import express from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { GoogleGenAI, Type, GenerateVideosOperation } from "@google/genai";
import { createServer as createViteServer } from "vite";
import WebSocket from "ws";
import { createLocalDynamicBlueprint } from "./src/serverLocalGenerator";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Global error handler for body-parser or syntax parsing issues to ensure JSON response instead of default HTML
app.use((err: any, req: any, res: any, next: any) => {
  if (err) {
    console.error("Express Parser / Middleware Error:", err);
    res.status(err.status || 400).json({
      error: err.message || "Invalid payload or body parser constraints exceeded.",
      status: err.status || 400
    });
    return;
  }
  next();
});

// Lazy-load Gemini client or check key inside route handler to prevent crash on startup if missing
let genaiClient: GoogleGenAI | null = null;
function getGenaiClient(): GoogleGenAI {
  if (!genaiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please add it in Settings > Secrets.");
    }
    genaiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genaiClient;
}

// ----------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------

/**
 * Health check
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════
//  EDGE TTS & AUDIO MARKER PARSER ENGINE
// ═══════════════════════════════════════════════════════════

interface SpeechState {
  rate: string;
  volume: string;
  pitch: string;
  voice: string;
}

interface SpeakSegment {
  action: "speak";
  text: string;
  rate: string;
  volume: string;
  pitch: string;
  voice: string;
}

interface SilenceSegment {
  action: "silence";
  duration: number;
}

type Segment = SpeakSegment | SilenceSegment;

function parseScript(raw: string): Segment[] {
  const VOICE = "en-GB-RyanNeural";
  const GLOBAL_RATE = "-6%";
  const GLOBAL_VOLUME = "+0%";
  const GLOBAL_PITCH = "+0Hz";

  const SLOW_RATE = "-24%"; const SLOW_VOLUME = "-12%";
  const FAST_RATE = "+20%"; const FAST_VOLUME = "+0%";
  const LOUD_RATE = "-2%";  const LOUD_VOLUME = "+35%";
  const SOFT_RATE = "-26%"; const SOFT_VOLUME = "-18%";
  const DEEP_RATE = "-38%"; const DEEP_VOLUME = "-25%";

  const PAUSE_DURATION = 1.5;
  const BEAT_DURATION = 0.6;

  const stateStack: SpeechState[] = [{
    rate: GLOBAL_RATE,
    volume: GLOBAL_VOLUME,
    pitch: GLOBAL_PITCH,
    voice: VOICE,
  }];

  const segments: Segment[] = [];
  let buf = "";

  const cur = () => stateStack[stateStack.length - 1];

  const flush = () => {
    if (buf.trim()) {
      const s = cur();
      segments.push({
        action: "speak",
        text: buf.trim(),
        rate: s.rate,
        volume: s.volume,
        pitch: s.pitch,
        voice: s.voice,
      });
    }
    buf = "";
  };

  const pattern = /\[(\/?)([A-Z]+)(?::([^\]]+))?\]/gi;
  let match;
  let lastIndex = 0;

  while ((match = pattern.exec(raw)) !== null) {
    const matchIndex = match.index;
    buf += raw.substring(lastIndex, matchIndex);

    const closing = match[1] === "/";
    const tag = match[2].toUpperCase();
    const arg = match[3];

    if (tag === 'PAUSE') {
      flush();
      const dur = arg ? parseFloat(arg) : PAUSE_DURATION;
      segments.push({ action: "silence", duration: isNaN(dur) ? PAUSE_DURATION : dur });
    } else if (tag === 'BEAT') {
      flush();
      segments.push({ action: "silence", duration: BEAT_DURATION });
    } else if (!closing) {
      flush();
      const newS = { ...cur() };

      if (tag === 'SLOW') {
        newS.rate = SLOW_RATE;
        newS.volume = SLOW_VOLUME;
      } else if (tag === 'FAST') {
        newS.rate = FAST_RATE;
        newS.volume = FAST_VOLUME;
      } else if (tag === 'LOUD') {
        newS.rate = LOUD_RATE;
        newS.volume = LOUD_VOLUME;
      } else if (tag === 'SOFT') {
        newS.rate = SOFT_RATE;
        newS.volume = SOFT_VOLUME;
      } else if (tag === 'DEEP') {
        newS.rate = DEEP_RATE;
        newS.volume = DEEP_VOLUME;
      } else if (tag === 'VOICE' && arg) {
        newS.voice = arg.trim();
        if (arg.trim().includes("en-US")) {
          newS.rate = "-12%";
        }
      }

      stateStack.push(newS);
    } else {
      flush();
      if (stateStack.length > 1) {
        stateStack.pop();
      }
    }

    lastIndex = pattern.lastIndex;
  }

  buf += raw.substring(lastIndex);
  flush();

  const merged: Segment[] = [];
  for (const seg of segments) {
    if (
      merged.length > 0 &&
      merged[merged.length - 1].action === "speak" &&
      seg.action === "speak"
    ) {
      const prev = merged[merged.length - 1] as SpeakSegment;
      if (
        prev.rate === seg.rate &&
        prev.volume === seg.volume &&
        prev.pitch === seg.pitch &&
        prev.voice === seg.voice
      ) {
        prev.text += " " + seg.text;
        continue;
      }
    }
    merged.push(seg);
  }

  return merged;
}

function makeSilence(duration: number): Buffer {
  const frame = Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x64]), Buffer.alloc(413)]);
  const nFrames = Math.max(1, Math.floor(duration * 38));
  const buffers: Buffer[] = [];
  for (let i = 0; i < nFrames; i++) {
    buffers.push(frame);
  }
  return Buffer.concat(buffers);
}

let timeOffsetMs = 0;
let lastSyncedTime = 0;

async function syncTimeOffset() {
  try {
    const start = Date.now();
    const res = await fetch("https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1", { method: "HEAD" });
    const headerDate = res.headers.get("date");
    const end = Date.now();
    if (headerDate) {
      const serverMs = new Date(headerDate).getTime();
      const localMs = (start + end) / 2;
      timeOffsetMs = Math.round(serverMs - localMs);
      lastSyncedTime = Date.now();
      console.log(`[Edge TTS Time Sync] Clock offset calculated: ${timeOffsetMs}ms (Server: ${headerDate})`);
    }
  } catch (err) {
    console.warn("[Edge TTS Time Sync] Failed to check clock drift, using default 0 offset.", err);
  }
}

async function getSynchronizedTimeMs(): Promise<number> {
  if (lastSyncedTime === 0 || (Date.now() - lastSyncedTime > 10 * 60 * 1000)) {
    await syncTimeOffset();
  }
  return Math.floor(Date.now() + timeOffsetMs);
}

function generateEdgeTTS(
  text: string,
  voice: string = "en-GB-RyanNeural",
  rate: string = "-6%",
  volume: string = "+0%",
  pitch: string = "+0Hz"
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const trustedClientToken = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
      const edgeVersion = "132.0.2957.140";
      const edgeSecGecVersion = `1-${edgeVersion}`;
      
      const nowSyncedMs = await getSynchronizedTimeMs();
      
      // Convert milliseconds since Unix Epoch to Windows File Time ticks (seconds-level with Number and conversion like @lobehub/tts)
      const nowSyncedSeconds = Math.floor(nowSyncedMs / 1000);
      const ticks = (BigInt(nowSyncedSeconds) + 11644473600n) * 10000000n;
      const croppedTicks = ticks - (ticks % 3000000000n);
      
      const data = croppedTicks.toString() + trustedClientToken;
      const gec = crypto.createHash("sha256").update(data, "ascii").digest("hex").toUpperCase();
      
      const connId = crypto.randomBytes(16).toString("hex").toUpperCase();
      const endpoint = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${trustedClientToken}&ConnectionId=${connId}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${edgeSecGecVersion}`;

      console.log(`[Edge TTS] Connecting with connectionId: ${connId}, ticks: ${croppedTicks}, GEC: ${gec}`);

      const ws = new WebSocket(endpoint, {
        headers: {
          "Pragma": "no-cache",
          "Cache-Control": "no-cache",
          "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36 Edg/${edgeVersion}`,
          "Origin": "chrome-extension://jdiccldimpdaibohphhopfldocgfhjdm",
          "Sec-MS-GEC": gec,
          "Sec-MS-GEC-Version": edgeSecGecVersion
        }
      });

      const audioBuffers: Buffer[] = [];
      const requestId = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error(`Edge TTS synthesis timed out for text: "${text.substring(0, 30)}..."`));
      }, 15000);

      const cleanupAndFinish = (err?: Error) => {
        clearTimeout(timeout);
        try {
          ws.close();
        } catch (e) {}
        if (err) {
          reject(err);
        } else if (audioBuffers.length === 0) {
          reject(new Error("No audio bytes received from Edge TTS."));
        } else {
          resolve(Buffer.concat(audioBuffers));
        }
      };

    ws.on("open", () => {
      const speechConfig = {
        context: {
          system: {
            name: "SpeechSDK",
            version: "1.30.0",
            build: "JavaScript",
            lang: "JavaScript"
          },
          os: {
            platform: "Browser",
            name: "Chrome",
            version: "120.0.0.0"
          }
        }
      };

      const speechConfigMsg = 
        `X-Timestamp:${new Date().toISOString()}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        JSON.stringify(speechConfig);

      ws.send(speechConfigMsg, (err) => {
        if (err) return cleanupAndFinish(err);

        const escapedText = text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

        const ssml = 
          `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
            `<voice name='${voice}'>` +
              `<prosody rate='${rate}' pitch='${pitch}' volume='${volume}'>` +
                escapedText +
              `</prosody>` +
            `</voice>` +
          `</speak>`;

        const ssmlMsg = 
          `X-RequestId:${requestId}\r\n` +
          `Content-Type:application/ssml+xml\r\n` +
          `Path:ssml\r\n\r\n` +
          ssml;

        ws.send(ssmlMsg, (errSend) => {
          if (errSend) return cleanupAndFinish(errSend);
        });
      });
    });

    ws.on("message", (data: any, isBinary: boolean) => {
      if (isBinary) {
        try {
          const buffer = Buffer.from(data);
          const headerLength = buffer.readUInt16BE(0);
          const header = buffer.toString("utf-8", 2, 2 + headerLength);
          if (header.includes("Path:audio")) {
            const payload = buffer.subarray(2 + headerLength);
            audioBuffers.push(payload);
          }
        } catch (e: any) {
          console.error("Error parsing binary WS frame:", e);
        }
      } else {
        const textMsg = data.toString("utf-8");
        if (textMsg.includes("Path:turn.end")) {
          cleanupAndFinish();
        }
      }
    });

    ws.on("error", (err) => {
      cleanupAndFinish(err);
    });

    ws.on("close", () => {
      cleanupAndFinish();
    });
    } catch (e: any) {
      reject(e);
    }
  });
}

/**
 * Helper to fall back to Google Translate Speech system if Edge TTS is blocked/unavailable
 */
