import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Tv, 
  FileText, 
  Search, 
  Share2, 
  Copy, 
  Download, 
  BookOpen, 
  Layers, 
  Clock, 
  Compass, 
  HelpCircle, 
  AlertTriangle, 
  RotateCcw, 
  Layers2, 
  ExternalLink,
  Github,
  Check,
  FileCode,
  CornerDownRight,
  User,
  Lightbulb,
  Workflow,
  Smile,
  Eye,
  MessageSquare,
  Film,
  Play,
  Loader2,
  UploadCloud,
  Edit3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PRESET_BLUEPRINTS } from "./presetsDetail";
import { DocumentaryBlueprint, Scene } from "./types";
import AudioEngine from "./components/AudioEngine";
import TimelineIntensityChart from "./components/TimelineIntensityChart";
import CharacterConsistencyModal, { CharacterConsistency } from "./components/CharacterConsistencyModal";
import SentimentToneDiagnostic from "./components/SentimentToneDiagnostic";
import TeleprompterView from "./components/TeleprompterView";
import CinematicVideoPlayer from "./components/CinematicVideoPlayer";

// Interface for User Preset storage
interface UserPreset {
  id: string;
  name: string;
  topic: string;
  tone: "Melancholic" | "Overthinking" | "Existential" | "Stoic" | "Golden-Sand Comfort";
  consistency: CharacterConsistency;
}

// Robust response parser to handle transient backend errors (e.g., PayloadTooLarge, 404, 503) without breaking React layout
async function safeParseResponseJson(response: Response, defaultErrorMessage: string) {
  const text = await response.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch (err) {
    if (!response.ok) {
      throw new Error(`${defaultErrorMessage} (Status ${response.status})`);
    } else {
      throw new Error(`Invalid response format from server (Status ${response.status})`);
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || defaultErrorMessage);
  }
  return data;
}

