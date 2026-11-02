import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppUpdater } from '../appUpdater';
import { APP_UPDATE_IPC_SET_AUTOMATIC } from '../appUpdateController';

// autobyteus-356 DS-002 (SR-004..SR-006): on macOS the automatic path stops nothing until Squirrel has its copy.
const { appMock, ipcHandlers, updater, native } = vi.hoisted(() => {
  const emitter = () => {
    const listeners = new Map<string, Set<(...args: any[]) => void>>();
    return {
      on(event: string, listener: (...args: any[]) => void) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(listener);
      },
      emit(event: string, ...args: any[]) { for (const listener of listeners.get(event) ?? []) listener(...args); },
      removeAllListeners() { listeners.clear(); },
    };
  };
  return {
    appMock: { isPackaged: true, getVersion: vi.fn(() => '1.1.9'), getPath: vi.fn(() => ''), on: vi.fn() },
    ipcHandlers: new Map<string, (...args: any[]) => any>(),
    native: emitter(),
    updater: Object.assign(emitter(), {
      autoDownload: false, autoInstallOnAppQuit: false, allowPrerelease: false, allowDowngrade: false, logger: undefined as unknown,
      checkForUpdates: vi.fn(), downloadUpdate: vi.fn(), quitAndInstall: vi.fn(), setFeedURL: vi.fn(),
    }),
  };
});

