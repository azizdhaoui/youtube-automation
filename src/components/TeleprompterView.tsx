import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Type, ChevronUp, ChevronDown, Check, Columns, Clock, Mic } from "lucide-react";

interface TeleprompterViewProps {
  scriptText: string;
  activeSceneIdx?: number;
  voiceoverAlign?: boolean;
  onVoiceoverAlignToggle?: (align: boolean) => void;
}

export default function TeleprompterView({ 
  scriptText, 
  activeSceneIdx = 0, 
  voiceoverAlign = true, 
  onVoiceoverAlignToggle 
}: TeleprompterViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(130); // average narration speed
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg" | "xl">("lg");
  const [activeBlockIdx, setActiveBlockIdx] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Parse scriptText into readable paragraph chunks
  const paragraphs = React.useMemo(() => {
    return scriptText
      .split("###")
      .filter((block) => block.trim().length > 0)
      .map((block) => {
        const lines = block.trim().split("\n");
        const header = lines[0]?.trim() || "DIRECTIONS";
        const body = lines.slice(1).join("\n").trim();
        return { header, body };
      });
  }, [scriptText]);

  // Compute total word counts
  const wordCount = React.useMemo(() => {
    return scriptText.split(/\s+/).filter(Boolean).length;
  }, [scriptText]);

  // Estimate total read time
  const totalSeconds = Math.round((wordCount / wpm) * 60);
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Playback timer & scrolling logic
  useEffect(() => {
    if (!isPlaying) return;
    if (voiceoverAlign) return; // Driven by parent Video player sync instead!

    // Calculate duration for the active block based on word count
    const activeBlock = paragraphs[activeBlockIdx];
    if (!activeBlock) return;

    const blockWords = activeBlock.body.split(/\s+/).filter(Boolean).length || 10;
    // Seconds to read this block
    const blockDurationMs = (blockWords / wpm) * 60 * 1000;

    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= blockDurationMs) {
        // Increment block indexes
        if (activeBlockIdx < paragraphs.length - 1) {
          setActiveBlockIdx((prev) => prev + 1);
        } else {
          setIsPlaying(false); // Finished
          setActiveBlockIdx(0);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, activeBlockIdx, paragraphs, wpm]);

  // Handle active block auto-scrolling
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const activeEl = document.getElementById(`teleprompter-block-${activeBlockIdx}`);
    if (activeEl) {
      const containerHeight = scrollContainerRef.current.clientHeight;
      const elOffsetTop = activeEl.offsetTop;
      const elHeight = activeEl.clientHeight;

      // Scroll to center the dynamic element
      scrollContainerRef.current.scrollTo({
        top: elOffsetTop - containerHeight / 2 + elHeight / 2,
        behavior: "smooth",
      });
    }
  }, [activeBlockIdx]);

  // Sync teleprompter block with external active scene idx when alignment is on
  useEffect(() => {
    if (voiceoverAlign && typeof activeSceneIdx === "number") {
      if (activeSceneIdx >= 0 && activeSceneIdx < paragraphs.length) {
        setActiveBlockIdx(activeSceneIdx);
      }
    }
  }, [activeSceneIdx, voiceoverAlign, paragraphs.length]);

  const handleReset = () => {
    setIsPlaying(false);
    setActiveBlockIdx(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const increaseSpeed = () => setWpm((p) => Math.min(280, p + 10));
  const decreaseSpeed = () => setWpm((p) => Math.max(80, p - 10));

  const textClasses = {
    sm: "text-base md:text-lg leading-relaxed",
    md: "text-lg md:text-xl leading-relaxed",
    lg: "text-xl md:text-2xl leading-loose",
    xl: "text-2xl md:text-3.5xl leading-loose",
  }[fontSize];

  return (
    <div className="border border-white/10 bg-[#050505] overflow-hidden flex flex-col rounded-none">
      
      {/* Teleprompter Top Controller Deck */}
      <div className="bg-[#0a0a0a] border-b border-white/10 p-4 flex flex-wrap items-center justify-between gap-4">
        
        {/* Play/Pause/Rewind Indicators */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`cursor-pointer px-4 py-2 text-xs font-mono uppercase tracking-widest font-bold font-sans flex items-center gap-1.5 transition-all ${
              isPlaying 
                ? "bg-white text-black hover:bg-white/80" 
                : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-black stroke-none" />
                <span>PAUSE PROMPTER</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-white stroke-none" />
                <span>PLAY PROMPTER</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            title="Reset to beginning"
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 transition-all text-white/50 hover:text-white cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {onVoiceoverAlignToggle && (
            <button
              onClick={() => onVoiceoverAlignToggle(!voiceoverAlign)}
              className={`px-3.5 py-2 text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                voiceoverAlign 
                  ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 shadow-[0_0_8px_rgba(16,185,129,0.25)]" 
                  : "bg-white/5 text-white/40 hover:text-white border border-white/10"
              }`}
              title="Synchronize prompter automatically with active scene voiceover playing"
            >
              <Mic className="h-3.5 w-3.5 animate-pulse" />
              <span>Voiceover Sync: {voiceoverAlign ? "ON" : "OFF"}</span>
            </button>
          )}
        </div>

        {/* Speed controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block font-bold">WPM (Speed)</span>
          <div className="flex items-center bg-[#050505] border border-white/10 p-1">
            <button
              onClick={decreaseSpeed}
              disabled={wpm <= 80}
              className="p-1 text-white/60 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-mono font-bold px-2.5 min-w-[50px] text-center text-white">
              {wpm}
            </span>
            <button
              onClick={increaseSpeed}
              disabled={wpm >= 280}
              className="p-1 text-white/60 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Font styling scale */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block font-bold">Scale</span>
          <div className="flex bg-[#050505] border border-white/10 text-xs font-mono overflow-hidden">
            {(["sm", "md", "lg", "xl"] as const).map((sz) => (
              <button
                key={sz}
                onClick={() => setFontSize(sz)}
                className={`px-2.5 py-1 text-center transition-all uppercase ${
                  fontSize === sz 
                    ? "bg-white text-black font-bold font-sans" 
                    : "text-white/40 hover:text-white/80"
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Time statistics badge */}
        <div className="flex items-center gap-4 text-[10px] font-mono text-white/40">
          <div className="flex items-center gap-1.5 uppercase">
            <Clock className="h-3.5 w-3.5 text-white/30" />
            <span>EST READ: <span className="text-white font-bold">{formatTime(totalSeconds)}</span></span>
          </div>
        </div>

      </div>

      {/* Synchronized Prompter Display viewport */}
      <div className="relative h-[320px] bg-black">
        
        {/* Horizontal Red highlight focus rule guide helper */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-18 border-y border-[#ffffff]/10 bg-white/[0.02] pointer-events-none z-10 flex items-center justify-between px-4">
          <div className="w-1.5 h-1.5 bg-[#ffffff] rounded-full animate-ping" />
          <div className="w-1.5 h-1.5 bg-[#ffffff] rounded-full animate-ping" />
        </div>

        {/* Center line text scroll scrollbar container */}
        <div
          ref={scrollContainerRef}
          className="w-full h-full overflow-y-auto px-6 md:px-12 py-32 flex flex-col gap-12 select-none scrollbar-none"
        >
          {paragraphs.map((block, idx) => {
            const isActive = idx === activeBlockIdx;
            const isRead = idx < activeBlockIdx;

            return (
              <div
                key={idx}
                id={`teleprompter-block-${idx}`}
                onClick={() => setActiveBlockIdx(idx)}
                className={`transition-all duration-300 font-serif text-center cursor-pointer relative py-6 px-4 ${
                  isActive 
                    ? "text-[#fff] scale-[1.03] font-normal" 
                    : isRead 
                      ? "text-white/15 scale-[0.96]" 
                      : "text-white/30 scale-[0.98]"
                }`}
              >
                {/* Meta Indicator anchor section header */}
                <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-3 text-center transition-opacity ${
                  isActive ? "opacity-100 text-white/50" : "opacity-0"
                }`}>
                  ── {block.header} ──
                </div>

                {/* Body narration prompt */}
                <p className={`${textClasses} transition-all duration-300`}>
                  "{block.body}"
                </p>
              </div>
            );
          })}
        </div>

      </div>

      <div className="bg-[#0a0a0a] border-t border-white/10 px-5 py-3 flex items-center justify-between">
        <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest block">
          💡 Click any paragraph block to align promper scroll directly
        </span>
        <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest block font-bold">
          BLOCK: {activeBlockIdx + 1} / {paragraphs.length} ({(Math.round((activeBlockIdx + 1) / paragraphs.length * 100)) || 0}%)
        </span>
      </div>

    </div>
  );
}
