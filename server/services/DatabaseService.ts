import { MongoClient, Db, Collection } from "mongodb";
import type { ChildProfile, GameSession, WordAttempt } from "@shared/schema";

export class DatabaseService {
  private client: MongoClient;
  private db: Db | null = null;
  private childProfiles: Collection<ChildProfile> | null = null;
  private gameSessions: Collection<GameSession> | null = null;
  private wordAttempts: Collection<WordAttempt> | null = null;

  constructor() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    this.client = new MongoClient(uri);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db("pronunciation_game");
      this.childProfiles = this.db.collection<ChildProfile>("child_profiles");
      this.gameSessions = this.db.collection<GameSession>("game_sessions");
      this.wordAttempts = this.db.collection<WordAttempt>("word_attempts");
      
      console.log("MongoDB connected successfully");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  // Child Profile methods
  async getOrCreateChildProfile(name: string, age: number = 7, interests: string[] = []): Promise<ChildProfile> {
    if (!this.childProfiles) throw new Error("Database not connected");

    const existing = await this.childProfiles.findOne({ name });
    if (existing) {
      return existing;
    }

    const profile: ChildProfile = {
      id: crypto.randomUUID(),
      name,
      age,
      interests: interests.length > 0 ? interests : ["animals", "space", "nature"],
      createdAt: new Date(),
    };

    await this.childProfiles.insertOne(profile);
    return profile;
  }

  // Game Session methods
  async createGameSession(session: Omit<GameSession, "id" | "startedAt" | "completedAt">): Promise<GameSession> {
    if (!this.gameSessions) throw new Error("Database not connected");

    const newSession: GameSession = {
      ...session,
      id: crypto.randomUUID(),
      startedAt: new Date(),
      completedAt: null,
    };

    await this.gameSessions.insertOne(newSession);
    return newSession;
  }

  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<void> {
    if (!this.gameSessions) throw new Error("Database not connected");

    await this.gameSessions.updateOne({ id }, { $set: updates });
  }

  async completeGameSession(id: string, finalScore: number, wordsCompleted: number): Promise<void> {
    if (!this.gameSessions) throw new Error("Database not connected");

    await this.gameSessions.updateOne(
      { id },
      {
        $set: {
          status: "completed",
          totalPoints: finalScore,
          wordsCompleted,
          completedAt: new Date(),
        },
      }
    );
  }

  // Word Attempt methods
  async createWordAttempt(attempt: Omit<WordAttempt, "id" | "createdAt">): Promise<void> {
    if (!this.wordAttempts) throw new Error("Database not connected");

    const newAttempt: WordAttempt = {
      ...attempt,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    await this.wordAttempts.insertOne(newAttempt);
  }
}
