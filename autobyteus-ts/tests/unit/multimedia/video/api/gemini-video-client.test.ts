import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import { GeminiVideoClient } from '../../../../../src/multimedia/video/api/gemini-video-client.js';
import { VideoModel } from '../../../../../src/multimedia/video/video-model.js';
import { MultimediaConfig } from '../../../../../src/multimedia/utils/multimedia-config.js';
import { MultimediaProvider } from '../../../../../src/multimedia/providers.js';
import { multimediaApiKeyContext } from '../../../explicit-auth-test-helpers.js';

const { createMock, filesGetMock, filesDownloadMock, loadMediaReferenceMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  filesGetMock: vi.fn(),
  filesDownloadMock: vi.fn(),
  loadMediaReferenceMock: vi.fn()
}));

vi.mock('../../../../../src/utils/gemini-helper.js', () => ({
  initializeGeminiClientWithRuntime: () => ({
    client: {
      interactions: { create: createMock },
      files: { get: filesGetMock, download: filesDownloadMock }
    },
    runtimeInfo: { runtime: 'api_key' }
  })
}));

vi.mock('../../../../../src/utils/gemini-model-mapping.js', () => ({
  resolveModelForRuntime: (modelValue: string) => modelValue
}));

vi.mock('../../../../../src/multimedia/utils/media-reference-loader.js', () => ({
  loadMediaReference: loadMediaReferenceMock
}));

const buildClient = (config = new MultimediaConfig({
  aspect_ratio: '16:9',
  delivery: 'uri',
  poll_interval_ms: 5000,
  max_poll_ms: 600000
})) => {
  const model = new VideoModel({
    name: 'gemini-omni-flash-preview',
    value: 'gemini-omni-flash-preview',
    provider: MultimediaProvider.GEMINI,
    clientClass: GeminiVideoClient
  });
  return new GeminiVideoClient(model, multimediaApiKeyContext(config, 'synthetic-gemini-key'));
};

