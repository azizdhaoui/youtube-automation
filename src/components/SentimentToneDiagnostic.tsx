import React, { useMemo } from "react";
import { Smile, Sparkles, Heart, Activity, CheckCircle, AlertCircle, HelpCircle } from "lucide-react";

interface SentimentToneDiagnosticProps {
  scriptText: string;
  targetTone: "Melancholic" | "Overthinking" | "Existential" | "Stoic" | "Golden-Sand Comfort";
}

export interface SentimentAnalysisResult {
  scores: {
    melancholic: number;
    overthinking: number;
    existential: number;
    stoic: number;
    cozy: number;
  };
  dominantTone: string;
  pithyDefinition: string;
}

export function analyzeScriptSentiment(text: string): SentimentAnalysisResult {
  if (!text) {
    return {
      scores: { melancholic: 20, overthinking: 20, existential: 20, stoic: 20, cozy: 20 },
      dominantTone: "Flat Uniform Resonance",
      pithyDefinition: "No prominent emotional frequency detected yet."
    };
  }

  const lowercase = text.toLowerCase();
  
  // Keyword dictionary
  const keywords = {
    melancholic: [
      "grief", "tears", "weight", "shadow", "lost", "memory", "silence", 
      "blue", "sad", "dark", "empty", "cold", "hollow", "sorrow", "mourn", 
      "ache", "lonely", "darkness", "forget", "haunt", "faded", "broken", "unhappy"
    ],
    overthinking: [
      "why", "think", "explain", "logic", "maze", "puzzle", "loop", 
      "brain", "thought", "calculate", "analytical", "pattern", "reason", 
      "analyze", "questions", "understanding", "doubt", "mind", "rationalize", 
      "obsess", "overthinking", "conundrum", "paralysis"
    ],
    existential: [
      "stars", "universe", "dust", "meaning", "void", "abyss", "cosmic", 
      "silent", "fleeting", "temporary", "death", "life", "insignificant", 
      "galaxy", "nothingness", "space", "existential", "purpose", "absurd", 
      "eternal", "unfathomable", "horizon"
    ],
    stoic: [
      "control", "release", "courage", "action", "stand", "stable", 
      "unmoving", "barrier", "endure", "fortress", "path", "strength", 
      "will", "acceptance", "clarity", "focus", "discipline", "stature", 
      "indifference", "rational", "observe", "calm"
    ],
    cozy: [
      "sand", "sun", "gold", "warm", "beach", "soft", "breeze", "wave", 
      "accept", "peace", "quiet", "gentle", "sleep", "rest", "comfort", 
      "ambient", "glow", "blanket", "hearth", "safe", "kindness", "shelter"
    ]
  };

  const counts = {
    melancholic: 0,
    overthinking: 0,
    existential: 0,
    stoic: 0,
    cozy: 0,
  };

  // Count matches
  Object.keys(keywords).forEach((key) => {
    const wordList = keywords[key as keyof typeof keywords];
    wordList.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowercase.match(regex);
      if (matches) {
        counts[key as keyof typeof counts] += matches.length;
      }
    });
  });

  const totalRaw = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  
  // Base floor offset for visualization aesthetic
  const scores = {
    melancholic: Math.min(100, Math.round((counts.melancholic / totalRaw) * 100) + 12),
    overthinking: Math.min(100, Math.round((counts.overthinking / totalRaw) * 100) + 14),
    existential: Math.min(100, Math.round((counts.existential / totalRaw) * 100) + 16),
    stoic: Math.min(100, Math.round((counts.stoic / totalRaw) * 100) + 10),
    cozy: Math.min(100, Math.round((counts.cozy / totalRaw) * 100) + 8),
  };

  const sum = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  const normalized = {
    melancholic: Math.round((scores.melancholic / sum) * 100),
    overthinking: Math.round((scores.overthinking / sum) * 100),
    existential: Math.round((scores.existential / sum) * 100),
    stoic: Math.round((scores.stoic / sum) * 100),
    cozy: Math.round((scores.cozy / sum) * 100),
  };

  const dominantKey = Object.keys(normalized).reduce((a, b) => 
    normalized[a as keyof typeof normalized] > normalized[b as keyof typeof normalized] ? a : b
  );

  let dominantTone = "";
  let pithyDefinition = "";

  if (dominantKey === "melancholic") {
    dominantTone = "High Melancholic Resonance";
    pithyDefinition = "Deeply elegiac and reflective, capturing the emotional gravity of forgotten human spaces.";
  } else if (dominantKey === "overthinking") {
    dominantTone = "Double-Edged Intellectual Agitation";
    pithyDefinition = "Highly analytical and meticulous, mirroring the cognitive loops of existential search.";
  } else if (dominantKey === "existential") {
    dominantTone = "Vast Existential Solitude";
    pithyDefinition = "Philosophically unanchored, framing human action against the grand majesty of cosmic scales.";
  } else if (dominantKey === "stoic") {
    dominantTone = "Fortified Stoic Resilience";
    pithyDefinition = "Centered, tranquil, and practical—focusing on clarity, endurance, and quiet acceptance.";
  } else {
    dominantTone = "Golden-Sand Comfort";
    pithyDefinition = "Providing a soft, amber-tinted reassurance of peace, acceptance, and gentle integration.";
  }

  return {
    scores: normalized,
    dominantTone,
    pithyDefinition
  };
}

