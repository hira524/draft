import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Child Profile Schema
export const childProfiles = pgTable("child_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  interests: text("interests").array().notNull(), // e.g., ["animals", "space", "dinosaurs"]
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChildProfileSchema = createInsertSchema(childProfiles).omit({
  id: true,
  createdAt: true,
});

export type InsertChildProfile = z.infer<typeof insertChildProfileSchema>;
export type ChildProfile = typeof childProfiles.$inferSelect;

// Game Session Schema
export const gameSessions = pgTable("game_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childId: varchar("child_id").notNull().references(() => childProfiles.id),
  totalPoints: integer("total_points").notNull().default(0),
  wordsCompleted: integer("words_completed").notNull().default(0),
  wordList: jsonb("word_list").notNull(), // Array of word objects
  currentWordIndex: integer("current_word_index").notNull().default(0),
  status: text("status").notNull().default("active"), // active, completed
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GameSession = typeof gameSessions.$inferSelect;

// Word Attempt Schema
export const wordAttempts = pgTable("word_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => gameSessions.id),
  word: text("word").notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  transcript: text("transcript").notNull(),
  pronunciationScore: integer("pronunciation_score").notNull(),
  deepgramConfidence: integer("deepgram_confidence").notNull(), // stored as percentage (0-100)
  success: integer("success").notNull().default(0), // 0 or 1 (boolean)
  phonemeErrors: text("phoneme_errors").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWordAttemptSchema = createInsertSchema(wordAttempts).omit({
  id: true,
  createdAt: true,
});

export type InsertWordAttempt = z.infer<typeof insertWordAttemptSchema>;
export type WordAttempt = typeof wordAttempts.$inferSelect;

// TypeScript interfaces for frontend/backend communication
export interface WordData {
  word: string;
  difficulty: string;
  phonetic: string;
  hint: string;
}

export interface GameState {
  botIsSpeaking: boolean;
  botIsBusy: boolean;
  waitingForChildResponse: boolean;
  sttReady: boolean;
  currentWord: string;
  wordList: WordData[];
  currentWordIndex: number;
  attemptCount: number;
  totalScore: number;
  wordsCompleted: number;
  sessionId: string;
}

export interface PronunciationAnalysis {
  targetWord: string;
  childSaid: string;
  pronunciationScore: number;
  attemptNumber: number;
  maxAttempts: number;
  phonemeErrors: string[];
  deepgramConfidence: number;
  success: boolean;
}

export interface WebSocketMessage {
  event: 'audio_chunk' | 'transcript' | 'game_state' | 'feedback' | 'audio_end' | 'error' | 'init' | 'start_game';
  data?: any;
}

// User schema (keeping existing for potential auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
