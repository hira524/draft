import metaphone from "metaphone";
import * as natural from "natural";
import stringSimilarity from "string-similarity";

export interface AnalysisResult {
  pronunciationScore: number;
  phonemeErrors: string[];
  success: boolean;
}

export class PronunciationAnalyzer {
  private levenshtein = natural.LevenshteinDistance;

  analyze(
    targetWord: string,
    transcript: string,
    deepgramConfidence: number
  ): AnalysisResult {
    const target = targetWord.toLowerCase().trim();
    const spoken = transcript.toLowerCase().trim();

    // Perfect match check
    if (spoken === target && deepgramConfidence > 0.85) {
      return {
        pronunciationScore: 100,
        phonemeErrors: [],
        success: true,
      };
    }

    // Phonetic analysis
    const targetPhonetic = this.getPhonetic(target);
    const spokenPhonetic = this.getPhonetic(spoken);

    // Calculate phoneme similarity using Levenshtein distance
    const maxLength = Math.max(targetPhonetic.length, spokenPhonetic.length);
    const distance = this.levenshtein(targetPhonetic, spokenPhonetic);
    const phonemeSimilarity = maxLength > 0 ? 1 - (distance / maxLength) : 0;

    // Calculate string similarity as additional measure
    const stringSim = stringSimilarity.compareTwoStrings(target, spoken);

    // Combine metrics with weights
    const baseScore = (phonemeSimilarity * 0.4) + (stringSim * 0.2) + (deepgramConfidence * 0.4);
    
    let finalScore: number;
    if (baseScore >= 0.80) {
      finalScore = Math.round(80 + (baseScore - 0.80) * 100);
    } else if (baseScore >= 0.60) {
      finalScore = Math.round(60 + (baseScore - 0.60) * 100);
    } else {
      finalScore = Math.round(baseScore * 100);
    }

    // Identify phoneme errors
    const phonemeErrors = this.identifyErrors(target, spoken, targetPhonetic, spokenPhonetic);

    return {
      pronunciationScore: Math.min(100, Math.max(0, finalScore)),
      phonemeErrors,
      success: finalScore >= 80,
    };
  }

  private getPhonetic(word: string): string {
    try {
      // Use metaphone for phonetic encoding
      return metaphone(word) || word;
    } catch {
      return word;
    }
  }

  private identifyErrors(
    target: string,
    spoken: string,
    targetPhonetic: string,
    spokenPhonetic: string
  ): string[] {
    const errors: string[] = [];

    // Check for common pronunciation issues
    if (target !== spoken) {
      // Vowel errors
      const targetVowels = target.match(/[aeiou]/g) || [];
      const spokenVowels = spoken.match(/[aeiou]/g) || [];
      
      if (targetVowels.length !== spokenVowels.length) {
        errors.push("vowel count mismatch");
      } else {
        for (let i = 0; i < targetVowels.length; i++) {
          if (targetVowels[i] !== spokenVowels[i]) {
            errors.push(`vowel '${targetVowels[i]}' pronounced as '${spokenVowels[i]}'`);
            break; // Only report first error
          }
        }
      }

      // Consonant errors
      const targetConsonants = target.match(/[bcdfghjklmnpqrstvwxyz]/g) || [];
      const spokenConsonants = spoken.match(/[bcdfghjklmnpqrstvwxyz]/g) || [];
      
      if (targetConsonants.length !== spokenConsonants.length) {
        errors.push("consonant count mismatch");
      } else {
        for (let i = 0; i < targetConsonants.length; i++) {
          if (targetConsonants[i] !== spokenConsonants[i]) {
            errors.push(`consonant '${targetConsonants[i]}' pronounced as '${spokenConsonants[i]}'`);
            break; // Only report first error
          }
        }
      }

      // Length errors
      if (target.length !== spoken.length && errors.length === 0) {
        if (target.length > spoken.length) {
          errors.push("word too short");
        } else {
          errors.push("word too long");
        }
      }
    }

    // Limit to most significant errors
    return errors.slice(0, 2);
  }
}