async function generateGoogleTranslateTTS(text: string, voice: string = "en-GB-RyanNeural"): Promise<Buffer> {
  const maxLength = 200;
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length < maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  if (chunks.length === 0) {
    chunks.push(text.substring(0, maxLength));
  }

  // Map requested Edge voice names to Google Translate regional accent codes
  let tl = "en-GB"; // Default to natural British accent (comparable to en-GB-RyanNeural)
  if (voice) {
    const voiceLower = voice.toLowerCase();
    if (voiceLower.includes("us") || voiceLower.includes("guy") || voiceLower.includes("aria") || voiceLower.includes("jenny")) {
      tl = "en-US";
    } else if (voiceLower.includes("au") || voiceLower.includes("australia")) {
      tl = "en-AU";
    } else if (voiceLower.includes("in") || voiceLower.includes("india")) {
      tl = "en-IN";
    } else if (voiceLower.includes("ca") || voiceLower.includes("canada")) {
      tl = "en-CA";
    } else if (voiceLower.includes("gb") || voiceLower.includes("ryan") || voiceLower.includes("sonia")) {
      tl = "en-GB";
    }
  }

  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
      }
    });
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      buffers.push(Buffer.from(arrayBuffer));
    } else {
      throw new Error(`Google Translate TTS answered with status: ${response.status}`);
    }
  }
  return Buffer.concat(buffers);
}

