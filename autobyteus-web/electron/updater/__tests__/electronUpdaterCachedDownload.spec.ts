import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NsisUpdater } from 'electron-updater';

/**
 * autobyteus-356 AR-002 / N-8: turning automatic updates on after an update was staged calls `downloadUpdate()` again.
 * electron-updater 6.8.9 then finds the cached download and emits `update-downloaded` again, which installs it.
 * The real library's download path (BaseUpdater: Windows, Linux) with a cached file: no download task runs and
 * `update-downloaded` is emitted. On macOS `MacUpdater.done` re-serves the cached zip and dispatches it the same way
 * (`MacUpdater.updateDownloaded` → `dispatchUpdateDownloaded`, read in 6.8.9).
 */
describe('electron-updater 6.8.9: a cached download emits update-downloaded again', () => {
  let dir = '';
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cached-download-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('skips the download task and emits update-downloaded for the cached file', async () => {
    const app = {
      version: '1.0.0', name: 'AutoByteus', isPackaged: true, appUpdateConfigPath: path.join(dir, 'app-update.yml'),
      userDataPath: dir, baseCachePath: dir, whenReady: () => Promise.resolve(), relaunch: vi.fn(), quit: vi.fn(), onQuit: vi.fn(),
    };
    const updater = new NsisUpdater(null, app as never);
    const cached = path.join(dir, 'AutoByteus-2.0.0.exe');
    fs.writeFileSync(cached, 'installer');
    const validateDownloadedPath = vi.fn(async () => cached);
    (updater as unknown as { getOrCreateDownloadHelper: () => Promise<unknown> }).getOrCreateDownloadHelper = async () => ({
      cacheDir: dir, cacheDirForPendingUpdate: dir, validateDownloadedPath, setDownloadedFile: vi.fn(async () => undefined), clear: vi.fn(async () => undefined),
    });
    const downloaded = vi.fn();
    updater.on('update-downloaded', downloaded);
    const task = vi.fn(async () => undefined);

    await (updater as unknown as { executeDownload(options: unknown): Promise<unknown> }).executeDownload({
      fileExtension: 'exe',
      fileInfo: { url: new URL('https://feed.test/AutoByteus-2.0.0.exe'), info: { url: 'AutoByteus-2.0.0.exe', sha512: 'abc' } },
      downloadUpdateOptions: { updateInfoAndProvider: { info: { version: '2.0.0' } }, requestHeaders: {}, cancellationToken: {} },
      task,
      done: async () => undefined,
    });

    expect(validateDownloadedPath).toHaveBeenCalledOnce();
    expect(task).not.toHaveBeenCalled();
    expect(downloaded).toHaveBeenCalledOnce();
    expect(downloaded.mock.calls[0]![0]).toMatchObject({ version: '2.0.0', downloadedFile: cached });
  });
});
