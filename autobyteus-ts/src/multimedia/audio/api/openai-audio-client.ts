import OpenAI from 'openai';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

import { BaseAudioClient } from '../base-audio-client.js';
import { SpeechGenerationResponse } from '../../utils/response-types.js';
import type { AudioModel } from '../audio-model.js';
import type { MultimediaConfig } from '../../utils/multimedia-config.js';

const AUDIO_TEMP_DIR = path.join(os.tmpdir(), 'autobyteus_audio');

async function saveAudioBytes(audioBytes: Uint8Array, fileExtension?: string | null): Promise<string> {
  await fs.mkdir(AUDIO_TEMP_DIR, { recursive: true });
  const extension = (fileExtension ?? 'mp3').replace(/^\./, '') || 'mp3';
  const filePath = path.join(AUDIO_TEMP_DIR, `${crypto.randomUUID()}.${extension}`);
  await fs.writeFile(filePath, Buffer.from(audioBytes));
  return filePath;
}

  export class OpenAIAudioClient extends BaseAudioClient {
  private client: OpenAI;

  constructor(model: AudioModel, config: MultimediaConfig) {
    super(model, config);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set.');
    }

    try {
      this.client = new OpenAI({ apiKey, baseURL: 'https://api.openai.com/v1' });
    } catch (error) {
      throw new Error(`Failed to configure OpenAI client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateSpeech(prompt: string, generationConfig?: Record<string, unknown>): Promise<SpeechGenerationResponse> {
    try {
      const finalConfig = { ...(this.config.toDict?.() ?? {}) } as Record<string, unknown>;
      if (generationConfig) {
        Object.assign(finalConfig, generationConfig);
      }

      const voice = typeof finalConfig.voice === 'string' ? finalConfig.voice : 'alloy';
      const responseFormat = typeof finalConfig.response_format === 'string'
        ? finalConfig.response_format
        : (typeof finalConfig.format === 'string' ? finalConfig.format : 'mp3');
      const instructions = typeof finalConfig.instructions === 'string' ? finalConfig.instructions : undefined;

      const request: Record<string, unknown> = {
        model: this.model.value,
        voice,
        input: prompt
      };

      if (instructions) {
        request.instructions = instructions;
      }

      if (responseFormat) {
        request.response_format = responseFormat;
      }

      const response = await this.client.audio.speech.create(
        request as unknown as OpenAI.Audio.SpeechCreateParams
      );
      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('OpenAI Speech API returned an empty response.');
      }

      const audioPath = await saveAudioBytes(new Uint8Array(arrayBuffer), responseFormat);
      return new SpeechGenerationResponse([audioPath]);
    } catch (error) {
      throw new Error(`OpenAI speech generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
