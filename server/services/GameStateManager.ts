import type { GameState, WordData, PronunciationAnalysis } from "@shared/schema";

export class GameStateManager {
  private state: GameState;

  constructor(sessionId: string, wordList: WordData[]) {
    this.state = {
      botIsSpeaking: false,
      botIsBusy: false,
      waitingForChildResponse: false,
      sttReady: false,
      currentWord: wordList[0]?.word || "",
      wordList,
      currentWordIndex: 0,
      attemptCount: 0,
      totalScore: 0,
      wordsCompleted: 0,
      sessionId,
    };
  }

  getState(): GameState {
    return { ...this.state };
  }

  setState(updates: Partial<GameState>): void {
    this.state = { ...this.state, ...updates };
  }

  setBotSpeaking(speaking: boolean): void {
    this.state.botIsSpeaking = speaking;
  }

  setBotBusy(busy: boolean): void {
    this.state.botIsBusy = busy;
  }

  setWaitingForResponse(waiting: boolean): void {
    this.state.waitingForChildResponse = waiting;
  }

  setSTTReady(ready: boolean): void {
    this.state.sttReady = ready;
  }

  canProcessTranscript(): boolean {
    return !this.state.botIsSpeaking && !this.state.botIsBusy && this.state.waitingForChildResponse;
  }

  handlePronunciationResult(analysis: PronunciationAnalysis): {
    shouldMoveToNext: boolean;
    pointsAwarded: number;
  } {
    let pointsAwarded = 0;
    let shouldMoveToNext = false;

    if (analysis.success) {
      // Correct pronunciation
      pointsAwarded = 10;
      this.state.totalScore += pointsAwarded;
      this.state.wordsCompleted++;
      this.state.attemptCount = 0;
      shouldMoveToNext = true;
    } else {
      // Incorrect pronunciation
      this.state.attemptCount++;
      
      if (this.state.attemptCount >= 3) {
        // Max attempts reached, move to next word
        this.state.attemptCount = 0;
        shouldMoveToNext = true;
      }
    }

    return { shouldMoveToNext, pointsAwarded };
  }

  moveToNextWord(): boolean {
    this.state.currentWordIndex++;
    
    if (this.state.currentWordIndex >= this.state.wordList.length) {
      // Game complete
      return false;
    }

    this.state.currentWord = this.state.wordList[this.state.currentWordIndex].word;
    this.state.attemptCount = 0;
    this.state.waitingForChildResponse = false;
    return true;
  }

  isGameComplete(): boolean {
    return this.state.currentWordIndex >= this.state.wordList.length;
  }

  getCurrentWord(): WordData | undefined {
    return this.state.wordList[this.state.currentWordIndex];
  }

  getProgress(): {
    current: number;
    total: number;
    percentage: number;
  } {
    return {
      current: this.state.currentWordIndex + 1,
      total: this.state.wordList.length,
      percentage: (this.state.currentWordIndex / this.state.wordList.length) * 100,
    };
  }
}
