export interface TopicAnalysis {
  coreEmotion: string;
  coreConflict: string;
  hiddenFear: string;
  hiddenDesire: string;
  existentialQuestion: string;
  internalContradiction: string;
  emotionalTrigger: string;
  whyClick: string;
  whyKeepWatching: string;
  mostRelatableSituation: string;
}

export interface ViralPositioning {
  targetAudience: string;
  emotionalState: string;
  curiosityGap: string;
  psychologicalHook: string;
  strongestTitleAngle: string;
  clickableThumbnailConcept: string;
}

export interface ThumbnailIdea {
  id: number;
  conceptName: string;
  description: string;
  symbolicElement: string;
  visualComposition: string; // e.g. "Single silhouette standing under a massive cracked sky"
}

export interface Scene {
  number: number;
  duration: string;
  section: string; // "HOOK", "EMOTIONAL MIRROR", "PROBLEM EXPANSION", "PSYCHOLOGICAL ANALYSIS", "PHILOSOPHICAL LAYER", "ENDING" etc.
  voiceoverText: string;
  visualDescription: string;
  cameraMovement: string;
  transitionType: string;
  emotion: string;
  imagePrompt: string;
  musicCategory: "ambient piano" | "cinematic drones" | "emotional strings" | "atmospheric textures" | "subtle tension";
}

export interface Chapter {
  timestamp: string;
  title: string;
}

export interface DocumentaryBlueprint {
  id?: string;
  topic: string;
  tone: "Melancholic" | "Overthinking" | "Existential" | "Stoic" | "Golden-Sand Comfort";
  createdAt: string;
  analysis: TopicAnalysis;
  viralPositioning: ViralPositioning;
  titles: string[];
  thumbnailIdeas: ThumbnailIdea[];
  description: string;
  scriptText: string;
  scenes: Scene[];
  chapters: Chapter[];
  tags: string[];
  keywords: string[];
  pinnedComment: string;
  isLocalFallback?: boolean;
  fallbackWarning?: string;
  isPermissionError?: boolean;
  isQuotaError?: boolean;
}
