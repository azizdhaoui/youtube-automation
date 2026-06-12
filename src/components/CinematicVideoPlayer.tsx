import React, { useState, useEffect, useRef } from "react";
import { EdgeSpeechTTS } from "@lobehub/tts";
import { Scene } from "../types";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Film, 
  Eye, 
  Sliders, 
  Clapperboard, 
  Volume2, 
  VolumeX,
  Mic,
  AlertTriangle,
  Camera, 
  Expand, 
  Tv,
  Check,
  Sparkles,
  Download
} from "lucide-react";

interface CinematicVideoPlayerProps {
  scenes: Scene[];
  initialActiveIdx?: number;
  onSceneChange?: (idx: number) => void;
  consistencySettings?: {
    enabled: boolean;
    name: string;
    genderAppearance: string;
    physicalTraits: string;
    attire: string;
    artStyle: string;
  };
  selectedTone?: "Melancholic" | "Overthinking" | "Existential" | "Stoic" | "Golden-Sand Comfort";
  artDirectionSettings?: {
    enabled: boolean;
    aestheticRules: string;
  };
  autoPlay?: boolean;
}

export default function CinematicVideoPlayer({ 
  scenes, 
  initialActiveIdx = 0, 
  onSceneChange,
  consistencySettings,
  selectedTone,
  artDirectionSettings,
  autoPlay = false
}: CinematicVideoPlayerProps) {
  const [activeIdx, setActiveIdx] = useState(initialActiveIdx);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewGrainMode, setPreviewGrainMode] = useState(true);
  const [audioMuted, setAudioMuted] = useState(false);
  const [voiceSynthesizerEnabled, setVoiceSynthesizerEnabled] = useState(true);
  const [narratorType, setNarratorType] = useState<"server" | "browser">("server");
  const [progress, setProgress] = useState(0); // 0 to 100 for current scene
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [downloadingTts, setDownloadingTts] = useState(false);

  const narratorAudioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const edgeSpeechRef = useRef<EdgeSpeechTTS | null>(null);

  const stopServerNarrator = () => {
    if (narratorAudioRef.current) {
      narratorAudioRef.current.pause();
      narratorAudioRef.current.onended = null;
      narratorAudioRef.current.onerror = null;
    }
  };

  const downloadCurrentTts = async () => {
    if (!activeScene) return;
    setDownloadingTts(true);
    try {
      // Short voice feedback using window.speechSynthesis to show Web Speech API integration
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const whisper = new SpeechSynthesisUtterance("Exporting narrator track");
          whisper.volume = 0.45;
          whisper.rate = 1.1;
          whisper.lang = "en-US";
          window.speechSynthesis.speak(whisper);
        } catch (ttsErr) {
          console.warn("Browser SpeechSynthesis feedback blocked or unsupported during export", ttsErr);
        }
      }

      let blob: Blob;
      try {
        if (!edgeSpeechRef.current) {
          edgeSpeechRef.current = new EdgeSpeechTTS();
        }
        console.log("[Client TTS] Synthesizing download track client-side...");
        const response = await edgeSpeechRef.current.create({
          input: activeScene.voiceoverText,
          options: {
            voice: "en-GB-RyanNeural"
          }
        });
        const ab = await response.arrayBuffer();
        blob = new Blob([ab], { type: "audio/mpeg" });
      } catch (clientErr) {
        console.warn("[Client TTS] Client-side direct synthesis for download failed, using server fallback:", clientErr);
        const response = await fetch(`/api/tts?text=${encodeURIComponent(activeScene.voiceoverText)}`);
        if (!response.ok) {
          throw new Error("Unable to synthesize audio. Please try again.");
        }
        blob = await response.blob();
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `voiceover-scene-${activeIdx + 1}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error("Synthesizer export failed", error);
      alert(error.message || "An issue occurred while generating the audio file.");
    } finally {
      setDownloadingTts(false);
    }
  };

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<{
    osc1?: OscillatorNode;
    osc2?: OscillatorNode;
    gainNode?: GainNode;
    noiseNode?: AudioBufferSourceNode;
    filterNode?: BiquadFilterNode;
    sequencerTimer?: NodeJS.Timeout;
    additionalOscs?: OscillatorNode[];
    additionalGains?: GainNode[];
  }>({});

  // Sync index externally if needed
  useEffect(() => {
    setActiveIdx(initialActiveIdx);
    setProgress(0);
  }, [initialActiveIdx]);

  // Handle autoPlay toggle to play-on-load
  useEffect(() => {
    if (autoPlay && scenes && scenes.length > 0) {
      setIsPlaying(true);
    }
  }, [autoPlay, scenes]);

  const activeScene = scenes[activeIdx] || null;

  const [fadeActiveScene, setFadeActiveScene] = useState<Scene | null>(activeScene);
  const [fadePriorScene, setFadePriorScene] = useState<Scene | null>(null);
  const [fadeTrigger, setFadeTrigger] = useState(true);

  useEffect(() => {
    if (activeScene) {
      if (fadeActiveScene && fadeActiveScene.number !== activeScene.number) {
        setFadePriorScene(fadeActiveScene);
        setFadeActiveScene(activeScene);
        setFadeTrigger(false);
        const raf = requestAnimationFrame(() => {
          setFadeTrigger(true);
        });
        const timer = setTimeout(() => {
          setFadePriorScene(null);
        }, 1000); // clear after fade out (duration-1000 matches our fade duration)
        return () => {
          cancelAnimationFrame(raf);
          clearTimeout(timer);
        };
      } else {
        setFadeActiveScene(activeScene);
        setFadeTrigger(true);
      }
    }
  }, [activeIdx, scenes]);

  const getIntensityScore = (scene: Scene): number => {
    if (!scene) return 50;
    const sec = (scene.section || "").toUpperCase();
    const emo = (scene.emotion || "").toLowerCase();

    if (sec.includes("HOOK")) return 80;
    if (sec.includes("MIRROR")) return 65;
    if (sec.includes("EXPANSION") || sec.includes("PROBLEM") || emo.includes("friction") || emo.includes("crisis") || emo.includes("dread")) return 92;
    if (sec.includes("ANALYSIS") || sec.includes("COGNITIVE")) return 55;
    if (sec.includes("PHILOSOPHICAL") || sec.includes("LAYER") || emo.includes("calm") || emo.includes("peace") || emo.includes("comfort")) return 40;
    if (sec.includes("ENDING") || sec.includes("RESOLUTION") || sec.includes("RELEASE")) return 85;

    // Fallback based on keywords or string length hash
    let hash = 0;
    for (let i = 0; i < emo.length; i++) {
      hash = emo.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 45 + Math.abs(hash % 45); // deterministic between [45 - 90]
  };

  // Load standard system voices on mount (strictly filtering for English)
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const getVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Prefer English-based narrators for consistent playback
        const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith("en"));
        setAvailableVoices(englishVoices);
        
        // Pick custom deep voice if available
        const defaultVoice = englishVoices.find(v => 
          v.name.includes("Google US English") || 
          v.name.includes("David") || 
          v.name.includes("Natural") || 
          v.name.toLowerCase().includes("english")
        ) || englishVoices[0];
        
        if (defaultVoice) {
          setSelectedVoiceName(defaultVoice.name);
        }
      };

      getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = getVoices;
      }
    }
  }, []);

  // Web Audio Synthesizer: custom deep drone and ambient background music tailored of the scene & tone
  const startAmbientSynth = (category: string) => {
    if (audioMuted) {
      stopAmbientSynth();
      return;
    }

    try {
      if (typeof window === "undefined") return;
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Safeguard: Stop previous waves first
      stopAmbientSynth();

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.2); // Soft overall music level
      gainNode.connect(ctx.destination);

      synthNodesRef.current.gainNode = gainNode;
      synthNodesRef.current.additionalOscs = [];
      synthNodesRef.current.additionalGains = [];

      const categoryLower = category.toLowerCase();
      const activeTone = selectedTone || "Existential";

      // 1. Core Background Noise floor (Rain, wind, cosmic dust)
      if (categoryLower.includes("rain") || categoryLower.includes("wind") || categoryLower.includes("cozy") || activeTone === "Existential") {
        const bufferSize = ctx.sampleRate * 25;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          // Pink-ish soft room rumble filters
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut * 0.98 + white * 0.02);
          lastOut = output[i];
        }

        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        // Warm ocean drift filter cutoff based on tone
        const cutoff = activeTone === "Golden-Sand Comfort" ? 500 : 350;
        filter.frequency.setValueAtTime(cutoff, ctx.currentTime);
        filter.Q.setValueAtTime(1.0, ctx.currentTime);

        source.connect(filter);
        filter.connect(gainNode);
        source.start();

        synthNodesRef.current.noiseNode = source;
        synthNodesRef.current.filterNode = filter;
      }

      // 2. Play continuous atmospheric drone foundation (A root note and fifth/octave chord)
      const getRootFreq = (tone: string) => {
        switch (tone) {
          case "Melancholic": return 110.0; // A2 (Pensive minor)
          case "Overthinking": return 146.83; // D3 (Nervous high focus)
          case "Stoic": return 82.41; // E2 (Deep, solid low bar)
          case "Golden-Sand Comfort": return 130.81; // C3 (Warm, comfortable grounding)
          case "Existential":
          default:
            return 73.42; // D2 (Vast cosmic dark)
        }
      };

      const rootFreq = getRootFreq(activeTone);

      // Oscillators for fundamental pad
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      osc1.frequency.setValueAtTime(rootFreq, ctx.currentTime);
      // Beautiful detuned second oscillator for a thick stereophonic chorus
      osc2.frequency.setValueAtTime(rootFreq * 1.004, ctx.currentTime);

      if (activeTone === "Stoic") {
        osc1.type = "sine";
        osc2.type = "triangle";
        // Stoical constant fifth note
        const osc5th = ctx.createOscillator();
        osc5th.type = "sine";
        osc5th.frequency.setValueAtTime(rootFreq * 1.5, ctx.currentTime);
        
        const g5th = ctx.createGain();
        g5th.gain.setValueAtTime(0.02, ctx.currentTime);
        osc5th.connect(g5th);
        g5th.connect(gainNode);
        osc5th.start();
        synthNodesRef.current.additionalOscs.push(osc5th);
      } else if (activeTone === "Melancholic") {
        osc1.type = "triangle";
        osc2.type = "sine";
        // Minor third representing weeping soul
        const osc3rd = ctx.createOscillator();
        osc3rd.type = "sine";
        osc3rd.frequency.setValueAtTime(rootFreq * 1.189, ctx.currentTime); // minor third
        
        const g3rd = ctx.createGain();
        g3rd.gain.setValueAtTime(0.015, ctx.currentTime);
        osc3rd.connect(g3rd);
        g3rd.connect(gainNode);
        osc3rd.start();
        synthNodesRef.current.additionalOscs.push(osc3rd);
      } else if (activeTone === "Golden-Sand Comfort") {
        osc1.type = "sine";
        osc2.type = "sine";
        // Warm major third and major fifth waves
        const oscMaj = ctx.createOscillator();
        oscMaj.type = "sine";
        oscMaj.frequency.setValueAtTime(rootFreq * 1.25, ctx.currentTime); // Major 3rd
        
        const oscOct = ctx.createOscillator();
        oscOct.type = "sine";
        oscOct.frequency.setValueAtTime(rootFreq * 2.0, ctx.currentTime); // octave
        
        const gWarm = ctx.createGain();
        gWarm.gain.setValueAtTime(0.02, ctx.currentTime);
        
        oscMaj.connect(gWarm);
        oscOct.connect(gWarm);
        gWarm.connect(gainNode);
        
        oscMaj.start();
        oscOct.start();
        
        synthNodesRef.current.additionalOscs.push(oscMaj);
        synthNodesRef.current.additionalOscs.push(oscOct);
      } else {
        osc1.type = "sine";
        osc2.type = "sine";
      }

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      osc1.start();
      osc2.start();

      synthNodesRef.current.osc1 = osc1;
      synthNodesRef.current.osc2 = osc2;

      // 3. Ambient Sequencer / Pulse Track - Plays beautiful cinematic notes periodically
      let noteIndex = 0;
      let notes: number[] = [];

      if (activeTone === "Overthinking") {
        // High, nervous, beautiful analytical ticking notes
        notes = [rootFreq * 2, rootFreq * 2.25, rootFreq * 2.5, rootFreq * 3, rootFreq * 3.37];
        const seqTimer = setInterval(() => {
          if (ctx.state === "closed" || audioMuted) return;
          
          const pitch = notes[noteIndex % notes.length];
          noteIndex++;

          // Synthesize short high bell/pluck note
          const synthOsc = ctx.createOscillator();
          const synthGain = ctx.createGain();

          synthOsc.type = "triangle";
          synthOsc.frequency.setValueAtTime(pitch, ctx.currentTime);

          synthGain.gain.setValueAtTime(0, ctx.currentTime);
          synthGain.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 0.05);
          synthGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);

          synthOsc.connect(synthGain);
          synthGain.connect(gainNode);

          synthOsc.start();
          setTimeout(() => {
            try { synthOsc.stop(); } catch(e){}
            synthOsc.disconnect();
            synthGain.disconnect();
          }, 800);

        }, 420); // Fast tempo logic sequence

        synthNodesRef.current.sequencerTimer = seqTimer;

      } else if (activeTone === "Melancholic") {
        // Sad weeping slow cello notes
        notes = [rootFreq * 1.5, rootFreq * 1.189, rootFreq * 1.334, rootFreq * 1.5, rootFreq * 1.782];
        const seqTimer = setInterval(() => {
          if (ctx.state === "closed" || audioMuted) return;
          
          const pitch = notes[Math.floor(Math.random() * notes.length)];

          const synthOsc = ctx.createOscillator();
          const synthGain = ctx.createGain();

          synthOsc.type = "sawtooth"; // Cello texture
          synthOsc.frequency.setValueAtTime(pitch, ctx.currentTime);

          // Cello Low Pass Filter
          const celloFilter = ctx.createBiquadFilter();
          celloFilter.type = "lowpass";
          celloFilter.frequency.setValueAtTime(250, ctx.currentTime);

          // Slow swell
          synthGain.gain.setValueAtTime(0, ctx.currentTime);
          synthGain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 1.5);
          synthGain.gain.linearRampToValueAtTime(0.00001, ctx.currentTime + 3.8);

          synthOsc.connect(celloFilter);
          celloFilter.connect(synthGain);
          synthGain.connect(gainNode);

          synthOsc.start();
          setTimeout(() => {
            try { synthOsc.stop(); } catch(e){}
            synthOsc.disconnect();
            celloFilter.disconnect();
            synthGain.disconnect();
          }, 4500);

        }, 3000); // Very slow tempo melancholic breath

        synthNodesRef.current.sequencerTimer = seqTimer;

      } else if (activeTone === "Golden-Sand Comfort") {
        // Comforting, flowing wave of warmth
        notes = [rootFreq * 2.0, rootFreq * 2.5, rootFreq * 1.5, rootFreq * 3.0];
        const seqTimer = setInterval(() => {
          if (ctx.state === "closed" || audioMuted) return;
          
          const pitch = notes[noteIndex % notes.length];
          noteIndex++;

          const synthOsc = ctx.createOscillator();
          const synthGain = ctx.createGain();

          synthOsc.type = "sine";
          synthOsc.frequency.setValueAtTime(pitch, ctx.currentTime);

          // Warm soft swell
          synthGain.gain.setValueAtTime(0, ctx.currentTime);
          synthGain.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 1.2);
          synthGain.gain.linearRampToValueAtTime(0.00001, ctx.currentTime + 2.8);

          synthOsc.connect(synthGain);
          synthGain.connect(gainNode);

          synthOsc.start();
          setTimeout(() => {
            try { synthOsc.stop(); } catch(e){}
            synthOsc.disconnect();
            synthGain.disconnect();
          }, 3500);

        }, 2200);

        synthNodesRef.current.sequencerTimer = seqTimer;

      } else if (activeTone === "Existential") {
        // Stellar twinkling space dust
        const seqTimer = setInterval(() => {
          if (ctx.state === "closed" || audioMuted) return;
          
          // twinkle pitch
          const pitch = 600 + Math.random() * 800;

          const synthOsc = ctx.createOscillator();
          const synthGain = ctx.createGain();

          synthOsc.type = "sine";
          synthOsc.frequency.setValueAtTime(pitch, ctx.currentTime);

          synthGain.gain.setValueAtTime(0, ctx.currentTime);
          synthGain.gain.linearRampToValueAtTime(0.008, ctx.currentTime + 0.1);
          synthGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);

          synthOsc.connect(synthGain);
          synthGain.connect(gainNode);

          synthOsc.start();
          setTimeout(() => {
            try { synthOsc.stop(); } catch(e){}
            synthOsc.disconnect();
            synthGain.disconnect();
          }, 1800);

        }, 1800);

        synthNodesRef.current.sequencerTimer = seqTimer;
      }

    } catch (err) {
      console.warn("Failed to spin up organic movie audio generator:", err);
    }
  };

  const stopAmbientSynth = () => {
    try {
      const nodes = synthNodesRef.current;
      if (nodes.sequencerTimer) {
        clearInterval(nodes.sequencerTimer);
      }
      if (nodes.osc1) {
        try { nodes.osc1.stop(); } catch(e){}
        nodes.osc1.disconnect();
      }
      if (nodes.osc2) {
        try { nodes.osc2.stop(); } catch(e){}
        nodes.osc2.disconnect();
      }
      if (nodes.noiseNode) {
        try { nodes.noiseNode.stop(); } catch(e){}
        nodes.noiseNode.disconnect();
      }
      if (nodes.additionalOscs) {
        nodes.additionalOscs.forEach(o => {
          try { o.stop(); } catch(e){}
          o.disconnect();
        });
      }
      if (nodes.additionalGains) {
        nodes.additionalGains.forEach(g => g.disconnect());
      }
      if (nodes.gainNode) {
        nodes.gainNode.disconnect();
      }
      synthNodesRef.current = {};
    } catch (e) {
      console.warn("Synthesizer shutdown mismatch", e);
    }
  };

  // HTML5 Speech Synthesis or High-Fi Server Audio: Speaks out the current voiceover script
  const playSpeechVoiceov = (text: string) => {
    stopServerNarrator();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn("speechSynthesis.cancel failed during initiation", err);
      }
    }
    
    if (!voiceSynthesizerEnabled) return;

    if (narratorType === "server") {
      // Create or reuse Audio element
      if (!narratorAudioRef.current) {
        narratorAudioRef.current = new Audio();
      }
      const audio = narratorAudioRef.current;
      audio.volume = audioMuted ? 0 : 0.95;
      audio.playbackRate = 0.9; // Majestic contemplative pace matching default rate
      
      audio.onended = () => {
        if (isPlaying) {
          setTimeout(() => {
            if (activeIdx < scenes.length - 1) {
              const next = activeIdx + 1;
              setActiveIdx(next);
              setProgress(0);
              if (onSceneChange) onSceneChange(next);
            } else {
              setIsPlaying(false);
              setProgress(100);
            }
          }, 800); // Cinematic breath pause
        }
      };

      audio.onerror = (e) => {
        console.warn("Server TTS playback had an issue, falling back to browser synthesis:", e);
        // Soft fallback if server stream has issues (e.g. offline/network)
        setNarratorType("browser");
      };

      // Instantly play via client-side edge-tts websocket, falling back to server route ONLY on failure
      const playTtsDirect = async () => {
        try {
          if (!edgeSpeechRef.current) {
            edgeSpeechRef.current = new EdgeSpeechTTS();
          }
          console.log("[Client TTS] Synthesizing speech via direct browser ws connection...");
          const response = await edgeSpeechRef.current.create({
            input: text,
            options: {
              voice: "en-GB-RyanNeural"
            }
          });
          const arrayBuffer = await response.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
          const blobUrl = URL.createObjectURL(blob);
          audio.src = blobUrl;
          await audio.play();
          console.log("[Client TTS] Successfully playing direct browser synthesis.");
        } catch (clientErr) {
          console.warn("[Client TTS] Client-side direct synthesis failed, reverting to server-side fallback proxy:", clientErr);
          audio.src = `/api/tts?text=${encodeURIComponent(text)}`;
          audio.play().catch(err => {
            console.warn("Auto-play blocked or backend audio fetch interrupted:", err);
          });
        }
      };

      playTtsDirect();
    } else {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance; // Keep strong reference so Chrome doesn't garbage-collect it mid-speech!
      
      // Explicitly enforce English as default language to prevent foreign accent reading
      utterance.lang = "en-US";
      
      // Assign selected voice
      if (selectedVoiceName) {
        const liveVoice = window.speechSynthesis.getVoices().find(v => v.name === selectedVoiceName);
        if (liveVoice) {
          utterance.voice = liveVoice;
          utterance.lang = liveVoice.lang;
        }
      }

      utterance.volume = audioMuted ? 0 : 0.95;
      utterance.rate = 0.88; // Majestic contemplative pace
      utterance.pitch = 0.92; // Deep timbre resonance

      utterance.onend = () => {
        // Speech finished. If playing, trigger automatic step forward safely
        if (isPlaying) {
          setTimeout(() => {
            if (activeIdx < scenes.length - 1) {
              const next = activeIdx + 1;
              setActiveIdx(next);
              setProgress(0);
              if (onSceneChange) onSceneChange(next);
            } else {
              setIsPlaying(false);
              setProgress(100);
            }
          }, 500); // Cinematic breath pause
        }
      };

      utterance.onerror = (e) => {
        console.warn("Speech playback finished or interrupted:", e.error);
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("speechSynthesis-speak failed, falling back to Server synthesis", err);
        setNarratorType("server");
      }
    }
  };

  // Sync volume of server narrator if mutated
  useEffect(() => {
    if (narratorAudioRef.current) {
      narratorAudioRef.current.volume = audioMuted ? 0 : 0.95;
    }
  }, [audioMuted]);

  // Handle synchronized speech starts, synth background triggers, and state resets
  useEffect(() => {
    if (isPlaying && activeScene) {
      playSpeechVoiceov(activeScene.voiceoverText);
      startAmbientSynth(activeScene.musicCategory);
    } else {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (err) {
          console.warn("speechSynthesis.cancel failed", err);
        }
      }
      stopServerNarrator();
      stopAmbientSynth();
    }

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (err) {
          console.warn("speechSynthesis.cancel failed inside cleanup", err);
        }
      }
      stopServerNarrator();
      stopAmbientSynth();
    };
  }, [isPlaying, activeIdx, voiceSynthesizerEnabled, audioMuted, selectedVoiceName, narratorType]);

  // Synchronized scene advancement when progress hits 100% and voice synthesizer is disabled
  useEffect(() => {
    if (isPlaying && progress >= 100 && !voiceSynthesizerEnabled) {
      if (activeIdx < scenes.length - 1) {
        const nextIdx = activeIdx + 1;
        setActiveIdx(nextIdx);
        setProgress(0);
        if (onSceneChange) onSceneChange(nextIdx);
      } else {
        setIsPlaying(false);
      }
    }
  }, [progress, isPlaying, voiceSynthesizerEnabled, activeIdx, scenes, onSceneChange]);

  // Handle automatic progress slider rendering
  useEffect(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (!isPlaying || !activeScene) return;

    // Estimate speaking/gaze duration for progress interval sequence (min 4.2 seconds)
    const estimateDurationMs = Math.max(activeScene.voiceoverText.length * 68 + 1500, 4200);
    const stepMs = 50;
    const increment = (stepMs / estimateDurationMs) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 100;
        }
        return Math.min(100, prev + increment);
      });
    }, stepMs);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, activeIdx, scenes, activeScene, voiceSynthesizerEnabled]);

  const handlePlayToggle = () => {
    if (activeIdx >= scenes.length - 1 && progress >= 100) {
      // Re-initialize from beginning
      setActiveIdx(0);
      setProgress(0);
      if (onSceneChange) onSceneChange(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setActiveIdx(0);
    setProgress(0);
    if (onSceneChange) onSceneChange(0);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn("speechSynthesis.cancel failed inside reset", err);
      }
    }
    stopAmbientSynth();
  };

  const selectScene = (idx: number) => {
    setActiveIdx(idx);
    setProgress(0);
    if (onSceneChange) onSceneChange(idx);
  };

  // Generate dynamic seed based description vector visual
  const renderSceneSymbol = (number: number) => {
    const strokeColor = previewGrainMode ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.25)";
    const highlightColor = previewGrainMode ? "#ffffff" : "#e0d8d0";

    switch (number % 5) {
      case 1:
        return (
          <svg className="w-28 h-28 stroke-[1] fill-none" viewBox="0 0 100 100">
            {/* Melting existential hourglass & stars */}
            <path d="M30,20 L70,20 M30,80 L70,80" stroke={strokeColor} />
            <path d="M35,20 C35,45 48,50 48,50 C48,50 65,45 65,20" stroke={strokeColor} />
            <path d="M35,80 C35,55 48,50 48,50 C48,50 65,55 65,80" stroke={strokeColor} />
            <path d="M47,50 L53,50" stroke={highlightColor} strokeWidth="2" />
            <circle cx="50" cy="35" r="3" fill="#ffffff" className="animate-pulse" />
            {/* Dripping single sand drops */}
            <circle cx="50" cy="55" r="1.5" fill={highlightColor} className="animate-ping" />
            <line x1="50" y1="52" x2="50" y2="72" stroke={strokeColor} strokeDasharray="1,3" />
            {/* Little stars floating */}
            <path d="M20,35 L22,35 M21,34 L21,36 M80,25 L82,25 M81,24 L81,26" stroke="#ffffff" />
            <circle cx="21" cy="35" r="0.5" fill="#fff" />
            <circle cx="81" cy="25" r="0.5" fill="#fff" />
          </svg>
        );
      case 2:
        return (
          <svg className="w-28 h-28 stroke-[1] fill-none" viewBox="0 0 100 100">
            {/* Shattered circular mirror lens / cosmic loop */}
            <circle cx="50" cy="50" r="35" stroke={strokeColor} strokeDasharray="3,2" />
            <circle cx="50" cy="50" r="28" stroke={strokeColor} />
            {/* Breakage fracture lines */}
            <path d="M50,50 L25,30 M50,50 L78,28 M50,50 L60,82 M50,50 L30,70" stroke={strokeColor} strokeWidth="0.7" />
            <circle cx="50" cy="50" r="5" stroke={highlightColor} fill="#050505" strokeWidth="1.5" />
            {/* Distant planet halo */}
            <ellipse cx="50" cy="50" rx="42" ry="12" stroke={strokeColor} transform="rotate(-15, 50, 50)" strokeWidth="0.8" />
          </svg>
        );
      case 3:
        return (
          <svg className="w-28 h-28 stroke-[1] fill-none" viewBox="0 0 100 100">
            {/* Monolith floating above desert waves */}
            <path d="M40,20 L60,25 L60,70 L40,65 Z" stroke={highlightColor} strokeWidth="1.5" fill="rgba(255,255,255,0.03)" />
            <path d="M40,20 L40,65 Q50,70 60,70" stroke={strokeColor} />
            {/* Desert ground lines */}
            <path d="M15,75 Q35,65 55,75 T95,75" stroke={strokeColor} />
            <path d="M10,83 Q40,75 70,83 T100,83" stroke={strokeColor} strokeDasharray="2,2" />
            {/* Radiant sun glowing behind */}
            <circle cx="50" cy="38" r="10" stroke={strokeColor} strokeDasharray="1,4" />
          </svg>
        );
      case 4:
        return (
          <svg className="w-28 h-28 stroke-[1] fill-none" viewBox="0 0 100 100">
            {/* Abstract architectural ladders into the void */}
            <line x1="25" y1="15" x2="25" y2="85" stroke={strokeColor} />
            <line x1="25" y1="30" x2="45" y2="30" stroke={strokeColor} />
            <line x1="25" y1="50" x2="45" y2="50" stroke={strokeColor} />
            <line x1="25" y1="70" x2="45" y2="70" stroke={strokeColor} />
            
            <line x1="45" y1="20" x2="45" y2="90" stroke={strokeColor} />
            <line x1="45" y1="35" x2="70" y2="35" stroke={strokeColor} />
            <line x1="45" y1="55" x2="70" y2="55" stroke={strokeColor} />
            
            <circle cx="58" cy="45" r="4" stroke={highlightColor} className="animate-ping" />
            <circle cx="58" cy="45" r="2.5" fill="#fff" />
            <path d="M15,85 L85,85" stroke={strokeColor} strokeWidth="2" />
          </svg>
        );
      default:
        return (
          <svg className="w-28 h-28 stroke-[1] fill-none" viewBox="0 0 100 100">
            {/* Lonely figure standing under a giant looming astronomical orb */}
            <circle cx="50" cy="35" r="18" stroke={strokeColor} />
            <circle cx="50" cy="35" r="14" stroke={strokeColor} strokeDasharray="4,2" />
            <circle cx="50" cy="35" r="5" stroke={highlightColor} strokeWidth="1.5" />
            {/* Ground */}
            <path d="M20,80 C40,75 60,85 80,80" stroke={strokeColor} strokeWidth="1.2" />
            {/* Tiny vertical line figure */}
            <line x1="50" y1="70" x2="50" y2="80" stroke="#fff" strokeWidth="1.5" />
            <circle cx="50" cy="68" r="1" fill="#fff" />
          </svg>
        );
    }
  };

  const [isTransitioning, setIsTransitioning] = useState(false);
  useEffect(() => {
    setIsTransitioning(true);
    const t = setTimeout(() => {
      setIsTransitioning(false);
    }, 2500); // Trigger Ken Burns on scene switch for 2.5s
    return () => clearTimeout(t);
  }, [activeIdx]);

  const getCameraAnimationClass = () => {
    if (!isPlaying) return "";
    if (isTransitioning) {
      return "animate-cinematic-ken-burns";
    }
    const move = (activeScene?.cameraMovement || "").toLowerCase();
    if (move.includes("zoom-in") || move.includes("push") || move.includes("zoom in") || move.includes("forward")) {
      return "animate-cinematic-zoom-in";
    }
    if (move.includes("zoom-out") || move.includes("zoom out") || move.includes("pull") || move.includes("backward")) {
      return "animate-cinematic-zoom-out";
    }
    if (move.includes("pan left") || move.includes("glide left") || move.includes("track left")) {
      return "animate-cinematic-pan-left";
    }
    if (move.includes("pan right") || move.includes("glide right") || move.includes("track right") || move.includes("pan across")) {
      return "animate-cinematic-pan-right";
    }
    if (move.includes("tilt up") || move.includes("crane up") || move.includes("tilt-up")) {
      return "animate-cinematic-tilt-up";
    }
    if (move.includes("tilt down") || move.includes("crane down") || move.includes("tilt-down")) {
      return "animate-cinematic-tilt-down";
    }
    return "animate-cinematic-ken-burns";
  };

  const renderAmbientParticles = () => {
    const tone = selectedTone || "Existential";
    if (tone === "Melancholic") {
      return (
        <div className="absolute inset-0 pointer-events-none z-5 overflow-hidden">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-white/20 w-[1px] h-[12px] rain-drop"
              style={{
                left: `${(i * 7) + 2 + Math.sin(i) * 3}%`,
                top: `${Math.random() * -30}%`,
                animationDelay: `${i * 0.15}s`,
                animationDuration: `${1.2 + Math.random() * 0.8}s`,
              }}
            />
          ))}
        </div>
      );
    }
    if (tone === "Overthinking") {
      return (
        <div className="absolute inset-0 pointer-events-none z-5 overflow-hidden">
          <div 
            className="absolute inset-0 border border-white/5 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:30px_30px] opacity-40"
            style={{ animation: "matrix-grid-slide 10s ease-in-out infinite alternate" }}
          />
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute font-mono text-[7px] text-[#ffffff]/25 uppercase tracking-widest whitespace-nowrap"
              style={{
                left: `${10 + i * 18}%`,
                top: `${15 + (i * 14) % 60}%`,
                opacity: 0.15 + Math.random() * 0.2,
                transform: `rotate(${Math.sin(i) * 3}deg)`
              }}
            >
              LOC: {(1204 * (i + 1)) % 10000} // ANL_CH_{i * 8}
            </div>
          ))}
        </div>
      );
    }
    if (tone === "Existential") {
      return (
        <div className="absolute inset-0 pointer-events-none z-5 overflow-hidden">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full stellar-particle"
              style={{
                left: `${15 + (i * 8) + (Math.sin(i) * 3)}%`,
                top: `${15 + (i * 6) % 70}%`,
                width: `${1.5 + (i % 3)}px`,
                height: `${1.5 + (i % 3)}px`,
                animationDelay: `${i * 0.35}s`,
                animationDuration: `${6 + i * 0.6}s`,
              }}
            />
          ))}
        </div>
      );
    }
    if (tone === "Golden-Sand Comfort") {
      return (
        <div className="absolute inset-0 pointer-events-none z-5 overflow-hidden">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-amber-400 rounded-full amber-ember shadow-[0_0_6px_rgba(251,191,36,0.6)]"
              style={{
                left: `${6 + (i * 6) + Math.random() * 4}%`,
                bottom: `${Math.random() * -30}%`,
                width: `${1.5 + (i % 2) * 1.5}px`,
                height: `${1.5 + (i % 2) * 1.5}px`,
                animationDelay: `${i * 0.25}s`,
                animationDuration: `${4 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="absolute inset-0 pointer-events-none z-5 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-gradient-to-t from-white/0 via-white/[0.025] to-white/0 w-[45px] h-full"
            style={{
              left: `${15 + i * 24 + ((i * 7) % 5)}%`,
              opacity: 0.2,
              transform: `translateX(${Math.sin(i) * 10}px)`,
              transition: "transform 12s ease-in-out",
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/10 p-5 rounded-none flex flex-col gap-4 relative">
      
      {/* Dynamic Keyframe Injection for Live Film Grain, Camera Motion, and Jitter */}
      <style>{`
        @keyframes custom-noise-grain {
          0%, 100% { transform:translate(0, 0); }
          10% { transform:translate(-1%, -1.5%); }
          30% { transform:translate(-2.5%, 1%); }
          50% { transform:translate(1%, -2.5%); }
          70% { transform:translate(-1.5%, 1.8%); }
          90% { transform:translate(2%, -1%); }
        }
        @keyframes custom-flicker {
          0%, 100% { opacity: 0.28; }
          25% { opacity: 0.35; }
          50% { opacity: 0.24; }
          75% { opacity: 0.32; }
          90% { opacity: 0.26; }
        }
        @keyframes scratch-move {
          0% { transform: translateX(20%) translateY(-100%) rotate(5deg); opacity: 0; }
          10% { opacity: 0.15; }
          11% { opacity: 0; }
          45% { transform: translateX(80%) translateY(-100%) rotate(-3deg); opacity: 0; }
          46% { opacity: 0.2; }
          48% { opacity: 0; }
          100% { transform: translateX(50%) translateY(100%) rotate(0deg); opacity: 0; }
        }
        @keyframes dust-burst {
          0%, 100% { opacity: 0; }
          15% { opacity: 0.3; transform: scale(0.9) translate(10px, 20px); }
          16% { opacity: 0; }
          65% { opacity: 0.25; transform: scale(1.1) translate(-30px, -10px); }
          66% { opacity: 0; }
        }
        @keyframes cinematic-zoom-in {
          0% { transform: scale(0.92); opacity: 0.85; }
          100% { transform: scale(1.352); opacity: 1; }
        }
        @keyframes cinematic-zoom-out {
          0% { transform: scale(1.352); opacity: 1; }
          100% { transform: scale(0.92); opacity: 0.85; }
        }
        @keyframes cinematic-pan-left {
          0% { transform: scale(1.15) translateX(7%) translateY(1.5%); }
          100% { transform: scale(1.23) translateX(-7%) translateY(-1.5%); }
        }
        @keyframes cinematic-pan-right {
          0% { transform: scale(1.15) translateX(-7%) translateY(-1.5%); }
          100% { transform: scale(1.23) translateX(7%) translateY(1.5%); }
        }
        @keyframes cinematic-tilt-up {
          0% { transform: scale(1.15) translateY(6%) translateX(0.5%); }
          100% { transform: scale(1.15) translateY(-6%) translateX(-0.5%); }
        }
        @keyframes cinematic-tilt-down {
          0% { transform: scale(1.15) translateY(-6%) translateX(-0.5%); }
          100% { transform: scale(1.15) translateY(6%) translateX(0.5%); }
        }
        @keyframes cinematic-ken-burns {
          0% { transform: scale(1.02) translate(-2.2%, -2.2%) rotate(0.18deg); }
          50% { transform: scale(1.22) translate(2.2%, 2.2%) rotate(-0.18deg); }
          100% { transform: scale(1.02) translate(-2.2%, -2.2%) rotate(0.18deg); }
        }
        .animate-cinematic-zoom-in {
          animation: cinematic-zoom-in 11s ease-out infinite alternate;
        }
        .animate-cinematic-zoom-out {
          animation: cinematic-zoom-out 11s ease-out infinite alternate;
        }
        .animate-cinematic-pan-left {
          animation: cinematic-pan-left 12s ease-in-out infinite alternate;
        }
        .animate-cinematic-pan-right {
          animation: cinematic-pan-right 12s ease-in-out infinite alternate;
        }
        .animate-cinematic-tilt-up {
          animation: cinematic-tilt-up 11s ease-in-out infinite alternate;
        }
        .animate-cinematic-tilt-down {
          animation: cinematic-tilt-down 11s ease-in-out infinite alternate;
        }
        .animate-cinematic-ken-burns {
          animation: cinematic-ken-burns 15s ease-in-out infinite;
        }
        .organic-grain-overlay {
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' bg-opacity='0.1'/%3E%3C/svg%3E");
          background-size: 160px;
          opacity: 0.35;
          animation: custom-noise-grain 0.6s steps(4) infinite;
        }
        .film-scratch-line {
          pointer-events: none;
          width: 1px;
          height: 100%;
          background: rgba(255, 255, 255, 0.15);
          animation: scratch-move 3.5s linear infinite;
        }
        .film-dust-specks {
          pointer-events: none;
          background: radical-gradient(ellipse, rgba(0,0,0,0) 0%, rgba(255,255,255,0.05) 100%);
          animation: dust-burst 4.5s ease-in-out infinite;
        }
        @keyframes rain-fall {
          0% { transform: translateY(-120%) translateX(-15%); opacity: 0; }
          10% { opacity: 0.45; }
          90% { opacity: 0.45; }
          100% { transform: translateY(120%) translateX(15%); opacity: 0; }
        }
        @keyframes matrix-grid-slide {
          0% { transform: translateY(-5%) rotate(0deg); opacity: 0.04; }
          100% { transform: translateY(5%) rotate(1deg); opacity: 0.08; }
        }
        @keyframes stellar-float {
          0% { transform: translate(0, 0) scale(1); opacity: 0.1; }
          50% { transform: translate(25px, -25px) scale(1.4); opacity: 0.45; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.1; }
        }
        @keyframes amber-ember-rise {
          0% { transform: translateY(110%) translateX(0px) scale(0.8); opacity: 0; }
          15% { opacity: 0.75; }
          85% { opacity: 0.75; }
          100% { transform: translateY(-110%) translateX(25px) scale(1.3); opacity: 0; }
        }
        @keyframes soundwave-pulse {
          0%, 100% { height: 3px; }
          50% { height: 18px; }
        }
        .rain-drop {
          animation: rain-fall 1.5s linear infinite;
        }
        .amber-ember {
          animation: amber-ember-rise 4.5s ease-in-out infinite;
        }
        .stellar-particle {
          animation: stellar-float 7s ease-in-out infinite;
        }
        .soundwave-bar {
          animation: soundwave-pulse 1s ease-in-out infinite;
        }
      `}</style>

      {/* Header bar section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-4.5 w-4.5 text-white/50" />
          <div>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block font-bold">Production Output</span>
            <h4 className="text-xs font-serif text-white tracking-wider uppercase font-semibold">Cinematic Pre-visualization Theater</h4>
          </div>
        </div>
        
        {/* Toggle Mode Choice */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">35mm Film Composite:</span>
          <button
            onClick={() => setPreviewGrainMode(!previewGrainMode)}
            className={`cursor-pointer px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest font-bold transition-all border ${
              previewGrainMode 
                ? "bg-white text-black border-white" 
                : "bg-white/5 text-white/50 border-white/10 hover:border-white/20"
            }`}
          >
            {previewGrainMode ? "ON (PREVIEW STYLE)" : "OFF (RAW)"}
          </button>
        </div>
      </div>

      {activeScene ? (
        <div className="flex flex-col lg:flex-row gap-5">
          
          {/* Main Visual Monitor Shield */}
          <div className="flex-1 flex flex-col gap-3">
            
            {/* Monitor Stage */}
            <div className={`aspect-[16/9] w-full bg-[#050505] border border-white/10 relative overflow-hidden flex flex-col items-center justify-center p-6 select-none transition-all ${
              previewGrainMode ? "grayscale contrast-[1.3] brightness-[0.85] shadow-inner" : ""
            }`}>
              
              {/* Cinematic Vignette layer */}
              {previewGrainMode && (
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_50%,rgba(0,0,0,0.85)_100%)] z-10" />
              )}

              {/* Hardware Accelerated SVG Grain Filter Noise */}
              {previewGrainMode && (
                <div className="absolute inset-[-50%] organic-grain-overlay z-10" />
              )}

              {/* Film Scratch lines & dust */}
              {previewGrainMode && (
                <>
                  <div className="absolute left-[35%] top-0 bottom-0 film-scratch-line z-10" />
                  <div className="absolute left-[72%] top-0 bottom-0 film-scratch-line z-10 [animation-delay:1.5s]" />
                  <div className="absolute inset-0 film-dust-specks z-10" />
                  <div className="absolute inset-0 pointer-events-none z-10 bg-white/5 mix-blend-color-dodge animate-[custom-flicker_0.15s_infinite]" />
                </>
              )}

              {/* Aspect Ratio Safe Zone Guides */}
              <div className="absolute top-4 left-4 right-4 bottom-4 border border-white/5 border-dashed pointer-events-none" />

              {/* Dynamic Theme Particles Atmosphere Overlay */}
              {renderAmbientParticles()}

              {/* Top Meta tag */}
              <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
                <span className="text-[9px] font-mono text-white/50 bg-black/80 border border-white/10 px-2 py-0.5 tracking-wider uppercase font-bold">
                  RENDER MON: S-{activeIdx + 1}
                </span>
                <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
                  {activeScene.duration}
                </span>
              </div>

              {/* Dynamic Soundwave Live EQ Monitor */}
              {isPlaying && !audioMuted && (
                <div className="absolute bottom-6 right-6 z-20 flex items-end gap-[2px] h-[24px] px-2 py-1 bg-black/85 border border-white/10 select-none">
                  <span className="text-[7px] font-mono text-white/40 uppercase tracking-wider mr-1.5 self-center font-bold">SYNTH OUT</span>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[1.5px] bg-white/70 soundwave-bar"
                      style={{
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: `${0.6 + (i % 3) * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Top Right Intensity Pulse tag */}
              {(() => {
                const activeIntensity = getIntensityScore(activeScene);
                const pulseDotColor = activeIntensity >= 80 
                  ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" 
                  : activeIntensity >= 55 
                    ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" 
                    : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]";
                const intensityTextColor = activeIntensity >= 80 
                  ? "text-red-400 font-bold" 
                  : activeIntensity >= 55 
                    ? "text-amber-400 font-bold" 
                    : "text-emerald-400 font-bold";
                const intensityLevelLabel = activeIntensity >= 80 
                  ? "Critical" 
                  : activeIntensity >= 55 
                    ? "Moderate" 
                    : "Low";
                return (
                  <div className="absolute top-6 right-6 z-20 flex items-center gap-2 font-mono text-[9px] bg-black/85 border border-white/10 px-2.5 py-1 select-none">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseDotColor}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${pulseDotColor}`}></span>
                    </span>
                    <span className="text-white/40">Intensity:</span>
                    <span className={`${intensityTextColor}`}>{activeIntensity}%</span>
                    <span className="text-white/30 font-light text-[8px] uppercase tracking-wider">({intensityLevelLabel})</span>
                  </div>
                );
              })()}

              {/* Middle Symbolic Chalk Illustration with Robust Cross-Fade layer */}
              <div className="relative w-44 h-44 shrink-0 flex items-center justify-center z-20 overflow-visible select-none">
                {fadePriorScene && (
                  <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ease-in-out opacity-0 pointer-events-none transform scale-95">
                    {renderSceneSymbol(fadePriorScene.number)}
                  </div>
                )}
                
                {fadeActiveScene && (
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ease-in-out transform ${
                    fadeTrigger ? "opacity-100 scale-100" : "opacity-0 scale-95"
                  } ${getCameraAnimationClass()}`}>
                    {renderSceneSymbol(fadeActiveScene.number)}
                  </div>
                )}
              </div>

              {/* Script Subtitles overlay style */}
              <div className="absolute bottom-6 left-6 right-6 text-center select-text z-20 max-w-[85%] mx-auto bg-black/60 p-2 border border-white/5 backdrop-blur-xs">
                {consistencySettings?.enabled && activeIdx === 0 && (
                  <span className="text-[8.5px] font-mono text-emerald-400 uppercase tracking-wider block mb-1">
                    [Protagonist Locked: {consistencySettings.name}]
                  </span>
                )}
                <p className="text-xs md:text-sm font-serif text-white tracking-wide leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] px-4">
                  "{activeScene.voiceoverText}"
                </p>
              </div>

              {/* Dynamic Progress indicator within the stage */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
                <div className="h-full bg-white transition-all duration-75" style={{ width: `${progress}%` }} />
              </div>

            </div>

            {/* Playback Control Deck Panel with Live Audio Controls */}
            <div className="bg-[#050505] border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handlePlayToggle}
                  className={`cursor-pointer px-4.5 py-2 text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-1.5 transition-all ${
                    isPlaying 
                      ? "bg-white text-black hover:bg-white/80" 
                      : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5 fill-current" />
                      <span>PAUSE MOVIE</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>PREVIEW PLAYER</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  title="Rewind to start"
                  className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 transition-all text-white/50 hover:text-white cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                {/* Speaker synthesizer control button */}
                <button
                  type="button"
                  onClick={() => setAudioMuted(!audioMuted)}
                  title={audioMuted ? "Unmute Movie Sounds" : "Mute Movie Sounds"}
                  className={`p-2.5 border transition-all cursor-pointer ${
                    audioMuted 
                      ? "bg-red-950/40 border-red-900 text-red-400 hover:bg-red-950/60" 
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-white/85 hover:text-white"
                  }`}
                >
                  {audioMuted ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                  )}
                </button>

                {/* Voice narration toggle */}
                <button
                  type="button"
                  onClick={() => setVoiceSynthesizerEnabled(!voiceSynthesizerEnabled)}
                  className={`px-3 py-2 text-[9px] font-mono font-bold tracking-widest uppercase border transition-all cursor-pointer ${
                    voiceSynthesizerEnabled
                      ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/60"
                      : "bg-transparent text-white/30 border-white/5"
                  }`}
                  title="Toggle Voice Synthesizer narration track on or off"
                >
                  <span className="flex items-center gap-1">
                    <Mic className="h-3 w-3" />
                    Narrator Track: {voiceSynthesizerEnabled ? "ON" : "OFF"}
                  </span>
                </button>

                {/* Cloud vs Browser Speech Engine Selector */}
                {voiceSynthesizerEnabled && (
                  <button
                    type="button"
                    onClick={() => setNarratorType(narratorType === "server" ? "browser" : "server")}
                    className={`px-3 py-2 text-[9px] font-mono font-bold tracking-widest uppercase border transition-all cursor-pointer ${
                      narratorType === "server"
                        ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/50 hover:bg-emerald-950/50"
                        : "bg-blue-950/30 text-blue-400 border-blue-900/50 hover:bg-blue-950/50"
                    }`}
                    title="Switch between high-fidelity Server cloud streaming and simple Local Browser Speech Synthesis"
                  >
                    <span>Engine: {narratorType === "server" ? "☁️ CLOUD PROXY" : "💻 BROWSER TTS"}</span>
                  </button>
                )}

                {/* Exporter of synthesized track */}
                <button
                  type="button"
                  onClick={downloadCurrentTts}
                  disabled={downloadingTts}
                  className="px-3 py-2 text-[9px] font-mono font-bold tracking-widest uppercase border border-emerald-900/60 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40 hover:border-emerald-550 transition-all cursor-pointer disabled:opacity-50"
                  title="Synthesize currently selected scene monologue and download the MP3 track"
                >
                  <span className="flex items-center gap-1">
                    {downloadingTts ? (
                      <span className="w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent animate-spin rounded-full inline-block" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    <span>EXPORT SCENE VO</span>
                  </span>
                </button>
              </div>

              {/* Voice Actor accent select box or Server indicator */}
              {voiceSynthesizerEnabled && narratorType === "browser" && availableVoices.length > 0 && (
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[8px] uppercase tracking-widest text-[#E0D8D0]/60 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                    Browser Voice:
                  </span>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    className="bg-black text-[9px] text-[#E0D8D0] border border-white/10 rounded-none px-2 py-1 focus:outline-none focus:border-white/20 select-none font-mono max-w-[140px] md:max-w-[180px] truncate"
                  >
                    {availableVoices.map((voice, idx) => (
                      <option key={idx} value={voice.name}>
                        {voice.name.replace("Microsoft", "MS").replace("Google", "G")} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {voiceSynthesizerEnabled && narratorType === "server" && (
                <div className="flex items-center gap-1.5 font-mono text-[8.5px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 px-2 py-1" title="Streams real synthesized narrator track directly from cloud proxy">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>PREMIUM CLOUD STREAM (en-GB-RyanNeural)</span>
                </div>
              )}

              {/* Robust Fallback if sandboxed iframe restricts listing system voices */}
              {voiceSynthesizerEnabled && narratorType === "browser" && availableVoices.length === 0 && (
                <div className="flex items-center gap-1.5 font-mono text-[8.5px] text-blue-400 bg-blue-950/20 border border-blue-900/50 px-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span>ENG BROWSER VOICE FORCED (en-US)</span>
                </div>
              )}

              {/* Technical feedback overlay indicators */}
              <div className="flex items-center gap-4 text-[10px] font-mono text-white/40">
                <div className="flex items-center gap-2">
                  <Camera className="h-3.5 w-3.5 text-white/30" />
                  <span className="text-[#E0D8D0]/80">{activeScene.cameraMovement}</span>
                </div>
              </div>

            </div>

            {/* Scrubbable Frame Timeline Nodes Slider with character consistency warnings */}
            <div className="flex flex-col gap-1.5 bg-[#050505] p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[8.5px] font-mono text-white/30 uppercase tracking-widest">Scrub timeline sequence</span>
                {consistencySettings?.enabled && (
                  <span className="text-[8px] font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1 select-none">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                    Consistency Warning scans active
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {scenes.map((scene, idx) => {
                  const isActive = idx === activeIdx;
                  // run prompt deviation detection check
                  const deviates = consistencySettings?.enabled && consistencySettings.name 
                    ? !scene.imagePrompt.toLowerCase().includes(consistencySettings.name.trim().toLowerCase()) 
                    : false;

                  return (
                    <button
                      type="button"
                      key={scene.number}
                      onClick={() => selectScene(idx)}
                      className={`flex-1 group relative h-9 border cursor-pointer flex flex-col justify-between p-1.5 transition-all text-left ${
                        isActive 
                          ? "bg-white/5 border-white text-white" 
                          : deviates 
                            ? "bg-amber-950/10 border-amber-900 hover:border-amber-700 text-amber-350" 
                            : "bg-black/45 border-white/10 hover:bg-white/[0.02] hover:border-white/20 text-white/40"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full text-[8px] font-mono leading-none">
                        <span className="flex items-center gap-0.5">
                          S-{(idx + 1)}
                          {deviates && (
                            <span className="text-amber-400 font-extrabold" title="Drastic visual prompt deviation! Click to view detail.">⚠️</span>
                          )}
                        </span>
                        <span>{scene.duration}</span>
                      </div>
                      
                      <div className="h-0.5 bg-white/10 w-full relative">
                        {isActive && (
                          <div className="absolute top-0 left-0 bottom-0 bg-white" style={{ width: `${progress}%` }} />
                        )}
                        {!isActive && deviates && (
                          <div className="absolute inset-0 bg-amber-500/20" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Monitor Sidebar panel with live telemetry and cues */}
          <div className="w-full lg:w-[250px] shrink-0 flex flex-col gap-3.5 font-mono">
            
            {/* Direct Warning indicator widget if character consistency drift is scanned */}
            {consistencySettings?.enabled && !activeScene.imagePrompt.toLowerCase().includes((consistencySettings.name || "").trim().toLowerCase()) && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[9px] uppercase tracking-widest">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Prompt Drift Detected</span>
                </div>
                <p className="text-[9.5px] text-[#E0D8D0]/60 leading-relaxed font-sans font-medium">
                  Active Scene {activeScene.number}'s template does not refer to character name <strong>"{consistencySettings.name}"</strong>. Dynamic model rendering automatically stitches profile constraints to override concept drift.
                </p>
              </div>
            )}

            <div className="bg-[#050505] border border-white/10 p-4 flex flex-col gap-3">
              <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em] block font-bold">Scene Cue Sheet</span>
              
              <div className="flex flex-col gap-2 text-[10px]">
                <div className="border-b border-white/5 pb-2">
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider">Active Sequence:</span>
                  <span className="text-white font-serif italic block mt-0.5">Scene {activeScene.number}: {activeScene.section}</span>
                </div>

                <div className="border-b border-white/5 pb-2">
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider">Atmosphere Layer:</span>
                  <span className="text-white block mt-0.5 uppercase">{activeScene.emotion}</span>
                </div>

                <div className="border-b border-white/5 pb-2">
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider">Music Category:</span>
                  <span className="text-white block mt-0.5 uppercase text-emerald-300 font-bold">{activeScene.musicCategory}</span>
                </div>

                <div>
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider flex items-center gap-1">
                    <span>Image Composition Lock:</span>
                    {artDirectionSettings?.enabled && artDirectionSettings.aestheticRules.trim() && (
                      <span className="text-[7.5px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-1 py-0.5 uppercase tracking-wide">
                        Art Locked
                      </span>
                    )}
                  </span>
                  <span 
                    className="text-white/60 block mt-0.5 line-clamp-3 text-[9.5px]" 
                    title={
                      artDirectionSettings?.enabled && artDirectionSettings.aestheticRules.trim()
                        ? `[Art Direction: ${artDirectionSettings.aestheticRules.trim()}] ${activeScene.imagePrompt}`
                        : activeScene.imagePrompt
                    }
                  >
                    {artDirectionSettings?.enabled && artDirectionSettings.aestheticRules.trim()
                      ? `${artDirectionSettings.aestheticRules.trim()}, ${activeScene.imagePrompt}`
                      : activeScene.imagePrompt}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick tips */}
            <div className="border border-white/10 p-4 bg-black/35 flex flex-col gap-1 text-[9.5px] leading-relaxed text-[#E0D8D0]/40 italic">
              <span className="text-[9px] uppercase font-bold tracking-wider text-white/30 font-mono not-italic">Atmosphere Node Logs</span>
              <span>All 35mm pre-visualization waves feature responsive spatial synthesizers and real-time narrated voice tracks synced exactly to dialog parameters. Click play to begin cinematic stream.</span>
            </div>
          </div>

        </div>
      ) : (
        <span className="text-xs text-center text-white/40 font-mono py-12 block">
          Select a production script to activate cinematic play stage.
        </span>
      )}

    </div>
  );
}
