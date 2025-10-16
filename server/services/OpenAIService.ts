import OpenAI from "openai";
import type { WordData, PronunciationAnalysis } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class OpenAIService {
  // Generate personalized word list based on child's interests
  async generateWordList(age: number, interests: string[]): Promise<WordData[]> {
    try {
      const interestsStr = interests.join(", ");
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an expert in child education and pronunciation teaching. Generate age-appropriate words for pronunciation practice. Return only valid JSON.",
          },
          {
            role: "user",
            content: `Generate 15 pronunciation practice words for a ${age}-year-old child interested in ${interestsStr}. Start with easy 3-4 letter words, then progress to medium difficulty. Return as JSON array: [{"word": string, "difficulty": "easy"|"medium", "phonetic": string (IPA notation), "hint": string (simple pronunciation tip)}]`,
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content from OpenAI");
      }

      const parsed = JSON.parse(content);
      const words = parsed.words || parsed;
      
      if (!Array.isArray(words)) {
        throw new Error("Invalid response format from OpenAI");
      }

      return words;
    } catch (error) {
      console.error("OpenAI word generation error:", error);
      
      // Fallback word list if OpenAI fails
      return [
        { word: "cat", difficulty: "easy", phonetic: "kæt", hint: "Say 'c' like a hard 'k', then 'at'" },
        { word: "dog", difficulty: "easy", phonetic: "dɔg", hint: "Start with 'd', then 'og' like 'log'" },
        { word: "sun", difficulty: "easy", phonetic: "sʌn", hint: "Say 's' like a snake, then 'un'" },
        { word: "star", difficulty: "easy", phonetic: "stɑr", hint: "Combine 'st' then say 'ar' like at the doctor" },
        { word: "moon", difficulty: "easy", phonetic: "mun", hint: "Say 'm' then 'oon' like 'soon'" },
        { word: "tree", difficulty: "easy", phonetic: "tri", hint: "Say 'tr' together, then 'ee'" },
        { word: "bird", difficulty: "medium", phonetic: "bɜrd", hint: "Start with 'b', then 'ird' like 'third'" },
        { word: "flower", difficulty: "medium", phonetic: "flaʊər", hint: "Say 'fl' then 'ow' like 'cow', then 'er'" },
        { word: "rainbow", difficulty: "medium", phonetic: "reɪnboʊ", hint: "Say 'rain' then 'bow' like bow and arrow" },
        { word: "butterfly", difficulty: "medium", phonetic: "bʌtərflaɪ", hint: "Break it: 'butter' then 'fly'" },
      ];
    }
  }

  // Generate contextual feedback based on pronunciation analysis
  async generateFeedback(
    analysis: PronunciationAnalysis,
    childName: string,
    currentPoints: number
  ): Promise<string> {
    try {
      const { targetWord, childSaid, pronunciationScore, attemptNumber, maxAttempts, success } = analysis;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a warm, encouraging pronunciation tutor for young children. Provide clear, simple feedback using child-friendly language. Keep responses under 30 words. Always be positive and motivating.",
          },
          {
            role: "user",
            content: JSON.stringify({
              targetWord,
              childSaid,
              pronunciationScore,
              attemptNumber,
              maxAttempts,
              success,
              childName,
              currentPoints,
            }),
          },
        ],
        max_completion_tokens: 150,
      });

      const feedback = response.choices[0].message.content?.trim() || "";
      
      if (!feedback) {
        // Fallback responses
        if (success) {
          return `Wonderful! You said '${targetWord}' perfectly! You earned 10 points! Your total is now ${currentPoints + 10} points. Ready for the next word?`;
        } else if (attemptNumber < maxAttempts) {
          return `Good try! The word is '${targetWord}'. Let's try once more!`;
        } else {
          return `Great effort! The word was '${targetWord}'. Let's try a new word!`;
        }
      }

      return feedback;
    } catch (error) {
      console.error("OpenAI feedback generation error:", error);
      
      // Fallback feedback
      if (analysis.success) {
        return `Perfect! You said '${analysis.targetWord}' correctly! +10 points!`;
      } else if (analysis.attemptNumber < analysis.maxAttempts) {
        return `Try again! Listen: ${analysis.targetWord}. You can do it!`;
      } else {
        return `Good try! Let's practice '${analysis.targetWord}' again later. Next word!`;
      }
    }
  }

  // Generate greeting message
  async generateGreeting(childName: string, interests: string[]): Promise<string> {
    const interestsStr = interests.join(", ");
    return `Hi ${childName}! I'm your pronunciation buddy! Today we'll practice fun words about ${interestsStr}. Ready to start?`;
  }
}