export default function SentimentToneDiagnostic({ scriptText, targetTone }: SentimentToneDiagnosticProps) {
  const result = useMemo(() => analyzeScriptSentiment(scriptText), [scriptText]);

  // Check alignment
  const isAligned = useMemo(() => {
    const toneLower = targetTone.toLowerCase();
    const domLower = result.dominantTone.toLowerCase();

    if (toneLower.includes("melancholic") && domLower.includes("melancholic")) return true;
    if (toneLower.includes("overthinking") && domLower.includes("agitation")) return true;
    if (toneLower.includes("existential") && domLower.includes("solitude")) return true;
    if (toneLower.includes("stoic") && domLower.includes("resilience")) return true;
    if (toneLower.includes("comfort") && domLower.includes("comfort")) return true;
    return false;
  }, [targetTone, result.dominantTone]);

  return (
    <div className="bg-[#0a0a0a] border border-white/10 p-5 rounded-none flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <Activity className="h-4.5 w-4.5 text-white/50" />
        <div>
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block font-bold">Atmospheric Audit Panel</span>
          <h4 className="text-xs font-serif text-white tracking-wider uppercase font-semibold">Script Sentiment & Tone Diagnostic</h4>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        
        {/* Dominant tone badge & def */}
        <div className="bg-[#050505] border border-white/10 p-4 rounded-none flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Calculated Tone Score</span>
              <span className="text-sm font-serif italic text-[#E0D8D0] font-semibold mt-0.5">
                "{result.dominantTone}"
              </span>
            </div>

            {/* Target Tone Alignment Rating */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto uppercase tracking-widest font-mono text-[9px]">
              {isAligned ? (
                <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>ALIGNED WITH TARGET: {targetTone}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1" title="Neutral overlap. Ready for narrations.">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                  <span>BALANCED SPECTRUM (TARGET: {targetTone})</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-[#E0D8D0]/60 leading-relaxed font-sans mt-0.5">
            {result.pithyDefinition}
          </p>
        </div>

        {/* Individual bars list */}
        <div className="flex flex-col gap-3">
          <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Spectral Density breakdown</span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
            
            {/* Existentialism */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-white/40 uppercase tracking-wider">Existential Solitude</span>
                <span className="text-white">{result.scores.existential}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 border border-white/11 rounded-none overflow-hidden">
                <div className="h-full bg-white transition-all duration-500" style={{ width: `${result.scores.existential}%` }} />
              </div>
            </div>

            {/* Overthinking */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-white/40 uppercase tracking-wider">Intellectual Loop / Logic</span>
                <span className="text-white">{result.scores.overthinking}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 border border-white/11 rounded-none overflow-hidden">
                <div className="h-full bg-white/70 transition-all duration-500" style={{ width: `${result.scores.overthinking}%` }} />
              </div>
            </div>

            {/* Melancholy */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-white/40 uppercase tracking-wider">Elegiac Melancholy</span>
                <span className="text-white">{result.scores.melancholic}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 border border-white/11 rounded-none overflow-hidden">
                <div className="h-full bg-white/80 transition-all duration-500" style={{ width: `${result.scores.melancholic}%` }} />
              </div>
            </div>

            {/* Stoicism */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-white/40 uppercase tracking-wider">Stoic Self-Rule</span>
                <span className="text-white">{result.scores.stoic}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 border border-white/11 rounded-none overflow-hidden">
                <div className="h-full bg-white/50 transition-all duration-500" style={{ width: `${result.scores.stoic}%` }} />
              </div>
            </div>

            {/* Cozy Acceptance */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-white/40 uppercase tracking-wider">Quiet Accent / Comfort</span>
                <span className="text-white">{result.scores.cozy}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 border border-white/11 rounded-none overflow-hidden">
                <div className="h-full bg-white/30 transition-all duration-500" style={{ width: `${result.scores.cozy}%` }} />
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
