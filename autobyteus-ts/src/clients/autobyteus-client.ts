import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath, URL } from 'node:url';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { getMimeType, isBase64, mediaSourceToDataUri } from '../llm/utils/media-payload-formatter.js';
import {
  assertValidAutobyteusConversationPayload,
  AutobyteusConversationMessage,
  AutobyteusConversationPayload,
  AutobyteusSendMessageRequest
} from '../llm/api/autobyteus-conversation-payload.js';

export class CertificateError extends Error {}

type JsonRecord = Record<string, unknown>;
type MediaKind = 'image' | 'audio' | 'video';

type StageMediaBody = {
  body: Buffer | NodeJS.ReadableStream;
  filename: string;
  mimeType: string;
};

export type AutobyteusRequestOptions = {
  signal?: AbortSignal | null;
};

const DEFAULT_INLINE_MEDIA_MAX_BYTES: Record<MediaKind, number> = {
  image: 10 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 25 * 1024 * 1024
};

const INLINE_MEDIA_MAX_BYTES_ENV: Record<MediaKind, string> = {
  image: 'AUTOBYTEUS_INLINE_IMAGE_MAX_BYTES',
  audio: 'AUTOBYTEUS_INLINE_AUDIO_MAX_BYTES',
  video: 'AUTOBYTEUS_INLINE_VIDEO_MAX_BYTES'
};

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

function getInlineMaxBytes(kind: MediaKind): number {
  const envName = INLINE_MEDIA_MAX_BYTES_ENV[kind];
  const configuredValue = process.env[envName];
  if (!configuredValue) {
    return DEFAULT_INLINE_MEDIA_MAX_BYTES[kind];
  }

  const parsed = Number(configuredValue);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_INLINE_MEDIA_MAX_BYTES[kind];
}

function isHttpUrl(source: string): boolean {
  return source.startsWith('http://') || source.startsWith('https://');
}

function isDataUri(source: string): boolean {
  return source.startsWith('data:');
}

function isMediaUri(source: string): boolean {
  return source.startsWith('media://');
}

