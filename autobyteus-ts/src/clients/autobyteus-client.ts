import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import https from 'node:https';
import { URL } from 'node:url';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { mediaSourceToDataUri } from '../llm/utils/media-payload-formatter.js';

export class CertificateError extends Error {}

type JsonRecord = Record<string, unknown>;

function joinUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl).toString();
}

function getDefaultServerUrlFromEnv(): string {
  const hosts = process.env.AUTOBYTEUS_LLM_SERVER_HOSTS;
  if (!hosts) {
    return AutobyteusClient.DEFAULT_SERVER_URL;
  }

  const firstHost = hosts.split(',').map((host) => host.trim()).find(Boolean);
  return firstHost ?? AutobyteusClient.DEFAULT_SERVER_URL;
}

function formatHttpError(error: AxiosError): Error {
  const response = error.response;
  const status = response?.status;
  const statusText = response?.statusText ?? '';
  let detail = '';

  if (response?.data) {
    if (typeof response.data === 'string') {
      detail = response.data;
    } else {
      try {
        detail = JSON.stringify(response.data);
      } catch {
        detail = String(response.data);
      }
    }
  }

  let message = status ? `HTTP ${status} ${statusText}`.trim() : 'HTTP error';
  if (detail) {
    message = `${message}: ${detail}`;
  } else if (error.message) {
    message = `${message}: ${error.message}`;
  }

  const wrapped = new Error(message);
  Object.assign(wrapped, { cause: error });
  return wrapped;
}

export class AutobyteusClient {
  static DEFAULT_SERVER_URL = 'https://api.autobyteus.com';
  static API_KEY_HEADER = 'AUTOBYTEUS_API_KEY';
  static API_KEY_ENV_VAR = 'AUTOBYTEUS_API_KEY';
  static SSL_CERT_FILE_ENV_VAR = 'AUTOBYTEUS_SSL_CERT_FILE';

  serverUrl: string;
  apiKey: string;
  asyncClient: AxiosInstance;
  syncClient: AxiosInstance;

  private asyncAgent?: https.Agent;
  private syncAgent?: https.Agent;