vi.mock('electron', () => ({
  app: appMock,
  autoUpdater: native,
  ipcMain: {
    removeHandler: (channel: string) => ipcHandlers.delete(channel),
    handle: (channel: string, handler: (...args: any[]) => any) => { ipcHandlers.set(channel, handler); },
  },
  BrowserWindow: { getAllWindows: () => [] },
  net: { isOnline: () => true },
}));
vi.mock('electron-updater', () => ({ autoUpdater: updater }));
vi.mock('../../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const REFUSAL = 'Cannot update while running on a read-only volume at /private/var/secret/AutoByteus.app';
const FIFTEEN_MINUTES = 15 * 60_000;
let userData = '';
let feedVersion = '1.2.0';
let rejectDownload: (error: Error) => void = () => undefined;
const recover = vi.fn();
const prepare = vi.fn(async () => undefined);

const readRecord = (): Record<string, any> =>
  JSON.parse(fs.readFileSync(path.join(userData, 'app-update-notification.json'), 'utf8'));
const startUpdater = (): AppUpdater => {
  const app = new AppUpdater({ prepareForInstall: prepare, recoverAfterFailedInstall: recover, testFeedUrl: 'http://feed.test', platform: 'darwin' });
  app.initialize();
  return app;
};
const setAutomatic = (enabled: boolean): Promise<any> => ipcHandlers.get(APP_UPDATE_IPC_SET_AUTOMATIC)!({}, enabled);
const flush = (ms = 0): Promise<unknown> => vi.advanceTimersByTimeAsync(ms);
/** The real order: electron-updater reports the download, and MacUpdater's promise is still pending. */
const downloadStaysPending = (): void => {
  updater.downloadUpdate.mockImplementation(() => new Promise<void>((_resolve, reject) => {
    rejectDownload = reject;
    updater.emit('update-downloaded', { version: feedVersion });
  }));
};
const startWaiting = async (): Promise<AppUpdater> => {
  const app = startUpdater();
  await setAutomatic(true);
  await app.checkForUpdates('periodic');
  await flush();
  return app;
};

describe('AppUpdater automatic install order on macOS (autobyteus-356)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    userData = fs.mkdtempSync(path.join(os.tmpdir(), 'app-updater-automatic-mac-'));
    appMock.getPath.mockImplementation(() => userData);
    ipcHandlers.clear();
    updater.removeAllListeners();
    native.removeAllListeners();
    feedVersion = '1.2.0';
    updater.checkForUpdates.mockReset().mockImplementation(async () => { updater.emit('update-available', { version: feedVersion }); });
    // MacUpdater's promise resolves once the zip is served, before Squirrel is done.
    updater.downloadUpdate.mockReset().mockImplementation(async () => { updater.emit('update-downloaded', { version: feedVersion }); });
    updater.quitAndInstall.mockReset();
    recover.mockReset();
    prepare.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(userData, { recursive: true, force: true });
  });

  it('stops nothing until the native event: status stays downloaded, the switch is read, then it installs', async () => {
    const app = await startWaiting();
    await flush(10 * 60_000);
    expect(prepare).not.toHaveBeenCalled();
    expect(app.getState()).toMatchObject({ status: 'downloaded', automaticInstallPreparing: true, updateStaged: true, message: 'Update downloaded. Preparing to install...' });
    expect(readRecord().automatic).toBeNull();

    native.emit('update-downloaded');
    expect(app.getState()).toMatchObject({ status: 'installing', automaticInstallPreparing: false });
    expect(readRecord().automatic).toMatchObject({ version: '1.2.0' });
    await flush(100);
    expect(prepare).toHaveBeenCalledOnce();
    expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  describe.each([
    ['before the zip is served (error, error, rejection; activeOperation download)', async () => {
      downloadStaysPending();
      const app = await startWaiting();
      updater.emit('error', new Error(REFUSAL));
      await flush(2);
      updater.emit('error', new Error(REFUSAL));
      rejectDownload(new Error(REFUSAL));
      await flush();
      return app;
    }],
    ['after the zip is served (one error; activeOperation null)', async () => {
      const app = await startWaiting();
      updater.emit('error', new Error(REFUSAL));
      await flush();
      return app;
    }],
  ])('a native refusal %s', (_name, refuse) => {
    it('records install with a plain reason, blocks V, runs no recovery, clears the stage, and nothing overwrites its state', async () => {
      const app = await refuse();
      expect(readRecord().automaticFailure).toEqual({ version: '1.2.0', step: 'install', reason: 'The system updater could not prepare this update.' });
      expect(recover).not.toHaveBeenCalled();
      expect(prepare).not.toHaveBeenCalled();
      expect(updater.quitAndInstall).not.toHaveBeenCalled();
      expect(app.getState()).toMatchObject({
        status: 'error', errorKind: 'install-preparation', errorOperation: 'install', updateStaged: false, automaticInstallPreparing: false,
        message: 'AutoByteus could not prepare this update for installing. It keeps running on this version.',
      });
      expect(app.getState().notification).toMatchObject({ outcome: 'AUTO_FAILED', outcomeStep: 'install' });
      expect(app.isBusy()).toBe(false);
      await flush(FIFTEEN_MINUTES);
      expect(app.getState().errorKind).toBe('install-preparation');
    });

    it('a later check finding V starts nothing; finding W starts W', async () => {
      const app = await refuse();
      const downloads = updater.downloadUpdate.mock.calls.length;
      await app.checkForUpdates('periodic');
      expect(updater.downloadUpdate).toHaveBeenCalledTimes(downloads);
      expect(app.getState().status).toBe('available');
      expect(app.getState().notification).toMatchObject({ outcome: 'AUTO_FAILED' });

      updater.downloadUpdate.mockImplementation(async () => { updater.emit('update-downloaded', { version: '1.3.0' }); });
      feedVersion = '1.3.0';
      await app.checkForUpdates('periodic');
      expect(updater.downloadUpdate).toHaveBeenCalledTimes(downloads + 1);
      expect(app.getState().automaticInstallPreparing).toBe(true);
      native.emit('update-downloaded');
      expect(readRecord().automatic).toMatchObject({ version: '1.3.0' });
    });

    it('a later real error still shows', async () => {
      const app = await refuse();
      updater.emit('error', new Error('net::ERR_CONNECTION_RESET'));
      expect(app.getState().errorKind).toBe('network');
    });
  });

  it('the bound: failure with its own reason, no recovery, status stays downloaded and the click still works', async () => {
    const app = await startWaiting();
    await flush(FIFTEEN_MINUTES - 1);
    expect(readRecord().automaticFailure).toBeNull();
    await flush(1);
    expect(readRecord().automaticFailure).toEqual({ version: '1.2.0', step: 'install', reason: 'The update was still not ready to install after 15 minutes.' });
    expect(app.getState()).toMatchObject({ status: 'downloaded', updateStaged: true, automaticInstallPreparing: false, errorKind: null });
    expect(recover).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();

    // Squirrel finishing later installs nothing by itself: V is blocked.
    native.emit('update-downloaded');
    await flush(100);
    expect(prepare).not.toHaveBeenCalled();
    expect(app.installUpdateAndRestart()).toEqual({ accepted: true });
  });

  it('switch off drops the wait with nothing recorded; on again after Squirrel finished installs at once', async () => {
    const app = await startWaiting();
    await setAutomatic(false);
    expect(app.getState()).toMatchObject({ status: 'downloaded', automaticInstallPreparing: false, message: 'Update downloaded. Restart to install.' });
    native.emit('update-downloaded');
    await flush(FIFTEEN_MINUTES);
    expect(prepare).not.toHaveBeenCalled();
    expect(readRecord().automaticFailure).toBeNull();

    await setAutomatic(true);
    expect(app.getState().status).toBe('installing');
    await flush(100);
    expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it('switch on while Squirrel still works waits; every re-emit resets readiness, whatever the switch says', async () => {
    const app = startUpdater();
    await app.checkForUpdates('manual');
    await app.downloadUpdate();
    await setAutomatic(true);
    expect(app.getState()).toMatchObject({ status: 'downloaded', automaticInstallPreparing: true });
    await setAutomatic(false);
    native.emit('update-downloaded');
    // A cached re-emit: this download's native answer comes later again.
    updater.emit('update-downloaded', { version: '1.2.0' });
    await setAutomatic(true);
    expect(app.getState().automaticInstallPreparing).toBe(true);
    native.emit('update-downloaded');
    expect(app.getState().status).toBe('installing');
  });

  it('a click during the wait ends it: a later native error follows the manual path, and the bound never fires', async () => {
    const app = await startWaiting();
    expect(app.installUpdateAndRestart()).toEqual({ accepted: true });
    expect(app.getState()).toMatchObject({ status: 'installing', automaticInstallPreparing: false });
    updater.emit('error', new Error('installer refused'));
    expect(app.getState()).toMatchObject({ status: 'error', errorKind: 'install', updateStaged: true });
    await flush(FIFTEEN_MINUTES);
    expect(readRecord().automaticFailure).toBeNull();
    expect(readRecord().automatic).toBeNull();
    expect(recover).not.toHaveBeenCalled();
  });

  it('no check and no download run during the wait, for every source; V stays unblocked and the native event installs it', async () => {
    const app = await startWaiting();
    updater.checkForUpdates.mockClear();
    updater.downloadUpdate.mockClear();
    for (const source of ['manual', 'periodic', 'startup'] as const) {
      expect((await app.checkForUpdates(source)).status).toBe('downloaded');
    }
    expect((await app.downloadUpdate()).status).toBe('downloaded');
    expect(updater.checkForUpdates).not.toHaveBeenCalled();
    expect(updater.downloadUpdate).not.toHaveBeenCalled();
    expect(readRecord().automaticFailure).toBeNull();
    native.emit('update-downloaded');
    expect(app.getState().status).toBe('installing');
  });

  it('a check after the wait ended runs as today, and its failure does not touch automaticFailure', async () => {
    const app = await startWaiting();
    await setAutomatic(false);
    updater.checkForUpdates.mockClear().mockImplementation(async () => { throw new Error('net::ERR_CONNECTION_RESET'); });
    await app.checkForUpdates('manual');
    expect(updater.checkForUpdates).toHaveBeenCalledOnce();
    expect(app.getState()).toMatchObject({ status: 'error', errorOperation: 'manual-check' });
    expect(readRecord().automaticFailure).toBeNull();
  });

  it('switch on with V staged, status available and readiness true installs with no second native fetch (N-13)', async () => {
    const app = startUpdater();
    await app.checkForUpdates('manual');
    await app.downloadUpdate();
    native.emit('update-downloaded');
    await app.checkForUpdates('manual');
    expect(app.getState()).toMatchObject({ status: 'available', updateStaged: true });
    await setAutomatic(true);
    expect(updater.downloadUpdate).toHaveBeenCalledOnce();
    expect(app.getState().status).toBe('installing');
  });

  it('switch on with V staged, status available and readiness false downloads again and waits for the native answer (F-15)', async () => {
    const app = startUpdater();
    await app.checkForUpdates('manual');
    await app.downloadUpdate();
    await app.checkForUpdates('manual');
    await setAutomatic(true);
    await flush();
    expect(updater.downloadUpdate).toHaveBeenCalledTimes(2);
    expect(app.getState()).toMatchObject({ status: 'downloaded', automaticInstallPreparing: true });
    native.emit('update-downloaded');
    expect(app.getState().status).toBe('installing');
  });

  it('switch on while a manual check runs, with V staged and ready, also needs no second fetch (N-19)', async () => {
    const app = startUpdater();
    await app.checkForUpdates('manual');
    await app.downloadUpdate();
    native.emit('update-downloaded');
    updater.checkForUpdates.mockImplementation(async () => {
      await setAutomatic(true);
      updater.emit('update-available', { version: feedVersion });
    });
    await app.checkForUpdates('manual');
    expect(updater.downloadUpdate).toHaveBeenCalledOnce();
    expect(app.getState().status).toBe('installing');
  });

  it('after the native event, a failure after the stop records the restart reason and recovers once', async () => {
    updater.quitAndInstall.mockImplementation(() => { throw new Error('installer refused at /private/var/secret'); });
    await startWaiting();
    native.emit('update-downloaded');
    await flush(100);
    await flush();
    expect(readRecord().automaticFailure).toEqual({ version: '1.2.0', step: 'install', reason: 'The app could not restart to install the update.' });
    expect(recover).toHaveBeenCalledOnce();
  });
});