function recordCanvasVideo(
  imageSrc: string,
  prompt: string,
  aspectRatio: "16:9" | "9:16",
  durationMs: number = 5000
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = 960;
      let height = 540;
      if (aspectRatio === "9:16") {
        width = 540;
        height = 960;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not initialize 2D rendering context."));
        return;
      }

      let mimeType = "video/webm;codecs=vp9";
      if (typeof MediaRecorder !== "undefined") {
        const candidates = [
          "video/webm;codecs=vp9",
          "video/webm;codecs=vp8",
          "video/webm",
          "video/mp4",
          "video/ogg"
        ];
        let found = false;
        for (const cand of candidates) {
          if (MediaRecorder.isTypeSupported(cand)) {
            mimeType = cand;
            found = true;
            break;
          }
        }
        if (!found) {
          mimeType = "";
        }
      }

      let stream: MediaStream;
      try {
        stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : (canvas as any).mozCaptureStream ? (canvas as any).mozCaptureStream(30) : null;
        if (!stream) {
          throw new Error("Canvas streamlines unsupported in this browser.");
        }
      } catch (streamErr) {
        reject(new Error("Your browser security settings prevent visual canvas streamline capture."));
        return;
      }

      const recordedChunks: Blob[] = [];
      let recorder: MediaRecorder;
      try {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch (recErr) {
        try {
          recorder = new MediaRecorder(stream);
        } catch (recErr2: any) {
          reject(new Error("Media recording is unsupported in your current browser agent: " + recErr2.message));
          return;
        }
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: recorder.mimeType || "video/webm" });
        resolve(blob);
      };

      const startTime = performance.now();
      recorder.start();

      const promptLower = (prompt || "").toLowerCase();
      const isZoomOut = promptLower.includes("zoom out") || promptLower.includes("pull back") || promptLower.includes("away");
      const isZoomIn = promptLower.includes("zoom in") || promptLower.includes("push") || promptLower.includes("into") || (!isZoomOut && (promptLower.includes("zoom") || promptLower.includes("breathe") || true));
      
      const isPanLeft = promptLower.includes("pan left") || promptLower.includes("move left") || promptLower.includes("pan");
      const isPanRight = promptLower.includes("pan right") || promptLower.includes("move right");
      const isTiltUp = promptLower.includes("tilt up") || promptLower.includes("rise") || promptLower.includes("move up");
      const isTiltDown = promptLower.includes("tilt down") || promptLower.includes("sink") || promptLower.includes("move down");

      const stars: Array<{ x: number; y: number; r: number; speed: number }> = [];
      for (let sDx = 0; sDx < 30; sDx++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.6 + 0.6,
          speed: Math.random() * 0.2 + 0.05
        });
      }

      const animate = (now: number) => {
        const elapsed = now - startTime;
        if (elapsed >= durationMs) {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
          return;
        }

        const t = Math.min(1, elapsed / durationMs);

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        let scale = 1.0;
        if (isZoomOut) {
          scale = 1.15 - t * 0.15;
        } else if (isZoomIn) {
          scale = 1.0 + t * 0.15;
        } else {
          scale = 1.0 + Math.sin(t * Math.PI) * 0.05;
        }

        let dx = 0;
        let dy = 0;
        const maxPan = width * 0.04;
        const maxTilt = height * 0.04;

        if (isPanLeft) {
          dx = (1 - t) * maxPan;
        } else if (isPanRight) {
          dx = -t * maxPan;
        } else {
          dx = Math.sin(t * Math.PI * 2) * (width * 0.007);
        }

        if (isTiltUp) {
          dy = (1 - t) * maxTilt;
        } else if (isTiltDown) {
          dy = -t * maxTilt;
        } else {
          dy = Math.cos(t * Math.PI * 2) * (height * 0.007);
        }

        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let dWidth, dHeight;

        if (imgRatio > canvasRatio) {
          dHeight = height;
          dWidth = height * imgRatio;
        } else {
          dWidth = width;
          dHeight = width / imgRatio;
        }

        const cx = (width - dWidth) / 2;
        const cy = (height - dHeight) / 2;

        ctx.save();
        ctx.translate(width / 2 + dx, height / 2 + dy);
        ctx.scale(scale, scale);
        ctx.drawImage(img, cx - width / 2, cy - height / 2, dWidth, dHeight);
        ctx.restore();

        const gradient = ctx.createRadialGradient(
          width / 2, height / 2, Math.min(width, height) * 0.45,
          width / 2, height / 2, Math.max(width, height) * 0.72
        );
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(1, "rgba(0,0,0,0.6)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "rgba(255, 235, 205, 0.45)";
        for (const star of stars) {
          star.y = (star.y + star.speed) % height;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
        ctx.font = "bold 11px monospace";
        const progressSeconds = (elapsed / 1000).toFixed(1);
        ctx.fillText(`REC ${progressSeconds}s / 5.0s`, 32, height - 25);

        if (Math.floor(elapsed / 500) % 2 === 0) {
          ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
          ctx.beginPath();
          ctx.arc(20, height - 28, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    };

    img.onerror = () => {
      reject(new Error("Unable to synthesize current image. Check file structure."));
    };

    img.src = imageSrc;
  });
}

export default function App() {
  // History and state management
  const [blueprints, setBlueprints] = useState<DocumentaryBlueprint[]>([]);
  const [activeBlueprint, setActiveBlueprint] = useState<DocumentaryBlueprint | null>(null);
  
  // Custom inputs
  const [customTopic, setCustomTopic] = useState("");
  const [selectedTone, setSelectedTone] = useState<"Melancholic" | "Overthinking" | "Existential" | "Stoic" | "Golden-Sand Comfort">("Existential");
  
  // UI States
  const [activeTab, setActiveTab] = useState<"blueprint" | "titles" | "script" | "storyboard" | "seo" | "movie">("blueprint");
  const [autoplayPlayer, setAutoplayPlayer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [pinnedTitle, setPinnedTitle] = useState<string | null>(null);
  const [pinnedThumbnail, setPinnedThumbnail] = useState<number | null>(null);
  const [downloadingTtsId, setDownloadingTtsId] = useState<string | null>(null);

  const handleDownloadTts = async (text: string, id: string, filename: string) => {
    setDownloadingTtsId(id);
    try {
      // Trigger short voice announcement using window.speechSynthesis to show Web Speech API integration
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const whisper = new SpeechSynthesisUtterance("Synthesizing voiceover track download.");
          whisper.volume = 0.45;
          whisper.rate = 1.05;
          whisper.pitch = 0.95;
          whisper.lang = "en-US";
          window.speechSynthesis.speak(whisper);
        } catch (ttsErr) {
          console.warn("Browser SpeechSynthesis feedback blocked or unsupported", ttsErr);
        }
      }

      const response = await fetch(`/api/tts?text=${encodeURIComponent(text)}`);
      if (!response.ok) {
        throw new Error("Unable to synthesize audio. Please try again.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error("Synthesizer export failed", error);
      alert(error.message || "An issue occurred while generating the audio file.");
    } finally {
      setDownloadingTtsId(null);
    }
  };

  // New features configuration
  const [teleprompterMode, setTeleprompterMode] = useState(false);
  const [isConsistencyModalOpen, setIsConsistencyModalOpen] = useState(false);
  const [filmGrainPreviewEnabled, setFilmGrainPreviewEnabled] = useState(true);
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [presetFeedbackMessage, setPresetFeedbackMessage] = useState<string | null>(null);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [voiceoverAlign, setVoiceoverAlign] = useState(true);
  const [artDirection, setArtDirection] = useState<{
    enabled: boolean;
    aestheticRules: string;
  }>({
    enabled: true,
    aestheticRules: "no bright colors, high-contrast noir, minimalist existential graphite sketches"
  });

  // Script direct editing enhancements
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [editedScriptText, setEditedScriptText] = useState("");

  const handleSaveEditedScript = () => {
    if (!activeBlueprint) return;
    
    const updatedParts = editedScriptText.split("###").filter(b => b.trim().length > 0);
    const updatedScenes = activeBlueprint.scenes.map((scene, idx) => {
      const part = updatedParts[idx];
      if (part) {
        const lines = part.trim().split("\n");
        const voiceoverText = lines.slice(1).join("\n").trim();
        return {
          ...scene,
          voiceoverText: voiceoverText || scene.voiceoverText,
        };
      }
      return scene;
    });

    const refreshedBlueprint = {
      ...activeBlueprint,
      scriptText: editedScriptText,
      scenes: updatedScenes,
    };

    setActiveBlueprint(refreshedBlueprint);
    setBlueprints(prev => prev.map(bp => bp.id === activeBlueprint.id ? refreshedBlueprint : bp));
    setIsEditingScript(false);
  };

  // Reset active scene index when active blueprint changes
  useEffect(() => {
    setActiveSceneIdx(0);
  }, [activeBlueprint?.id, activeBlueprint?.topic]);

  // Synchronization: Auto-scroll Double-spaced Script view based on Active Scene Index
  useEffect(() => {
    if (voiceoverAlign && activeTab === "script" && !teleprompterMode) {
      const activeEl = document.getElementById(`script-block-${activeSceneIdx}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeSceneIdx, voiceoverAlign, activeTab, teleprompterMode]);

  // Load user presets on mount
  useEffect(() => {
    const savedPresets = localStorage.getItem("existential_user_presets");
    if (savedPresets) {
      try {
        setUserPresets(JSON.parse(savedPresets));
      } catch (e) {
        console.warn("Could not load user presets:", e);
      }
    }
  }, []);

  const savePresetsToStorage = (presets: UserPreset[]) => {
    localStorage.setItem("existential_user_presets", JSON.stringify(presets));
    setUserPresets(presets);
  };

  // Veo Video states
  const [veoImage, setVeoImage] = useState<string | null>(null);
  const [veoPrompt, setVeoPrompt] = useState("A slow cinematically breathing video, 35mm pan, mysterious existential atmosphere");
  const [veoAspectRatio, setVeoAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [veoLoading, setVeoLoading] = useState(false);
  const [veoProgressMsg, setVeoProgressMsg] = useState("Preparing photo telemetry...");
  const [veoVideoUrl, setVeoVideoUrl] = useState<string | null>(null);
  const [veoError, setVeoError] = useState<string | null>(null);
  const [veoEngineMode, setVeoEngineMode] = useState<"cloud" | "local">("local");
  const [veoHistory, setVeoHistory] = useState<Array<{
    id: string;
    originalImage: string;
    prompt: string;
    aspectRatio: "16:9" | "9:16";
    videoUrl: string;
    createdAt: string;
  }>>([]);

  // Load Veo history meta on mount
  useEffect(() => {
    const savedMeta = localStorage.getItem("existential_veo_history_meta");
    if (savedMeta) {
      try {
        const parsed = JSON.parse(savedMeta);
        // Note: the original blob URLs are session-specific, so users can regenerate or download anew
        setVeoHistory(parsed);
      } catch (e) {
        console.warn("Could not load Veo history metadata:", e);
      }
    }
  }, []);

  const generateLocalCinematicVideo = async (imageSrc: string, prompt: string, aspectRatio: "16:9" | "9:16") => {
    setVeoProgressMsg("Initializing Local Cinematic Video Canvas...");
    
    const localSteps = [
      "Simulating 35mm optical glass panning...",
      "Injecting ambient atmospheric floating particles...",
      "Capturing frame sequence timeline at 30 fps...",
      "Compiling video stream buffer blocks...",
      "Finishing video file export..."
    ];
    
    let stepCount = 0;
    const localInterval = setInterval(() => {
      if (stepCount < localSteps.length) {
        setVeoProgressMsg(localSteps[stepCount]);
        stepCount++;
      }
    }, 700);

    try {
      const recordedBlob = await recordCanvasVideo(imageSrc, prompt, aspectRatio, 5000);
      const generatedUrl = URL.createObjectURL(recordedBlob);
      setVeoVideoUrl(generatedUrl);

      // Add to local session history
      const hItem = {
        id: Date.now().toString(),
        originalImage: imageSrc,
        prompt: prompt,
        aspectRatio: aspectRatio,
        videoUrl: generatedUrl,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setVeoHistory((prev) => {
        const upd = [hItem, ...prev];
        try {
          const persistReady = upd.map(i => ({ ...i, videoUrl: "" })); 
          localStorage.setItem("existential_veo_history_meta", JSON.stringify(persistReady));
        } catch (pErr) {
          console.warn("Could not persist history metadata:", pErr);
        }
        return upd;
      });
    } catch (err: any) {
      console.error("Local Video Generation Error:", err);
      throw new Error(err.message || "Failed to compile offline cinematic video track.");
    } finally {
      clearInterval(localInterval);
    }
  };

  const handleGenerateVeoVideo = async () => {
    if (!veoImage) {
      setVeoError("Please upload some photo target to construct your cinematic composition.");
      return;
    }

    setVeoLoading(true);
    setVeoError(null);
    setVeoVideoUrl(null);

    if (veoEngineMode === "local") {
      try {
        await generateLocalCinematicVideo(veoImage, veoPrompt, veoAspectRatio);
      } catch (err: any) {
        console.error("Local cinematic synthesizer failed:", err);
        setVeoError(err.message || "Localized synthesis failed.");
      } finally {
        setVeoLoading(false);
      }
      return;
    }

    setVeoProgressMsg("Uploading visual frames to high-fidelity container...");

    // Selection of beautiful, highly engaging psychological & cinematic steps to provide a stellar UX
    const dynamicMessages = [
      "Analyzing visual composition & balance fields...",
      "Interpolating frame vectors and cognitive depths...",
      "Deconstructing light thresholds and negative space...",
      "Polishing ambient frame details...",
      "Fusing 35mm motion telemetry...",
      "Rendering pristine video blocks...",
      "Finalizing high-definition streaming tracks..."
    ];

    let msgIndex = 0;
    const progressInterval = setInterval(() => {
      setVeoProgressMsg(dynamicMessages[msgIndex % dynamicMessages.length]);
      msgIndex++;
    }, 8500);

    try {
      // 1. Start generation operation
      const devResponse = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: veoImage,
          prompt: veoPrompt,
          aspectRatio: veoAspectRatio
        })
      });

      const { operationName } = await safeParseResponseJson(devResponse, "The server rejected the video request structure.");
      if (!operationName) {
        throw new Error("Did not receive a valid operation ID from the build server.");
      }

      setVeoProgressMsg("Analyzing frame depth vectors on server-side...");

      // 2. Poll for status
      let isComplete = false;
      let attempts = 0;
      const maxAttempts = 100; // ~10 minutes limit

      while (!isComplete && attempts < maxAttempts) {
        attempts++;
        // Wait 6 seconds between poll checks
        await new Promise((resolve) => setTimeout(resolve, 6000));

        const statusResponse = await fetch("/api/video-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName })
        });

        let statusData;
        try {
          statusData = await safeParseResponseJson(statusResponse, "Failed to inspect video generation progress.");
        } catch (pollErr: any) {
          console.warn("Polling status encountered a temporary issue, continuing...", pollErr);
          continue;
        }
        
        if (statusData.error) {
          throw new Error(statusData.error.message || "The video processing sequence failed.");
        }

        if (statusData.done) {
          isComplete = true;
          setVeoProgressMsg("Streaming and caching completed video...");
          
          // 3. Download / fetch binary stream
          const downloadResponse = await fetch("/api/video-download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operationName })
          });

          if (!downloadResponse.ok) {
            throw new Error("Unable to compose and fetch the video track binary.");
          }

          const blob = await downloadResponse.blob();
          const generatedUrl = URL.createObjectURL(blob);
          
          setVeoVideoUrl(generatedUrl);

          // Add to local session history
          const hItem = {
            id: Date.now().toString(),
            originalImage: veoImage,
            prompt: veoPrompt,
            aspectRatio: veoAspectRatio,
            videoUrl: generatedUrl,
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          
          setVeoHistory((prev) => {
            const upd = [hItem, ...prev];
            try {
              // Persist metadata (omitting raw data URL or keeping a portion)
              const persistReady = upd.map(i => ({ ...i, videoUrl: "" })); // URL is object-specific, so reset it and keep details
              localStorage.setItem("existential_veo_history_meta", JSON.stringify(persistReady));
            } catch (pErr) {
              console.warn("Could not persist history metadata:", pErr);
            }
            return upd;
          });
        }
      }

      if (!isComplete) {
        throw new Error("Generation timeline exceeded limit. Please try again.");
      }

    } catch (err: any) {
      console.error("Veo Generation Error:", err);
      
      const isQuotaLimit = err.message && (
        err.message.includes("429") ||
        err.message.includes("quota") ||
        err.message.includes("exhausted") ||
        err.message.includes("limit") ||
        err.message.includes("billing")
      );

      if (isQuotaLimit) {
        console.warn("Cloud Veo quota exceeded. Activating local cinematic pre-visualization module instantly...");
        try {
          setVeoProgressMsg("Cloud Veo Quota (429) Limit Detected. Switching to Local Canvas Synthesizer...");
          await new Promise((r) => setTimeout(r, 1800));
          await generateLocalCinematicVideo(veoImage, veoPrompt, veoAspectRatio);
          setVeoError("Cloud Quota Exceeded. The high-fidelity local rendering engine successfully compiled your video instead!");
        } catch (innerErr: any) {
          setVeoError("Cloud Quota Exceeded and local animation failed: " + (innerErr.message || innerErr));
        }
      } else {
        setVeoError(err.message || "An unexpected error disrupted the motion synthesis.");
      }
    } finally {
      clearInterval(progressInterval);
      setVeoLoading(false);
    }
  };

  const handleSaveCurrentPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    
    const newPreset: UserPreset = {
      id: "preset-" + Date.now(),
      name: newPresetName.trim(),
      topic: customTopic || "Untitled Setup",
      tone: selectedTone,
      consistency: { ...consistencySettings }
    };
    
    const updated = [newPreset, ...userPresets];
    savePresetsToStorage(updated);
    setNewPresetName("");
    setPresetFeedbackMessage(`Saved preset "${newPreset.name}"!`);
    setTimeout(() => setPresetFeedbackMessage(null), 3000);
  };

  const handleSelectUserPreset = (preset: UserPreset) => {
    setCustomTopic(preset.topic);
    setSelectedTone(preset.tone);
    setConsistencySettings(preset.consistency);
    
    setPresetFeedbackMessage(`Loaded preset "${preset.name}"!`);
    setTimeout(() => setPresetFeedbackMessage(null), 3000);
  };

  const handleDeleteUserPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = userPresets.filter(p => p.id !== id);
    savePresetsToStorage(updated);
  };

  const [consistencySettings, setConsistencySettings] = useState<CharacterConsistency>({
    enabled: false,
    name: "The Voyager",
    genderAppearance: "A solitary wanderer",
    attire: "wearing a dark heavy wool overcoat and a faded grey scarf",
    physicalTraits: "slender build, messy windblown charcoal hair, tired contemplative eyes",
    artStyle: "shot on moody 35mm cinematic film grain, dark chiaroscuro, desaturated slate tones"
  });

  const getConsistentPrompt = (basePrompt: string) => {
    if (!consistencySettings.enabled) return basePrompt;
    return `A detailed high metaphor scene of ${consistencySettings.name} (${consistencySettings.genderAppearance}, ${consistencySettings.physicalTraits}, ${consistencySettings.attire}), ${basePrompt}, rendering details in ${consistencySettings.artStyle}.`;
  };

  const getEffectivePrompt = (basePrompt: string) => {
    let finalPrompt = basePrompt;
    if (consistencySettings.enabled) {
      finalPrompt = `A detailed high metaphor scene of ${consistencySettings.name} (${consistencySettings.genderAppearance}, ${consistencySettings.physicalTraits}, ${consistencySettings.attire}), ${basePrompt}, rendering details in ${consistencySettings.artStyle}.`;
    }
    if (artDirection.enabled && artDirection.aestheticRules.trim()) {
      finalPrompt = `${artDirection.aestheticRules.trim()}, ${finalPrompt}`;
    }
    return finalPrompt;
  };

  const getMissingCharacterTraits = (promptText: string) => {
    if (!consistencySettings.enabled) return [];
    const missing: string[] = [];
    const prompt = (promptText || "").toLowerCase();

    // 1. Name check
    if (consistencySettings.name && consistencySettings.name.trim()) {
      const nameLow = consistencySettings.name.trim().toLowerCase();
      if (!prompt.includes(nameLow)) {
        missing.push(`Name ("${consistencySettings.name}")`);
      }
    }

    // 2. Physical Description check
    if (consistencySettings.physicalTraits && consistencySettings.physicalTraits.trim()) {
      const words = consistencySettings.physicalTraits.split(/,|\s+/).map(w => w.trim().toLowerCase()).filter(w => w.length > 2);
      const hasOverlap = words.length === 0 || words.some(w => prompt.includes(w));
      if (!hasOverlap) {
        missing.push("Physical Traits");
      }
    }

    // 3. Attire check
    if (consistencySettings.attire && consistencySettings.attire.trim()) {
      const words = consistencySettings.attire.split(/,|\s+/).map(w => w.trim().toLowerCase()).filter(w => w.length > 2);
      const hasOverlap = words.length === 0 || words.some(w => prompt.includes(w));
      if (!hasOverlap) {
        missing.push("Attire Style");
      }
    }

    return missing;
  };

  const handleReorderScenes = (reorderedScenes: Scene[]) => {
    if (!activeBlueprint) return;
    const updatedBlueprint = {
      ...activeBlueprint,
      scenes: reorderedScenes,
    };
    setActiveBlueprint(updatedBlueprint);
    setBlueprints(prev => prev.map(bp => bp.id === activeBlueprint.id ? updatedBlueprint : bp));
  };
  
  // Loading prompts animation
  const loadingPrompts = [
    "Dismantling core human emotions and anxieties...",
    "Tracing psychological self-handicapping defenses...",
    "Formulating Stoic and existential philosophical frameworks...",
    "Sifting through 20 curated high-retention title hook angles...",
    "Drafting detailed cinematic storyboard frames in the style-lock...",
    "Compiling script text to feel poetic, deep, and comforting...",
    "Formulating YouTube Search SEO keywords and chapter splits..."
  ];

  // Load baseline blueprints
  useEffect(() => {
    // Check if user has saved history
    const lSaved = localStorage.getItem("existential_blueprints");
    if (lSaved) {
      try {
        const parsed = JSON.parse(lSaved);
        if (parsed.length > 0) {
          setBlueprints(parsed);
          setActiveBlueprint(parsed[0]);
          setPinnedTitle(parsed[0].titles[0]);
          return;
        }
      } catch (e) {
        console.warn("Could not load history:", e);
      }
    }
    
    // Set presets if no history exists
    setBlueprints(PRESET_BLUEPRINTS);
    setActiveBlueprint(PRESET_BLUEPRINTS[0]);
    setPinnedTitle(PRESET_BLUEPRINTS[0].titles[0]);
  }, []);

  // Sync to local storage
  const saveToHistory = (newBlueprints: DocumentaryBlueprint[]) => {
    localStorage.setItem("existential_blueprints", JSON.stringify(newBlueprints));
    setBlueprints(newBlueprints);
  };

  // Select a preset or past blueprint
  const handleSelectBlueprint = (blueprint: DocumentaryBlueprint) => {
    setActiveBlueprint(blueprint);
    setPinnedTitle(blueprint.titles[0]);
    setPinnedThumbnail(blueprint.thumbnailIdeas[0]?.id || 1);
  };

  // Triggers background simulation loop during loading
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingPrompts.length);
      }, 3500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(timer);
  }, [isLoading]);

  // Command handlers
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setAutoplayPlayer(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: customTopic,
          tone: selectedTone
        })
      });

      const generatedData: DocumentaryBlueprint = await safeParseResponseJson(response, "Failed to generate video blueprint.");
      
      // Setup identifiers
      generatedData.id = "gen-" + Date.now();
      generatedData.tone = selectedTone;
      generatedData.createdAt = new Date().toISOString();

      const updatedHistory = [generatedData, ...blueprints.filter(b => b.id !== "gen-")];
      saveToHistory(updatedHistory);
      setActiveBlueprint(generatedData);
      setPinnedTitle(generatedData.titles[0]);
      setPinnedThumbnail(generatedData.thumbnailIdeas[0]?.id || 1);
      
      // Soft reset custom field but show success transition
      setCustomTopic("");
      // Make the process automatic to continue straight to the result storyboard video preview
      setActiveTab("storyboard");
      setFilmGrainPreviewEnabled(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || 
        "The server is running but could not reach Gemini. Please verify that your GEMINI_API_KEY is properly loaded under the Secrets tab."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOneClickProduce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setAutoplayPlayer(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: customTopic,
          tone: selectedTone
        })
      });

      const generatedData: DocumentaryBlueprint = await safeParseResponseJson(response, "Failed to generate video blueprint.");
      
      // Setup identifiers
      generatedData.id = "gen-" + Date.now();
      generatedData.tone = selectedTone;
      generatedData.createdAt = new Date().toISOString();

      const updatedHistory = [generatedData, ...blueprints.filter(b => b.id !== "gen-")];
      saveToHistory(updatedHistory);
      setActiveBlueprint(generatedData);
      setPinnedTitle(generatedData.titles[0]);
      setPinnedThumbnail(generatedData.thumbnailIdeas[0]?.id || 1);
      setActiveSceneIdx(0);
      
      // Soft reset custom field but show success transition
      setCustomTopic("");
      setAutoplayPlayer(true); // Instantly trigger play!
      setActiveTab("storyboard");
      setFilmGrainPreviewEnabled(true);

      // Smooth scroll direct to the narrator theater view
      setTimeout(() => {
        const theater = document.getElementById("narrator-pre-visualization-suite");
        if (theater) {
          theater.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 700);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || 
        "The server is running but could not reach Gemini. Please verify that your GEMINI_API_KEY is properly loaded under the Secrets tab."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to revert to default master presets?")) {
      localStorage.removeItem("existential_blueprints");
      setBlueprints(PRESET_BLUEPRINTS);
      setActiveBlueprint(PRESET_BLUEPRINTS[0]);
      setPinnedTitle(PRESET_BLUEPRINTS[0].titles[0]);
      setPinnedThumbnail(1);
    }
  };

  const executeCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const downloadJSON = () => {
    if (!activeBlueprint) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeBlueprint, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `existential-script-${activeBlueprint.topic.toLowerCase().replace(/[^a-z0-9]/g, "-")}.json`);
    dlAnchorElem.click();
  };

  return (
    <div id="existential-root" className="min-h-screen bg-[#050505] text-[#E0D8D0] flex flex-col relative overflow-x-hidden font-serif selection:bg-white/10 selection:text-white">
      
      {/* Decorative ambient background blurs */}
      <div className="absolute top-[-300px] left-[-300px] w-[600px] h-[600px] rounded-full bg-white/5 ambient-aurora pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-200px] w-[500px] h-[500px] rounded-full bg-white/5 ambient-aurora pointer-events-none" />

      {/* Header element */}
      <header id="app-header" className="z-20 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 border border-white/40 flex items-center justify-center rotate-45 group">
            <div className="w-4 h-4 bg-white/10 -rotate-45 flex items-center justify-center">
              <Sparkles className="h-2.5 w-2.5 text-white/80 animate-pulse group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <h1 className="text-sm md:text-base font-serif tracking-[0.2em] font-light uppercase text-white flex items-center gap-2">
              Existential Architect
              <span className="text-[9px] uppercase font-mono tracking-widest bg-white/5 text-white border border-white/20 px-2 py-0.5 rounded-none">
                Elite Creator Tier
              </span>
            </h1>
            <p className="text-[10px] text-white/40 tracking-[0.1em] font-sans">
              Elite Storyboarder & Narrator for Psychological Philosophy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase">System Chrono</span>
            <span className="text-[10px] font-mono text-[#E0D8D0]/80">2026-06-11 UTC</span>
          </div>
          
          <button
            onClick={downloadJSON}
            disabled={!activeBlueprint}
            className="flex items-center gap-2 text-[10px] uppercase tracking-widest bg-transparent border border-white/20 hover:border-white hover:bg-white/5 disabled:opacity-30 text-[#E0D8D0] font-mono px-4 py-2 rounded-none transition-all"
          >
            <Download className="h-3 w-3" />
            <span className="hidden md:inline">Export Pipeline Blueprint</span>
          </button>
        </div>
      </header>

      {/* Main container layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative z-10">
        
        {/* Left pane - Interactive control center */}
        <aside id="control-sidebar" className="w-full lg:w-[400px] border-r border-white/10 bg-[#0a0a0a]/90 shrink-0 p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* Custom builder workspace formulary */}
          <div className="flex flex-col gap-4">
            <div className="border bg-[#050505] border-white/10 rounded-none p-5">
              <h2 className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-[0.25em] mb-4 flex items-center gap-1.5">
                <Workflow className="h-3.5 w-3.5 text-white/60" />
                Initialize Script
              </h2>
              
              <form onSubmit={handleGenerate} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="topic-input" className="block text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">
                    Anxiety Topic / Creative Focus
                  </label>
                  <textarea
                    id="topic-input"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="E.g., Why we feel stuck, The sorrow of getting exactly what you wanted..."
                    rows={3}
                    className="w-full bg-black border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/40 rounded-none p-3.5 text-xs leading-relaxed text-[#E0D8D0] placeholder:text-white/20 focus:border-white/20 resize-none transition-all font-serif"
                    required
                  />
                  <span className="text-[9px] text-[#E0D8D0]/40 block mt-1.5 italic">
                    Describe a human emotion, modern fear, or existential crisis.
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  <div>
                    <label htmlFor="tone-select" className="text-[9px] font-mono font-semibold text-white/30 uppercase tracking-[0.2em] block mb-2">
                      Narration Tone
                    </label>
                    <select
                      id="tone-select"
                      value={selectedTone}
                      onChange={(e: any) => setSelectedTone(e.target.value)}
                      className="w-full bg-black border border-white/10 text-xs font-serif text-[#E0D8D0] focus:ring-1 focus:ring-white rounded-none px-3 py-2 focus:outline-none focus:border-white/30"
                    >
                      <option value="Existential">Existentialist Vibe</option>
                      <option value="Melancholic">Melancholic Grief</option>
                      <option value="Overthinking">Overthinking Loop</option>
                      <option value="Stoic">Stoic Tranquility</option>
                      <option value="Golden-Sand Comfort">Soft Compassion</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2 mt-1.5 font-mono">
                    <button
                      type="button"
                      onClick={handleOneClickProduce}
                      disabled={isLoading || !customTopic.trim()}
                      className="w-full bg-[#d4af37] text-black hover:bg-[#e5c158] active:bg-[#c29d2b] disabled:opacity-20 text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-3.5 rounded-none transition-all flex items-center justify-center gap-2 border border-[#e5c158]/50 shadow-[0_0_15px_rgba(212,175,55,0.15)] cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>Auto-Creating Video...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-black" />
                          <span>1-Click Auto-Produce Video</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between gap-2 my-1">
                      <div className="h-[1px] bg-white/10 flex-1"></div>
                      <span className="text-[8px] text-white/30 uppercase tracking-[0.2em]">or</span>
                      <div className="h-[1px] bg-white/10 flex-1"></div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || !customTopic.trim()}
                      className="w-full bg-white text-black hover:bg-white/95 active:bg-white/90 disabled:opacity-20 text-[10px] uppercase tracking-[0.2em] font-medium px-4 py-3 rounded-none transition-all flex items-center justify-center gap-2 border border-white/20 font-mono"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>Rendering...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 fill-black" />
                          <span>Run Step-by-Step Architect</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Preset Quick-Saver Panel */}
              <div className="border-t border-white/10 mt-4.5 pt-4 flex flex-col gap-2 font-mono">
                <label className="block text-[8px] uppercase tracking-[0.2em] text-[#E0D8D0]/50 font-bold">
                  Save current input settings & locks
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="E.g., Melancholy Sisyphus Setup"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="flex-1 bg-black text-[11px] font-mono border border-white/10 px-2.5 py-1.5 focus:outline-none focus:border-white/20 text-[#E0D8D0] rounded-none placeholder:text-white/20"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCurrentPreset}
                    disabled={!newPresetName.trim()}
                    className="bg-white hover:bg-white/9 text-black font-bold text-[9px] uppercase font-mono px-3.5 py-1.5 cursor-pointer disabled:opacity-30 rounded-none shrink-0"
                  >
                    Save Preset
                  </button>
                </div>
                {presetFeedbackMessage && (
                  <span className="text-[9px] font-mono text-emerald-400 block mt-1 animate-pulse">
                    ✓ {presetFeedbackMessage}
                  </span>
                )}
              </div>

            </div>

            {/* Global Aesthetic Art Direction Section */}
            <div className="border bg-[#050505] border-white/10 rounded-none p-5 flex flex-col gap-4">
              <h2 className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-[0.25em] flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold">
                  🎨 Art Direction Style
                </span>
                <span className="text-[9px] font-mono text-white/30 lowercase italic">
                  aesthetic lock
                </span>
              </h2>

              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={artDirection.enabled}
                    onChange={(e) => setArtDirection({ ...artDirection, enabled: e.target.checked })}
                    className="rounded-none border border-white/20 bg-black text-white focus:ring-0 cursor-pointer h-3.5 w-3.5"
                  />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#E0D8D0]/80">
                    Prepend Style Rules
                  </span>
                </label>

                {artDirection.enabled && (
                  <div className="flex flex-col gap-2 mt-1">
                    <span className="text-[8px] font-mono text-white/40 uppercase tracking-wider block font-bold">Global Aesthetic Rules</span>
                    <textarea
                      rows={2}
                      value={artDirection.aestheticRules}
                      onChange={(e) => setArtDirection({ ...artDirection, aestheticRules: e.target.value })}
                      placeholder="E.g., no bright colors, high-contrast noir..."
                      className="w-full bg-black border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/40 rounded-none p-2.5 text-xs text-[#E0D8D0] font-mono resize-none transition-all placeholder:text-white/20"
                    />
                    <span className="text-[8.5px] text-[#E0D8D0]/40 font-mono leading-relaxed">
                      These parameters are automatically prefixed to all generated visual storyboard frames.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Custom Saved Presets List */}
          {userPresets.length > 0 && (
            <div className="flex flex-col gap-3 border bg-[#050505] border-white/10 rounded-none p-5">
              <h3 className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-[0.25em] flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold">
                  ⭐ Saved User Presets
                </span>
                <span className="text-[8px] opacity-45 font-mono">{userPresets.length} saved</span>
              </h3>
              
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                {userPresets.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectUserPreset(preset)}
                    className="group w-full text-left p-3.5 rounded-none bg-white/[0.02] border border-white/5 hover:border-white/25 hover:bg-white/[0.04] transition-all cursor-pointer flex flex-col gap-1.5 relative select-none"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-white/80 font-bold tracking-wider truncate max-w-[155px]">
                        {preset.name}
                      </span>
                      <button
                        onClick={(e) => {
                          handleDeleteUserPreset(preset.id, e);
                        }}
                        className="text-[10px] text-white/30 hover:text-red-400 font-mono p-1 cursor-pointer transition-colors"
                        title="Delete Preset"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <p className="text-[10px] text-white/50 font-serif line-clamp-1 italic">
                      "{preset.topic}"
                    </p>
                    
                    <div className="flex gap-2 text-[8px] font-mono text-white/35">
                      <span>Tone: {preset.tone}</span>
                      {preset.consistency.enabled && (
                        <span className="text-emerald-400 font-bold">[Protagonist locked]</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI soundtrack integration widget */}
          <AudioEngine 
            activeMusicCategory={activeBlueprint?.scenes?.[activeSceneIdx]?.musicCategory || "ambient piano"}
            selectedTone={selectedTone}
          />

          {/* Error messages display */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-950/20 border border-red-900/40 rounded-none p-4 flex gap-3 text-red-100 mb-4"
              >
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1.5 font-serif">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-400">
                    {errorMessage.toLowerCase().includes("403") || errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("denied")
                      ? "API Permission Blocked (403)"
                      : errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("limit")
                      ? "Quota Limit Exceeded (429)"
                      : "API Connection Fault"}
                  </span>
                  <p className="text-[11px] text-red-200/90 leading-relaxed">
                    {errorMessage}
                  </p>
                  <span className="text-[10px] text-white/50 bg-black/40 p-2 border border-white/5 font-mono mt-1">
                    💡 <strong>How to resolve:</strong> Click on your developer <strong>Secrets panel</strong> or verify that billing options are configured for your Google AI Studio project. Meanwhile, you can immediately preview and interact with the professional masterwork screenplays and storyboard presets below! No API key is required to explore those.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Presets and History section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-[0.25em] flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-white/30" />
                Select Production Script
              </h3>
              
              {blueprints.length > PRESET_BLUEPRINTS.length && (
                <button
                  onClick={handleClearHistory}
                  className="text-[9px] uppercase tracking-widest font-mono text-white/40 hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear History
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {blueprints.map((b) => {
                const isActive = activeBlueprint?.id === b.id || (activeBlueprint?.topic === b.topic && !activeBlueprint.id && !b.id);
                const isPreset = b.id?.startsWith("preset-") || !b.id;
                
                return (
                  <button
                    key={b.id || b.topic}
                    onClick={() => handleSelectBlueprint(b)}
                    className={`w-full text-left p-4 rounded-none border text-xs leading-relaxed flex flex-col gap-1 transition-all group ${
                      isActive 
                        ? "bg-white/5 border-white/60 text-white" 
                        : "bg-[#050505]/45 border-white/10 hover:bg-[#050505]/80 hover:border-white/20 text-[#E0D8D0]/60"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[9px] font-mono tracking-widest text-[#E0D8D0]/50 font-semibold uppercase">
                        {isPreset ? "📚 Preset Masterwork" : "✨ Studio Draft"}
                      </span>
                      <span className="text-[9px] font-mono text-white/30">
                        {b.tone}
                      </span>
                    </div>

                    <h4 className={`font-serif text-sm tracking-wide transition-colors ${isActive ? "text-white" : "text-[#E0D8D0]/80 group-hover:text-white"}`}>
                      {b.topic}
                    </h4>

                    <p className="text-[10px] text-white/40 font-serif line-clamp-1 truncate mt-1 italic">
                      {b.analysis.coreEmotion}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between font-mono">
            <span className="text-[9px] text-white/30 uppercase tracking-widest">v1.1.2 Existential-AI</span>
            <div className="flex items-center gap-1.5 text-white/30 hover:text-white/50 text-[9px] uppercase tracking-widest">
              <span>Antigravity Build</span>
            </div>
          </div>

        </aside>

        {/* Loading screen overlay - beautifully animated */}
        {isLoading && (
          <div className="flex-1 bg-[#050505]/98 z-20 absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-[500px] flex flex-col items-center gap-6">
              
              <div className="relative flex items-center justify-center">
                {/* Spinning rings representing existential clockwork */}
                <div className="absolute w-24 h-24 border border-white/10 border-t-white rounded-full animate-spin" />
                <div className="absolute w-18 h-18 border border-dotted border-white/15 border-b-white/50 rounded-full animate-spin [animation-direction:reverse]" />
                <div className="w-10 h-10 rounded-none bg-[#0a0a0a] border border-white/20 flex items-center justify-center rotate-45">
                  <Sparkles className="h-4.5 w-4.5 text-white animate-pulse -rotate-45" />
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                <span className="text-[10px] font-mono text-white/40 tracking-[0.25em] uppercase font-bold">
                  DEEP NARRATIVE COGNITION
                </span>
                
                <h3 className="text-lg font-serif tracking-wide text-white">
                  Synthesizing Psychological Metaphors
                </h3>
              </div>

              {/* Progress dynamic subtitle steps */}
              <div className="bg-[#0a0a0a] border border-white/10 rounded-none px-6 py-3 w-full h-11 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingStep}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-xs text-[#E0D8D0]/85 font-serif italic tracking-wide"
                  >
                    {loadingPrompts[loadingStep]}
                  </motion.p>
                </AnimatePresence>
              </div>

              <span className="text-[10px] text-white/40 font-serif italic leading-relaxed">
                "We must imagine Sisyphus happy, or at least highly optimized for automated video timelines."
              </span>
            </div>
          </div>
        )}

        {/* Right main workspace columns */}
        <main id="production-workspace" className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#050505]">
          
          {/* Production menu tabs navigation */}
          <nav className="border-b border-white/10 bg-[#0a0a0a] px-8 flex items-center justify-between h-[52px] md:h-[60px] overflow-x-auto gap-4 shrink-0 font-mono text-[9px] uppercase tracking-[0.2em] select-none">
            <div className="flex items-center gap-2 md:gap-4 shrink-0 h-full">
              
              <button
                onClick={() => setActiveTab("blueprint")}
                className={`flex items-center gap-2 h-full px-4 transition-all border-b-2 font-semibold ${
                  activeTab === "blueprint"
                    ? "border-white text-white font-bold"
                    : "border-transparent text-white/40 hover:text-white/80"
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Deep Analysis</span>
              </button>

              <button
                onClick={() => setActiveTab("titles")}
                className={`flex items-center gap-2 h-full px-4 transition-all border-b-2 font-semibold ${
                  activeTab === "titles"
                    ? "border-white text-white font-bold"
                    : "border-transparent text-white/40 hover:text-white/80"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Viral Deck</span>
              </button>

              <button
                onClick={() => setActiveTab("script")}
                className={`flex items-center gap-2 h-full px-4 transition-all border-b-2 font-semibold ${
                  activeTab === "script"
                    ? "border-white text-white font-bold"
                    : "border-transparent text-white/40 hover:text-white/80"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Screenplay Script</span>
              </button>

              <button
                onClick={() => setActiveTab("storyboard")}
                className={`flex items-center gap-2 h-full px-4 transition-all border-b-2 font-semibold ${
                  activeTab === "storyboard"
                    ? "border-white text-white font-bold"
                    : "border-transparent text-white/40 hover:text-white/80"
                }`}
              >
                <Tv className="h-3.5 w-3.5" />
                <span>Cinematic Timeline</span>
              </button>

              <button
                onClick={() => setActiveTab("seo")}
                className={`flex items-center gap-2 h-full px-4 transition-all border-b-2 font-semibold ${
                  activeTab === "seo"
                    ? "border-white text-white font-bold"
                    : "border-transparent text-white/40 hover:text-white/80"
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                <span>SEO & Automation</span>
              </button>

              <button
                onClick={() => setActiveTab("movie")}
                className={`flex items-center gap-2 h-full px-4 transition-all border-b-2 font-semibold ${
                  activeTab === "movie"
                    ? "border-white text-white font-bold"
                    : "border-transparent text-white/40 hover:text-white/80"
                }`}
              >
                <Film className="h-3.5 w-3.5" />
                <span>Veo Animate</span>
              </button>

            </div>

            {activeBlueprint && (
              <div className="hidden md:flex items-center gap-2 text-[9px] text-white/30 shrink-0 uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5" />
                <span>Duration: 5–8 Min</span>
              </div>
            )}
          </nav>

          {/* Active Blueprint Content rendering area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <AnimatePresence mode="wait">
              {activeBlueprint ? (
                <motion.div
                  key={activeBlueprint.topic + activeTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35 }}
                  className="max-w-[1000px] mx-auto flex flex-col gap-8"
                >
                  {activeBlueprint.isLocalFallback && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-950/20 border border-amber-900/40 rounded-none p-4 flex gap-3 text-amber-100"
                    >
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1.5 font-serif">
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400">
                          Offline Creative Writer Active (Local Blueprint Drafted)
                        </span>
                        <p className="text-[11.5px] text-amber-200/95 leading-relaxed">
                          Your live Google GenAI endpoint returned a 403 Permission or 429 Limit block: <em>"{activeBlueprint.fallbackWarning}"</em>. 
                          To ensure your experience remains seamless and fully functional, our <strong>Built-In Offline Creative Writer</strong> took over and successfully compiled a complete, topic-tailored, and poetic storyboard screenplay for <strong>"{activeBlueprint.topic}"</strong>!
                        </p>
                        <span className="text-[10px] text-white/50 bg-black/40 p-2.5 border border-white/5 font-mono leading-normal">
                          💡 <strong>Key Status Note:</strong> You can completely test, read, and preview this custom script in the <strong>Interactive Screenplay</strong>, <strong>Voiceover Player</strong>, and <strong>Timeline Storyboard</strong> panels! If you wish to run full remote generations on raw cloud models, check your Secrets or billing settings.
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* Topic Title Badge Display */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/15 py-0.5 px-2 rounded-md">
                        ACTIVE METAPHOR BLUEPRINT
                      </span>
                      <span className="text-[10px] uppercase font-mono tracking-widest bg-slate-900 text-slate-400 border border-slate-800 py-0.5 px-2 rounded-md">
                        Tone: {activeBlueprint.tone}
                      </span>
                    </div>
                    
                    <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
                      {activeBlueprint.topic}
                    </h2>
                    
                    <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-[800px]">
                      "{activeBlueprint.analysis.coreEmotion}"
                    </p>
                  </div>

                  {/* TAB 1: DEEP PSYCHOLOGICAL BLUEPRINT */}
                  {activeTab === "blueprint" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Section: Analysis Bento Grid */}
                      <div className="md:col-span-2 group border border-slate-900 bg-slate-900/15 p-5 rounded-2xl flex flex-col gap-2">
                        <span className="text-[10px] font-mono text-amber-500 font-bold tracking-wider uppercase">
                          Phase 1: Existential Archetype
                        </span>
                        <h3 className="text-base font-display font-semibold text-slate-200 flex items-center gap-2">
                          Core Human Emotion & Relatability
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {activeBlueprint.analysis.coreEmotion}
                        </p>
                      </div>

                      <div className="border border-slate-900 bg-slate-900/10 hover:bg-slate-900/20 p-5 rounded-2xl flex flex-col gap-2 transition-colors">
                        <span className="text-[10px] font-mono text-slate-400 tracking-wider">CORE PSYCHOLOGICAL CONFLICT</span>
                        <p className="text-xs font-semibold text-slate-200 leading-relaxed">
                          {activeBlueprint.analysis.coreConflict}
                        </p>
                      </div>

                      <div className="border border-slate-900 bg-slate-900/10 hover:bg-slate-900/20 p-5 rounded-2xl flex flex-col gap-2 transition-colors">
                        <span className="text-[10px] font-mono text-slate-400 tracking-wider">THE HIDDEN FEAR</span>
                        <p className="text-xs font-semibold text-slate-200 leading-relaxed text-amber-200/90">
                          {activeBlueprint.analysis.hiddenFear}
                        </p>
                      </div>

                      <div className="border border-slate-900 bg-slate-900/10 hover:bg-slate-900/20 p-5 rounded-2xl flex flex-col gap-2 transition-colors">
                        <span className="text-[10px] font-mono text-slate-400 tracking-wider">THE HIDDEN DESIRE</span>
                        <p className="text-xs font-semibold text-slate-200 leading-relaxed text-slate-300">
                          {activeBlueprint.analysis.hiddenDesire}
                        </p>
                      </div>

                      <div className="border border-slate-900 bg-slate-900/10 hover:bg-slate-900/20 p-5 rounded-2xl flex flex-col gap-2 transition-colors">
                        <span className="text-[10px] font-mono text-slate-400 tracking-wider">THE EXISTENTIAL QUESTION</span>
                        <p className="text-xs font-semibold italic text-slate-200 leading-relaxed">
                          {activeBlueprint.analysis.existentialQuestion}
                        </p>
                      </div>

                      <div className="md:col-span-2 border border-slate-900 bg-slate-900/10 hover:bg-slate-900/20 p-5 rounded-2xl flex flex-col gap-2 transition-colors">
                        <span className="text-[10px] font-mono text-slate-400 tracking-wider font-bold">THE INTERNAL CONTRADICTION / THE SHADOW SELF</span>
                        <p className="text-xs font-medium text-slate-300 leading-relaxed">
                          {activeBlueprint.analysis.internalContradiction}
                        </p>
                      </div>

                      <div className="border border-slate-900 bg-slate-900/10 hover:bg-slate-900/20 p-5 rounded-2xl flex flex-col gap-1.5 transition-colors">
                        <span className="text-[10px] font-mono text-amber-500 font-bold tracking-wider">EMOTIONAL INCITING INCIDENT (TRIGGER)</span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {activeBlueprint.analysis.emotionalTrigger}
                        </p>
                      </div>

                      <div className="border border-slate-900 bg-slate-900/10 hover:bg-slate-900/20 p-5 rounded-2xl flex flex-col gap-1.5 transition-colors">
                        <span className="text-[10px] font-mono text-slate-400 tracking-wider font-semibold">MOST RELATABLE SITUATION</span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {activeBlueprint.analysis.mostRelatableSituation}
                        </p>
                      </div>

                      {/* Section: Viral Positioning Column */}
                      <div className="md:col-span-2 border border-slate-900 bg-gradient-to-r from-slate-950 to-slate-900/45 p-6 rounded-2xl flex flex-col gap-4 mt-2">
                        <div className="flex items-center gap-1 border-b border-slate-900 pb-3">
                          <Layers2 className="h-4.5 w-4.5 text-amber-500" />
                          <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-200">
                            Phase 2: Video Retention Blueprint
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">TARGET PSYCHE</span>
                            <span className="text-xs text-slate-200 font-semibold leading-relaxed">{activeBlueprint.viralPositioning.targetAudience}</span>
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">CURIOSITY GAP POINT</span>
                            <span className="text-xs text-slate-200 font-semibold leading-relaxed">{activeBlueprint.viralPositioning.curiosityGap}</span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">EMOTIONAL AUDIENCE STATE</span>
                            <span className="text-xs text-slate-200 font-semibold leading-relaxed">{activeBlueprint.viralPositioning.emotionalState}</span>
                          </div>
                        </div>

                        <div className="border border-slate-900 bg-slate-950/70 p-4 rounded-xl flex flex-col sm:flex-row justify-between gap-4">
                          <div className="flex flex-col gap-1 max-w-[500px]">
                            <span className="text-[10px] font-mono tracking-wider uppercase text-amber-500">PSYCHOLOGICAL HOOK</span>
                            <p className="text-xs text-slate-300 italic">
                              "{activeBlueprint.viralPositioning.psychologicalHook}"
                            </p>
                          </div>
                          
                          <div className="flex flex-col gap-1 sm:text-right">
                            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-500">OPTIMAL ENTRY SEQUENCE</span>
                            <span className="text-xs text-slate-200 font-bold">High-Retaining Paradox Hook</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 2: VIRAL TITLE & THUMBNAIL POSITIONING DECK */}
                  {activeTab === "titles" && (
                    <div className="flex flex-col gap-8">
                      
                      {/* Section Title Alternative Selection */}
                      <div className="border border-slate-900 bg-slate-900/10 p-5 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-slate-950 pb-3.5">
                          <div className="flex items-center gap-2">
                            <Workflow className="h-4.5 w-4.5 text-amber-500" />
                            <div>
                              <h3 className="text-sm font-display font-semibold text-slate-200">
                                20 Alternative YouTube Video Titles
                              </h3>
                              <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                                Engineered using psychological interest anchors and curiosity loops. Click a title to lock it as your choice.
                              </p>
                            </div>
                          </div>

                          {pinnedTitle && (
                            <div className="text-[10px] font-mono bg-amber-500/10 border border-amber-500/20 rounded px-2.5 py-1 text-amber-400 text-right">
                              Locked Pitch Title: <span className="font-bold underline">{pinnedTitle}</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {activeBlueprint.titles.slice(0, 20).map((title, idx) => {
                            const isPinned = pinnedTitle === title;
                            return (
                              <div
                                key={idx}
                                onClick={() => executeCopy(title, `title-${idx}`)}
                                onDoubleClick={() => setPinnedTitle(title)}
                                title="Double-click to lock as representative choice, single-click to copy"
                                className={`group/title flex items-center justify-between p-3 rounded-none text-xs transition-all cursor-pointer ${
                                  isPinned
                                    ? "bg-white/5 border border-white text-white"
                                    : "bg-[#0a0a0a] border border-white/10 hover:bg-white/[0.03] hover:border-white/25 text-white/80"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <span className={`text-[10px] font-mono tracking-wider text-white/30 group-hover/title:text-white ${isPinned ? "text-white" : ""}`}>
                                    {(idx + 1).toString().padStart(2, "0")}
                                  </span>
                                  <span className="truncate font-medium">{title}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setPinnedTitle(title); }}
                                    className={`p-1 rounded-none opacity-0 group-hover/title:opacity-100 hover:bg-white/10 text-white/50 transition-all ${isPinned ? "opacity-100 text-white" : ""}`}
                                    title="Lock as Primary Pitch Title"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); executeCopy(title, `title-${idx}`); }}
                                    className="p-1 rounded-none opacity-0 group-hover/title:opacity-100 hover:bg-white/10 text-white/50 transition-all"
                                    title="Copy Title"
                                  >
                                    {copiedSection === `title-${idx}` ? (
                                      <Check className="h-3.5 w-3.5 text-green-400" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section: Thumbnail Concepts with Chalk Previews */}
                      <div className="flex flex-col gap-4">
                        <h4 className="text-sm font-display font-semibold text-slate-200 flex items-center gap-2">
                          <Eye className="h-4.5 w-4.5 text-amber-500" />
                          Minimalist Dark Thumbnail Concepts (Chalk Sketches)
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          {activeBlueprint.thumbnailIdeas.map((thumb) => {
                            const isPinned = pinnedThumbnail === thumb.id;
                            return (
                              <div
                                key={thumb.id}
                                className={`border rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden transition-all select-none ${
                                  isPinned
                                    ? "bg-amber-950/15 border-amber-600/40"
                                    : "bg-slate-900/20 border-slate-950 hover:bg-slate-900/30 hover:border-slate-900"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono bg-slate-900 text-slate-500 border border-slate-800 px-2.5 py-0.5 rounded-md font-bold">
                                    CONCEPT {(thumb.id || 1).toString().padStart(2, "0")}
                                  </span>
                                  <button
                                    onClick={() => setPinnedThumbnail(thumb.id)}
                                    className={`px-2 py-0.5 text-[10px] font-mono border rounded transition-all ${
                                      isPinned
                                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30 font-bold"
                                        : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                                    }`}
                                  >
                                    {isPinned ? "Locked Frame" : "Select Frame"}
                                  </button>
                                </div>

                                {/* Chalk representation frame mock */}
                                <div className="aspect-[16/9] w-full rounded-xl bg-slate-950 border border-slate-900 flex flex-col items-center justify-center p-3 text-center relative overflow-hidden shadow-inner group-hover:border-slate-800">
                                  
                                  {/* Symbolic chalkboard rendering illustration */}
                                  <div className="absolute inset-0 bg-[radial-gradient(#111827_0.5px,transparent_0.5px)] [background-size:12px_12px] opacity-15" />
                                  
                                  {thumb.id === 1 ? (
                                    <svg className="w-16 h-16 stroke-slate-500 fill-none mb-2" viewBox="0 0 100 100">
                                      <path d="M50,15 A12,12 0 0,0 38,27 L62,27 A12,12 0 0,0 50,15 Z" strokeDasharray="3,3" />
                                      <line x1="50" y1="27" x2="50" y2="75" strokeWidth="1.5" />
                                      <circle cx="50" cy="80" r="4" strokeWidth="2" stroke="#f59e0b" className="animate-pulse" />
                                      <path d="M20,85 C40,75 60,75 80,85" strokeWidth="1" strokeDasharray="4,2" />
                                    </svg>
                                  ) : thumb.id === 2 ? (
                                    <svg className="w-16 h-16 stroke-slate-500 fill-none mb-2" viewBox="0 0 100 100">
                                      {/* Stacked sheets representation */}
                                      <rect x="25" y="25" width="40" height="50" rx="3" strokeWidth="1" strokeDasharray="3,3" />
                                      <rect x="35" y="35" width="40" height="50" rx="3" strokeWidth="1.2" />
                                      <circle cx="55" cy="60" r="2" strokeWidth="2" stroke="#ef4444" />
                                    </svg>
                                  ) : (
                                    <svg className="w-16 h-16 stroke-slate-500 fill-none mb-2" viewBox="0 0 100 100">
                                      {/* Hourglass walker */}
                                      <line x1="30" y1="30" x2="70" y2="30" strokeWidth="2" />
                                      <line x1="30" y1="70" x2="70" y2="70" strokeWidth="2" />
                                      <path d="M30,30 L50,50 L30,70" strokeWidth="1.5" />
                                      <path d="M70,30 L50,50 L70,70" strokeWidth="1.5" />
                                      <circle cx="50" cy="50" r="3" stroke="#f59e0b" className="animate-pulse" />
                                      <circle cx="50" cy="85" r="3" />
                                    </svg>
                                  )}

                                  <span className="text-[10px] font-mono text-slate-400 font-semibold tracking-wide">
                                    {thumb.conceptName}
                                  </span>
                                  <p className="text-[9px] text-slate-500 leading-tight mt-1 px-2 line-clamp-2">
                                    {thumb.visualComposition}
                                  </p>
                                </div>

                                <div className="flex flex-col gap-1.5 mt-2">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-mono text-slate-500">SYMBOLIC CUE:</span>
                                    <span className="text-[10px] font-bold text-slate-300 font-mono truncate">{thumb.symbolicElement}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                                    {thumb.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 3: SCREENPLAY & IMMERSIVE SCRIPT READER */}
                  {activeTab === "script" && (
                    <div className="flex flex-col gap-6">

                      <div className="bg-[#0a0a0a] border border-white/10 rounded-none p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-mono text-white/50 font-bold uppercase tracking-widest block">
                            🎙️ Cinematic Teleprompt Manuscript
                          </span>
                          <p className="text-xs text-[#E0D8D0]/60 mt-1">
                            The full literary sequence formatted for voiceover production. Note: Toggle the **Atmospheric Soundtrack** to play a rich drone while reading.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
                          <button
                            onClick={() => {
                              setIsEditingScript(true);
                              setEditedScriptText(activeBlueprint.scriptText);
                            }}
                            className="flex items-center gap-1.5 bg-white hover:bg-[#e2dacb] text-black text-xs px-3.5 py-2 font-mono uppercase tracking-[0.08em] font-extrabold transition-all rounded-none cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-black" />
                            <span>Edit Manuscript</span>
                          </button>

                          <button
                            onClick={() => executeCopy(activeBlueprint.scriptText, "script-text")}
                            className="flex items-center gap-1.5 bg-[#0a0a0a] hover:bg-white/[0.03] border border-white/10 text-xs px-3.5 py-2 hover:border-white/20 text-[#E0D8D0] font-mono uppercase tracking-widest transition-all rounded-none cursor-pointer"
                          >
                            {copiedSection === "script-text" ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-green-400" />
                                <span>Monologue Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-white/40" />
                                <span>Copy Full Script Monologue</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Sentiment & Tone Profile Analysis card */}
                      <SentimentToneDiagnostic 
                        scriptText={activeBlueprint.scriptText}
                        targetTone={activeBlueprint.tone}
                      />

                      {/* Immersive View Mode selection tabs */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0a0a0a] border border-white/10 p-1.5 rounded-none">
                        <div className="flex gap-1 flex-1">
                          <button
                            onClick={() => setTeleprompterMode(false)}
                            className={`flex-1 md:flex-none px-6 py-2.5 text-[10px] font-mono uppercase tracking-widest font-bold transition-all text-center rounded-none cursor-pointer ${
                              !teleprompterMode 
                                ? "bg-white text-black font-sans" 
                                : "text-white/40 hover:text-white"
                            }`}
                          >
                            Double-Spaced Script Document
                          </button>
                          
                          <button
                            onClick={() => setTeleprompterMode(true)}
                            className={`flex-1 md:flex-none px-6 py-2.5 text-[10px] font-mono uppercase tracking-widest font-bold transition-all text-center rounded-none cursor-pointer ${
                              teleprompterMode 
                                ? "bg-white text-black font-sans" 
                                : "text-white/40 hover:text-white"
                            }`}
                          >
                            Active Teleprompter Mode
                          </button>
                        </div>

                        <button
                          onClick={() => setVoiceoverAlign(!voiceoverAlign)}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest font-bold rounded-none transition-all cursor-pointer ${
                            voiceoverAlign 
                              ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 shadow-[0_0_8px_rgba(16,185,129,0.15)] md:mr-1" 
                              : "bg-white/5 text-white/40 hover:text-white border border-white/10 md:mr-1"
                          }`}
                        >
                          <span className={`relative flex h-2 w-2 ${voiceoverAlign ? "block" : "hidden"}`}>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>🎙️ Voiceover Alignment: {voiceoverAlign ? "ACTIVE" : "OFF"}</span>
                        </button>
                      </div>

                      {teleprompterMode ? (
                        <TeleprompterView 
                          scriptText={activeBlueprint.scriptText} 
                          activeSceneIdx={activeSceneIdx}
                          voiceoverAlign={voiceoverAlign}
                          onVoiceoverAlignToggle={setVoiceoverAlign}
                        />
                      ) : (
                        /* Fully styled Screenplay Draft board */
                        <div className="border border-white/10 rounded-none overflow-hidden bg-[#0a0a0a]">
                          {/* Paper header decoration mimicking terminal drafts */}
                          <div className="bg-[#050505] border-b border-white/10 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4.5 w-4.5 text-white/40 animate-pulse" />
                              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E0D8D0]/60 font-bold">
                                Exposition Monologue Draft
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-[10px] font-mono text-white/30 tracking-widest uppercase">
                              <span>Double-spaced narrative mode</span>
                            </div>
                          </div>

                          {/* Interactive annotated text editor representation */}
                          {isEditingScript ? (
                            <div className="p-6 md:p-8 flex flex-col gap-5 min-h-[400px] w-full">
                              <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">
                                  Manuscript Workspace Editor (Structure by "### PART_NAME_HEADER")
                                </label>
                                <p className="text-[11px] text-[#E0D8D0]/50 tracking-wide">
                                  Modify the segments below. Every "###" header denotes a new scene's narrating paragraph. Preserving headers ensures automated structural alignment.
                                </p>
                                <textarea
                                  value={editedScriptText}
                                  onChange={(e) => setEditedScriptText(e.target.value)}
                                  className="w-full h-[380px] bg-[#050505] border border-white/10 rounded-sm p-5 text-sm font-mono text-[#E0D8D0] leading-relaxed focus:outline-none focus:border-white/30 resize-y select-text shadow-inner"
                                  placeholder="### HOOK (0-30s)&#10;Enter monologue text here..."
                                />
                              </div>

                              <div className="flex items-center gap-3 justify-end mt-2">
                                <button
                                  type="button"
                                  onClick={() => setIsEditingScript(false)}
                                  className="px-4 py-2 border border-white/10 hover:border-white/20 text-xs font-mono uppercase tracking-widest text-[#E0D8D0]/60 hover:text-white transition-all rounded-none cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveEditedScript}
                                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-extrabold uppercase tracking-widest transition-all rounded-none cursor-pointer"
                                >
                                  Apply Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 min-h-[400px]">
                              
                              {/* Main script narrative column */}
                              <div className="flex-1 flex flex-col gap-8 font-sans text-white/80 font-serif leading-relaxed text-[#E0D8D0]/90">
                                {activeBlueprint.scriptText.split("###").filter(b => b.trim().length > 0).map((part, index) => {
                                  const lines = part.trim().split("\n");
                                  const sectionHeader = lines[0];
                                  const paragraphBody = lines.slice(1).join("\n");
                                  
                                  const isParagraphActive = voiceoverAlign && index === activeSceneIdx;

                                  return (
                                    <div 
                                      key={index} 
                                      id={`script-block-${index}`}
                                      onClick={() => {
                                        if (voiceoverAlign) {
                                          setActiveSceneIdx(index);
                                        }
                                      }}
                                      className={`flex flex-col gap-3 group relative border-l pl-5 transition-all duration-500 scroll-mt-28 py-2.5 rounded-none cursor-pointer ${
                                        isParagraphActive 
                                          ? "border-emerald-500 bg-emerald-500/[0.03] shadow-[inset_0_0_15px_rgba(16,185,129,0.02)] -translate-x-1" 
                                          : "border-white/10 hover:border-white/35"
                                      }`}
                                    >
                                      {isParagraphActive && (
                                        <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 uppercase tracking-widest flex items-center gap-1 w-fit mb-1 font-bold">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                          Active Scene Segment
                                        </span>
                                      )}
                                      {/* Section heading marker */}
                                      <div className="flex items-center gap-2">
                                        <span className={`${isParagraphActive ? "text-emerald-300 font-bold" : "text-[#E0D8D0]/60"} text-[10px] font-mono font-bold uppercase tracking-[0.2em]`}>
                                          {sectionHeader.trim()}
                                        </span>
                                      </div>
                                      
                                      {/* Paragraph script text */}
                                      <p className={`text-sm md:text-base leading-relaxed md:leading-loose font-normal whitespace-pre-wrap select-text transition-all duration-500 ${
                                        isParagraphActive ? "text-white" : "text-[#E0D8D0]/70"
                                      }`}>
                                        {paragraphBody.trim()}
                                      </p>

                                      {/* Hover Action Toolbar */}
                                      <div className="flex items-center gap-4 mt-2 transition-opacity duration-300">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            executeCopy(paragraphBody.trim(), `script-copy-${index}`);
                                          }}
                                          className="text-[10px] font-mono text-white/40 hover:text-white flex items-center gap-1 transition-all uppercase tracking-widest cursor-pointer"
                                        >
                                          {copiedSection === `script-copy-${index}` ? (
                                            <Check className="h-3 w-3 text-green-400" />
                                          ) : (
                                            <Copy className="h-3 w-3" />
                                          )}
                                          <span>Copy Segment</span>
                                        </button>
                                        
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadTts(paragraphBody.trim(), `script-tts-${index}`, `narrator-scene-${index + 1}.mp3`);
                                          }}
                                          disabled={downloadingTtsId !== null}
                                          className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-all uppercase tracking-widest disabled:opacity-50 cursor-pointer"
                                        >
                                          {downloadingTtsId === `script-tts-${index}` ? (
                                            <span className="flex items-center gap-1">
                                              <span className="w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent animate-spin rounded-full inline-block" />
                                              <span>Exporting...</span>
                                            </span>
                                          ) : (
                                            <>
                                              <Download className="h-3 w-3" />
                                              <span>Download Voiceover Track</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                            {/* Annotated sidebar column matching retention cues */}
                            <div className="w-full md:w-[240px] shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-6 flex flex-col gap-4">
                              <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                                <Workflow className="h-3.5 w-3.5 text-white/40" />
                                Structural Direction
                              </h5>

                              <div className="flex flex-col gap-3.5">
                                <div className="bg-[#050505] border border-white/10 rounded-none p-4 flex flex-col gap-1.5">
                                  <span className="text-[9px] font-mono text-white font-bold uppercase tracking-wider">SEC 0:00 - 0:30 (THE HOOK)</span>
                                  <p className="text-[11px] text-[#E0D8D0]/60 leading-relaxed font-sans">
                                    Target the viewer's current state of overthinking directly. Create immediate alignment.
                                  </p>
                                </div>

                                <div className="bg-[#050505] border border-white/10 rounded-none p-4 flex flex-col gap-1.5">
                                  <span className="text-[9px] font-mono text-white/40 font-bold uppercase tracking-wider">SEC 1:30 (COGNITIVE STORY)</span>
                                  <p className="text-[11px] text-[#E0D8D0]/60 leading-relaxed font-sans">
                                    Introduce the hand-drawn metaphor (stretching back into childhood) to stabilize focus.
                                  </p>
                                </div>

                                <div className="bg-[#050505] border border-white/10 rounded-none p-4 flex flex-col gap-1.5">
                                  <span className="text-[9px] font-mono text-white/40 font-bold uppercase tracking-wider">SEC 4:00 (PHILOSOPHICAL LAYER)</span>
                                  <p className="text-[11px] text-[#E0D8D0]/60 leading-relaxed font-sans">
                                    Overlay existentialism as a form of comfort. Provide conceptual framework.
                                  </p>
                                </div>

                                <div className="bg-[#050505] border border-white/10 rounded-none p-4 flex flex-col gap-1.5">
                                  <span className="text-[9px] font-mono text-white font-bold uppercase tracking-wider">SEC 7:00 (THE COLD RELEASE)</span>
                                  <p className="text-[11px] text-[#E0D8D0]/60 leading-relaxed font-sans">
                                    Decimate motivational clichés. Quiet, raw call to imperfect courage.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    </div>
                  )}

                  {/* TAB 4: CINEMATIC TIMELINE STORYBOARD */}
                  {activeTab === "storyboard" && (
                    <div className="flex flex-col gap-6">

                      {/* Header overview mapping */}
                      <div className="bg-[#0a0a0a] border border-white/10 rounded-none p-6 flex flex-col gap-2">
                        <span className="text-[9px] font-mono text-white/30 font-bold uppercase tracking-[0.25em] block">
                          Phase 4: Multi-scene Interactive Timeline
                        </span>
                        <h3 className="text-sm font-serif tracking-wide text-white uppercase">
                          Production Storyboard Sequence
                        </h3>
                        <p className="text-xs text-[#E0D8D0]/60 leading-relaxed font-sans mt-1">
                          A side-by-side view combining direct voiceover cues, detailed camera instructions, style-locked illustration prompts, and specific audio cues. Copy or save prompts individually for Midjourney or Imagen generation.
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-3 pt-3 border-t border-white/5">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${consistencySettings.enabled ? "bg-emerald-400 animate-pulse" : "bg-white/25"}`} />
                            <span className="text-[10px] font-mono text-white/45 tracking-widest uppercase">
                              Character Locks: {consistencySettings.enabled ? "Active for Protagonist" : "Standard prompt defaults"}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={() => setFilmGrainPreviewEnabled(!filmGrainPreviewEnabled)}
                              className={`text-[10px] font-mono uppercase tracking-widest border font-bold h-9 px-4 flex items-center gap-2 transition-all outline-none rounded-none cursor-pointer ${
                                filmGrainPreviewEnabled 
                                  ? "bg-white text-black border-white" 
                                  : "bg-transparent border-white/20 hover:border-white text-white/70"
                              }`}
                            >
                              <span>35mm Film Grain: {filmGrainPreviewEnabled ? "ON" : "OFF"}</span>
                            </button>

                            <button
                              onClick={() => setIsConsistencyModalOpen(true)}
                              className="text-[10px] font-mono uppercase tracking-widest bg-white hover:bg-[#e0d8d0] text-black font-bold h-9 px-4 flex items-center gap-2 transition-all outline-none rounded-none cursor-pointer animate-pulse"
                            >
                              <User className="h-3.5 w-3.5" />
                              <span>Setup Character Consistency</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* EXPORT PIPELINE QUICK ASSISTANCE GUIDE */}
                      <div className="bg-amber-500/5 border border-amber-500/25 p-6 rounded-none flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                          <span className="p-1 bg-amber-500/10 text-amber-500 rounded-none">
                            <Film className="h-4 w-4" />
                          </span>
                          <h4 className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest">
                            Video Production & Export Pipeline Helper
                          </h4>
                        </div>
                        <p className="text-xs text-[#E0D8D0]/75 leading-relaxed font-sans">
                          To assemble your documentary video, let's locate the three essential elements of your production. Use the quick links below to view and download each file:
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                          
                          {/* Column 1: Screenplay Script text */}
                          <div className="bg-[#0c0c0c] border border-white/5 p-4 flex flex-col gap-3 justify-between">
                            <div>
                              <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 block mb-1">Part 1</span>
                              <h5 className="text-xs font-serif text-white font-medium">Screenplay Script / Voiceover Text</h5>
                              <p className="text-[11px] text-[#E0D8D0]/50 mt-1 leading-normal font-sans">
                                The full dramatic narration text formatted for voiceover production.
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                              <button
                                onClick={() => setActiveTab("script")}
                                className="w-full text-center py-2 bg-white/5 hover:bg-white/10 text-white font-mono text-[10px] uppercase font-bold tracking-wider transition-all rounded-none cursor-pointer"
                              >
                                Go to Screenplay Script Tab
                              </button>
                              <button
                                onClick={() => executeCopy(activeBlueprint.scriptText, "script-text")}
                                className="w-full text-center py-1.5 bg-transparent border border-white/10 hover:border-white/25 text-[#E0D8D0]/70 hover:text-white font-mono text-[9px] uppercase tracking-wider transition-all rounded-none cursor-pointer"
                              >
                                {copiedSection === "script-text" ? "✓ Monologue Copied" : "Copy Full Script Monologue"}
                              </button>
                            </div>
                          </div>

                          {/* Column 2: Voiceover Audio MP3 */}
                          <div className="bg-[#0c0c0c] border border-white/5 p-4 flex flex-col gap-3 justify-between">
                            <div>
                              <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 block mb-1">Part 2</span>
                              <h5 className="text-xs font-serif text-white font-medium">High fidelity Audio Narration (.mp3)</h5>
                              <p className="text-[11px] text-[#E0D8D0]/50 mt-1 leading-normal font-sans">
                                Professional voiceovers rendered either via our cloud synth or your native speech generator.
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                              <button
                                onClick={() => {
                                  const el = document.getElementById("narrator-pre-visualization-suite");
                                  if (el) {
                                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                                  } else {
                                    // fallback: scroll to cinematic player container
                                    window.scrollTo({ top: window.scrollY + 400, behavior: "smooth" });
                                  }
                                }}
                                className="w-full text-center py-2 bg-white/5 hover:bg-white/10 text-white font-mono text-[10px] uppercase font-bold tracking-wider transition-all rounded-none cursor-pointer"
                              >
                                Scroll to Narration Player
                              </button>
                              <span className="text-[9px] font-mono text-center text-amber-500/60 uppercase">
                                click download icon key inside player
                              </span>
                            </div>
                          </div>

                          {/* Column 3: Cinematic Video Clip */}
                          <div className="bg-[#0c0c0c] border border-white/5 p-4 flex flex-col gap-3 justify-between">
                            <div>
                              <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 block mb-1">Part 3</span>
                              <h5 className="text-xs font-serif text-white font-medium">Cinematic Video Motion (.mp4)</h5>
                              <p className="text-[11px] text-[#E0D8D0]/50 mt-1 leading-normal font-sans">
                                Dynamic camera pans and breathing motion synthesized from your storyboards in high fidelity.
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                              <button
                                onClick={() => setActiveTab("movie")}
                                className="w-full text-center py-2 bg-white/10 hover:bg-white/25 hover:text-white text-white font-mono text-[10px] uppercase font-bold tracking-wider transition-all rounded-none cursor-pointer border border-[#E0D8D0]/20"
                              >
                                Go to Veo Animate Tab
                              </button>
                              <span className="text-[9px] font-mono text-center text-[#E0D8D0]/40 lowercase mt-0.5">
                                runs local engine or cloud veo instantly
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Interactive D3 Emotional Intensity Curve */}
                      <TimelineIntensityChart 
                        scenes={activeBlueprint.scenes}
                        onSceneClick={(idx) => {
                          setActiveSceneIdx(idx);
                          const el = document.getElementById(`scene-card-${idx}`);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                        }}
                        onReorderScenes={handleReorderScenes}
                      />

                      {/* Cinematic Narrative Pre-visualization Suite & 35mm Film Composite */}
                      <div id="narrator-pre-visualization-suite">
                        <CinematicVideoPlayer 
                          scenes={activeBlueprint.scenes}
                          initialActiveIdx={activeSceneIdx}
                          onSceneChange={(idx) => {
                            setActiveSceneIdx(idx);
                          }}
                          consistencySettings={consistencySettings}
                          selectedTone={selectedTone}
                          artDirectionSettings={artDirection}
                          autoPlay={autoplayPlayer}
                        />
                      </div>

                      {/* Step-by-step storyboard items list */}
                      <div className="flex flex-col gap-8 relative pl-5 border-l border-white/10">
                        {activeBlueprint.scenes.map((scene, idx) => (
                          <div
                            key={scene.number}
                            id={`scene-card-${idx}`}
                            className="bg-[#0a0a0a] border border-white/10 rounded-none p-6 md:p-8 shadow-sm hover:border-white/25 transition-all flex flex-col lg:flex-row gap-6 relative scroll-mt-24"
                          >
                            
                            {/* Visual Timeline Connector Node */}
                            {(() => {
                              const missingTraits = getMissingCharacterTraits(scene.imagePrompt);
                              if (consistencySettings.enabled && missingTraits.length > 0) {
                                return (
                                  <div 
                                    className="absolute left-[-29px] top-[26px] w-[20px] h-[20px] bg-amber-950 border border-amber-500 rounded-full z-20 flex items-center justify-center animate-bounce animate-pulse cursor-help animate-duration-1000" 
                                    title={`Character Concept Drift: Missing: ${missingTraits.join(", ")}`}
                                  >
                                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                                  </div>
                                );
                              }
                              return (
                                <div className="absolute left-[-26px] top-[30px] w-3 h-3 bg-[#050505] border border-white rotate-45 z-10 flex items-center justify-center">
                                  <div className="w-1 h-1 bg-white" />
                                </div>
                              );
                            })()}

                            {/* Left sub-column: Scene Meta specifics and Sketch Canvas */}
                            <div className="w-full lg:w-[260px] shrink-0 flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-mono font-bold bg-white/5 text-white border border-white/20 px-3 py-1 uppercase tracking-[0.15em] rounded-none">
                                  Scene {scene.number.toString().padStart(2, "0")}
                                </span>
                                <span className="text-[10px] font-mono text-white/40 flex items-center gap-1.5 uppercase tracking-wider">
                                  <Clock className="h-3.5 w-3.5 text-white/30" />
                                  {scene.duration}
                                </span>
                              </div>

                              {/* Stylized blackboard image prompt preview frame */}
                              <div className={`aspect-[16/9] w-full bg-[#050505] border border-white/10 rounded-none relative overflow-hidden flex flex-col p-3 justify-center items-center text-center group/story transition-all ${
                                filmGrainPreviewEnabled ? "grayscale contrast-[1.35] brightness-[0.8] shadow-inner" : ""
                              }`}>
                                <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/25 absolute top-2 left-3 z-20">
                                  Minimalist Chalk Sketch Mock
                                </span>

                                {/* Minimal vector chalkboard diagrams */}
                                <div className="relative shrink-0 flex items-center justify-center py-2 z-20">
                                  {scene.number === 1 ? (
                                    <svg className="w-12 h-12 stroke-white/20 fill-none mb-1 opacity-70" viewBox="0 0 100 100">
                                      <rect x="35" y="35" width="30" height="50" rx="0" strokeDasharray="3,3" />
                                      <line x1="50" y1="20" x2="50" y2="35" />
                                      <circle cx="50" cy="18" r="3" stroke="#fff" className="animate-pulse" />
                                      <line x1="20" y1="85" x2="80" y2="85" />
                                    </svg>
                                  ) : scene.number === 2 ? (
                                    <svg className="w-12 h-12 stroke-white/20 fill-none mb-1 opacity-70" viewBox="0 0 100 100">
                                      <circle cx="50" cy="50" r="24" strokeDasharray="4,2" />
                                      <path d="M50,15 L50,85" />
                                      <circle cx="50" cy="50" r="4" stroke="#fff" />
                                    </svg>
                                  ) : scene.number === 3 ? (
                                    <svg className="w-12 h-12 stroke-white/20 fill-none mb-1 opacity-70" viewBox="0 0 100 100">
                                      <path d="M25,25 L75,25 L50,50 L25,75 L75,75 M50,51 L50,74" />
                                      <circle cx="50" cy="74" r="3" stroke="#fff" />
                                    </svg>
                                  ) : scene.number === 4 ? (
                                    <svg className="w-12 h-12 stroke-white/20 fill-none mb-1 opacity-70" viewBox="0 0 100 100">
                                      <line x1="15" y1="80" x2="85" y2="80" strokeWidth="1" />
                                      <path d="M50,15 L50,80 M20,40 L80,40" strokeDasharray="2,2" />
                                      <circle cx="50" cy="40" r="5" stroke="#fff" />
                                    </svg>
                                  ) : (
                                    <svg className="w-12 h-12 stroke-white/20 fill-none mb-1 opacity-70" viewBox="0 0 100 100">
                                      <path d="M15,85 Q50,20 85,85 Z" strokeDasharray="4,2" />
                                      <circle cx="50" cy="50" r="4" stroke="#fff" className="animate-pulse" />
                                    </svg>
                                  )}
                                </div>

                                <p className="text-[10px] font-mono text-white/30 font-bold truncate max-w-full tracking-widest uppercase z-20">
                                  {scene.section}
                                </p>
                                <span className="text-[10px] text-white/40 font-serif italic truncate max-w-full px-2 mt-0.5 z-20">
                                  {scene.emotion}
                                </span>

                                {/* 35mm grain composite screen layers */}
                                {filmGrainPreviewEnabled && (
                                  <>
                                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_50%,rgba(0,0,0,0.8)_100%)] z-10" />
                                    <div className="absolute inset-[-50%] pointer-events-none organic-grain-overlay z-10" />
                                    <div className="absolute left-[35%] top-0 bottom-0 pointer-events-none film-scratch-line z-10" />
                                    <div className="absolute inset-0 pointer-events-none z-10 bg-white/[0.04] mix-blend-color-dodge animate-[custom-flicker_0.15s_infinite]" />
                                  </>
                                )}
                              </div>

                              {/* Technical camera direction cues */}
                              <div className="flex flex-col gap-2 bg-[#050505] p-4 rounded-none border border-white/10">
                                <div className="flex items-center gap-1.5 select-none">
                                  <Layers className="h-3.5 w-3.5 text-white/40" />
                                  <span className="text-[9px] font-mono text-white/40 font-bold uppercase tracking-widest">CAMERA MOVEMENT</span>
                                </div>
                                <span className="text-[11px] text-[#E0D8D0] tracking-wider font-mono font-medium leading-relaxed uppercase">
                                  {scene.cameraMovement}
                                </span>
                              </div>

                              <div className="flex flex-col gap-2 bg-[#050505] p-4 rounded-none border border-white/10">
                                <div className="flex items-center gap-1.5 select-none">
                                  <Sparkles className="h-3.5 w-3.5 text-white/40" />
                                  <span className="text-[9px] font-mono text-white/40 font-bold uppercase tracking-widest">MUSIC LAYER</span>
                                </div>
                                <span className="text-[11px] text-[#E0D8D0] font-mono tracking-wider font-semibold uppercase">
                                  {scene.musicCategory}
                                </span>
                              </div>
                            </div>

                            {/* Right sub-column: Story screenplay content and voiceover details */}
                            <div className="flex-1 flex flex-col gap-4">
                              
                              {/* Voiceover narration monologues card */}
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-[0.15em]">VOICEOVER DIALOGUE (NARRATOR)</span>
                                  <div className="flex items-center gap-4 shrink-0">
                                    <button
                                      onClick={() => handleDownloadTts(scene.voiceoverText, `vo-tts-${idx}`, `voiceover-scene-${idx + 1}.mp3`)}
                                      disabled={downloadingTtsId !== null}
                                      className="text-[10.5px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-all uppercase tracking-widest disabled:opacity-50 cursor-pointer"
                                      title="Generate and download synthesized English MP3 narrator audio for this block"
                                    >
                                      {downloadingTtsId === `vo-tts-${idx}` ? (
                                        <span className="flex items-center gap-1">
                                          <span className="w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent animate-spin rounded-full inline-block" />
                                          <span>EXPORTING...</span>
                                        </span>
                                      ) : (
                                        <>
                                          <Download className="h-3 w-3 text-emerald-400" />
                                          <span>Download Voice Track</span>
                                        </>
                                      )}
                                    </button>

                                    <button
                                      onClick={() => executeCopy(scene.voiceoverText, `vo-${idx}`)}
                                      className="text-[10.5px] font-mono text-white/40 hover:text-white flex items-center gap-1.5 transition-all uppercase tracking-widest cursor-pointer"
                                    >
                                      {copiedSection === `vo-${idx}` ? (
                                        <Check className="h-3.5 w-3.5 text-green-400" />
                                      ) : (
                                        <>
                                          <Copy className="h-3 w-3" />
                                          <span>Copy Dialogue</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="bg-[#050505]/40 border border-white/10 p-5 rounded-none relative">
                                  <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-white/10" />
                                  <p className="text-sm text-[#E0D8D0] leading-relaxed font-serif pl-5 select-text font-normal italic">
                                    "{scene.voiceoverText}"
                                  </p>
                                </div>
                              </div>

                              {/* On-screen visual directives card */}
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-[0.15em]">ON-SCREEN STAGE SYMBOLISM & DETAILS</span>
                                <div className="bg-transparent border border-white/10 p-5 rounded-none">
                                  <p className="text-xs text-[#E0D8D0]/80 leading-relaxed font-serif">
                                    {scene.visualDescription}
                                  </p>
                                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5 text-[9px] font-mono text-white/30 uppercase tracking-widest">
                                    <span>Transition:</span>
                                    <span className="text-white/60">{scene.transitionType}</span>
                                  </div>
                                </div>
                              </div>

                              {/* StyleLocked AI Image Generator Prompt */}
                              <div className="flex flex-col gap-2 bg-[#050505] border border-white/10 rounded-none p-5 mt-1">
                                {(() => {
                                  const missingTraits = getMissingCharacterTraits(scene.imagePrompt);
                                  if (consistencySettings.enabled && missingTraits.length > 0) {
                                    return (
                                      <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 mb-2 rounded-none flex items-start gap-2.5 font-mono">
                                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                                        <div className="flex flex-col gap-1.5">
                                          <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                                            Character Concept Drift Warning
                                          </span>
                                          <p className="text-[10.5px] text-[#E0D8D0]/70 font-sans leading-relaxed">
                                            This active scene's raw template lacks references to your locked protagonist <strong>"{consistencySettings.name}"</strong>. Dynamic model rendering automatically injects stability locks to override design drift in active rendering.
                                          </p>
                                          <div className="flex flex-wrap gap-1 mt-1 pr-1">
                                            {missingTraits.map((t, index) => (
                                              <span key={index} className="text-[7.5px] bg-amber-500/20 border border-amber-500/30 text-amber-400 font-extrabold px-1.5 py-0.5 tracking-wider uppercase">
                                                Missing {t}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-white/50 font-bold tracking-[0.2em] uppercase">
                                      STYLE-LOCKED AI PROMPT FOR IMAGE DESIGN
                                    </span>
                                    {(consistencySettings.enabled || artDirection.enabled) && (
                                      <span className="text-[8px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 tracking-widest uppercase font-bold">
                                        Locks Applied
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => executeCopy(getEffectivePrompt(scene.imagePrompt), `prompt-${idx}`)}
                                    className="text-[9px] font-mono text-white/40 hover:text-white hover:bg-white/5 border border-white/20 px-3 py-1.5 rounded-none transition-all flex items-center gap-1 uppercase tracking-widest cursor-pointer"
                                  >
                                    {copiedSection === `prompt-${idx}` ? (
                                      <Check className="h-3 w-3 text-green-400" />
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" />
                                        <span>Copy Prompt</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="bg-black/45 p-4 rounded-none border border-white/5 select-text">
                                  <p className="text-[11px] font-mono leading-relaxed text-[#E0D8D0]/90">
                                    {getEffectivePrompt(scene.imagePrompt)}
                                  </p>
                                </div>
                              </div>

                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  )}

                  {/* TAB 5: YOUTUBE SEO & AUTOMATION JSON EXPORTS */}
                  {activeTab === "seo" && (
                    <div className="flex flex-col gap-6">

                      {/* Header overview info */}
                      <div className="bg-[#0a0a0a] border border-white/10 rounded-none p-6 flex flex-col gap-2">
                        <span className="text-[9px] font-mono text-white/30 font-bold uppercase tracking-[0.25em] block">
                          Phase 5: Automated Publish Suite
                        </span>
                        <h3 className="text-sm font-serif tracking-wide text-white uppercase">
                          YouTube Video SEO & Metadata Automator
                        </h3>
                        <p className="text-xs text-[#E0D8D0]/60 leading-relaxed font-sans mt-1">
                          Ready-to-copy publish deck containing optimized description block, dynamic chapters, keywords, metadata tags, and active social comment structures designed to boost retention and community comment response.
                        </p>
                      </div>

                      {/* Video Publish Assets Panel */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        {/* Dynamic Description Box */}
                        <div className="border border-white/10 bg-[#0a0a0a] p-6 rounded-none flex flex-col gap-3.5">
                          <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <span className="text-[10px] font-mono text-[#E0D8D0]/60 font-bold uppercase tracking-widest">optimized video description block</span>
                            <button
                              onClick={() => executeCopy(activeBlueprint.description, "desc")}
                              className="text-[10px] font-mono text-white/40 hover:text-white flex items-center gap-1 transition-all uppercase tracking-widest"
                            >
                              {copiedSection === "desc" ? (
                                <Check className="h-3.5 w-3.5 text-green-400" />
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy Text</span>
                                </>
                              )}
                            </button>
                          </div>
                          
                          <textarea
                            readOnly
                            value={activeBlueprint.description}
                            rows={12}
                            className="w-full bg-[#050505] border border-white/10 focus:outline-none focus:border-white/30 rounded-none p-4 text-xs leading-relaxed font-sans text-[#E0D8D0]/80 select-text resize-none"
                          />
                        </div>

                        {/* Metadata Tag Suite and Pinned Comment Box */}
                        <div className="flex flex-col gap-5">
                          
                          {/* Selected Pitch Target Metadata Card */}
                          <div className="border border-white/10 bg-[#0a0a0a] p-6 rounded-none flex flex-col gap-3">
                            <span className="text-[10px] font-mono text-[#E0D8D0]/40 font-bold uppercase tracking-widest">Locked Video Pitch Title</span>
                            <div className="bg-[#050505] border border-white/10 px-4 py-3 rounded-none select-text">
                              <span className="text-xs font-serif text-white block italic">
                                "{pinnedTitle || activeBlueprint.titles[0]}"
                              </span>
                            </div>
                            <span className="text-[9px] font-sans text-white/30">
                              💡 Adjust this locked pitch title by double-clicking on any option under the <b>Viral Title Deck</b> tab.
                            </span>
                          </div>

                          {/* Pinned community engagement comment card */}
                          <div className="border border-white/10 bg-[#0a0a0a] p-6 rounded-none flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                              <span className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-widest">Optimized Pinned Comment Hook</span>
                              <button
                                onClick={() => executeCopy(activeBlueprint.pinnedComment, "pinned-comment")}
                                className="text-[10px] font-mono text-white/40 hover:text-white flex items-center gap-1 transition-all uppercase tracking-widest"
                              >
                                {copiedSection === "pinned-comment" ? (
                                  <Check className="h-3.5 w-3.5 text-green-400" />
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="bg-[#050505] border border-white/10 p-4 rounded-none select-text">
                              <p className="text-xs text-[#E0D8D0] italic leading-relaxed font-serif">
                                "{activeBlueprint.pinnedComment}"
                              </p>
                              <div className="flex items-center gap-1.5 mt-3 text-[9px] font-mono text-white/30 uppercase tracking-widest">
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>High emotional engagement trigger active</span>
                              </div>
                            </div>
                          </div>

                          {/* Meta Tags */}
                          <div className="border border-white/10 bg-[#0a0a0a] p-6 rounded-none flex flex-col gap-3">
                            <span className="text-[10px] font-mono text-[#E0D8D0]/40 font-bold uppercase tracking-widest">Search Keywords & Tags Suite</span>
                            <div className="flex flex-wrap gap-1.5">
                              {activeBlueprint.tags.map((tag, i) => (
                                <span key={i} className="text-[10px] bg-[#050505] border border-white/10 text-white/50 px-2.5 py-1 rounded-none font-mono">
                                  #{tag}
                                </span>
                              ))}
                              {activeBlueprint.keywords.slice(0, 5).map((kw, i) => (
                                <span key={i} className="text-[10px] bg-[#050505] border border-white/20 text-[#E0D8D0]/80 px-2.5 py-1 rounded-none font-mono">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Section: Raw Unified JSON Automation Object */}
                      <div className="border border-white/10 rounded-none overflow-hidden bg-[#0a0a0a] mt-4">
                        <div className="bg-[#0a0a0a]/40 border-b border-white/10 px-6 py-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileCode className="h-4.5 w-4.5 text-white/40" />
                            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/50 font-bold">
                              Unified Automation API JSON payload
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => executeCopy(JSON.stringify(activeBlueprint, null, 2), "json")}
                              className="text-[10px] font-mono text-white/40 hover:text-white flex items-center gap-1 transition-all uppercase tracking-widest"
                            >
                              {copiedSection === "json" ? (
                                <Check className="h-3.5 w-3.5 text-green-400" />
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy Unified JSON</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <div className="p-5">
                          <pre className="w-full bg-[#050505] border border-white/10 p-4 rounded-none text-[10px] text-[#E0D8D0]/60 leading-relaxed font-mono max-h-[300px] overflow-y-auto overflow-x-auto select-text">
                            {JSON.stringify(activeBlueprint, null, 2)}
                          </pre>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 6: VEO MOVIE MOTION SYNTHESIZER */}
                  {activeTab === "movie" && (
                    <div className="flex flex-col gap-6">

                      {/* Header overview info */}
                      <div className="bg-[#0a0a0a] border border-white/10 rounded-none p-6 flex flex-col gap-2">
                        <span className="text-[9px] font-mono text-white/30 font-bold uppercase tracking-[0.25em] block">
                          Phase 6: Advanced Motion Synthesis
                        </span>
                        <h3 className="text-sm font-serif tracking-wide text-white uppercase flex items-center gap-2">
                          <Film className="h-4 w-4 text-amber-500" />
                          <span>Veo Live-Animate Engine</span>
                        </h3>
                        <p className="text-xs text-[#E0D8D0]/60 leading-relaxed font-sans mt-1">
                          Animate static photos with Google's state-of-the-art Veo foundation video model. Drag and drop static illustrations, or sync from the active production storyboard scenes to generate striking, fluid cinematic clips in true high fidelity.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* Control Box: 5 cols */}
                        <div className="lg:col-span-5 flex flex-col gap-5">
                          
                          {/* File input drag and drop upload */}
                          <div className="border border-white/10 bg-[#0a0a0a] p-5 flex flex-col gap-3">
                            <span className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-widest">
                              1. Upload Illustration / Photo
                            </span>
                            
                            {veoImage ? (
                              <div className="relative border border-white/10 bg-black p-2 flex flex-col items-center">
                                <img 
                                  src={veoImage} 
                                  alt="Target composition" 
                                  className="w-full max-h-[220px] object-contain rounded-sm"
                                  referrerPolicy="no-referrer"
                                />
                                <button
                                  onClick={() => setVeoImage(null)}
                                  className="absolute top-4 right-4 bg-black/85 border border-white/20 text-white/60 hover:text-white p-1 rounded-full text-xs font-mono transition-all px-2.5 py-0.5 uppercase hover:bg-black"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <label className="border-2 border-dashed border-white/15 hover:border-white/45 bg-[#050505] p-8 flex flex-col items-center justify-center text-center cursor-pointer group transition-all h-[240px]">
                                <UploadCloud className="h-8 w-8 text-white/20 group-hover:text-white/60 mb-3 transition-colors shrink-0" />
                                <span className="text-[11px] text-[#E0D8D0]/70 font-semibold font-serif">Drop your image here, or browse</span>
                                <span className="text-[9px] text-white/30 font-mono mt-1">Supports PNG, JPEG, WEBP up to 4MB</span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        if (event.target?.result) {
                                          setVeoImage(event.target.result as string);
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            )}

                            {/* Quickly populate from active storyboard scene sketches if available */}
                            {activeBlueprint && activeBlueprint.scenes.length > 0 && (
                              <div className="flex flex-col gap-2 mt-1">
                                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest text-center">Or quickly load blueprint cue</span>
                                <div className="grid grid-cols-4 gap-1">
                                  {activeBlueprint.scenes.slice(0, 4).map((scene, sx) => (
                                    <button
                                      key={sx}
                                      onClick={() => {
                                        // Set prompt to scene visual description and imagePrompt
                                        setVeoPrompt(`Cinematic slowly breathing video. ${scene.visualDescription || scene.imagePrompt}`);
                                        // A elegant minimalist black/white sketch target:
                                        const simpleSketchSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="black"/><circle cx="400" cy="225" r="120" stroke="white" stroke-width="2" fill="none"/><line x1="200" y1="225" x2="600" y2="225" stroke="white" stroke-width="1" stroke-dasharray="8,8"/><text x="400" y="410" fill="white" font-family="monospace" font-size="14" text-anchor="middle">SCENE ${scene.number} COMPOSITION LAYOUT</text></svg>`;
                                        setVeoImage(simpleSketchSvg);
                                      }}
                                      className="bg-black/45 border border-white/10 hover:border-white/30 p-2 text-[10px] text-[#E0D8D0]/70 font-mono transition-all text-center rounded-sm truncate"
                                    >
                                      Scene {scene.number}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Aspect ratio and prompt settings */}
                          <div className="border border-white/10 bg-[#0a0a0a] p-5 flex flex-col gap-4">
                            <span className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-widest">
                              2. Direct Motion Configuration
                            </span>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] text-[#E0D8D0]/60 uppercase font-mono tracking-wider font-semibold">Video Synthesis Engine</label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setVeoEngineMode("local")}
                                  className={`p-2 font-mono text-[10px] uppercase font-bold border transition-all rounded-sm flex flex-col items-center justify-center gap-0.5 leading-normal ${
                                    veoEngineMode === "local"
                                      ? "bg-white text-black border-white"
                                      : "bg-black border-white/10 text-[#E0D8D0]/50 hover:border-white/20"
                                  }`}
                                >
                                  <span className="tracking-wider">Local Engine</span>
                                  <span className="text-[8px] opacity-75 lowercase font-normal tracking-normal">(instant offline)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVeoEngineMode("cloud")}
                                  className={`p-2 font-mono text-[10px] uppercase font-bold border transition-all rounded-sm flex flex-col items-center justify-center gap-0.5 leading-normal ${
                                    veoEngineMode === "cloud"
                                      ? "bg-white text-black border-white"
                                      : "bg-black border-white/10 text-[#E0D8D0]/50 hover:border-white/20"
                                  }`}
                                >
                                  <span className="tracking-wider">Cloud Veo</span>
                                  <span className="text-[8px] opacity-75 lowercase font-normal tracking-normal">(requires api key quota)</span>
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] text-[#E0D8D0]/60 uppercase font-mono tracking-wider font-semibold">Aspect Ratio Dimension</label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setVeoAspectRatio("16:9")}
                                  className={`p-2.5 text-xs font-mono font-bold border transition-all rounded-sm flex items-center justify-center gap-2 ${
                                    veoAspectRatio === "16:9"
                                      ? "bg-white text-black border-white"
                                      : "bg-black border-white/10 text-white/60 hover:border-white/30"
                                  }`}
                                >
                                  <span>16:9 Landscape</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVeoAspectRatio("9:16")}
                                  className={`p-2.5 text-xs font-mono font-bold border transition-all rounded-sm flex items-center justify-center gap-2 ${
                                    veoAspectRatio === "9:16"
                                      ? "bg-white text-black border-white"
                                      : "bg-black border-white/10 text-white/60 hover:border-white/30"
                                  }`}
                                >
                                  <span>9:16 Portrait</span>
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] text-[#E0D8D0]/60 uppercase font-mono tracking-wider font-semibold">Motion Direction Cue (Prompt)</label>
                              <textarea
                                value={veoPrompt}
                                onChange={(e) => setVeoPrompt(e.target.value)}
                                rows={4}
                                className="w-full bg-[#050505] border border-white/10 focus:outline-none focus:border-white/30 rounded-none p-3 text-xs leading-relaxed font-serif text-[#E0D8D0]/95"
                                placeholder="Describe the slow moving cinematic action..."
                              />
                            </div>

                            {/* Trigger buttons */}
                            {veoError && (
                              <div className="bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-sm flex gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                                <span className="text-[10px] text-red-400 leading-relaxed font-mono">{veoError}</span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={handleGenerateVeoVideo}
                              disabled={veoLoading || !veoImage}
                              className={`w-full h-11 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-widest font-bold border rounded-none transition-all cursor-pointer select-none ${
                                veoLoading
                                  ? "bg-black text-white/40 border-white/10 cursor-not-allowed"
                                  : !veoImage
                                  ? "bg-black text-white/30 border-white/5 cursor-not-allowed"
                                  : "bg-white hover:bg-[#e0d8d0] text-black border-white animate-pulse"
                              }`}
                            >
                              {veoLoading ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                                  <span>Processing Flow...</span>
                                </>
                              ) : (
                                <>
                                  <Play className="h-3.5 w-3.5 fill-black" />
                                  <span>{veoEngineMode === "local" ? "Synthesize Local Video (Instant)" : "Synthesize Cloud Veo Clip"}</span>
                                </>
                              )}
                            </button>
                          </div>
                          
                        </div>

                        {/* Preview screen: 7 cols */}
                        <div className="lg:col-span-7 flex flex-col gap-6">
                          
                          {/* Main video presentation board */}
                          <div className="border border-white/10 bg-[#0a0a0a] p-6 rounded-none flex flex-col gap-4 min-h-[400px] justify-center relative overflow-hidden">
                            
                            {/* Decorative scan line overlays */}
                            <div className="absolute inset-0 pointer-events-none bg-gradient-radial from-transparent to-black/35 opacity-40 animate-pulse" />

                            <div className="flex items-center justify-between border-b border-white/10 pb-3 z-10">
                              <span className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-widest">
                                Live Pre-visualization Stage
                              </span>
                              {veoVideoUrl && (
                                <a
                                  href={veoVideoUrl}
                                  download={`veo-cinematic-${Date.now()}.mp4`}
                                  className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-all uppercase tracking-widest font-bold"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Export Video</span>
                                </a>
                              )}
                            </div>

                            {veoLoading ? (
                              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 text-center z-10 select-none">
                                <div className="relative flex items-center justify-center">
                                  <div className="h-14 w-14 rounded-full border-t-2 border-white animate-spin" />
                                  <Film className="h-5 w-5 text-white/50 absolute animate-pulse" />
                                </div>
                                <div className="flex flex-col gap-1 max-w-[320px] mt-2">
                                  <span className="text-xs text-white font-serif font-bold italic tracking-wider">
                                    "{veoProgressMsg}"
                                  </span>
                                  <span className="text-[9px] text-[#E0D8D0]/40 font-mono leading-relaxed mt-1 uppercase tracking-widest">
                                    VEOPREVIEW ENGINE ONLINE
                                  </span>
                                </div>
                              </div>
                            ) : veoVideoUrl ? (
                              <div className="flex-1 flex flex-col gap-4 justify-center items-center z-10 py-2">
                                <div className="w-full h-full max-h-[380px] bg-black border border-white/10 rounded-sm relative group overflow-hidden shadow-2xl flex items-center justify-center">
                                  <video 
                                    src={veoVideoUrl} 
                                    controls 
                                    autoPlay 
                                    loop 
                                    className={`w-full h-full object-contain ${veoAspectRatio === "9:16" ? "max-h-[320px]" : "max-h-[360px]"}`}
                                  />
                                </div>
                                <span className="text-[9px] font-mono text-white/35 uppercase tracking-widest text-center mt-1">
                                  Generated utilizing model: <b>veo-3.1-lite-generate-preview</b>
                                </span>
                              </div>
                            ) : (
                              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-slate-500 z-10 select-none">
                                <Film className="h-10 w-10 text-white/10 mb-4 stroke-[1]" />
                                <h4 className="text-xs font-serif text-white/40 uppercase font-medium">Awaiting Cinematic Animate Trigger</h4>
                                <p className="text-[11px] text-[#E0D8D0]/25 max-w-[280px] mt-1.5 font-sans leading-relaxed">
                                  Upload a photo target, set your relative motion direction prompt, and unleash Veo's fluid frame interpolations.
                                </p>
                              </div>
                            )}

                          </div>

                          {/* Historical clips reel */}
                          <div className="border border-white/10 bg-[#0a0a0a] p-5 flex flex-col gap-4">
                            <span className="text-[10px] font-mono text-[#E0D8D0]/50 font-bold uppercase tracking-widest">
                              Historical Session Clips ({veoHistory.length})
                            </span>
                            
                            {veoHistory.length === 0 ? (
                              <p className="text-[10px] text-white/20 italic font-mono uppercase tracking-[0.15em]">
                                No videos compiled in this runtime session yet.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                                {veoHistory.map((item, hx) => (
                                  <div 
                                    key={item.id} 
                                    className="bg-black/45 border border-white/10 p-3 flex flex-col gap-2 rounded-sm"
                                  >
                                    <div className="flex gap-2">
                                      {item.originalImage && (
                                        <img 
                                          src={item.originalImage} 
                                          alt="Thumbnail source" 
                                          className="h-11 w-11 object-cover border border-white/10 rounded-sm shrink-0" 
                                          referrerPolicy="no-referrer"
                                        />
                                      )}
                                      <div className="flex-1 min-w-0 flex flex-col">
                                        <span className="text-[9px] text-[#E0D8D0]/80 font-serif italic truncate">
                                          "{item.prompt}"
                                        </span>
                                        <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest mt-1">
                                          {item.aspectRatio} dimension • {item.createdAt}
                                        </span>
                                      </div>
                                    </div>

                                    {item.videoUrl ? (
                                      <div className="flex gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setVeoVideoUrl(item.videoUrl)}
                                          className="text-[9px] font-mono uppercase tracking-widest text-amber-500 hover:text-amber-400 font-bold"
                                        >
                                          Replay
                                        </button>
                                        <span className="text-[9px] text-white/20">|</span>
                                        <a
                                          href={item.videoUrl}
                                          download={`veo-historical-${item.id}.mp4`}
                                          className="text-[9px] font-mono uppercase tracking-widest text-[#E0D8D0]/50 hover:text-white"
                                        >
                                          Export
                                        </a>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setVeoImage(item.originalImage);
                                          setVeoPrompt(item.prompt);
                                          setVeoAspectRatio(item.aspectRatio);
                                          setActiveTab("movie");
                                        }}
                                        className="text-[9px] font-mono uppercase tracking-widest text-white/50 hover:text-white text-left"
                                      >
                                        Re-load target
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>

                      </div>

                    </div>
                  )}

                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-12 max-w-[400px] mx-auto min-h-[400px] select-none">
                  <HelpCircle className="h-10 w-10 text-white/20 mb-5 stroke-[1]" />
                  <h3 className="text-sm font-serif tracking-wider text-white uppercase font-medium">No Production Blueprint Selected</h3>
                  <p className="text-xs text-[#E0D8D0]/40 leading-relaxed mt-2.5 font-sans">
                    Please select one of our curated premium presets or insert a custom topic focus to build your custom documentary storyboard.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </main>

      </div>

      {/* Character Consistency Config Dialog overlay */}
      <CharacterConsistencyModal
        isOpen={isConsistencyModalOpen}
        onClose={() => setIsConsistencyModalOpen(false)}
        settings={consistencySettings}
        onUpdate={setConsistencySettings}
      />

    </div>
  );
}
