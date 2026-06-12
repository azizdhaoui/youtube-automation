import React, { useEffect, useRef, useState } from "react";
import { Play, Square, Volume2, Sparkles, VolumeX } from "lucide-react";

interface AudioEngineProps {
  activeMusicCategory?: string;
  selectedTone?: "Melancholic" | "Overthinking" | "Existential" | "Stoic" | "Golden-Sand Comfort";
}

export default function AudioEngine({ activeMusicCategory = "ambient piano", selectedTone = "Existential" }: AudioEngineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentToneName, setCurrentToneName] = useState("Silent Space");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to map selectedTone to root frequency note
  const getRootFrequency = (tone: string): number => {
    switch (tone) {
      case "Melancholic": return 110.00; // A2 (Pensive and reflective)
      case "Overthinking": return 146.83; // D3 (Restless analytical focus)
      case "Stoic": return 82.41; // E2 (Deep, solid foundation)
      case "Golden-Sand Comfort": return 130.81; // C3 (Warm major comfort)
      case "Existential":
      default:
        return 73.42; // D2 (Vast dark universe frequency)
    }
  };

  const startAmbientDrone = () => {
    try {
      // Create new AudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const baseFreq = getRootFrequency(selectedTone);
      const cat = activeMusicCategory.toLowerCase();

      // Clear any prior nodes to be completely safe
      oscillatorsRef.current = [];
      gainNodesRef.current = [];

      // Transition label
      let trackInfoLabel = "Cinematic Synth Drone";

      // 1. Setup fundamental drone based on musicCategory
      if (cat.includes("drones") || cat.includes("tension") || cat.includes("textures")) {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        osc1.type = cat.includes("tension") ? "sawtooth" : "sine";
        osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        gain1.gain.setValueAtTime(cat.includes("tension") ? 0.015 : 0.04, ctx.currentTime);

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime); // Perfect fifth chord factor
        gain2.gain.setValueAtTime(0.015, ctx.currentTime);

        // Connect
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc1.start();
        osc2.start();

        oscillatorsRef.current.push(osc1, osc2);
        gainNodesRef.current.push(gain1, gain2);
        trackInfoLabel = cat.includes("tension") ? "Subtle Tension (Deep Pulse & Saw)" : "Cosmic Drones & Low Harmonies";
      }

      // 2. Setup pinkroom ocean wind noise block for "atmospheric textures"
      if (cat.includes("textures") || cat.includes("strings")) {
        const bufferSize = ctx.sampleRate * 12;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut * 0.985 + white * 0.015);
          lastOut = output[i];
        }

        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.015, ctx.currentTime);

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = "lowpass";
        noiseFilter.frequency.setValueAtTime(280, ctx.currentTime);

        source.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        source.start();
        noiseSourceRef.current = source;
        gainNodesRef.current.push(noiseGain);
        trackInfoLabel = cat.includes("textures") ? "Atmospheric Room Wind & Dust" : "Lush Ambient Space Strings";
      }

      // 3. Periodic note triggers depending on category (Ambient Piano Plucks vs Strings Chord vs Tension ticks)
      const pianoNotes = [baseFreq * 2, baseFreq * 2.4, baseFreq * 3, baseFreq * 4, baseFreq * 4.8]; 
      
      const triggerTrackEvent = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === "suspended") return;
        const currentCtx = audioCtxRef.current;

        if (cat.includes("piano") || cat.includes("textures") || cat.includes("drones")) {
          // Play classic beautiful sparse minor/major ambient piano plucks
          const noteFreq = pianoNotes[Math.floor(Math.random() * pianoNotes.length)];
          const pluckOsc = currentCtx.createOscillator();
          const pluckGain = currentCtx.createGain();
          
          pluckOsc.type = "sine";
          pluckOsc.frequency.setValueAtTime(noteFreq, currentCtx.currentTime);
          
          pluckGain.gain.setValueAtTime(0, currentCtx.currentTime);
          pluckGain.gain.linearRampToValueAtTime(0.06, currentCtx.currentTime + 0.1);
          pluckGain.gain.exponentialRampToValueAtTime(0.0001, currentCtx.currentTime + 4.2);
          
          pluckOsc.connect(pluckGain);
          pluckGain.connect(currentCtx.destination);
          
          pluckOsc.start();
          pluckOsc.stop(currentCtx.currentTime + 4.5);

          const noteLabels: Record<string, string> = {
            "Melancholic": "Melancholy Introspection",
            "Overthinking": "Cognitive Rifts",
            "Existential": "Stellar Void Solace",
            "Stoic": "Stoical Acceptance Pulse",
            "Golden-Sand Comfort": "Golden Horizon Compassion"
          };
          setCurrentToneName(`${noteLabels[selectedTone] || "Introspective Tone"} (${Math.round(noteFreq)}Hz)`);
        } else if (cat.includes("tension")) {
          // Play fast ticking clockwork pulse
          const tickOsc = currentCtx.createOscillator();
          const tickGain = currentCtx.createGain();

          tickOsc.type = "triangle";
          tickOsc.frequency.setValueAtTime(baseFreq * 5, currentCtx.currentTime); // High tick pitch

          tickGain.gain.setValueAtTime(0, currentCtx.currentTime);
          tickGain.gain.linearRampToValueAtTime(0.012, currentCtx.currentTime + 0.02);
          tickGain.gain.exponentialRampToValueAtTime(0.0001, currentCtx.currentTime + 0.25);

          tickOsc.connect(tickGain);
          tickGain.connect(currentCtx.destination);
          
          tickOsc.start();
          tickOsc.stop(currentCtx.currentTime + 0.3);
          setCurrentToneName(`Subtle Tension (Nervous Pulsing: ${selectedTone})`);
        } else if (cat.includes("strings")) {
          // Lush warm string sweep chord notes
          const noteFreq1 = baseFreq * 2;
          const noteFreq2 = baseFreq * 2.5; // major or near minor third ratio
          
          const strOsc1 = currentCtx.createOscillator();
          const strOsc2 = currentCtx.createOscillator();
          const strGain = currentCtx.createGain();

          strOsc1.type = "triangle";
          strOsc1.frequency.setValueAtTime(noteFreq1, currentCtx.currentTime);

          strOsc2.type = "sine";
          strOsc2.frequency.setValueAtTime(noteFreq2, currentCtx.currentTime);

          // Warm lowpass strings filter
          const filter = currentCtx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(350, currentCtx.currentTime);

          strGain.gain.setValueAtTime(0, currentCtx.currentTime);
          strGain.gain.linearRampToValueAtTime(0.03, currentCtx.currentTime + 1.5); // long rise
          strGain.gain.linearRampToValueAtTime(0.0001, currentCtx.currentTime + 3.8); // long decay

          strOsc1.connect(filter);
          strOsc2.connect(filter);
          filter.connect(strGain);
          strGain.connect(currentCtx.destination);

          strOsc1.start();
          strOsc2.start();
          strOsc1.stop(currentCtx.currentTime + 4.0);
          strOsc2.stop(currentCtx.currentTime + 4.0);
          setCurrentToneName(`Strings Pad Suite: ${selectedTone}`);
        }
      };

      // Periodic trigger intervals depending on track category
      const triggerPeriod = cat.includes("tension") ? 900 : 3600; // Tension ticks much faster
      triggerTrackEvent();
      
      const interval = setInterval(triggerTrackEvent, triggerPeriod);
      intervalRef.current = interval;

      setIsPlaying(true);
      if (trackInfoLabel) {
        setCurrentToneName(`${trackInfoLabel} (${selectedTone})`);
      }
    } catch (err) {
      console.warn("Audio engine failed to boot due to user gesture requirement:", err);
    }
  };

  const stopAmbientDrone = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    oscillatorsRef.current.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    oscillatorsRef.current = [];
    gainNodesRef.current = [];
    
    if (noiseSourceRef.current) {
      try { noiseSourceRef.current.stop(); } catch(e){}
      noiseSourceRef.current = null;
    }

    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setIsPlaying(false);
    setCurrentToneName("Silent Space");
  };

  // Dynamically switch track layout parameters when scene category or tone changes in mid-air
  useEffect(() => {
    if (isPlaying) {
      // Re-trigger synthesis cleanly to match the newly active category
      stopAmbientDrone();
      startAmbientDrone();
    }
  }, [activeMusicCategory, selectedTone]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      oscillatorsRef.current.forEach(osc => {
        try { osc.stop(); } catch(e) {}
      });
      if (noiseSourceRef.current) {
        try { noiseSourceRef.current.stop(); } catch(e){}
      }
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  return (
    <div id="audio-engine-widget" className="bg-[#0a0a0a] border border-white/10 rounded-none p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isPlaying ? (
            <div className="flex items-center justify-center w-8 h-8 rounded-none border border-white/30 bg-white/5 text-white/90">
              <Volume2 className="h-4 w-4 animate-pulse" />
            </div>
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-none border border-white/10 bg-transparent text-white/30">
              <VolumeX className="h-4 w-4" />
            </div>
          )}
          <div>
            <span className="text-[9px] font-mono text-white/40 block tracking-[0.25em] uppercase">AUDIO TEXTURE SYSTEM</span>
            <span className="text-xs font-serif font-light text-white/90 block truncate max-w-[180px]">
              {currentToneName}
            </span>
          </div>
        </div>

        <button
          onClick={isPlaying ? stopAmbientDrone : startAmbientDrone}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-none text-[10px] uppercase tracking-widest font-mono transition-all ${
            isPlaying
              ? "bg-white/10 text-white border border-white/30 hover:bg-white/20"
              : "bg-transparent text-white/60 border border-white/20 hover:bg-white/5 hover:text-white"
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="h-3 w-3 fill-white" />
              <span>Silence</span>
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-white/60" />
              <span>Drone</span>
            </>
          )}
        </button>
      </div>

      <p className="text-[10px] text-white/40 leading-relaxed font-serif italic select-none">
        🎭 Generates low-frequency 55Hz rumbles and A-pentatonic minor bell notes locally via Web Audio API to match the melancholic YouTube essay tone. Recommended while reading scripts.
      </p>
    </div>
  );
}
