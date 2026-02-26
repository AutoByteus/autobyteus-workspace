import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Readable } from 'node:stream';
import axios from 'axios';
import { AutobyteusClient } from '../../../src/clients/autobyteus-client.js';

const createMock = vi.fn();
const mediaSourceToDataUriMock = vi.fn();

vi.mock('axios', async () => {
  return {
    default: {
      create: (...args: any[]) => createMock(...args),
      isAxiosError: (error: any) => Boolean(error?.isAxiosError)
    }
  };
});

vi.mock('../../../src/llm/utils/media-payload-formatter.js', async () => {
  const actual = await vi.importActual('../../../src/llm/utils/media-payload-formatter.js');
  return {
    ...(actual as Record<string, unknown>),
    mediaSourceToDataUri: (...args: any[]) => mediaSourceToDataUriMock(...args)
  };
});

describe('AutobyteusClient', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, AUTOBYTEUS_API_KEY: 'test-key' };
    createMock.mockImplementation((config: any) => ({ config, get: vi.fn(), post: vi.fn() }));
    mediaSourceToDataUriMock.mockReset();
    mediaSourceToDataUriMock.mockImplementation(async (value: string) => `data:mock/type;base64,${value}`);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    createMock.mockReset();
    vi.restoreAllMocks();
  });

  it('throws when API key is missing', () => {
    delete process.env.AUTOBYTEUS_API_KEY;
    expect(() => new AutobyteusClient('https://example.com')).toThrow();
  });

  it('uses explicit server URL and disables TLS verification when no cert is provided', () => {
    process.env.AUTOBYTEUS_LLM_SERVER_HOSTS = 'https://env-host-1,https://env-host-2';
    delete process.env.AUTOBYTEUS_SSL_CERT_FILE;

    const client = new AutobyteusClient('https://override-host');
    expect(client.serverUrl).toBe('https://override-host');
    expect(createMock).toHaveBeenCalledTimes(2);

    const asyncConfig = createMock.mock.calls[0][0];
    expect(asyncConfig.httpsAgent.options.rejectUnauthorized).toBe(false);
  });

  it('uses the first host from AUTOBYTEUS_LLM_SERVER_HOSTS when server URL is not provided', () => {
    process.env.AUTOBYTEUS_LLM_SERVER_HOSTS = 'https://first-host,https://second-host';
    delete process.env.AUTOBYTEUS_SSL_CERT_FILE;

    const client = new AutobyteusClient();
    expect(client.serverUrl).toBe('https://first-host');
  });

  it('uses custom cert path for TLS verification', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-cert-'));
    const certPath = path.join(tempDir, 'cert.pem');
    await fs.writeFile(certPath, 'dummy-cert');
    process.env.AUTOBYTEUS_SSL_CERT_FILE = certPath;

    new AutobyteusClient();
    const asyncConfig = createMock.mock.calls[0][0];
    expect(asyncConfig.httpsAgent.options.ca.toString()).toBe('dummy-cert');
    expect(asyncConfig.httpsAgent.options.rejectUnauthorized).not.toBe(false);
  });

  it('enter/exit returns instance and closes', async () => {
    const client = new AutobyteusClient();
    const closeSpy = vi.spyOn(client, 'close').mockResolvedValue();

    const entered = await client.enter();
    expect(entered).toBe(client);

    await client.exit();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('normalizes media to data URIs for sendMessage', async () => {
    const client = new AutobyteusClient();
    const postMock = vi.fn().mockResolvedValue({ data: { ok: true } });
    (client.asyncClient.post as any) = postMock;

    await client.sendMessage(
      'conversation-1',
      'model-1',
      'hello',
      ['/tmp/image.png'],
      ['https://example.com/audio.mp3'],
      ['data:image/png;base64,abc']
    );

    const payload = postMock.mock.calls[0][1];
    expect(payload.image_urls).toEqual(['data:mock/type;base64,/tmp/image.png']);
    expect(payload.audio_urls).toEqual(['data:mock/type;base64,https://example.com/audio.mp3']);
    expect(payload.video_urls).toEqual(['data:mock/type;base64,data:image/png;base64,abc']);
  });

  it('normalizes media to data URIs for streamMessage', async () => {
    const client = new AutobyteusClient();
    const stream = Readable.from(['data: {"content":"ok","is_complete":true}\n']);
    const postMock = vi.fn().mockResolvedValue({ data: stream });
    (client.asyncClient.post as any) = postMock;

    const iterator = client.streamMessage('conversation-1', 'model-1', 'hello', ['/tmp/image.png']);
    await iterator.next();

    const payload = postMock.mock.calls[0][1];
    expect(payload.image_urls).toEqual(['data:mock/type;base64,/tmp/image.png']);
  });

  it('normalizes media to data URIs for generateImage including mask', async () => {
    const client = new AutobyteusClient();
    const postMock = vi.fn().mockResolvedValue({ data: { image_urls: ['http://server/image.png'] } });
    (client.asyncClient.post as any) = postMock;

    await client.generateImage(
      'image-model-1',
      'make image',
      ['/tmp/input.png'],
      '/tmp/mask.png',
      { size: '1024x1024' }
    );

    const payload = postMock.mock.calls[0][1];
    expect(payload.input_image_urls).toEqual(['data:mock/type;base64,/tmp/input.png']);
    expect(payload.mask_url).toBe('data:mock/type;base64,/tmp/mask.png');
  });
});
