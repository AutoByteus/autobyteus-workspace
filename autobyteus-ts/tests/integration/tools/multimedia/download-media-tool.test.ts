import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DownloadMediaTool } from '../../../../src/tools/multimedia/download-media-tool.js';

const LOCAL_SERVER_BASE_URL = process.env.AUTOBYTEUS_MEDIA_LOCAL_BASE_URL ?? 'http://192.168.2.124:29695';
const LOCAL_FILES_TO_TEST: Array<[string, string, string]> = [
  [`${LOCAL_SERVER_BASE_URL}/rest/files/images/nice_image.png`, 'test-image', '.png']
];
const PUBLIC_PDF_URL = process.env.AUTOBYTEUS_MEDIA_PDF_URL ?? 'https://arxiv.org/pdf/1706.03762';

describe('DownloadMediaTool integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'download-media-int-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  for (const [url, filename, expectedExt] of LOCAL_FILES_TO_TEST) {
    it(`downloads local media file: ${filename}`, async () => {
      const tool = new DownloadMediaTool();
      const context = { agentId: 'test-agent-123' };

      let resultMessage: string;
      try {
        resultMessage = await tool.execute(context, {
          url,
          filename,
          folder: tempDir
        });
      } catch (error) {
        throw new Error(
          `Downloading from local URL '${url}' failed unexpectedly. Ensure the server is running and accessible. Error: ${String(error)}`
        );
      }

      expect(resultMessage.startsWith('Successfully downloaded file to:')).toBe(true);
      const filePath = resultMessage.replace('Successfully downloaded file to: ', '').trim();

      const stat = await fs.stat(filePath);
      expect(stat.isFile()).toBe(true);
      expect(stat.size).toBeGreaterThan(0);
      expect(path.basename(filePath).startsWith(filename)).toBe(true);
      expect(path.extname(filePath)).toBe(expectedExt);
      expect(filePath.includes(tempDir)).toBe(true);
    });
  }

  it('downloads a public PDF', async () => {
    const tool = new DownloadMediaTool();
    const context = { agentId: 'test-agent-123' };
    const filename = 'attention-is-all-you-need';

    let resultMessage: string;
    try {
      resultMessage = await tool.execute(context, {
        url: PUBLIC_PDF_URL,
        filename,
        folder: tempDir
      });
    } catch (error) {
      throw new Error(
        `Downloading from public URL failed. This may be due to a network issue or a change in the source URL. Error: ${String(error)}`
      );
    }

    expect(resultMessage.startsWith('Successfully downloaded file to:')).toBe(true);
    const filePath = resultMessage.replace('Successfully downloaded file to: ', '').trim();

    const stat = await fs.stat(filePath);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(100000);
    expect(path.basename(filePath).startsWith(filename)).toBe(true);
    expect(path.extname(filePath)).toBe('.pdf');
    expect(filePath.includes(tempDir)).toBe(true);
  });
});