function estimateBase64DecodedBytes(base64Data: string): number {
  const normalized = base64Data.replace(/\s/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function parseDataUri(mediaSource: string): { mimeType: string; payload: string; isBase64Payload: boolean } {
  const commaIndex = mediaSource.indexOf(',');
  if (commaIndex < 0) {
    throw new Error('Invalid data URI media source: missing payload separator.');
  }

  const header = mediaSource.slice(0, commaIndex);
  const payload = mediaSource.slice(commaIndex + 1);
  const mimeType = header.slice(5).split(';', 1)[0] || 'application/octet-stream';

  return {
    mimeType,
    payload,
    isBase64Payload: header.toLowerCase().includes(';base64')
  };
}

function getFilenameFromUrl(mediaUrl: string, fallback: string): string {
  try {
    const parsed = new URL(mediaUrl);
    const basename = path.basename(parsed.pathname);
    return basename || fallback;
  } catch {
    return fallback;
  }
}

function getLocalFilePathFromSource(source: string): string | null {
  if (source.startsWith('file://')) {
    try {
      return fileURLToPath(source);
    } catch {
      return null;
    }
  }

  if (isHttpUrl(source) || isDataUri(source) || isMediaUri(source)) {
    return null;
  }

  return source;
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
    request: AutobyteusSendMessageRequest,
    options: AutobyteusRequestOptions = {},
  ): Promise<JsonRecord> {
    try {
      const normalizedPayload = await this.normalizeConversationPayload(request.payload, options.signal ?? null);
      const payload = {
        conversation_id: request.conversationId,
        model_name: request.modelName,
        messages: normalizedPayload.messages,
        current_message_index: normalizedPayload.current_message_index,
        generation_config: request.generationConfig ?? {}
      };
      const response = await this.asyncClient.post(joinUrl(this.serverUrl, '/send-message'), payload, {
        signal: options.signal ?? undefined
      });
      return response.data;
    } catch (error) {
      throw this.handleAxiosError(error, 'Error sending message');
    }
  }

  async *streamMessage(
    request: AutobyteusSendMessageRequest,
    options: AutobyteusRequestOptions = {},
  ): AsyncGenerator<JsonRecord, void, void> {
    const normalizedPayload = await this.normalizeConversationPayload(request.payload, options.signal ?? null);
    const payload = {
      conversation_id: request.conversationId,
      model_name: request.modelName,
      messages: normalizedPayload.messages,
      current_message_index: normalizedPayload.current_message_index,
      generation_config: request.generationConfig ?? {}
    };

    try {
      const response = await this.asyncClient.post(joinUrl(this.serverUrl, '/stream-message'), payload, {
        responseType: 'stream',
        signal: options.signal ?? undefined
      });

      const readline = await import('node:readline');
      const stream = response.data as NodeJS.ReadableStream;
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

      try {
        for await (const line of rl) {
          if (typeof line !== 'string') continue;
          if (!line.startsWith('data: ')) continue;
          let chunk: JsonRecord;
          try {
            chunk = JSON.parse(line.slice(6)) as JsonRecord;
          } catch {
            throw new Error('Invalid stream response format');
          }
          if (chunk.error) {
            throw new Error(
              typeof chunk.error === 'string' ? chunk.error : JSON.stringify(chunk.error)
            );
          }
          yield chunk;
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
      const normalizedInputImageUrls = await this.normalizeMediaSources(inputImageUrls, 'image', null);
      const normalizedMaskUrl = await this.normalizeSingleMediaSource(maskUrl, 'image', null);
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

  private async normalizeMediaSources(
    mediaSources: string[] | null | undefined,
    kind: MediaKind,
    signal: AbortSignal | null
  ): Promise<string[]> {
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
      normalized.push(await this.normalizeMediaSource(trimmed, kind, signal));
    }
    return normalized;
  }

  private async normalizeConversationPayload(
    payload: AutobyteusConversationPayload,
    signal: AbortSignal | null
  ): Promise<AutobyteusConversationPayload> {
    assertValidAutobyteusConversationPayload(payload);

    const messages: AutobyteusConversationMessage[] = [];
    for (let index = 0; index < payload.messages.length; index += 1) {
      const message = payload.messages[index];
      const isCurrentMessage = index === payload.current_message_index;

      messages.push({
        role: message.role,
        content: message.content ?? '',
        image_urls: isCurrentMessage ? await this.normalizeMediaSources(message.image_urls, 'image', signal) : [],
        audio_urls: isCurrentMessage ? await this.normalizeMediaSources(message.audio_urls, 'audio', signal) : [],
        video_urls: isCurrentMessage ? await this.normalizeMediaSources(message.video_urls, 'video', signal) : []
      });
    }

    return {
      messages,
      current_message_index: payload.current_message_index
    };
  }

  private async normalizeSingleMediaSource(
    mediaSource: string | null | undefined,
    kind: MediaKind,
    signal: AbortSignal | null
  ): Promise<string | null> {
    if (typeof mediaSource !== 'string') {
      return null;
    }
    const trimmed = mediaSource.trim();
    if (!trimmed) {
      return null;
    }
    return this.normalizeMediaSource(trimmed, kind, signal);
  }

  private async normalizeMediaSource(source: string, kind: MediaKind, signal: AbortSignal | null): Promise<string> {
    if (isMediaUri(source)) {
      return source;
    }

    const sourceSizeBytes = await this.getMediaSourceSizeBytes(source, signal);
    const inlineMaxBytes = getInlineMaxBytes(kind);
    if (sourceSizeBytes !== null && sourceSizeBytes > inlineMaxBytes) {
      return this.stageMediaSource(source, kind, signal);
    }
    if (sourceSizeBytes === null && isHttpUrl(source)) {
      return this.stageMediaSource(source, kind, signal);
    }

    return mediaSourceToDataUri(getLocalFilePathFromSource(source) ?? source);
  }

  private async getMediaSourceSizeBytes(source: string, signal: AbortSignal | null): Promise<number | null> {
    if (isDataUri(source)) {
      const parsed = parseDataUri(source);
      return parsed.isBase64Payload
        ? estimateBase64DecodedBytes(parsed.payload)
        : Buffer.byteLength(decodeURIComponent(parsed.payload), 'utf8');
    }

    if (isBase64(source)) {
      return estimateBase64DecodedBytes(source);
    }

    if (isHttpUrl(source)) {
      try {
        const response = await axios.head(source, { signal: signal ?? undefined });
        const contentLength = response.headers?.['content-length'];
        if (typeof contentLength === 'string') {
          const parsed = Number(contentLength);
          return Number.isFinite(parsed) ? parsed : null;
        }
      } catch {
        return null;
      }
      return null;
    }

    const localPath = getLocalFilePathFromSource(source);
    if (!localPath) {
      return null;
    }

    try {
      const stat = await fsPromises.stat(localPath);
      return stat.isFile() ? stat.size : null;
    } catch {
      return null;
    }
  }

  private async stageMediaSource(source: string, kind: MediaKind, signal: AbortSignal | null): Promise<string> {
    const mediaBody = await this.createStageMediaBody(source, kind, signal);
    const response = await this.asyncClient.post(joinUrl(this.serverUrl, '/media/stage'), mediaBody.body, {
      headers: {
        'Content-Type': mediaBody.mimeType,
        'X-Autobyteus-Media-Filename': mediaBody.filename,
        'X-Autobyteus-Media-Type': kind
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      signal: signal ?? undefined
    });

    const mediaUri = response.data?.media_uri;
    if (typeof mediaUri !== 'string' || !isMediaUri(mediaUri)) {
      throw new Error('Invalid media staging response: missing media_uri.');
    }

    return mediaUri;
  }

  private async createStageMediaBody(
    source: string,
    kind: MediaKind,
    signal: AbortSignal | null
  ): Promise<StageMediaBody> {
    if (isDataUri(source)) {
      const parsed = parseDataUri(source);
      const body = parsed.isBase64Payload
        ? Buffer.from(parsed.payload, 'base64')
        : Buffer.from(decodeURIComponent(parsed.payload), 'utf8');
      return {
        body,
        filename: `${kind}.bin`,
        mimeType: parsed.mimeType
      };
    }

    if (isBase64(source)) {
      return {
        body: Buffer.from(source, 'base64'),
        filename: `${kind}.bin`,
        mimeType: 'application/octet-stream'
      };
    }

    if (isHttpUrl(source)) {
      const response = await axios.get<NodeJS.ReadableStream>(source, {
        responseType: 'stream',
        signal: signal ?? undefined
      });
      const headerContentType = response.headers?.['content-type'];
      const mimeType = typeof headerContentType === 'string'
        ? headerContentType.split(';', 1)[0].trim() || 'application/octet-stream'
        : 'application/octet-stream';
      return {
        body: response.data,
        filename: getFilenameFromUrl(source, `${kind}.bin`),
        mimeType
      };
    }

    const localPath = getLocalFilePathFromSource(source);
    if (localPath) {
      return {
        body: fs.createReadStream(localPath),
        filename: path.basename(localPath) || `${kind}.bin`,
        mimeType: getMimeType(localPath)
      };
    }

    return {
      body: Readable.from(Buffer.from(source)),
      filename: `${kind}.bin`,
      mimeType: 'application/octet-stream'
    };
  }
}
