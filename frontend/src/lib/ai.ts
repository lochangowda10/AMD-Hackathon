/**
 * Provider-agnostic AI client (OpenAI-compatible APIs).
 *
 * Replaces `z-ai-web-dev-sdk`, which only works inside the Z.ai sandbox and
 * crashes on Vercel / any normal host. This client works with any
 * OpenAI-compatible provider. Set ONE of these env vars on Vercel:
 *
 *   FIREWORKS_API_KEY  -> Fireworks AI (Llama 4 Maverick, multimodal: chat + vision)
 *   GROQ_API_KEY       -> Groq (Llama 3.3 chat, Llama 4 Scout vision, Whisper ASR)
 *   OPENAI_API_KEY     -> OpenAI (gpt-4o-mini chat + vision, Whisper ASR, TTS)
 *
 * Optional overrides: AI_BASE_URL, AI_API_KEY, AI_MODEL, AI_VISION_MODEL
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessageInput {
  role: ChatRole;
  content: string | Array<Record<string, unknown>>;
}

interface ProviderConfig {
  name: 'fireworks' | 'groq' | 'openai' | 'custom';
  baseUrl: string;
  apiKey: string;
  chatModel: string;
  visionModel: string;
  asrModel: string | null;
  asrUrl: string | null;
  ttsModel: string | null;
  ttsVoice: string | null;
}

export function getProvider(): ProviderConfig {
  const customKey = process.env.AI_API_KEY;
  const customUrl = process.env.AI_BASE_URL;

  if (customKey && customUrl) {
    return {
      name: 'custom',
      baseUrl: customUrl.replace(/\/$/, ''),
      apiKey: customKey,
      chatModel: process.env.AI_MODEL || 'gpt-4o-mini',
      visionModel: process.env.AI_VISION_MODEL || process.env.AI_MODEL || 'gpt-4o-mini',
      asrModel: null,
      asrUrl: null,
      ttsModel: null,
      ttsVoice: null,
    };
  }

  if (process.env.FIREWORKS_API_KEY) {
    return {
      name: 'fireworks',
      baseUrl: 'https://api.fireworks.ai/inference/v1',
      apiKey: process.env.FIREWORKS_API_KEY,
      // Fireworks periodically retires serverless model deployments (e.g. the
      // former default llama4-maverick-instruct-basic returns 404 now).
      // gpt-oss-120b cleanly separates its reasoning into `reasoning_content`
      // and returns a clean `content` for structured JSON - Kimi K2 does not
      // (it writes its chain-of-thought into `content` itself on complex
      // schemas, so it needs a larger token budget - see visionComplete).
      // Kimi K2 is used for vision only because it's the one deployed model
      // on this account that accepts image input.
      chatModel: process.env.AI_MODEL || 'accounts/fireworks/models/gpt-oss-120b',
      visionModel: process.env.AI_VISION_MODEL || 'accounts/fireworks/models/kimi-k2p6',
      asrModel: 'whisper-v3',
      asrUrl: 'https://audio-prod.us-virginia-1.direct.fireworks.ai/v1/audio/transcriptions',
      ttsModel: null,
      ttsVoice: null,
    };
  }

  if (process.env.GROQ_API_KEY) {
    return {
      name: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      chatModel: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      visionModel: process.env.AI_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
      asrModel: 'whisper-large-v3-turbo',
      asrUrl: 'https://api.groq.com/openai/v1/audio/transcriptions',
      ttsModel: 'playai-tts',
      ttsVoice: 'Fritz-PlayAI',
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      name: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      chatModel: process.env.AI_MODEL || 'gpt-4o-mini',
      visionModel: process.env.AI_VISION_MODEL || 'gpt-4o-mini',
      asrModel: 'whisper-1',
      asrUrl: 'https://api.openai.com/v1/audio/transcriptions',
      ttsModel: 'tts-1',
      ttsVoice: 'alloy',
    };
  }

  throw new Error(
    'No AI provider configured. Set FIREWORKS_API_KEY, GROQ_API_KEY or OPENAI_API_KEY in your environment (Vercel > Project > Settings > Environment Variables), then redeploy.'
  );
}

export function hasAIProvider(): boolean {
  return Boolean(
    (process.env.AI_API_KEY && process.env.AI_BASE_URL) ||
      process.env.FIREWORKS_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.OPENAI_API_KEY
  );
}

/**
 * Standard chat completion. Returns the assistant message text.
 */
export async function chatComplete(
  messages: ChatMessageInput[],
  options: { model?: string; temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
): Promise<string> {
  const provider = getProvider();

  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || provider.chatModel,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 2048,
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 45_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`AI request failed (${provider.name} ${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Vision completion - sends an image (data URL) plus a text prompt.
 */
export async function visionComplete(prompt: string, imageDataUrl: string): Promise<string> {
  const provider = getProvider();

  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.visionModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      temperature: 0.2,
      // Some vision models (e.g. Kimi K2 on Fireworks) write their
      // chain-of-thought directly into `content` on complex JSON schemas
      // instead of the separate `reasoning_content` field, so they need a
      // larger budget to reach the actual answer - 2048 was cutting them off
      // mid-thought before any JSON appeared.
      max_tokens: 4096,
    }),
    // Kept comfortably under the vision route's 60s maxDuration so a slow
    // model response still leaves time to fall back to the pixel engine and
    // return a real answer, instead of the whole request being killed by the
    // platform's hard timeout.
    signal: AbortSignal.timeout(42_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Vision request failed (${provider.name} ${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Speech-to-text (Whisper). Returns transcript text.
 * Throws if the configured provider has no ASR endpoint (e.g. custom URL);
 * the client then falls back to the browser's Web Speech API.
 */
export async function transcribeAudio(audio: Blob, filename = 'recording.webm'): Promise<string> {
  const provider = getProvider();

  if (!provider.asrUrl || !provider.asrModel) {
    throw new Error(`Provider "${provider.name}" has no speech-to-text endpoint configured`);
  }

  const form = new FormData();
  form.append('file', audio, filename);
  form.append('model', provider.asrModel);

  const res = await fetch(provider.asrUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${provider.apiKey}` },
    body: form,
    signal: AbortSignal.timeout(50_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Transcription failed (${provider.name} ${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.text || '';
}

/**
 * Text-to-speech. Returns audio bytes, or null if the provider has no TTS
 * (the client then falls back to the browser's speechSynthesis).
 */
export async function synthesizeSpeech(
  text: string,
  options: { voice?: string; speed?: number } = {}
): Promise<{ audio: ArrayBuffer; contentType: string } | null> {
  const provider = getProvider();

  if (!provider.ttsModel) return null;

  const res = await fetch(`${provider.baseUrl}/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.ttsModel,
      input: text,
      voice: options.voice || provider.ttsVoice,
      speed: Math.max(0.5, Math.min(2.0, options.speed ?? 1.0)),
      response_format: provider.name === 'groq' ? 'wav' : 'mp3',
    }),
    signal: AbortSignal.timeout(50_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`TTS failed (${provider.name} ${res.status}): ${body.slice(0, 300)}`);
  }

  const audio = await res.arrayBuffer();
  return { audio, contentType: provider.name === 'groq' ? 'audio/wav' : 'audio/mpeg' };
}

/**
 * Extract the first JSON object found in an LLM response.
 */
export function extractJSON<T = Record<string, unknown>>(text: string): T | null {
  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '');
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
  } catch {
    // fall through
  }
  return null;
}
