import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

import { ApiError, GoogleGenAI } from '@google/genai';
import { BaseAudioClient } from '../base-audio-client.js';
import { GEMINI_TTS_VOICES } from '../gemini-tts-voices.js';
import { SpeechGenerationResponse } from '../../utils/response-types.js';
import {
  initializeGeminiClientWithRuntime,
} from '../../../utils/gemini-helper.js';
import type { GeminiRuntimeInfo } from '../../../utils/gemini-helper.js';
import { resolveModelForRuntime } from '../../../utils/gemini-model-mapping.js';
import type { AudioModel } from '../audio-model.js';
import type { MultimediaConfig } from '../../utils/multimedia-config.js';
import type { ProviderApiKeyResolver } from '../../../secrets/provider-api-key-resolver.js';
import type { GeminiRuntimeResolver } from '../../../utils/gemini-runtime.js';

const AUDIO_TEMP_DIR = path.join(os.tmpdir(), 'autobyteus_audio');

type SpeechTurn = { speaker?: string; text: string; style?: string };

type MimeInfo = { base: string; params: Record<string, string> };

// Only fixed messages created inside this adapter can cross the error boundary.
class GeminiSpeechError extends Error {}

function safeFailureMessage(error: unknown): string {
  if (error instanceof GeminiSpeechError) return error.message;
  if (error instanceof ApiError) {
    const status = error.status;
    return Number.isInteger(status) && status >= 400 && status <= 599
      ? `Gemini TTS provider request failed (HTTP ${status}).`
      : 'Gemini TTS provider request failed.';
  }
  return 'Gemini TTS provider or audio operation failed.';
}

function parseMimeType(mimeType?: string | null): MimeInfo {
  const [base = '', ...attributes] = (mimeType ?? '').split(';').map((item) => item.trim());
  const params: Record<string, string> = {};
  for (const attribute of attributes) {
    const [key, value] = attribute.split('=', 2);
    if (key && value) params[key.toLowerCase()] = value;
  }
  return { base: base.toLowerCase(), params };
}

function decodeAudio(data: unknown): Buffer {
  if (typeof data === 'string') {
    if (!data || !/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4 !== 0) {
      throw new GeminiSpeechError('Gemini TTS returned invalid audio encoding.');
    }
    return Buffer.from(data, 'base64');
  }
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  throw new GeminiSpeechError('Gemini TTS returned no audio data.');
}

function isWav(bytes: Buffer): boolean {
  return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF'
    && bytes.toString('ascii', 8, 12) === 'WAVE';
}

function validateWav(bytes: Buffer): void {
  if (!isWav(bytes) || bytes.readUInt32LE(4) + 8 !== bytes.length) {
    throw new GeminiSpeechError('Gemini TTS returned an invalid WAV container.');
  }
  let offset = 12;
  let frameSize: number | null = null;
  const dataSizes: number[] = [];
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const next = offset + 8 + size + (size % 2);
    if (next > bytes.length) throw new GeminiSpeechError('Gemini TTS returned a truncated WAV chunk.');
    if (id === 'fmt ') {
      if (size < 16 || frameSize !== null) throw new GeminiSpeechError('Gemini TTS returned an invalid WAV format chunk.');
      const format = bytes.readUInt16LE(offset + 8);
      const channels = bytes.readUInt16LE(offset + 10);
      const rate = bytes.readUInt32LE(offset + 12);
      const byteRate = bytes.readUInt32LE(offset + 16);
      const blockAlign = bytes.readUInt16LE(offset + 20);
      const bitsPerSample = bytes.readUInt16LE(offset + 22);
      const bytesPerSample = bitsPerSample / 8;
      if (format !== 1 || channels < 1 || channels > 2
        || rate < 8000 || rate > 192000
        || ![8, 16, 24, 32].includes(bitsPerSample)
        || blockAlign !== channels * bytesPerSample
        || byteRate !== rate * blockAlign) {
        throw new GeminiSpeechError('Gemini TTS returned an unsupported or unplayable WAV format.');
      }
      frameSize = blockAlign;
    }
    if (id === 'data') dataSizes.push(size);
    offset = next;
  }
  if (offset !== bytes.length || frameSize === null || dataSizes.length === 0
    || dataSizes.every((size) => size === 0)
    || dataSizes.some((size) => size % frameSize !== 0)) {
    throw new GeminiSpeechError('Gemini TTS returned a WAV file without playable audio.');
  }
}

