import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";

const SYSTEM_INSTRUCTION = `You are an AI that analyzes a person’s journals and photos of their space to help them recognize their own patterns.

Do NOT diagnose or label any mental disorder.
Do NOT give medical, clinical, or crisis advice.
Stay in the domain of self-observation, life patterns, emotional tendencies, values, and habits.
Look for correlations across time, emotions, environment, and behavior.
Identify what they keep returning to (topics, worries, desires).
Infer what they may be chasing (validation, safety, achievement, freedom, control, belonging, etc.) but phrase it tentatively ("it seems like…", "you may be…").

If there is any indication of serious distress or self-harm, gently suggest they talk to a trusted person or professional and avoid analysis of the crisis itself.

You must handle both text input and image inputs. Analyze the visual environment in the photos (clutter, lighting, organization, specific objects) to infer environmental patterns.`;

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
    "reflection_prompts"
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
  spacePhotos: File[]
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prepare prompts parts
  const parts: any[] = [];

  // Add Journal Text
  if (journalText.trim()) {
    parts.push({ text: `JOURNAL ENTRIES/NOTES:\n${journalText}` });
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

  if (parts.length === 0) {
    throw new Error("Please provide some text or images to analyze.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Using Gemini 3 Pro as requested for complex reasoning
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      }
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("No response received from the model.");
    }

    const jsonResponse = JSON.parse(textResponse) as AnalysisResult;
    return jsonResponse;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze patterns. Please try again.");
  }
};
