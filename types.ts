export interface AnalysisResult {
  overview: string;
  emotional_patterns: string[];
  environment_patterns: string[];
  behavioral_loops: string[];
  triggers: string[];
  recurring_themes: string[];
  core_pursuits_and_why: string;
  reflection_prompts: string[];
}

export interface AnalysisState {
  isLoading: boolean;
  error: string | null;
  result: AnalysisResult | null;
}

export interface UploadedFile {
  file: File;
  previewUrl: string;
}

export interface JournalEntry {
  id: string;
  timestamp: string;
  text: string;
  journalPhotoCount: number;
  spacePhotoCount: number;
}

export interface UserPatternProfile {
  summary: string;
  tendencies: string[];
  typical_triggers: string[];
  typical_coping_styles: string[];
  last_updated: string;
}