function pcmToWav(pcm: Buffer, params: Record<string, string>): Buffer {
  const rate = Number(params.rate);
  const channels = Number(params.channels);
  if (!Number.isInteger(rate) || rate < 8000 || rate > 192000
    || !Number.isInteger(channels) || channels < 1 || channels > 2
    || pcm.length === 0 || pcm.length % (channels * 2) !== 0) {
    throw new GeminiSpeechError('Gemini TTS returned PCM with invalid sample rate, channels or data.');
  }
  const wav = Buffer.alloc(44 + pcm.length);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * channels * 2, 28);
  wav.writeUInt16LE(channels * 2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(pcm.length, 40);
  pcm.copy(wav, 44);
  return wav;
}

async function saveWav(bytes: Buffer): Promise<string> {
  await fs.mkdir(AUDIO_TEMP_DIR, { recursive: true });
  const filePath = path.join(AUDIO_TEMP_DIR, `${crypto.randomUUID()}.wav`);
  await fs.writeFile(filePath, bytes);
  return filePath;
}

function speechTurns(prompt: string, mode: string, style: string | undefined, config: Record<string, unknown>): SpeechTurn[] {
  if (typeof prompt !== 'string' || !prompt.trim()) throw new GeminiSpeechError('Speech transcript must not be empty.');
  const hasTurnStyles = Object.hasOwn(config, 'turn_styles');
  if (mode === 'single-speaker') {
    if (hasTurnStyles) throw new GeminiSpeechError('turn_styles is only supported in multi-speaker mode.');
    return [{ text: prompt, ...(style ? { style } : {}) }];
  }
  if (mode !== 'multi-speaker') throw new GeminiSpeechError('Unsupported Gemini TTS speech mode.');
  const lines = prompt.split(/\r?\n/);
  const turnStyles = config.turn_styles;
  if (hasTurnStyles && (!Array.isArray(turnStyles) || turnStyles.length !== lines.length)) {
    throw new GeminiSpeechError('turn_styles must be an array with exactly one entry per dialogue line.');
  }
  return lines.map((line, index) => {
    const separator = line.indexOf(':');
    if (separator < 1) throw new GeminiSpeechError("Multi-speaker dialogue requires 'Speaker: utterance' lines.");
    const speaker = line.slice(0, separator).trim();
    const text = line.slice(separator + 1).trim();
    if (!speaker || !text) throw new GeminiSpeechError('Multi-speaker dialogue requires nonempty speaker and utterance.');
    const turnStyle = hasTurnStyles ? (turnStyles as unknown[])[index] : null;
    if (turnStyle !== null && typeof turnStyle !== 'string') {
      throw new GeminiSpeechError('Each turn_styles entry must be a string or null.');
    }
    const effectiveStyle = (typeof turnStyle === 'string' ? turnStyle.trim() : '') || style;
    return { speaker, text, ...(effectiveStyle ? { style: effectiveStyle } : {}) };
  });
}

function multiSpeakerConfig(rawMapping: unknown, turns: SpeechTurn[]) {
  if (!Array.isArray(rawMapping) || rawMapping.length < 1 || rawMapping.length > 2) {
    throw new GeminiSpeechError('Multi-speaker mode requires one or two speaker mappings.');
  }
  const voices = new Map<string, string>();
  for (const item of rawMapping) {
    if (typeof item !== 'object' || item === null) throw new GeminiSpeechError('Invalid speaker mapping.');
    const { speaker, voice } = item as Record<string, unknown>;
    if (typeof speaker !== 'string' || !speaker.trim() || speaker !== speaker.trim()
      || typeof voice !== 'string' || !voice.trim() || voice !== voice.trim()
      || !GEMINI_TTS_VOICES.includes(voice) || voices.has(speaker)) throw new GeminiSpeechError('Invalid or duplicate speaker mapping.');
    voices.set(speaker, voice);
  }
  if (new Set(turns.map((turn) => turn.speaker)).size > 2
    || turns.some((turn) => !voices.has(turn.speaker!))
    || [...voices.keys()].some((speaker) => !turns.some((turn) => turn.speaker === speaker))) {
    throw new GeminiSpeechError('Dialogue speakers must match one or two mapped voices.');
  }
  return {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: [...voices].map(([speaker, voice]) => ({
        speaker, voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
      }))
    }
  };
}

