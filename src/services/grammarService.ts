import { GoogleGenAI, Type } from "@google/genai";
import { GrammarCheckResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function checkGrammar(text: string, tone: string = 'Professional'): Promise<GrammarCheckResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following text for grammar, spelling, punctuation, and style issues. 
    The desired tone is: ${tone}.
    
    Provide:
    1. A grammar score (0-100).
    2. Detect the current tone (Formal, Casual, Academic, etc.).
    3. Context-aware corrections that fix grammar based on sentence meaning.
    4. 2-3 alternative versions of the entire text (e.g., more concise, more professional, etc.).
    
    Text to analyze:
    """
    ${text}
    """`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          originalText: { type: Type.STRING },
          correctedText: { type: Type.STRING },
          summary: { type: Type.STRING },
          grammarScore: { type: Type.NUMBER },
          detectedTone: { type: Type.STRING },
          alternativeVersions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                label: { type: Type.STRING }
              },
              required: ["text", "label"]
            }
          },
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                original: { type: Type.STRING },
                replacement: { type: Type.STRING },
                explanation: { type: Type.STRING },
                type: { 
                  type: Type.STRING,
                  description: "One of: grammar, spelling, style, punctuation"
                },
                startIndex: { type: Type.INTEGER },
                endIndex: { type: Type.INTEGER }
              },
              required: ["id", "original", "replacement", "explanation", "type", "startIndex", "endIndex"]
            }
          },
          analytics: {
            type: Type.OBJECT,
            properties: {
              readabilityScore: { type: Type.NUMBER, description: "0-100 score" },
              readingTimeMinutes: { type: Type.NUMBER },
              toneProfile: {
                type: Type.OBJECT,
                properties: {
                  formal: { type: Type.NUMBER },
                  confident: { type: Type.NUMBER },
                  friendly: { type: Type.NUMBER },
                  optimistic: { type: Type.NUMBER }
                },
                required: ["formal", "confident", "friendly", "optimistic"]
              },
              vocabularyLevel: { type: Type.STRING, description: "Basic, Intermediate, or Advanced" },
              topKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["readabilityScore", "readingTimeMinutes", "toneProfile", "vocabularyLevel", "topKeywords"]
          }
        },
        required: ["originalText", "correctedText", "suggestions", "summary", "analytics", "grammarScore", "detectedTone", "alternativeVersions"]
      },
    },
  });

  try {
    const result = JSON.parse(response.text || "{}");
    return result as GrammarCheckResult;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to analyze text. Please try again.");
  }
}
