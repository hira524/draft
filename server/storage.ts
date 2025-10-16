import { 
  type ChildProfile, 
  type InsertChildProfile,
  type GameSession,
  type InsertGameSession,
  type WordAttempt,
  type InsertWordAttempt,
  type WordData
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Child Profile methods
  getChildProfile(id: string): Promise<ChildProfile | undefined>;
  getChildProfileByName(name: string): Promise<ChildProfile | undefined>;
  createChildProfile(profile: InsertChildProfile): Promise<ChildProfile>;
  
  // Game Session methods
  getGameSession(id: string): Promise<GameSession | undefined>;
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession>;
  
  // Word Attempt methods
  createWordAttempt(attempt: InsertWordAttempt): Promise<WordAttempt>;
  getWordAttemptsBySession(sessionId: string): Promise<WordAttempt[]>;
}

export class MemStorage implements IStorage {
  private childProfiles: Map<string, ChildProfile>;
  private gameSessions: Map<string, GameSession>;
  private wordAttempts: Map<string, WordAttempt>;

  constructor() {
    this.childProfiles = new Map();
    this.gameSessions = new Map();
    this.wordAttempts = new Map();
    
    // Add a default child profile for testing
    const defaultChild: ChildProfile = {
      id: randomUUID(),
      name: "Test Child",
      age: 7,
      interests: ["animals", "space", "dinosaurs"],
      createdAt: new Date(),
    };
    this.childProfiles.set(defaultChild.id, defaultChild);
  }

  // Child Profile methods
  async getChildProfile(id: string): Promise<ChildProfile | undefined> {
    return this.childProfiles.get(id);
  }

  async getChildProfileByName(name: string): Promise<ChildProfile | undefined> {
    return Array.from(this.childProfiles.values()).find(
      (profile) => profile.name.toLowerCase() === name.toLowerCase()
    );
  }

  async createChildProfile(insertProfile: InsertChildProfile): Promise<ChildProfile> {
    const id = randomUUID();
    const profile: ChildProfile = {
      ...insertProfile,
      id,
      createdAt: new Date(),
    };
    this.childProfiles.set(id, profile);
    return profile;
  }

  // Game Session methods
  async getGameSession(id: string): Promise<GameSession | undefined> {
    return this.gameSessions.get(id);
  }

  async createGameSession(insertSession: InsertGameSession): Promise<GameSession> {
    const id = randomUUID();
    const session: GameSession = {
      ...insertSession,
      id,
      startedAt: new Date(),
      completedAt: null,
    };
    this.gameSessions.set(id, session);
    return session;
  }

  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession> {
    const session = this.gameSessions.get(id);
    if (!session) {
      throw new Error("Game session not found");
    }
    const updatedSession = { ...session, ...updates };
    this.gameSessions.set(id, updatedSession);
    return updatedSession;
  }

  // Word Attempt methods
  async createWordAttempt(insertAttempt: InsertWordAttempt): Promise<WordAttempt> {
    const id = randomUUID();
    const attempt: WordAttempt = {
      ...insertAttempt,
      id,
      createdAt: new Date(),
    };
    this.wordAttempts.set(id, attempt);
    return attempt;
  }

  async getWordAttemptsBySession(sessionId: string): Promise<WordAttempt[]> {
    return Array.from(this.wordAttempts.values()).filter(
      (attempt) => attempt.sessionId === sessionId
    );
  }
}

export const storage = new MemStorage();
