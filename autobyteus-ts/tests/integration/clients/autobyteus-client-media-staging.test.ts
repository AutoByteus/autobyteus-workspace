import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { AutobyteusClient } from '../../../src/clients/autobyteus-client.js';

type CapturedRequest = {
  path: string;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
  json?: any;
};

async function readBody(request: http.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function writeJson(response: http.ServerResponse, statusCode: number, payload: Record<string, unknown>): void {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}

describe('AutobyteusClient media staging integration', () => {
  const apiKey = 'test-key';
  const originalEnv = { ...process.env };
  let tempDir: string;
  let server: http.Server;
  let serverUrl: string;
  let capturedRequests: CapturedRequest[];

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      AUTOBYTEUS_API_KEY: apiKey,
      AUTOBYTEUS_INLINE_VIDEO_MAX_BYTES: '4'
    };
    capturedRequests = [];
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-media-e2e-'));

    server = http.createServer(async (request, response) => {
      const requestPath = request.url ?? '';
      const body = await readBody(request);
      const captured: CapturedRequest = {
        path: requestPath,
        headers: request.headers,
        body
      };
      capturedRequests.push(captured);

      if (request.method === 'POST' && requestPath === '/media/stage') {
        writeJson(response, 200, {
          media_id: 'staged-video.mp4',
          media_uri: 'media://videos/staged-video.mp4',
          mime_type: request.headers['content-type'] ?? 'video/mp4',
          size_bytes: body.length
        });
        return;
      }

      if (request.method === 'POST' && requestPath === '/send-message') {
        captured.json = JSON.parse(body.toString('utf8'));
        writeJson(response, 200, {
          content: 'ok',
          reasoning: null,
          token_usage: null,
          image_urls: [],
          audio_urls: [],
          video_urls: []
        });
        return;
      }

      writeJson(response, 404, { error: 'not found' });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    serverUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await fs.rm(tempDir, { recursive: true, force: true });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it('stages a large local video before sending an empty-content media-only message', async () => {
    const videoBytes = Buffer.from('large-video-bytes');
    const videoPath = path.join(tempDir, 'input.mp4');
    await fs.writeFile(videoPath, videoBytes);

    const client = new AutobyteusClient(serverUrl, apiKey);
    const result = await client.sendMessage({
      conversationId: 'conversation-media-only',
      modelName: 'dummy-rpa-model',
      payload: {
        current_message_index: 0,
        messages: [
          {
            role: 'user',
            content: '',
            image_urls: [],
            audio_urls: [],
            video_urls: [videoPath]
          }
        ]
      }
    });

    expect(result.content).toBe('ok');
    expect(capturedRequests.map((request) => request.path)).toEqual([
      '/media/stage',
      '/send-message'
    ]);

    const stageRequest = capturedRequests[0];
    expect(stageRequest.headers.autobyteus_api_key).toBe('test-key');
    expect(stageRequest.headers['content-type']).toBe('video/mp4');
    expect(stageRequest.headers['x-autobyteus-media-filename']).toBe('input.mp4');
    expect(stageRequest.headers['x-autobyteus-media-type']).toBe('video');
    expect(stageRequest.body).toEqual(videoBytes);

    const sendRequest = capturedRequests[1];
    expect(sendRequest.headers.autobyteus_api_key).toBe('test-key');
    expect(sendRequest.json).toMatchObject({
      conversation_id: 'conversation-media-only',
      model_name: 'dummy-rpa-model',
      current_message_index: 0
    });
    expect(sendRequest.json.messages).toEqual([
      {
        role: 'user',
        content: '',
        image_urls: [],
        audio_urls: [],
        video_urls: ['media://videos/staged-video.mp4']
      }
    ]);
  });
});
