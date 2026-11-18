import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppUpdater } from '../appUpdater';
import { APP_UPDATE_IPC_SET_AUTOMATIC } from '../appUpdateController';

// autobyteus-356: the app's "Update automatically" switch (REQ-001, REQ-002, REQ-004; DS-001, DS-002).
const { appMock, appListeners, ipcHandlers, updater } = vi.hoisted(() => {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  const appEvents = new Map<string, Array<() => void>>();
  const handlers = new Map<string, (...args: any[]) => any>();
  const emitter = {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: false,
    allowDowngrade: false,
    logger: undefined as unknown,
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    setFeedURL: vi.fn(),
    on(event: string, listener: (...args: any[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
      return emitter;
    },
    emit(event: string, ...args: any[]) {
      for (const listener of listeners.get(event) ?? []) listener(...args);
    },
    removeAllListeners() { listeners.clear(); },
  };
  return {
    appMock: {
      isPackaged: true,
      getVersion: vi.fn(() => '1.1.9'),
      getPath: vi.fn(() => ''),
      on: vi.fn((event: string, listener: () => void) => {
        appEvents.set(event, [...(appEvents.get(event) ?? []), listener]);
      }),
    },
    appListeners: appEvents,
    ipcHandlers: handlers,
    updater: emitter,
  };
});

vi.mock('electron', () => ({
  app: appMock,
  ipcMain: {
    removeHandler: (channel: string) => ipcHandlers.delete(channel),
    handle: (channel: string, handler: (...args: any[]) => any) => { ipcHandlers.set(channel, handler); },
  },
  autoUpdater: { on: vi.fn() },
  BrowserWindow: { getAllWindows: () => [] },
  net: { isOnline: () => true },
}));
vi.mock('electron-updater', () => ({ autoUpdater: updater }));
vi.mock('../../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

let userData = '';
let feedVersion: string | null = '1.2.0';
const recover = vi.fn();
const prepare = vi.fn(async () => undefined);

const readRecord = (): Record<string, any> =>
  JSON.parse(fs.readFileSync(path.join(userData, 'app-update-notification.json'), 'utf8'));
const automaticFile = (): string => path.join(userData, 'app-update-automatic.json');
const quitApp = (): void => { for (const listener of appListeners.get('before-quit') ?? []) listener(); };

function startUpdater(): AppUpdater {
  const app = new AppUpdater({ prepareForInstall: prepare, recoverAfterFailedInstall: recover, testFeedUrl: 'http://feed.test', platform: 'linux' });
  app.initialize();
  return app;
}

/** The switch is set through its IPC command, as the About page does. */
async function setAutomatic(enabled: unknown): Promise<any> {
  return ipcHandlers.get(APP_UPDATE_IPC_SET_AUTOMATIC)!({}, enabled);
}

describe('AppUpdater automatic update (autobyteus-356)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    userData = fs.mkdtempSync(path.join(os.tmpdir(), 'app-updater-automatic-'));
    appMock.getPath.mockImplementation(() => userData);
    appMock.getVersion.mockImplementation(() => '1.1.9');
    appMock.isPackaged = true;
    appListeners.clear();
    ipcHandlers.clear();
    updater.removeAllListeners();
    feedVersion = '1.2.0';
    // Like electron-updater: a check emits its result; a download emits `update-downloaded` (also from the cache).
    updater.checkForUpdates.mockReset().mockImplementation(async () => {
      if (feedVersion) updater.emit('update-available', { version: feedVersion });
      else updater.emit('update-not-available', {});
    });
    updater.downloadUpdate.mockReset().mockImplementation(async () => {
      updater.emit('update-downloaded', { version: feedVersion });
    });
    updater.quitAndInstall.mockReset();
    recover.mockReset();
    prepare.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(userData, { recursive: true, force: true });
  });

  it('is off on a fresh profile and then changes nothing: no download, no install (AC-001)', async () => {
    const app = startUpdater();
    expect(app.getState().automaticUpdate).toBe(false);

    await app.checkForUpdates('periodic');
    expect(app.getState().status).toBe('available');
    expect(updater.downloadUpdate).not.toHaveBeenCalled();

    updater.emit('update-downloaded', { version: '1.2.0' });
    await vi.advanceTimersByTimeAsync(61_000);
    expect(updater.quitAndInstall).not.toHaveBeenCalled();
    expect(readRecord().automatic).toBeNull();
  });

  it('refuses a non-boolean value and writes nothing', async () => {
    const app = startUpdater();
    const result = await setAutomatic('yes');
    expect(result).toMatchObject({ accepted: false, persisted: false });
    expect(app.getState().automaticUpdate).toBe(false);
    expect(fs.existsSync(automaticFile())).toBe(false);
  });

  it('on: a found release downloads, installs and restarts without a click; the next launch says AUTO_UPDATED (AC-002)', async () => {
    const app = startUpdater();
    const result = await setAutomatic(true);
    expect(result).toMatchObject({ accepted: true, persisted: true });
    expect(result.state.automaticUpdate).toBe(true);
    expect(JSON.parse(fs.readFileSync(automaticFile(), 'utf8'))).toEqual({ enabled: true });

    await app.checkForUpdates('periodic');
    expect(updater.downloadUpdate).toHaveBeenCalledOnce();
    expect(app.getState().status).toBe('installing');
    // Recorded before anything stops.
    expect(readRecord().automatic).toMatchObject({ version: '1.2.0' });

    await vi.advanceTimersByTimeAsync(100);
    expect(prepare).toHaveBeenCalledOnce();
    expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true);
    quitApp();
    await vi.advanceTimersByTimeAsync(61_000);
    expect(recover).not.toHaveBeenCalled();
    expect(readRecord().automaticFailure).toBeNull();

    // The restart runs the new version.
    appMock.getVersion.mockImplementation(() => '1.2.0');
    ipcHandlers.clear();
    const restarted = startUpdater();
    expect(restarted.getState().automaticUpdate).toBe(true);
    expect(restarted.getState().notification).toMatchObject({
      version: '1.2.0', state: 'handled', read: false, outcome: 'AUTO_UPDATED', outcomeReason: null,
    });
  });

  it('a switch turned off before the download finishes does not install', async () => {
    let finishDownload: () => void = () => undefined;
    updater.downloadUpdate.mockImplementation(() => new Promise<void>((resolve) => {
      finishDownload = () => { updater.emit('update-downloaded', { version: '1.2.0' }); resolve(); };
    }));
    const app = startUpdater();
    await setAutomatic(true);
    await app.checkForUpdates('periodic');
    expect(app.getState().status).toBe('downloading');

    await setAutomatic(false);
    finishDownload();
    await vi.advanceTimersByTimeAsync(61_000);
    expect(app.getState().status).toBe('downloaded');
    expect(updater.quitAndInstall).not.toHaveBeenCalled();
    expect(readRecord().automatic).toBeNull();
  });

  it('a failed download is recorded once, shows AUTO_FAILED, and is tried again at the next check (AC-005)', async () => {
    updater.downloadUpdate.mockImplementation(async () => {
      const error = new Error('net::ERR_CONNECTION_RESET');
      updater.emit('error', error);
      throw error;
    });
    const app = startUpdater();
    await setAutomatic(true);
    await app.checkForUpdates('periodic');
    await vi.advanceTimersByTimeAsync(0);

    expect(app.getState().status).toBe('error');
    expect(readRecord().automaticFailure).toMatchObject({ version: '1.2.0', step: 'download' });
    expect(app.getState().notification).toMatchObject({ state: 'waiting', outcome: 'AUTO_FAILED' });
    expect(app.getState().notification?.outcomeReason).toBeTruthy();

    updater.downloadUpdate.mockImplementation(async () => { updater.emit('update-downloaded', { version: '1.2.0' }); });
    await app.checkForUpdates('periodic');
    expect(updater.downloadUpdate).toHaveBeenCalledTimes(2);
    expect(app.getState().status).toBe('installing');
  });

  it.each([
    ['the install throws (a)', () => { updater.quitAndInstall.mockImplementation(() => { throw new Error('installer refused'); }); }],
    ['preparation fails (a)', () => { prepare.mockRejectedValueOnce(new Error('cleanup incomplete')); }],
    ['the updater reports an error during the install (b)', () => {
      updater.quitAndInstall.mockImplementation(() => { updater.emit('error', new Error('installer exited 2')); });
    }],
  ])('a failed install when %s: recorded, recovery once, and that version is not tried again (AC-005)', async (_name, failInstall) => {
    failInstall();
    const app = startUpdater();
    await setAutomatic(true);
    await app.checkForUpdates('periodic');
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(0);
    // Detected at once, not by the quit bound.
    expect(recover).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(61_000);

    expect(app.getState().errorKind).toBe('install');
    expect(readRecord()).toMatchObject({ automatic: null, automaticFailure: { version: '1.2.0', step: 'install' } });
    expect(app.getState().notification).toMatchObject({ state: 'waiting', outcome: 'AUTO_FAILED' });
    expect(recover).toHaveBeenCalledOnce();

    // A later check in this process finds the same version: nothing starts.
    await app.checkForUpdates('periodic');
    expect(updater.downloadUpdate).toHaveBeenCalledOnce();

    // After a restart on the old version: still nothing for 1.2.0, but a newer version installs.
    ipcHandlers.clear();
    updater.removeAllListeners();
    const restarted = startUpdater();
    await restarted.checkForUpdates('periodic');
    expect(updater.downloadUpdate).toHaveBeenCalledOnce();
    expect(restarted.getState().notification).toMatchObject({ outcome: 'AUTO_FAILED' });

    updater.quitAndInstall.mockReset();
    feedVersion = '1.3.0';
    await restarted.checkForUpdates('periodic');
    expect(updater.downloadUpdate).toHaveBeenCalledTimes(2);
    expect(restarted.getState().status).toBe('installing');
  });

  it('an install the app does not quit for within 60 s is a failure (c): recorded, recovery once, nothing more for that version (N-6)', async () => {
    const app = startUpdater();
    await setAutomatic(true);
    await app.checkForUpdates('periodic');
    await vi.advanceTimersByTimeAsync(100);
    expect(updater.quitAndInstall).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(59_000);
    expect(recover).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(0);

    expect(app.getState()).toMatchObject({ status: 'error', errorKind: 'install' });
    expect(readRecord().automaticFailure).toMatchObject({ version: '1.2.0', step: 'install' });
    expect(recover).toHaveBeenCalledOnce();

    // A late updater error for the same install does not record or recover again.
    updater.emit('error', new Error('late installer error'));
    await vi.advanceTimersByTimeAsync(0);
    expect(recover).toHaveBeenCalledOnce();

    await app.checkForUpdates('periodic');
    expect(updater.downloadUpdate).toHaveBeenCalledOnce();
  });

  it('a check while the requested install is under way does not start that version again (SR-003 AR-001)', async () => {
    const app = startUpdater();
    await setAutomatic(true);
    await app.checkForUpdates('periodic');
    await vi.advanceTimersByTimeAsync(100);
    expect(updater.quitAndInstall).toHaveBeenCalledOnce();

    // The manual check is not refused while installing; electron-updater reports the same version again.
    await app.checkForUpdates('manual');
    expect(app.getState().status).toBe('available');
    expect(updater.downloadUpdate).toHaveBeenCalledOnce();
  });

  it('a native refusal during the preparation waits for it, skips quitAndInstall, then recovers once (F-API-002)', async () => {
    let finishPreparation: () => void = () => undefined;
    prepare.mockImplementationOnce(() => new Promise<undefined>((resolve) => { finishPreparation = () => resolve(undefined); }));
    const order: string[] = [];
    recover.mockImplementation(() => { order.push('recover'); });
    const app = startUpdater();
    await setAutomatic(true);
    await app.checkForUpdates('periodic');
    await vi.advanceTimersByTimeAsync(100);
    expect(prepare).toHaveBeenCalledOnce();

    updater.emit('error', new Error('Cannot update while running on a read-only volume.'));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(readRecord().automaticFailure).toMatchObject({ version: '1.2.0', step: 'install' });
    // The server may still be stopping: nothing is decided yet.
    expect(recover).not.toHaveBeenCalled();

    order.push('prepared');
    finishPreparation();
    await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual(['prepared', 'recover']);
    expect(updater.quitAndInstall).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(61_000);
    expect(recover).toHaveBeenCalledOnce();
  });

  it('a preparation that fails after a refusal still recovers once (F-API-002)', async () => {
    let failPreparation: () => void = () => undefined;
    prepare.mockImplementationOnce(() => new Promise<undefined>((_resolve, reject) => { failPreparation = () => reject(new Error('cleanup incomplete')); }));
    const app = startUpdater();
    await setAutomatic(true);
    await app.checkForUpdates('periodic');
    await vi.advanceTimersByTimeAsync(100);
    updater.emit('error', new Error('Cannot update while running on a read-only volume.'));
    failPreparation();
    await vi.advanceTimersByTimeAsync(0);
    expect(recover).toHaveBeenCalledOnce();
    expect(readRecord().automaticFailure).toMatchObject({ version: '1.2.0', step: 'install' });
    expect(updater.quitAndInstall).not.toHaveBeenCalled();
  });

  it('a refusal before the preparation started cancels the install: nothing stops, no recovery, the version stays blocked (F-API-002)', async () => {
    const app = startUpdater();
    await setAutomatic(true);
    await app.checkForUpdates('periodic');
    updater.emit('error', new Error('Cannot update while running on a read-only volume.'));
    await vi.advanceTimersByTimeAsync(61_100);
    expect(prepare).not.toHaveBeenCalled();
    expect(updater.quitAndInstall).not.toHaveBeenCalled();
    expect(recover).not.toHaveBeenCalled();
    expect(app.getState()).toMatchObject({ status: 'error', errorKind: 'install', errorOperation: 'install' });
    expect(readRecord().automaticFailure).toMatchObject({ version: '1.2.0', step: 'install' });
    await app.checkForUpdates('periodic');
    expect(updater.downloadUpdate).toHaveBeenCalledOnce();
  });

  it('a refused install also rejecting the download keeps the install failure as the state (F-API-002)', async () => {
    let rejectDownload: (error: Error) => void = () => undefined;
    updater.downloadUpdate.mockImplementation(() => new Promise<void>((_resolve, reject) => {
      rejectDownload = reject;
      updater.emit('update-downloaded', { version: '1.2.0' });
    }));
    const app = startUpdater();
    await setAutomatic(true);
    await app.checkForUpdates('periodic');
    await vi.advanceTimersByTimeAsync(100);
    const refusal = new Error('Cannot update while running on a read-only volume.');
    updater.emit('error', refusal);
    const message = app.getState().message;
    rejectDownload(refusal);
    await vi.advanceTimersByTimeAsync(0);
    expect(app.getState()).toMatchObject({ status: 'error', errorKind: 'install', errorOperation: 'install', message });
    expect(readRecord().automaticFailure).toMatchObject({ version: '1.2.0', step: 'install' });
    expect(recover).toHaveBeenCalledOnce();
  });

  it('a download rejection with no automatic install requested is still a download error (manual path)', async () => {
    updater.downloadUpdate.mockRejectedValue(new Error('net::ERR_CONNECTION_RESET'));
    const app = startUpdater();
    await app.checkForUpdates('manual');
    await app.downloadUpdate();
    expect(app.getState()).toMatchObject({ status: 'error', errorOperation: 'download' });
  });

  it('an updater error during the install and then the quit bound recover only once (N-6)', async () => {
    const app = startUpdater();
    await setAutomatic(true);
    await app.checkForUpdates('periodic');
    await vi.advanceTimersByTimeAsync(100);
    updater.emit('error', new Error('installer exited 2'));
    await vi.advanceTimersByTimeAsync(61_000);
    expect(recover).toHaveBeenCalledOnce();
    expect(readRecord().automaticFailure).toMatchObject({ version: '1.2.0', step: 'install' });
  });

  it('the app quitting within the bound lets the install go ahead', async () => {
    const app = startUpdater();
    await setAutomatic(true);
    await app.checkForUpdates('periodic');
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(30_000);
    quitApp();
    await vi.advanceTimersByTimeAsync(61_000);
    expect(recover).not.toHaveBeenCalled();
    expect(app.getState().status).toBe('installing');
    expect(readRecord()).toMatchObject({ automatic: { version: '1.2.0' }, automaticFailure: null });
  });

  it('a manual install is never bounded (switch off)', async () => {
    const app = startUpdater();
    await app.checkForUpdates('manual');
    await app.downloadUpdate();
    expect(app.installUpdateAndRestart()).toEqual({ accepted: true });
    await vi.advanceTimersByTimeAsync(61_100);
    expect(app.getState().status).toBe('installing');
    expect(recover).not.toHaveBeenCalled();
    expect(readRecord().automatic).toBeNull();
  });

  it('turning the switch on when an update is downloaded installs it at once (REQ-002)', async () => {
    const app = startUpdater();
    await app.checkForUpdates('manual');
    await app.downloadUpdate();
    expect(app.getState().status).toBe('downloaded');
    expect(updater.quitAndInstall).not.toHaveBeenCalled();

    await setAutomatic(true);
    expect(app.getState().status).toBe('installing');
    await vi.advanceTimersByTimeAsync(100);
    expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it('turning the switch on when an update is found downloads and installs it (REQ-002)', async () => {
    const app = startUpdater();
    await app.checkForUpdates('manual');
    expect(updater.downloadUpdate).not.toHaveBeenCalled();
    await setAutomatic(true);
    expect(updater.downloadUpdate).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(100);
    expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it('turning the switch on with V staged and a later check at `available` installs V with no second download (N-13)', async () => {
    const app = startUpdater();
    await app.checkForUpdates('manual');
    await app.downloadUpdate();
    // A later check moves the status on; the staged update stays.
    await app.checkForUpdates('manual');
    expect(app.getState()).toMatchObject({ status: 'available', updateStaged: true });

    await setAutomatic(true);
    expect(updater.downloadUpdate).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(100);
    expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it('with a newer W found over a staged V, turning the switch on downloads W (the cache re-emit is proven by electronUpdaterCachedDownload.spec.ts)', async () => {
    const app = startUpdater();
    await app.checkForUpdates('manual');
    await app.downloadUpdate();
    feedVersion = '1.3.0';
    await app.checkForUpdates('manual');
    await setAutomatic(true);
    expect(updater.downloadUpdate).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(100);
    expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true);
    expect(readRecord().automatic).toMatchObject({ version: '1.3.0' });
  });

  it('no newer release found: nothing is downloaded', async () => {
    feedVersion = null;
    const app = startUpdater();
    await setAutomatic(true);
    await app.checkForUpdates('periodic');
    expect(updater.downloadUpdate).not.toHaveBeenCalled();
    expect(app.getState().status).toBe('no-update');
  });
});
