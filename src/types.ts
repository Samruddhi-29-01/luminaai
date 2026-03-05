export type SuggestionType = 'grammar' | 'spelling' | 'style' | 'punctuation';

export interface Suggestion {
  id: string;
  original: string;
  replacement: string;
  explanation: string;
  type: SuggestionType;
  startIndex: number;
  endIndex: number;
}

export interface GrammarCheckResult {
  originalText: string;
  correctedText: string;
  suggestions: Suggestion[];
  summary: string;
  grammarScore: number; // 0-100
  detectedTone: string; // e.g., Formal, Casual, Academic
  alternativeVersions: {
    text: string;
    label: string; // e.g., "More Concise", "More Professional", "More Friendly"
  }[];
  analytics: {
    readabilityScore: number; // 0-100
    readingTimeMinutes: number;
    toneProfile: {
      formal: number; // 0-100
      confident: number;
      friendly: number;
      optimistic: number;
    };
    vocabularyLevel: 'Basic' | 'Intermediate' | 'Advanced';
    topKeywords: string[];
  };
}