describe('GeminiVideoClient', () => {
  beforeEach(() => {
    createMock.mockReset();
    filesGetMock.mockReset();
    filesDownloadMock.mockReset();
    loadMediaReferenceMock.mockReset();
    createMock.mockResolvedValue({
      output_video: {
        data: 'dmkgYnl0ZXM=',
        mime_type: 'video/mp4'
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sends text-to-video interactions request and returns inline video data URI', async () => {
    const client = buildClient();
    const response = await client.generateVideo('a robot waves', null, {
      delivery: 'inline',
      task: 'text_to_video'
    });

    expect(response.video_urls).toEqual(['data:video/mp4;base64,dmkgYnl0ZXM=']);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-omni-flash-preview',
      input: 'a robot waves',
      response_format: {
        type: 'video',
        delivery: 'inline',
        aspect_ratio: '16:9'
      },
      generation_config: {
        video_config: {
          task: 'text_to_video'
        }
      },
      response_mime_type: 'video/mp4',
      background: false,
      store: false,
      stream: false
    }));
  });

  it('sends image-to-video image parts followed by a text part', async () => {
    loadMediaReferenceMock.mockResolvedValue({
      bytes: Buffer.from('image'),
      base64: 'aW1hZ2U=',
      mimeType: 'image/png'
    });

    const client = buildClient();
    await client.generateVideo('animate this scene', ['input.png'], { task: 'image_to_video' });

    expect(loadMediaReferenceMock).toHaveBeenCalledWith('input.png', { fallbackMimeType: 'image/png' });
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      input: [
        { type: 'image', data: 'aW1hZ2U=', mime_type: 'image/png' },
        { type: 'text', text: 'animate this scene' }
      ],
      generation_config: {
        video_config: {
          task: 'image_to_video'
        }
      }
    }));
  });

  it('passes reference-to-video task through provider video config', async () => {
    loadMediaReferenceMock.mockResolvedValue({
      bytes: Buffer.from('reference image'),
      base64: 'cmVmZXJlbmNl',
      mimeType: 'image/jpeg'
    });

    const client = buildClient();
    await client.generateVideo('make a subject reference video', ['subject.jpg'], {
      task: 'reference_to_video'
    });

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      generation_config: {
        video_config: {
          task: 'reference_to_video'
        }
      }
    }));
  });

  it('polls and downloads URI-delivered videos through the files API, then cleanup removes the temp file', async () => {
    createMock.mockResolvedValue({
      output_video: {
        uri: 'files/generated-video',
        mime_type: 'video/mp4'
      }
    });
    filesGetMock.mockResolvedValue({
      name: 'files/generated-video',
      state: 'ACTIVE',
      mimeType: 'video/mp4'
    });
    filesDownloadMock.mockImplementation(async ({ downloadPath }: { downloadPath: string }) => {
      await fs.writeFile(downloadPath, Buffer.from('downloaded mp4'));
    });

    const client = buildClient();
    const response = await client.generateVideo('download this video');
    const tempPath = response.video_urls[0];

    expect(filesGetMock).toHaveBeenCalledWith({ name: 'files/generated-video' });
    expect(filesDownloadMock).toHaveBeenCalledWith(expect.objectContaining({
      file: expect.objectContaining({ name: 'files/generated-video' }),
      downloadPath: tempPath
    }));
    await expect(fs.stat(tempPath)).resolves.toBeTruthy();

    await client.cleanup();
    await expect(fs.stat(tempPath)).rejects.toBeTruthy();
  });

  it('normalizes full file URIs with dashed IDs before polling', async () => {
    createMock.mockResolvedValue({
      output_video: {
        uri: 'https://generativelanguage.googleapis.com/v1beta/files/generated-video-123:download?alt=media#fragment',
        mime_type: 'video/mp4'
      }
    });
    filesGetMock.mockResolvedValue({
      name: 'files/generated-video-123',
      state: 'ACTIVE'
    });
    filesDownloadMock.mockImplementation(async ({ downloadPath }: { downloadPath: string }) => {
      await fs.writeFile(downloadPath, Buffer.from('downloaded mp4'));
    });

    const client = buildClient();
    const response = await client.generateVideo('download this full URI video');
    const tempPath = response.video_urls[0];

    expect(filesGetMock).toHaveBeenCalledWith({ name: 'files/generated-video-123' });
    expect(filesDownloadMock).toHaveBeenCalledWith(expect.objectContaining({
      file: expect.objectContaining({ name: 'files/generated-video-123' }),
      downloadPath: tempPath
    }));

    await client.cleanup();
  });

  it('continues polling object-shaped PROCESSING states until ACTIVE before download', async () => {
    createMock.mockResolvedValue({
      output_video: {
        uri: 'files/processing-video',
        mime_type: 'video/mp4'
      }
    });
    filesGetMock
      .mockResolvedValueOnce({
        name: 'files/processing-video',
        state: { name: 'PROCESSING' }
      })
      .mockResolvedValueOnce({
        name: 'files/processing-video',
        state: { name: 'ACTIVE' }
      });
    filesDownloadMock.mockImplementation(async ({ downloadPath }: { downloadPath: string }) => {
      await fs.writeFile(downloadPath, Buffer.from('downloaded mp4'));
    });

    const client = buildClient(new MultimediaConfig({
      aspect_ratio: '16:9',
      delivery: 'uri',
      poll_interval_ms: 1000,
      max_poll_ms: 60000
    }));
    const response = await client.generateVideo('download after processing');

    expect(filesGetMock).toHaveBeenCalledTimes(2);
    expect(filesDownloadMock).toHaveBeenCalledWith(expect.objectContaining({
      file: expect.objectContaining({ state: { name: 'ACTIVE' } }),
      downloadPath: response.video_urls[0]
    }));

    await client.cleanup();
  });

  it('throws on object-shaped FAILED states without downloading', async () => {
    createMock.mockResolvedValue({
      output_video: {
        uri: 'files/failed-video',
        mime_type: 'video/mp4'
      }
    });
    filesGetMock.mockResolvedValue({
      name: 'files/failed-video',
      state: { name: 'FAILED' },
      error: { message: 'provider rejected video generation' }
    });

    const client = buildClient();

    await expect(client.generateVideo('failed video'))
      .rejects.toThrow(/provider rejected video generation/);
    expect(filesDownloadMock).not.toHaveBeenCalled();
  });

  it('throws clear errors for invalid generation config values', async () => {
    const client = buildClient();
    await expect(client.generateVideo('bad config', null, { aspect_ratio: '1:1' }))
      .rejects.toThrow(/aspect_ratio/);
    await expect(client.generateVideo('bad config', null, { delivery: 'stream' }))
      .rejects.toThrow(/delivery/);
    await expect(client.generateVideo('bad config', null, { task: 'edit' }))
      .rejects.toThrow(/future edit_video tool/);
  });

  it.each(['image_to_video', 'reference_to_video'] as const)(
    'requires input_images for %s task',
    async (task) => {
      const client = buildClient();

      await expect(client.generateVideo('missing image input', null, { task }))
        .rejects.toThrow(new RegExp(`generation_config\\.task='${task}'.*input_images`));
      expect(createMock).not.toHaveBeenCalled();
    }
  );

  it('throws a clear error for unsupported non-edit video tasks', async () => {
    const client = buildClient();

    await expect(client.generateVideo('unsupported task', null, { task: 'video_to_video' }))
      .rejects.toThrow(/generation_config\.task must be one of/);
    expect(createMock).not.toHaveBeenCalled();
  });
});