/**
 * Express Proxy to fetch and stream stack-based voiceover narration via Edge TTS with Google Translate fallback
 */
app.get("/api/tts", async (req, res) => {
  try {
    const text = req.query.text as string;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({ error: "Text is required to synthesize audio." });
      return;
    }

    console.log(`[TTS Engine] Starting parse and synthesis for text length: ${text.length}`);
    const segments = parseScript(text);
    console.log(`[TTS Engine] Parsed ${segments.length} segments`);

    const audioBuffers: Buffer[] = [];
    let usedFallback = false;

    for (let idx = 0; idx < segments.length; idx++) {
      const seg = segments[idx];
      if (seg.action === "silence") {
        console.log(`[TTS Engine] Segment [${idx + 1}/${segments.length}] Silence: ${seg.duration}s`);
        // Only inject silent padding frames if we are on the primary high-fidelity Edge TTS track
        if (!usedFallback) {
          audioBuffers.push(makeSilence(seg.duration));
        }
      } else {
        console.log(`[TTS Engine] Segment [${idx + 1}/${segments.length}] Synthesized: "${seg.text.substring(0, 40)}..."`);
        try {
          // Use high-fidelity neural Edge TTS as our primary, professional audio generator supporting expressive parameters.
          const chunk = await generateEdgeTTS(seg.text, seg.voice, seg.rate, seg.volume, seg.pitch);
          audioBuffers.push(chunk);
        } catch (err: any) {
          console.warn(`[TTS Engine] Edge TTS failed (likely datacenter block), compiling high-grade fallback track:`, err.message || err);
          usedFallback = true;
          break; // Fallback to a single robust, continuous, and clear stream
        }
      }
    }

    // If Edge TTS failed/was blocked, we compile a single perfect continuous narration without corrupting frames
    if (usedFallback) {
      console.log("[TTS Engine] Building uncorrupted, fluent fallback track for screenplay.");
      const cleanNarrationText = text.replace(/\[.*?\]/g, " ").replace(/\s+/g, " ").trim();
      const fallbackChunk = await generateGoogleTranslateTTS(cleanNarrationText, "en-GB-RyanNeural");
      audioBuffers.length = 0; // Clear partial buffers to prevent decoding mismatch
      audioBuffers.push(fallbackChunk);
    }

    if (audioBuffers.length === 0) {
      res.status(500).json({ error: "Failed to generate voiceover audio." });
      return;
    }

    const concatenatedBuffer = Buffer.concat(audioBuffers);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `attachment; filename="existential-voiceover.mp3"`);
    res.send(concatenatedBuffer);
  } catch (err: any) {
    console.error("TTS Engine Route Error:", err);
    res.status(500).json({ error: err.message || "An error occurred during TTS audio synthesis." });
  }
});

