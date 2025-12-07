import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, JournalEntry, UserPatternProfile } from "../types";

const SYSTEM_INSTRUCTION = `You are an AI that analyzes a person's journals and photos of their space to help them recognize their own patterns over time.

SAFETY & SCOPE
- Do NOT diagnose or label any mental disorder.
- Do NOT give medical, clinical, or crisis advice.
- This is a self-reflection tool only.
- If there is any indication of serious distress or self-harm, gently suggest they talk to a trusted person or professional and avoid analyzing the crisis itself.

GROUNDING & HONESTY
- Base ALL observations ONLY on what is actually visible in the text, images, and summarized past entries/profile.
- Do NOT invent specific biographical details (e.g., names, locations, trips, job titles, book titles) that are not explicitly mentioned.
- If there is not enough information to infer something, say so explicitly (e.g., "There is not enough information to confidently infer X").
- Be conservative and humble in your inferences. Avoid story-like speculation.

TASK
- You receive:
  1) A summary of past journal entries,
  2) A previous pattern_profile (if any),
  3) The current journal entry and images.
- Stay in the domain of self-observation, life patterns, emotional tendencies, values, and habits.
- Look for correlations across time, emotions, environment, and behavior.
- Identify recurring ways this person tends to respond (e.g. flight vs fight, freeze, rumination, seeking reassurance).
- Identify what they keep returning to (topics, worries, desires).
- Infer what they may be chasing (validation, safety, achievement, freedom, control, belonging, etc.) but phrase it tentatively ("it seems like…", "you may be…").
- When the input is very short or vague, say that the insights are limited and speak in terms of possibilities, not certainties.
- Analyze the visual environment in the photos (clutter, lighting, organization, specific objects) to infer environmental patterns.

OUTPUT FORMAT
- You MUST respond as strict JSON matching the provided schema.
- The "pattern_profile" field should represent a *running*, cumulative profile that takes into account all past entries and the current one.
- When updating pattern_profile, you may refine or slightly adjust previous tendencies, but avoid dramatic changes unless the new evidence is strong.`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    overview: {
      type: Type.STRING,
      description: "A short summary paragraph of the analysis."
    },
    emotional_patterns: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of observed emotional tendencies."
    },
    environment_patterns: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Patterns observed from the physical environment/workspace photos."
    },
    behavioral_loops: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Repeated behaviors or habits identified."
    },
    triggers: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Events or situations that seem to initiate patterns."
    },
    recurring_themes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Topics or subjects the user keeps returning to."
    },
    core_pursuits_and_why: {
      type: Type.STRING,
      description: "Analysis of what the user seems to be chasing (values/motivations) and why."
    },
    reflection_prompts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "5-10 questions for self-reflection."
    },
    pattern_profile: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        tendencies: { type: Type.ARRAY, items: { type: Type.STRING } },
        typical_triggers: { type: Type.ARRAY, items: { type: Type.STRING } },
        typical_coping_styles: { type: Type.ARRAY, items: { type: Type.STRING } },
        last_updated: { type: Type.STRING },
      },
      required: ["summary", "tendencies", "typical_triggers", "typical_coping_styles", "last_updated"]
    }
  },
  required: [
    "overview",
    "emotional_patterns",
    "environment_patterns",
    "behavioral_loops",
    "triggers",
    "recurring_themes",
    "core_pursuits_and_why",
    "reflection_prompts",
    "pattern_profile"
  ]
};

// Helper to convert File to Base64 string (without prefix)
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzePatterns = async (
  journalText: string,
  journalPhotos: File[],
  spacePhotos: File[],
  pastEntries: JournalEntry[],
  previousProfile: UserPatternProfile | null
): Promise<{ analysis: AnalysisResult; pattern_profile: UserPatternProfile }> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const historySummaryText = pastEntries
    .slice(-10)
    .reverse()
    .map(e => `- [${e.timestamp}] ${e.text.slice(0, 500)}${e.text.length > 500 ? '...' : ''}`) // Truncate individual entries slightly to save context
    .join("\n");

  const previousProfileText = previousProfile
    ? JSON.stringify(previousProfile, null, 2)
    : "None yet. You are building the first version of this profile.";

  // Prepare prompts parts
  const parts: any[] = [];

  // Context Block
  parts.push({
    text: `PAST ENTRIES (summarized):
${historySummaryText || "No past entries. This is the first one."}

PREVIOUS PATTERN PROFILE (if any):
${previousProfileText}

CURRENT ENTRY TO ANALYZE:`
  });

  // Add Journal Text
  if (journalText.trim()) {
    parts.push({ text: `JOURNAL ENTRIES/NOTES:\n${journalText}` });
  } else {
    parts.push({ text: `(No text provided for this entry)` });
  }

  // Add Journal Photos
  if (journalPhotos.length > 0) {
    parts.push({ text: "Here are photos of handwritten journal entries:" });
    for (const file of journalPhotos) {
      const part = await fileToGenerativePart(file);
      parts.push(part);
    }
  }

  // Add Space Photos
  if (spacePhotos.length > 0) {
    parts.push({ text: "Here are photos of my room/workspace/environment:" });
    for (const file of spacePhotos) {
      const part = await fileToGenerativePart(file);
      parts.push(part);
    }
  }

  if (journalText.trim().length === 0 && journalPhotos.length === 0 && spacePhotos.length === 0) {
    throw new Error("Please provide some text or images to analyze.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.4,
      }
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("No response received from the model.");
    }

    const jsonResponse = JSON.parse(textResponse);
    
    // Separate the AnalysisResult from the UserPatternProfile
    const analysis: AnalysisResult = {
      overview: jsonResponse.overview,
      emotional_patterns: jsonResponse.emotional_patterns,
      environment_patterns: jsonResponse.environment_patterns,
      behavioral_loops: jsonResponse.behavioral_loops,
      triggers: jsonResponse.triggers,
      recurring_themes: jsonResponse.recurring_themes,
      core_pursuits_and_why: jsonResponse.core_pursuits_and_why,
      reflection_prompts: jsonResponse.reflection_prompts,
    };

    const pattern_profile: UserPatternProfile = jsonResponse.pattern_profile;

    return { analysis, pattern_profile };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze patterns. Please try again.");
  }
};
