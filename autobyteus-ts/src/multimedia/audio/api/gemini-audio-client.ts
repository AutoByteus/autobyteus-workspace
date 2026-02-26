import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

import { GoogleGenAI } from '@google/genai';
import { BaseAudioClient } from '../base-audio-client.js';
import { SpeechGenerationResponse } from '../../utils/response-types.js';
import { initializeGeminiClientWithRuntime } from '../../../utils/gemini-helper.js';
import type { GeminiRuntimeInfo } from '../../../utils/gemini-helper.js';
import { resolveModelForRuntime } from '../../../utils/gemini-model-mapping.js';
import type { AudioModel } from '../audio-model.js';
import type { MultimediaConfig } from '../../utils/multimedia-config.js';

const AUDIO_TEMP_DIR = path.join(os.tmpdir(), 'autobyteus_audio');

const AUDIO_MIME_EXTENSION_MAP: Record<string, string> = {
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm'
};

type MimeParseResult = { base: string; params: Record<string, string> };

function parseMimeType(mimeType?: string | null): MimeParseResult {
  if (!mimeType) {
    return { base: '', params: {} };
  }
  const parts = mimeType.split(';').map((part) => part.trim()).filter(Boolean);
  const base = parts[0]?.toLowerCase() ?? '';
  const params: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const [key, value] = part.split('=', 2);
    if (key && value) {
      params[key.trim().toLowerCase()] = value.trim();
    }
  }
  return { base, params };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function coerceAudioBytes(data: unknown): Uint8Array {
  if (!data) return new Uint8Array();
  if (typeof data === 'string') {
    return Uint8Array.from(Buffer.from(data, 'base64'));
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer as ArrayBuffer);
  }
  if (Array.isArray(data)) {
    return new Uint8Array(data);
  }
  return new Uint8Array();
}

async function saveAudioBytesToWav(
  pcmBytes: Uint8Array,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  await fs.mkdir(AUDIO_TEMP_DIR, { recursive: true });
  const filePath = path.join(AUDIO_TEMP_DIR, `${crypto.randomUUID()}.wav`);

  const blockAlign = channels * sampleWidth;
  const byteRate = rate * blockAlign;
  const dataSize = pcmBytes.length;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(sampleWidth * 8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  Buffer.from(pcmBytes).copy(buffer, 44);

  await fs.writeFile(filePath, buffer);
  return filePath;
}

async function saveAudioBytes(audioBytes: Uint8Array, extension?: string | null): Promise<string> {
  await fs.mkdir(AUDIO_TEMP_DIR, { recursive: true });
  const suffix = (extension ?? 'bin').replace(/^\./, '') || 'bin';
  const filePath = path.join(AUDIO_TEMP_DIR, `${crypto.randomUUID()}.${suffix}`);
  await fs.writeFile(filePath, Buffer.from(audioBytes));
  return filePath;
}

export class GeminiAudioClient extends BaseAudioClient {
  private client: GoogleGenAI;
  private runtimeInfo: GeminiRuntimeInfo | null;

  constructor(model: AudioModel, config: MultimediaConfig) {
    super(model, config);
    const { client, runtimeInfo } = initializeGeminiClientWithRuntime();
    this.client = client;
    this.runtimeInfo = runtimeInfo;
  }

  async generateSpeech(prompt: string, generationConfig?: Record<string, unknown>): Promise<SpeechGenerationResponse> {
    try {
      const finalConfig = { ...(this.config.toDict?.() ?? {}) } as Record<string, unknown>;
      if (generationConfig) {
        Object.assign(finalConfig, generationConfig);
      }

      const styleInstructions = typeof finalConfig.style_instructions === 'string'
        ? finalConfig.style_instructions
        : undefined;
      const finalPrompt = styleInstructions ? `${styleInstructions}: ${prompt}` : prompt;

      let speechConfig: Record<string, unknown> | null = null;
      const mode = typeof finalConfig.mode === 'string' ? finalConfig.mode : 'single-speaker';

      if (mode === 'multi-speaker') {
        const speakerMapping = Array.isArray(finalConfig.speaker_mapping)
          ? finalConfig.speaker_mapping
          : [];
        if (!Array.isArray(speakerMapping) || speakerMapping.length === 0) {
          throw new Error("Multi-speaker mode requires a 'speaker_mapping' list in generation_config.");
        }

        const speakerVoiceConfigs = speakerMapping
          .map((item) => {
            if (!isRecord(item)) {
              return null;
            }
            const speaker = item.speaker;
            const voice = item.voice;
            if (typeof speaker !== 'string' || typeof voice !== 'string') {
              return null;
            }
            return {
              speaker,
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice }
              }
            };
          })
          .filter((item): item is { speaker: string; voiceConfig: { prebuiltVoiceConfig: { voiceName: string } } } => Boolean(item));

        if (speakerVoiceConfigs.length === 0) {
          throw new Error("The 'speaker_mapping' list was empty or contained no valid mappings.");
        }

        speechConfig = {
          multiSpeakerVoiceConfig: { speakerVoiceConfigs }
        };
      } else {
        const voiceName = typeof finalConfig.voice_name === 'string'
          ? finalConfig.voice_name
          : 'Kore';
        speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        };
      }

      const runtimeAdjustedModel = resolveModelForRuntime(
        this.model.value,
        'tts',
        this.runtimeInfo?.runtime
      );

      const response = await this.client.models.generateContent({
        model: runtimeAdjustedModel,
        contents: finalPrompt,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig
        }
      });

      const part = response?.candidates?.[0]?.content?.parts?.[0];
      const inlineData = part?.inlineData;
      const mimeType = inlineData?.mimeType;
      const { base, params } = parseMimeType(mimeType);
      const audioBytes = coerceAudioBytes(inlineData?.data);

      if (!audioBytes || audioBytes.length === 0) {
        throw new Error('Gemini TTS returned empty audio data.');
      }

      if (!base || base.startsWith('audio/pcm') || base === 'audio/l16') {
        let rate = 24000;
        let channels = 1;
        if (params.rate) {
          const parsed = Number(params.rate);
          if (!Number.isNaN(parsed)) rate = parsed;
        }
        if (params.channels) {
          const parsed = Number(params.channels);
          if (!Number.isNaN(parsed)) channels = parsed;
        }
        const audioPath = await saveAudioBytesToWav(audioBytes, channels, rate, 2);
        return new SpeechGenerationResponse([audioPath]);
      }

      const extension = AUDIO_MIME_EXTENSION_MAP[base] ?? 'bin';
      const audioPath = await saveAudioBytes(audioBytes, extension);
      return new SpeechGenerationResponse([audioPath]);
    } catch (error) {
      throw new Error(`Google Gemini speech generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
