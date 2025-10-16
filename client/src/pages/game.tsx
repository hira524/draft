import { useState, useEffect, useRef } from "react";
import { Mic, Volume2, Star, Heart, Award, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import type { GameState, WordData } from "@shared/schema";

export default function PronunciationGame() {
  const { toast } = useToast();
  const [childName, setChildName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [showNameInput, setShowNameInput] = useState(true);
  const [gameState, setGameState] = useState<GameState>({
    botIsSpeaking: false,
    botIsBusy: false,
    waitingForChildResponse: false,
    sttReady: false,
    currentWord: "",
    wordList: [],
    currentWordIndex: 0,
    attemptCount: 0,
    totalScore: 0,
    wordsCompleted: 0,
    sessionId: "",
  });
  const [interimTranscript, setInterimTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!gameStarted) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      ws.send(JSON.stringify({
        event: "start_game",
        data: { childName, interests: ["animals", "space", "nature"] }
      }));
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.event) {
        case "game_state":
          setGameState(message.data);
          break;
        
        case "transcript":
          if (message.data.isFinal) {
            setInterimTranscript("");
          } else {
            setInterimTranscript(message.data.text);
          }
          break;
        
        case "feedback":
          setFeedback(message.data.text);
          setIsSuccess(message.data.success);
          setShowFeedback(true);
          
          if (message.data.success) {
            triggerConfetti();
          }
          
          setTimeout(() => {
            setShowFeedback(false);
            setFeedback("");
          }, 4000);
          break;
        
        case "audio_chunk":
          if (audioContextRef.current) {
            const audioData = new Uint8Array(message.data);
            const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.buffer);
            audioQueueRef.current.push(audioBuffer);
            playNextAudio();
          }
          break;
        
        case "audio_end":
          // Audio playback complete
          break;
        
        case "error":
          toast({
            title: "Error",
            description: message.data.message,
            variant: "destructive",
          });
          break;
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        title: "Connection Error",
        description: "Lost connection to the game server",
        variant: "destructive",
      });
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [gameStarted, childName, toast]);

  // Initialize audio context and microphone
  useEffect(() => {
    if (!gameStarted) return;

    const initAudio = async () => {
      try {
        // Initialize AudioContext
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          } 
        });
        mediaStreamRef.current = stream;

        // Setup audio processing
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (e) => {
          if (wsRef.current?.readyState === WebSocket.OPEN && !gameState.botIsSpeaking) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = new Int16Array(inputData.length);
            
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            
            wsRef.current.send(JSON.stringify({
              event: "audio_chunk",
              data: Array.from(pcmData)
            }));
          }
        };
        
        source.connect(processor);
        processor.connect(audioContextRef.current.destination);
      } catch (error) {
        console.error("Error initializing audio:", error);
        toast({
          title: "Microphone Error",
          description: "Could not access your microphone",
          variant: "destructive",
        });
      }
    };

    initAudio();
  }, [gameStarted, gameState.botIsSpeaking, toast]);

  const playNextAudio = () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) {
      return;
    }

    isPlayingRef.current = true;
    const buffer = audioQueueRef.current.shift()!;
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      isPlayingRef.current = false;
      playNextAudio();
    };
    
    source.start();
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b']
    });
  };

  const handleStartGame = () => {
    if (childName.trim()) {
      setShowNameInput(false);
      setGameStarted(true);
    }
  };

  const getMicrophoneState = () => {
    if (gameState.botIsSpeaking) return { label: "AI is talking", color: "bg-blue-500", icon: Volume2 };
    if (gameState.botIsBusy) return { label: "Thinking...", color: "bg-purple-500", icon: Loader2 };
    if (gameState.waitingForChildResponse) return { label: "Your turn!", color: "bg-green-500", icon: Mic };
    return { label: "Ready", color: "bg-muted", icon: Mic };
  };

  const micState = getMicrophoneState();
  const progressPercentage = gameState.wordList.length > 0 
    ? (gameState.currentWordIndex / gameState.wordList.length) * 100 
    : 0;

  if (showNameInput) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-purple-950 dark:to-pink-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6 animate-scale-in">
          <div className="text-center space-y-4">
            <div className="inline-block p-4 bg-primary/10 rounded-full animate-bounce-subtle">
              <Star className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-4xl font-display font-bold text-primary">
              Pronunciation Buddy
            </h1>
            <p className="text-lg text-muted-foreground">
              Let's practice fun words together!
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                What's your name?
              </label>
              <input
                id="name"
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleStartGame()}
                className="w-full px-4 py-3 rounded-lg border bg-background text-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter your name..."
                autoFocus
                data-testid="input-child-name"
              />
            </div>
            
            <Button
              onClick={handleStartGame}
              className="w-full py-6 text-lg font-semibold"
              size="lg"
              disabled={!childName.trim()}
              data-testid="button-start-game"
            >
              Start Playing!
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-purple-950 dark:to-pink-950">
      {/* Header */}
      <header className="border-b bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Star className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Hi, {childName}!</h2>
              <p className="text-sm text-muted-foreground">Keep practicing!</p>
            </div>
          </div>
          
          <Badge variant="secondary" className="px-4 py-2 text-lg font-bold gap-2" data-testid="badge-total-points">
            <Award className="w-5 h-5 text-yellow-500" />
            {gameState.totalScore} points
          </Badge>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Word {gameState.currentWordIndex + 1} of {gameState.wordList.length}</span>
            <span className="text-muted-foreground">{gameState.wordsCompleted} completed</span>
          </div>
          <Progress value={progressPercentage} className="h-3" data-testid="progress-word-completion" />
        </div>
      </div>

      {/* Main Game Area */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Current Word Display */}
        <Card className="p-12 text-center space-y-6 bg-gradient-to-br from-primary/5 to-accent/5 animate-scale-in">
          <div className="space-y-4">
            <h3 className="text-8xl font-display font-bold text-primary animate-bounce-subtle" data-testid="text-current-word">
              {gameState.currentWord || "Loading..."}
            </h3>
            {gameState.currentWord && gameState.wordList[gameState.currentWordIndex] && (
              <p className="text-2xl text-muted-foreground font-medium" data-testid="text-phonetic">
                /{gameState.wordList[gameState.currentWordIndex].phonetic}/
              </p>
            )}
          </div>

          {/* Attempt Hearts */}
          <div className="flex items-center justify-center gap-3" data-testid="container-attempt-hearts">
            {[1, 2, 3].map((attempt) => (
              <Heart
                key={attempt}
                className={`w-8 h-8 ${
                  attempt <= gameState.attemptCount 
                    ? 'text-muted fill-muted' 
                    : 'text-destructive fill-destructive'
                }`}
                data-testid={`heart-attempt-${attempt}`}
              />
            ))}
          </div>
        </Card>

        {/* Microphone Visualizer */}
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            {/* Pulsing rings */}
            {gameState.waitingForChildResponse && (
              <>
                <div className="absolute inset-0 rounded-full bg-green-500/30 animate-pulse-ring" />
                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-pulse-ring animation-delay-300" />
              </>
            )}
            
            <div className={`relative w-32 h-32 rounded-full ${micState.color} flex items-center justify-center transition-all duration-300 ${
              gameState.botIsBusy ? 'animate-spin-slow' : ''
            }`} data-testid="microphone-visualizer">
              <micState.icon className="w-16 h-16 text-white" />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-xl font-semibold" data-testid="text-mic-status">
              {micState.label}
            </p>
            {interimTranscript && (
              <p className="text-sm text-muted-foreground italic" data-testid="text-interim-transcript">
                "{interimTranscript}"
              </p>
            )}
          </div>
        </div>

        {/* Feedback Modal */}
        {showFeedback && (
          <Card className={`p-8 text-center space-y-4 animate-scale-in ${
            isSuccess ? 'border-success bg-success/5' : 'border-destructive/50 bg-destructive/5'
          } ${!isSuccess && gameState.attemptCount > 0 ? 'animate-shake' : ''}`} data-testid="card-feedback">
            <p className="text-2xl font-semibold leading-relaxed" data-testid="text-feedback">
              {feedback}
            </p>
          </Card>
        )}

        {/* Pronunciation Tip */}
        {gameState.currentWord && gameState.wordList[gameState.currentWordIndex]?.hint && (
          <Card className="p-6 bg-accent/10" data-testid="card-pronunciation-tip">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Volume2 className="w-5 h-5 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-2">Pronunciation Tip</h4>
                <p className="text-muted-foreground" data-testid="text-pronunciation-hint">
                  {gameState.wordList[gameState.currentWordIndex].hint}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
