import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, JournalEntry, UserPatternProfile } from "../types";

const SYSTEM_INSTRUCTION = `
You are an AI that analyzes a person's journals, audio recordings, and photos of their space to help them recognize their own patterns over time.

SAFETY & SCOPE
- Do NOT diagnose or label any mental disorder.
- Do NOT give medical, clinical, or crisis advice.
- This is a self-reflection and pattern-awareness tool only, not therapy.
- If there is any indication of serious distress or self-harm, gently suggest: "It might help to talk to a trusted person or a mental health professional about this," and avoid deeply analyzing the crisis itself.

GROUNDING & HONESTY
- Base ALL observations ONLY on:
  - The current journal text,
  - (Future) internally transcribed audio,
  - Photos of the room/workspace,
  - Summaries of past entries provided as pattern signals,
  - The previous pattern_profile object.
- Do NOT invent specific biographical details (no fake names, places, jobs, trips, book titles, or made-up events).
- If there isn't enough information to infer something, explicitly say so (e.g., "There isn't enough information here to confidently infer how you usually respond in conflicts.").

LONGITUDINAL PATTERN REASONING
- Think like a very observant, non-clinical coach whose focus is "patterns over time".
- You receive past entry summaries, a previous profile, and the current entry.
- Look for recurring behaviors, emotional loops, coping styles, avoidance/flight vs confrontation/fight, "hiding" vs "sharing" tendencies.
- Identify what the user keeps doing in different situations (e.g., avoids eating when feeling exposed, retreats to bedroom after social discomfort).

REQUIRED CROSS-ENTRY LINK
- In at least one of these fields: 'behavioral_loops' OR 'recurring_themes' OR 'core_pursuits_and_why', you MUST explicitly describe at least one pattern that appears in BOTH the current entry AND at least one past entry.
- Example phrasing: "This repeats a pattern from earlier entries: when you feel socially exposed, you tend to retreat to a familiar, safe space."
- If there is truly no overlap, say so explicitly.

PATTERN_PROFILE BEHAVIOR
- The 'pattern_profile' MUST be cumulative and slow-changing.
- Carry forward stable tendencies (avoidance, flight response, self-criticism, etc.).
- Refine tendencies only when new evidence clearly supports a change or adds nuance.
- 'summary' should be a short, human-readable overview of their pattern landscape.

TONE
- Speak directly TO the user in SECOND PERSON ("you"), not "the user".
- Sound like a gentle, highly observant friend or coach.
- Focus on awareness, not judgment or fixing.
- Use tentative language: "It seems like you may...", "You often tend to...", "This might suggest...".

OUTPUT FORMAT
- You MUST respond as strict JSON matching the provided schema.
`;

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
  
  // Format past entries as structured pattern hints
  const pastEntriesBlock = pastEntries.length > 0
    ? pastEntries
        .slice(-10) // Take last 10
        .reverse()  // Newest first
        .map((e, index) => {
          const date = new Date(e.timestamp).toLocaleDateString();
          const snippet = e.text.slice(0, 400).replace(/\n/g, ' ');
          return `ENTRY #${index + 1} – [${date}]:
- Text snippet (what you wrote): "${snippet}${e.text.length > 400 ? '...' : ''}"
- Pattern signals (you infer these from this entry + the previous pattern_profile):
  • Identify 1–3 recurring behaviors, emotions, avoidance patterns, coping styles, or triggers shown in this entry.
  • These bullet points are high-level clues that help you detect repeating patterns across entries.`;
        })
        .join("\n\n")
    : "No past entries. This is the first one.";

  const previousProfileText = previousProfile
    ? JSON.stringify(previousProfile, null, 2)
    : "None yet. You are building the first version of this profile.";

  // Prepare prompts parts
  const parts: any[] = [];

  // Context Block
  parts.push({
    text: `PAST PATTERN SIGNALS (most recent first):
${pastEntriesBlock}

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