  constructor(serverUrl?: string) {
    this.serverUrl =
      serverUrl ??
      getDefaultServerUrlFromEnv();
    this.apiKey = process.env[AutobyteusClient.API_KEY_ENV_VAR] ?? '';

    if (!this.apiKey) {
      throw new Error(
        `${AutobyteusClient.API_KEY_ENV_VAR} environment variable is required. ` +
        'Please set it before initializing the client.'
      );
    }

    const customCertPath = process.env[AutobyteusClient.SSL_CERT_FILE_ENV_VAR];
    const { asyncAgent, syncAgent } = this.buildAgents(customCertPath ?? null);
    this.asyncAgent = asyncAgent;
    this.syncAgent = syncAgent;

    const baseConfig = {
      headers: { [AutobyteusClient.API_KEY_HEADER]: this.apiKey },
      timeout: 0
    };

    try {
      this.asyncClient = axios.create({ ...baseConfig, httpsAgent: asyncAgent });
      this.syncClient = axios.create({ ...baseConfig, httpsAgent: syncAgent });
    } catch (error) {
      throw new Error(`HTTP client initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildAgents(certPath: string | null): { asyncAgent: https.Agent; syncAgent: https.Agent } {
    if (certPath) {
      const stat = fs.existsSync(certPath) ? fs.statSync(certPath) : null;
      if (!stat) {
        throw new CertificateError(
          `Custom SSL certificate file specified via ${AutobyteusClient.SSL_CERT_FILE_ENV_VAR} not found at: ${certPath}`
        );
      }
      if (!stat.isFile()) {
        throw new CertificateError(
          `Custom SSL certificate path specified via ${AutobyteusClient.SSL_CERT_FILE_ENV_VAR} is not a file: ${certPath}`
        );
      }

      const certData = fs.readFileSync(certPath);
      const agentOptions = { ca: certData, rejectUnauthorized: true };
      return {
        asyncAgent: new https.Agent(agentOptions),
        syncAgent: new https.Agent(agentOptions)
      };
    }

    console.warn(
      'SECURITY WARNING: SSL certificate verification is DISABLED because the ' +
      `'${AutobyteusClient.SSL_CERT_FILE_ENV_VAR}' environment variable is not set.`
    );

    const agentOptions = { rejectUnauthorized: false };
    return {
      asyncAgent: new https.Agent(agentOptions),
      syncAgent: new https.Agent(agentOptions)
    };
  }

  async getAvailableLlmModels(): Promise<JsonRecord> {
    try {
      const response = await this.asyncClient.get(joinUrl(this.serverUrl, '/models/llm'));
      return response.data;
    } catch (error) {
      throw this.handleAxiosError(error, 'Async LLM model fetch error');
    }
  }

  async getAvailableLlmModelsSync(): Promise<JsonRecord> {
    try {
      const response = await this.syncClient.get(joinUrl(this.serverUrl, '/models/llm'));
      return response.data;
    } catch (error) {
      throw this.handleAxiosError(error, 'Sync LLM model fetch error');
    }
  }

  async getAvailableImageModels(): Promise<JsonRecord> {
    try {
      const response = await this.asyncClient.get(joinUrl(this.serverUrl, '/models/image'));
      return response.data;
    } catch (error) {
      throw this.handleAxiosError(error, 'Async image model fetch error');
    }
  }

  async getAvailableImageModelsSync(): Promise<JsonRecord> {
    try {
      const response = await this.syncClient.get(joinUrl(this.serverUrl, '/models/image'));
      return response.data;
    } catch (error) {
      throw this.handleAxiosError(error, 'Sync image model fetch error');
    }
  }

  async getAvailableAudioModels(): Promise<JsonRecord> {
    try {
      const response = await this.asyncClient.get(joinUrl(this.serverUrl, '/models/audio'));
      return response.data;
    } catch (error) {
      throw this.handleAxiosError(error, 'Async audio model fetch error');
    }
  }

  async getAvailableAudioModelsSync(): Promise<JsonRecord> {
    try {
      const response = await this.syncClient.get(joinUrl(this.serverUrl, '/models/audio'));
      return response.data;
    } catch (error) {
      throw this.handleAxiosError(error, 'Sync audio model fetch error');
    }
  }

  async sendMessage(
    conversationId: string,
    modelName: string,
    userMessage: string,
    imageUrls?: string[] | null,
    audioUrls?: string[] | null,
    videoUrls?: string[] | null
  ): Promise<JsonRecord> {
    try {
      const normalizedImageUrls = await this.normalizeMediaSources(imageUrls);
      const normalizedAudioUrls = await this.normalizeMediaSources(audioUrls);
      const normalizedVideoUrls = await this.normalizeMediaSources(videoUrls);
      const payload = {
        conversation_id: conversationId,
        model_name: modelName,
        user_message: userMessage,
        image_urls: normalizedImageUrls,
        audio_urls: normalizedAudioUrls,
        video_urls: normalizedVideoUrls
      };
      const response = await this.asyncClient.post(joinUrl(this.serverUrl, '/send-message'), payload);
      return response.data;
    } catch (error) {
      throw this.handleAxiosError(error, 'Error sending message');
    }
  }

  async *streamMessage(
    conversationId: string,
    modelName: string,
    userMessage: string,
    imageUrls?: string[] | null,
    audioUrls?: string[] | null,
    videoUrls?: string[] | null
  ): AsyncGenerator<JsonRecord, void, void> {
    const normalizedImageUrls = await this.normalizeMediaSources(imageUrls);
    const normalizedAudioUrls = await this.normalizeMediaSources(audioUrls);
    const normalizedVideoUrls = await this.normalizeMediaSources(videoUrls);
    const payload = {
      conversation_id: conversationId,
      model_name: modelName,
      user_message: userMessage,
      image_urls: normalizedImageUrls,
      audio_urls: normalizedAudioUrls,
      video_urls: normalizedVideoUrls
    };

    try {
      const response = await this.asyncClient.post(joinUrl(this.serverUrl, '/stream-message'), payload, {
        responseType: 'stream'
      });

      const readline = await import('node:readline');
      const stream = response.data as NodeJS.ReadableStream;
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

      try {
        for await (const line of rl) {
          if (typeof line !== 'string') continue;
          if (!line.startsWith('data: ')) continue;
          try {
            const chunk = JSON.parse(line.slice(6));
            if (chunk?.error) {
              throw new Error(chunk.error);
            }
            yield chunk;
          } catch (error) {
            throw new Error('Invalid stream response format');
          }
        }
      } finally {
        rl.close();
      }
    } catch (error) {
      throw this.handleAxiosError(error, 'Stream error');
    }
  }

  async generateImage(
    modelName: string,
    prompt: string,
    inputImageUrls?: string[] | null,
    maskUrl?: string | null,
    generationConfig?: Record<string, unknown> | null,
    sessionId?: string | null
  ): Promise<JsonRecord> {
    try {
      const normalizedInputImageUrls = await this.normalizeMediaSources(inputImageUrls);
      const normalizedMaskUrl = await this.normalizeSingleMediaSource(maskUrl);
      const payload = {
        model_name: modelName,
        prompt,
        input_image_urls: normalizedInputImageUrls,
        mask_url: normalizedMaskUrl,
        generation_config: generationConfig ?? {},
        session_id: sessionId ?? null
      };
      const response = await this.asyncClient.post(joinUrl(this.serverUrl, '/generate-image'), payload);
      return response.data;
    } catch (error) {
      throw this.handleAxiosError(error, 'Error generating image');
    }
  }

  async generateSpeech(
    modelName: string,
    prompt: string,
    generationConfig?: Record<string, unknown> | null,
    sessionId?: string | null
  ): Promise<JsonRecord> {
    try {
      const payload = {
        model_name: modelName,
        prompt,
        generation_config: generationConfig ?? {},
        session_id: sessionId ?? null
      };
      const response = await this.asyncClient.post(joinUrl(this.serverUrl, '/generate-speech'), payload);
      return response.data;
    } catch (error) {
      throw this.handleAxiosError(error, 'Error generating speech');
    }
  }

  async cleanup(conversationId: string): Promise<JsonRecord> {
    try {
      const response = await this.asyncClient.post(joinUrl(this.serverUrl, '/cleanup'), {
        conversation_id: conversationId
      });
      return response.data;
    } catch (error) {
      throw this.handleAxiosError(error, 'Cleanup error');
    }
  }

  async cleanupImageSession(sessionId: string): Promise<JsonRecord> {
    try {
      const response = await this.asyncClient.post(joinUrl(this.serverUrl, '/cleanup/image'), {
        session_id: sessionId
      });
      return response.data;
    } catch (error) {
      throw this.handleAxiosError(error, 'Image session cleanup error');
    }
  }

  async cleanupAudioSession(sessionId: string): Promise<JsonRecord> {
    try {
      const response = await this.asyncClient.post(joinUrl(this.serverUrl, '/cleanup/audio'), {
        session_id: sessionId
      });
      return response.data;
    } catch (error) {
      throw this.handleAxiosError(error, 'Audio session cleanup error');
    }
  }

  async close(): Promise<void> {
    this.asyncAgent?.destroy();
    this.syncAgent?.destroy();
  }

  async enter(): Promise<AutobyteusClient> {
    return this;
  }

  async exit(): Promise<void> {
    await this.close();
  }

  private handleAxiosError(error: unknown, logPrefix: string): Error {
    if (axios.isAxiosError(error) && error.response) {
      return formatHttpError(error);
    }
    if (error instanceof Error) {
      return new Error(error.message);
    }
    return new Error(`${logPrefix}: ${String(error)}`);
  }

  private async normalizeMediaSources(mediaSources?: string[] | null): Promise<string[]> {
    if (!Array.isArray(mediaSources) || mediaSources.length === 0) {
      return [];
    }

    const normalized: string[] = [];
    for (const source of mediaSources) {
      if (typeof source !== 'string') {
        continue;
      }
      const trimmed = source.trim();
      if (!trimmed) {
        continue;
      }
      normalized.push(await mediaSourceToDataUri(trimmed));
    }
    return normalized;
  }

  private async normalizeSingleMediaSource(mediaSource?: string | null): Promise<string | null> {
    if (typeof mediaSource !== 'string') {
      return null;
    }
    const trimmed = mediaSource.trim();
    if (!trimmed) {
      return null;
    }
    return mediaSourceToDataUri(trimmed);
  }
}