/**
 * Endpoint to generate a complete interactive documentary storyboard & screenplay
 */
app.post("/api/generate", async (req, res) => {
  try {
    const { topic, tone = "Existential" } = req.body;
    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      res.status(400).json({ error: "A valid topic is required." });
      return;
    }

    const ai = getGenaiClient();

    const systemInstruction = `You are an elite YouTube documentary writer, psychologist, deep storyteller, content strategist, and video director.
Your mission is to write a highly engaging YouTube psychology & philosophy video script designed for maximum emotional impact and retention.

The video must explore the user's topic through the architectural lens of modern existential psychology channels (feel like "Sisyphus 55" or "Pursuit of Wonder").
The goal is NOT to teach trivial facts. The goal is to make viewers feel deeply understood.

Please adhere strictly to the target structure:
- HOOK (0-30 sec): A captivating contradiction or sudden emotional realization about the theme.
- EMOTIONAL MIRROR: Describe the viewer's experience using raw, relatable, day-to-day scenes so they think "that is exactly how I feel".
- PROBLEM EXPANSION: Show the deeper, dark layers (overthinking, regret, loneliness, anxiety, identity, meaning).
- PSYCHOLOGICAL ANALYSIS: Simple description of the underlying cognitive defense mechanism or triggers.
- PHILOSOPHICAL LAYER: Gently weave in existential or Stoic ideas (e.g. Sartre, Schopenhauer, Camus) without sounding academic.
- MEMORABLE ENDING: Avoid motivational clichés or self-help hype. End with a solemn, stunning perspective shift or realization that lingers in the silence.

Include a STORYTELLING SYSTEM: A striking thought experiment, metaphor, or specific character vignette (e.g., "Imagine standing in front of...", "Let us look at a person who spends their weekends...") introduced every 60-90 seconds.
Include a RETENTION SYSTEM: A surprising observation or deeper truth introduced every 30-45 seconds to keep the viewer intellectually hooked.

Every scene in the storyboard MUST use beautiful, cinematic psychological imagery.
Follow strictly THE STYLE LOCK: Minimalist existential illustration, black background, white sketch drawing, psychological symbolism, lonely figure, hand-drawn look, high-contrast, cinematic composition, 16:9 ratio.`;

    const prompt = `Topic to analyze and expand: "${topic}"
Tone of voice: "${tone}"

Analyze and generate the complete structured JSON response matching the required schema. Ensure the script text is flowing, poetic, and contains fully detailed monologue paragraphs for the actor, rather than short summary notes. Break it down into beautifully described 5 to 7 sequentially numbered scenes matching active script parts. Make sure the visual descriptions contain high psychological metaphors (e.g., figure looking into shattered glass, tiny figure holding a massive melting hourglass under stars).`;

    // Robust retry and fallback mechanism to handle transient 503/429/403 errors.
    // We prioritize highly compatible GA models like gemini-3.5-flash which support complex JSON schemas,
    // with fallbacks to lite and latest models, bypassing deprecated/denied ones.
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let response = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      console.log(`[Gemini] Attempting creative generation with model: ${modelName}`);
      let success = false;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  analysis: {
                    type: Type.OBJECT,
                    properties: {
                      coreEmotion: { type: Type.STRING },
                      coreConflict: { type: Type.STRING },
                      hiddenFear: { type: Type.STRING },
                      hiddenDesire: { type: Type.STRING },
                      existentialQuestion: { type: Type.STRING },
                      internalContradiction: { type: Type.STRING },
                      emotionalTrigger: { type: Type.STRING },
                      whyClick: { type: Type.STRING },
                      whyKeepWatching: { type: Type.STRING },
                      mostRelatableSituation: { type: Type.STRING }
                    },
                    required: ["coreEmotion", "coreConflict", "hiddenFear", "hiddenDesire", "existentialQuestion", "internalContradiction", "emotionalTrigger", "whyClick", "whyKeepWatching", "mostRelatableSituation"]
                  },
                  viralPositioning: {
                    type: Type.OBJECT,
                    properties: {
                      targetAudience: { type: Type.STRING },
                      emotionalState: { type: Type.STRING },
                      curiosityGap: { type: Type.STRING },
                      psychologicalHook: { type: Type.STRING },
                      strongestTitleAngle: { type: Type.STRING },
                      clickableThumbnailConcept: { type: Type.STRING }
                    },
                    required: ["targetAudience", "emotionalState", "curiosityGap", "psychologicalHook", "strongestTitleAngle", "clickableThumbnailConcept"]
                  },
                  titles: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "List of exactly 20 captivating alternative YouTube titles"
                  },
                  thumbnailIdeas: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.INTEGER },
                        conceptName: { type: Type.STRING },
                        description: { type: Type.STRING },
                        symbolicElement: { type: Type.STRING },
                        visualComposition: { type: Type.STRING }
                      },
                      required: ["id", "conceptName", "description", "symbolicElement", "visualComposition"]
                    },
                    description: "Exactly 3 distinct minimalist symbolic thumbnail drawings"
                  },
                  description: { type: Type.STRING },
                  scriptText: { type: Type.STRING, description: "Full narraters monologue, approx 1000-1500 words, rich with paragraphs, elegant subheadings, and deep prose." },
                  scenes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        number: { type: Type.INTEGER },
                        duration: { type: Type.STRING },
                        section: { type: Type.STRING },
                        voiceoverText: { type: Type.STRING },
                        visualDescription: { type: Type.STRING },
                        cameraMovement: { type: Type.STRING },
                        transitionType: { type: Type.STRING },
                        emotion: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING },
                        musicCategory: { type: Type.STRING }
                      },
                      required: ["number", "duration", "section", "voiceoverText", "visualDescription", "cameraMovement", "transitionType", "emotion", "imagePrompt", "musicCategory"]
                    }
                  },
                  chapters: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        timestamp: { type: Type.STRING },
                        title: { type: Type.STRING }
                      },
                      required: ["timestamp", "title"]
                    }
                  },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                  pinnedComment: { type: Type.STRING }
                },
                required: [
                  "analysis", "viralPositioning", "titles", "thumbnailIdeas", "description",
                  "scriptText", "scenes", "chapters", "tags", "keywords", "pinnedComment"
                ]
              }
            }
          });

          if (response && response.text) {
            console.log(`[Gemini] Successfully generated blueprint using model ${modelName} on attempt ${attempt}`);
            success = true;
            break;
          }
          throw new Error(`Empty response text received from model ${modelName}`);
        } catch (err: any) {
          lastError = err;
          console.warn(`[Gemini] Attempt ${attempt} failed with model ${modelName}:`, err.message || err);
          if (attempt < 3) {
            const delay = attempt * 2000;
            console.log(`[Gemini] Waiting ${delay}ms before retrying model ${modelName}...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      if (success) {
        break;
      }
      console.warn(`[Gemini] All attempts for model ${modelName} failed. Cycling to next fallback...`);
    }

    if (!response || !response.text) {
      throw lastError || new Error("All fallback models and retries failed to return content.");
    }

    const outputText = response.text;
    if (!outputText) {
      throw new Error("No output text received from Gemini API.");
    }

    const payload = JSON.parse(outputText.trim());
    res.json(payload);

  } catch (err: any) {
    console.error("Gemini Generation Error:", err);
    let errorMessage = err.message || "An unexpected error occurred during creative generation.";
    let isPermissionError = false;
    let isQuotaError = false;

    try {
      if (errorMessage.includes("{")) {
        const jsonStart = errorMessage.indexOf("{");
        const parsed = JSON.parse(errorMessage.substring(jsonStart));
        if (parsed?.error?.message) {
          errorMessage = parsed.error.message;
        }
      }
    } catch (e) {}

    const errLower = errorMessage.toLowerCase();
    if (errLower.includes("denied access") || errLower.includes("permission_denied") || errLower.includes("forbidden") || errLower.includes("403")) {
      isPermissionError = true;
    }
    if (errLower.includes("quota") || errLower.includes("resource_exhausted") || errLower.includes("limit") || errLower.includes("exhausted") || errLower.includes("429")) {
      isQuotaError = true;
    }

    let userFriendlyMessage = errorMessage;
    if (isPermissionError) {
      userFriendlyMessage = `Your Google Cloud / AI Studio project or API key returns a 403 Permission Denied error: "${errorMessage}". (Google Developer Console rules/updates require updating terms, region policy, or enabling the Paid Model Flow in Settings).`;
    } else if (isQuotaError) {
      userFriendlyMessage = `Your Gemini API key has exceeded its free-tier quota limits: "${errorMessage}". Consider enabling the Paid Model Flow inside your Google AI Studio or GCP workspace.`;
    }

    console.log(`[Offline Creative Engine Activator] Compiling interactive draft natively for topic: "${req.body.topic}"`);
    try {
      const fallbackPayload = createLocalDynamicBlueprint(req.body.topic, req.body.tone || "Existential");
      res.json({
        ...fallbackPayload,
        isLocalFallback: true,
        fallbackWarning: userFriendlyMessage,
        isPermissionError,
        isQuotaError
      });
    } catch (fallbackErr) {
      console.error("Failed to generate offline fallback plan:", fallbackErr);
      res.status(500).json({
        error: userFriendlyMessage,
        originalError: errorMessage,
        isPermissionError,
        isQuotaError,
        details: err.stack
      });
    }
  }
});

// ----------------------------------------------------
// VEO VIDEO GENERATION ENDPOINTS
// ----------------------------------------------------

/**
 * 1. Start Video Generation
 */
app.post("/api/generate-video", async (req, res) => {
  try {
    const { image, prompt, aspectRatio = "16:9" } = req.body;
    
    if (!image) {
      res.status(400).json({ error: "An image is required to animate into a video." });
      return;
    }

    const ai = getGenaiClient();

    // Parse image and strip prefix if it is a Data URL
    let base64String = image;
    let mimeType = "image/png";

    if (image.includes(";base64,")) {
      const parts = image.split(";base64,");
      const mimeMatch = parts[0].match(/data:(image\/[a-zA-Z0-9+.-]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      base64String = parts[1];
    }

    console.log(`[Veo Video] Starting generation with model 'veo-3.1-lite-generate-preview', aspectRatio: ${aspectRatio}, mimeType: ${mimeType}`);

    const operation = await ai.models.generateVideos({
      model: "veo-3.1-lite-generate-preview",
      prompt: prompt || "A slow cinematically breathing video, 35mm pan, mysterious existential atmosphere, matching character visual in the drawing",
      image: {
        imageBytes: base64String,
        mimeType: mimeType
      },
      config: {
        numberOfVideos: 1,
        resolution: "720p",
        aspectRatio: aspectRatio as "16:9" | "9:16"
      }
    });

    console.log(`[Veo Video] Created operation successfully: ${operation.name}`);
    res.json({ operationName: operation.name });

  } catch (err: any) {
    console.error("Video Generation Initiation Error:", err);
    let errorMessage = err.message || "Failed to start video generation.";
    let isPermissionError = false;
    let isQuotaError = false;

    try {
      if (errorMessage.includes("{")) {
        const jsonStart = errorMessage.indexOf("{");
        const parsed = JSON.parse(errorMessage.substring(jsonStart));
        if (parsed?.error?.message) {
          errorMessage = parsed.error.message;
        }
      }
    } catch (e) {}

    const errLower = errorMessage.toLowerCase();
    if (errLower.includes("denied access") || errLower.includes("permission_denied") || errLower.includes("forbidden") || errLower.includes("403")) {
      isPermissionError = true;
    }
    if (errLower.includes("quota") || errLower.includes("resource_exhausted") || errLower.includes("limit") || errLower.includes("exhausted") || errLower.includes("429")) {
      isQuotaError = true;
    }

    let userFriendlyMessage = errorMessage;
    if (isPermissionError) {
      userFriendlyMessage = `Your project has been denied access to Veo Video generation models (Error: "${errorMessage}"). Veo video generation requires a valid, verified billing account or transitioning to the Paid Model Flow inside your workspace.`;
    } else if (isQuotaError) {
      userFriendlyMessage = `Your API key has exceeded free resource quotas for Veo Video models. Please try enabling the Paid Model Flow inside the workspace or waiting before triggering another video rendering.`;
    }

    res.status(500).json({
      error: userFriendlyMessage,
      originalError: errorMessage,
      isPermissionError,
      isQuotaError
    });
  }
});

/**
 * 2. Poll Video Generation Status
 */
app.post("/api/video-status", async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      res.status(400).json({ error: "operationName is required parameter." });
      return;
    }

    const ai = getGenaiClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    
    res.json({
      done: updated.done,
      error: updated.error,
      response: updated.response
    });

  } catch (err: any) {
    console.error("Video Status Polling Error:", err);
    res.status(500).json({ error: err.message || "Failed to poll video status." });
  }
});

/**
 * 3. Securely Stream or Download Video
 */
app.post("/api/video-download", async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      res.status(400).json({ error: "operationName is required parameter." });
      return;
    }

    const ai = getGenaiClient();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    if (!updated.done) {
      res.status(400).json({ error: "Video generation operation is not complete yet." });
      return;
    }

    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      res.status(404).json({ error: "Video file download URI not found in operation response." });
      return;
    }

    console.log(`[Veo Video] Securely proxying video from: ${uri}`);
    const videoRes = await fetch(uri, {
      headers: { "x-goog-api-key": apiKey }
    });

    if (!videoRes.ok) {
      throw new Error(`Failed to secure video chunk stream from Google storage endpoint: ${videoRes.statusText}`);
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="existential-veo-${Date.now()}.mp4"`);

    const reader = videoRes.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      // Direct array buffering fallback
      const arrayBuffer = await videoRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    }

  } catch (err: any) {
    console.error("Video Proxy Download Stream Error:", err);
    res.status(500).json({ error: err.message || "An error occurred during video download stream." });
  }
});

// ----------------------------------------------------
// VITE DEV SERVER AND ASSETS PIPELINE
// ----------------------------------------------------

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Existential Script Studio Server booted on http://localhost:${PORT}`);
  });
}

start();