export class GeminiAudioClient extends BaseAudioClient {
  private clientPromise: Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> | null = null;
  private readonly apiKeyResolver: ProviderApiKeyResolver;
  private readonly runtimeResolver: GeminiRuntimeResolver;

  constructor(model: AudioModel, config: MultimediaConfig, apiKeyResolver: ProviderApiKeyResolver, runtimeResolver?: GeminiRuntimeResolver) {
    super(model, config);
    this.apiKeyResolver = apiKeyResolver;
    if (!runtimeResolver) throw new Error('GEMINI_RUNTIME_RESOLVER_REQUIRED');
    this.runtimeResolver = runtimeResolver;
  }

  private getClient(): Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> {
    this.clientPromise ??= this.initializeClient();
    return this.clientPromise;
  }

  private async initializeClient(): Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> {
    try {
      const selection = await this.runtimeResolver();
      return await initializeGeminiClientWithRuntime(selection, this.apiKeyResolver);
    } catch {
      throw new GeminiSpeechError('Gemini TTS configured runtime or credential could not be initialized.');
    }
  }

  async generateSpeech(prompt: string, generationConfig?: Record<string, unknown>): Promise<SpeechGenerationResponse> {
    try {
      const finalConfig = { ...(this.config.toDict?.() ?? {}) } as Record<string, unknown>;
      if (generationConfig) {
        Object.assign(finalConfig, generationConfig);
      }

      const mode = typeof finalConfig.mode === 'string' ? finalConfig.mode : 'single-speaker';
      const style = typeof finalConfig.style_instructions === 'string'
        ? finalConfig.style_instructions.trim() : undefined;
      const turns = speechTurns(prompt, mode, style, finalConfig);
      let voiceName = 'Kore';
      if (mode === 'single-speaker' && Object.hasOwn(finalConfig, 'voice_name')) {
        const suppliedVoice = finalConfig.voice_name;
        if (typeof suppliedVoice !== 'string' || !suppliedVoice.trim() || suppliedVoice !== suppliedVoice.trim()) {
          throw new GeminiSpeechError('Gemini TTS voice_name must be a nonempty string without surrounding whitespace.');
        }
        voiceName = suppliedVoice;
      }
      const speechConfig = mode === 'multi-speaker'
        ? multiSpeakerConfig(finalConfig.speaker_mapping, turns)
        : { voiceConfig: { voice: voiceName } };
      const { client, runtimeInfo } = await this.getClient();
      const runtimeAdjustedModel = resolveModelForRuntime(this.model.value, 'tts', runtimeInfo.runtime);
      const response = await client.models.generateContent({
        model: runtimeAdjustedModel,
        contents: [{ role: 'user', parts: turns.map((turn) => ({
          text: turn.text,
          ...(turn.speaker || turn.style ? { speechMetadata: {
            ...(turn.speaker ? { speaker: turn.speaker } : {}),
            ...(turn.style ? { style: turn.style } : {})
          } } : {})
        })) }],
        config: { responseModalities: ['AUDIO'], speechConfig }
      });
      const inlineData = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const audioBytes = decodeAudio(inlineData?.data);
      if (audioBytes.length === 0) throw new GeminiSpeechError('Gemini TTS returned empty audio data.');
      const { base, params } = parseMimeType(inlineData?.mimeType);
      let wav: Buffer;
      if (isWav(audioBytes) || base === 'audio/wav' || base === 'audio/x-wav') {
        validateWav(audioBytes);
        wav = audioBytes;
      } else if (base === 'audio/pcm' || base === 'audio/l16') {
        wav = pcmToWav(audioBytes, params);
      } else {
        throw new GeminiSpeechError('Gemini TTS returned an unsupported audio format.');
      }
      return new SpeechGenerationResponse([await saveWav(wav)]);
    } catch (error) {
      throw new Error(`Google Gemini speech generation failed: ${safeFailureMessage(error)}`);
    }
  }
}
