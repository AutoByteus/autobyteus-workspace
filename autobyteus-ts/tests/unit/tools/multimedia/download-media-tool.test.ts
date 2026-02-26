import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import * as fileUtils from '../../../../src/utils/file-utils.js';
import { DownloadMediaTool } from '../../../../src/tools/multimedia/download-media-tool.js';

describe('DownloadMediaTool', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'download-media-'));
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await fsPromises.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const mockAxiosStream = (contentType: string) => {
    const dataStream = Readable.from([Buffer.from('test-bytes')]);
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: dataStream,
      headers: { 'content-type': contentType },
      status: 200
    } as any);
  };

  it('resolves relative folder inside workspace', async () => {
    const tool = new DownloadMediaTool();
    const workspaceRoot = path.join(tempDir, 'workspace');
    await fsPromises.mkdir(workspaceRoot, { recursive: true });

    const context = {
      agentId: 'agent-1',
      workspace: {
        getBasePath: () => workspaceRoot
      }
    };

    mockAxiosStream('audio/wav');

    const result = await tool.execute(context, {
      url: 'http://example.com/audio.wav',
      filename: 'sample-audio',
      folder: 'relative/folder'
    });

    const savedPath = result.replace('Successfully downloaded file to: ', '').trim();
    expect(fs.existsSync(savedPath)).toBe(true);
    expect(path.dirname(savedPath)).toBe(path.join(workspaceRoot, 'relative', 'folder'));
    expect(path.extname(savedPath)).toBe('.wav');
  });

  it('falls back to default download folder when no workspace is present', async () => {
    const tool = new DownloadMediaTool();
    const defaultRoot = path.join(tempDir, 'downloads');

    vi.spyOn(fileUtils, 'getDefaultDownloadFolder').mockReturnValue(defaultRoot);

    const context = {
      agentId: 'agent-2',
      workspace: null
    };

    mockAxiosStream('application/pdf');

    const result = await tool.execute(context, {
      url: 'http://example.com/file.pdf',
      filename: 'doc',
      folder: 'reports'
    });

    const savedPath = result.replace('Successfully downloaded file to: ', '').trim();
    expect(fs.existsSync(savedPath)).toBe(true);
    expect(path.dirname(savedPath)).toBe(path.join(defaultRoot, 'reports'));
    expect(path.extname(savedPath)).toBe('.pdf');
  });
});
