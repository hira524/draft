import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { DeepgramService } from "./services/DeepgramService";
import { OpenAIService } from "./services/OpenAIService";
import { PronunciationAnalyzer } from "./services/PronunciationAnalyzer";
import { GameStateManager } from "./services/GameStateManager";
import { DatabaseService } from "./services/DatabaseService";
import type { PronunciationAnalysis } from "@shared/schema";

// Initialize services
const deepgramService = new DeepgramService();
const openaiService = new OpenAIService();
const pronunciationAnalyzer = new PronunciationAnalyzer();
const databaseService = new DatabaseService();

// Connect to MongoDB
databaseService.connect().catch(console.error);

// Session managers per connection
const sessions = new Map<WebSocket, {
  gameState: GameStateManager;
  deepgramConnection: any;
  childName: string;
  childId: string;
  sessionId: string;
}>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server on /ws path (as per blueprint instructions)
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', async (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.event) {
          case 'start_game':
            await handleStartGame(ws, message.data);
            break;
          
          case 'audio_chunk':
            await handleAudioChunk(ws, message.data);
            break;
          
          default:
            console.log('Unknown message event:', message.event);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        sendError(ws, 'Failed to process message');
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      const session = sessions.get(ws);
      if (session?.deepgramConnection) {
        session.deepgramConnection.finish();
      }
      sessions.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  async function handleStartGame(ws: WebSocket, data: { childName: string; interests: string[] }) {
    try {
      const { childName, interests } = data;

      // Get or create child profile from database
      const childProfile = await databaseService.getOrCreateChildProfile(
        childName,
        7,
        interests
      );

      // Generate personalized word list using OpenAI
      const wordList = await openaiService.generateWordList(childProfile.age, childProfile.interests);

      // Create game session in database
      const gameSession = await databaseService.createGameSession({
        childId: childProfile.id,
        totalPoints: 0,
        wordsCompleted: 0,
        wordList,
        currentWordIndex: 0,
        status: "active",
      });

      // Initialize game state manager
      const gameState = new GameStateManager(gameSession.id, wordList);

      // Setup Deepgram STT connection
      const deepgramConnection = await deepgramService.createSTTConnection(
        async (transcript: string, isFinal: boolean, confidence: number) => {
          // Send transcript to frontend
          sendMessage(ws, 'transcript', { text: transcript, isFinal, confidence });

          // Process final transcripts only
          if (isFinal && gameState.canProcessTranscript()) {
            await handlePronunciationAttempt(ws, gameState, transcript, confidence, childProfile.name);
          }
        }
      );

      // Store session
      sessions.set(ws, {
        gameState,
        deepgramConnection,
        childName: childProfile.name,
        childId: childProfile.id,
        sessionId: gameSession.id,
      });

      // Send initial game state
      sendMessage(ws, 'game_state', gameState.getState());

      // Generate and send greeting
      const greeting = await openaiService.generateGreeting(childProfile.name, childProfile.interests);
      await sendTTSAudio(ws, gameState, greeting);

      // Introduce first word
      const firstWord = gameState.getCurrentWord();
      if (firstWord) {
        const introduction = `Let's practice the word '${firstWord.word}'. Listen: ${firstWord.word}. ${firstWord.hint}. Now you try!`;
        await sendTTSAudio(ws, gameState, introduction);
        gameState.setWaitingForResponse(true);
        sendMessage(ws, 'game_state', gameState.getState());
      }
    } catch (error) {
      console.error('Start game error:', error);
      sendError(ws, 'Failed to start game');
    }
  }

  async function handleAudioChunk(ws: WebSocket, audioData: number[]) {
    const session = sessions.get(ws);
    if (!session || !session.deepgramConnection) {
      return;
    }

    // Don't send audio if bot is speaking (barge-in protection)
    if (session.gameState.getState().botIsSpeaking) {
      return;
    }

    // Convert to buffer and send to Deepgram
    const buffer = Buffer.from(new Int16Array(audioData).buffer);
    session.deepgramConnection.send(buffer);
  }

  async function handlePronunciationAttempt(
    ws: WebSocket,
    gameState: GameStateManager,
    transcript: string,
    confidence: number,
    childName: string
  ) {
    const session = sessions.get(ws);
    if (!session) return;

    try {
      // Set busy flag
      gameState.setBotBusy(true);
      gameState.setWaitingForResponse(false);
      sendMessage(ws, 'game_state', gameState.getState());

      const currentWord = gameState.getCurrentWord();
      if (!currentWord) return;

      // Analyze pronunciation
      const analysisResult = pronunciationAnalyzer.analyze(
        currentWord.word,
        transcript,
        confidence
      );

      const analysis: PronunciationAnalysis = {
        targetWord: currentWord.word,
        childSaid: transcript,
        pronunciationScore: analysisResult.pronunciationScore,
        attemptNumber: gameState.getState().attemptCount + 1,
        maxAttempts: 3,
        phonemeErrors: analysisResult.phonemeErrors,
        deepgramConfidence: confidence,
        success: analysisResult.success,
      };

      // Save word attempt to database
      await databaseService.createWordAttempt({
        sessionId: session.sessionId,
        word: currentWord.word,
        attemptNumber: analysis.attemptNumber,
        transcript,
        pronunciationScore: analysis.pronunciationScore,
        deepgramConfidence: Math.round(confidence * 100),
        success: analysisResult.success ? 1 : 0,
        phonemeErrors: analysisResult.phonemeErrors,
      });

      // Handle result and update state
      const { shouldMoveToNext, pointsAwarded } = gameState.handlePronunciationResult(analysis);

      // Generate AI feedback
      const feedback = await openaiService.generateFeedback(
        analysis,
        childName,
        gameState.getState().totalScore
      );

      // Send feedback to frontend
      sendMessage(ws, 'feedback', { text: feedback, success: analysisResult.success });

      // Send TTS feedback
      await sendTTSAudio(ws, gameState, feedback);

      // Update database session
      await databaseService.updateGameSession(session.sessionId, {
        totalPoints: gameState.getState().totalScore,
        wordsCompleted: gameState.getState().wordsCompleted,
        currentWordIndex: gameState.getState().currentWordIndex,
      });

      if (shouldMoveToNext) {
        const hasNext = gameState.moveToNextWord();
        
        if (!hasNext) {
          // Game complete
          await databaseService.completeGameSession(
            session.sessionId,
            gameState.getState().totalScore,
            gameState.getState().wordsCompleted
          );
          
          const summary = `Amazing job, ${childName}! You completed all words and earned ${gameState.getState().totalScore} points! You're a pronunciation star!`;
          await sendTTSAudio(ws, gameState, summary);
        } else {
          // Introduce next word
          const nextWord = gameState.getCurrentWord();
          if (nextWord) {
            const introduction = `Next word: '${nextWord.word}'. Listen: ${nextWord.word}. ${nextWord.hint}. Your turn!`;
            await sendTTSAudio(ws, gameState, introduction);
            gameState.setWaitingForResponse(true);
          }
        }
      } else {
        // Retry same word
        gameState.setWaitingForResponse(true);
      }

      // Update game state
      gameState.setBotBusy(false);
      sendMessage(ws, 'game_state', gameState.getState());
    } catch (error) {
      console.error('Pronunciation attempt error:', error);
      gameState.setBotBusy(false);
      gameState.setWaitingForResponse(true);
      sendMessage(ws, 'game_state', gameState.getState());
      sendError(ws, 'Failed to process pronunciation');
    }
  }

  async function sendTTSAudio(ws: WebSocket, gameState: GameStateManager, text: string) {
    try {
      gameState.setBotSpeaking(true);
      sendMessage(ws, 'game_state', gameState.getState());

      // Generate audio from Deepgram TTS
      const audioBuffer = await deepgramService.generateTTS(text);

      // Chunk audio into 20ms frames (320 bytes for 16kHz linear16)
      const chunkSize = 320;
      const chunks: Buffer[] = [];
      
      for (let i = 0; i < audioBuffer.length; i += chunkSize) {
        chunks.push(audioBuffer.slice(i, i + chunkSize));
      }

      // Stream chunks to frontend
      for (const chunk of chunks) {
        if (ws.readyState === WebSocket.OPEN) {
          sendMessage(ws, 'audio_chunk', Array.from(chunk));
          // Small delay between chunks for smooth playback
          await new Promise(resolve => setTimeout(resolve, 15));
        }
      }

      // Send end marker
      sendMessage(ws, 'audio_end', {});

      gameState.setBotSpeaking(false);
      sendMessage(ws, 'game_state', gameState.getState());
    } catch (error) {
      console.error('TTS error:', error);
      gameState.setBotSpeaking(false);
      sendMessage(ws, 'game_state', gameState.getState());
    }
  }

  function sendMessage(ws: WebSocket, event: string, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data }));
    }
  }

  function sendError(ws: WebSocket, message: string) {
    sendMessage(ws, 'error', { message });
  }

  return httpServer;
}
