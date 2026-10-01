import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppUpdater } from '../appUpdater';
import { APP_UPDATE_STATE_CHANNEL } from '../appUpdateController';

const {
  appMock,
  ipcHandlers,
  ipcMainMock,
  browserWindowMock,
  sendMock,
  autoUpdaterMock,
  loggerMock,
} = vi.hoisted(() => {
  const handlers = new Map<string, (...args: any[]) => any>();
  const send = vi.fn();
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  type AutoUpdaterMock = {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    allowPrerelease: boolean;
    allowDowngrade: boolean;
    logger?: unknown;
    checkForUpdates: ReturnType<typeof vi.fn>;
    downloadUpdate: ReturnType<typeof vi.fn>;
    quitAndInstall: ReturnType<typeof vi.fn>;
    on: (event: string, listener: (...args: any[]) => void) => unknown;
    emit: (event: string, ...args: any[]) => void;
    removeAllListeners: () => void;
  };

  const autoUpdaterEmitter: AutoUpdaterMock = {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: true,
    allowDowngrade: true,
    checkForUpdates: vi.fn().mockResolvedValue(undefined),
    downloadUpdate: vi.fn().mockResolvedValue(undefined),
    quitAndInstall: vi.fn(),
    on: (event: string, listener: (...args: any[]) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(listener);
      return autoUpdaterEmitter;
    },
    emit: (event: string, ...args: any[]) => {
      for (const listener of listeners.get(event) ?? []) {
        listener(...args);
      }
    },
    removeAllListeners: () => {
      listeners.clear();
    },
  };

  return {
    appMock: {
      isPackaged: true,
      getVersion: vi.fn(() => '1.1.9'),
      getPath: vi.fn((_name: string) => ''),
    },
    ipcHandlers: handlers,
    ipcMainMock: {
      removeHandler: vi.fn((channel: string) => handlers.delete(channel)),
      handle: vi.fn((channel: string, handler: (...args: any[]) => any) => {
        handlers.set(channel, handler);
      }),
    },
    browserWindowMock: {
      getAllWindows: vi.fn(() => [
        {
          isDestroyed: () => false,
          webContents: {
            send,
          },
        },
      ]),
    },
    sendMock: send,
    autoUpdaterMock: autoUpdaterEmitter,
    loggerMock: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
});

vi.mock('electron', () => ({
  app: appMock,
  ipcMain: ipcMainMock,
  BrowserWindow: browserWindowMock,
}));

vi.mock('electron-updater', () => ({
  autoUpdater: autoUpdaterMock,
}));

vi.mock('../../logger', () => ({
  logger: loggerMock,
}));

function getIpcHandler(channel: string): (...args: any[]) => any {
  const handler = ipcHandlers.get(channel);
  if (!handler) {
    throw new Error(`Missing handler for channel ${channel}`);
  }
  return handler;
}

let userDataDir = '';

describe('AppUpdater', () => {
  beforeEach(() => {
    vi.useRealTimers();
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-updater-spec-'));
    appMock.getPath.mockImplementation(() => userDataDir);
    appMock.getVersion.mockImplementation(() => '1.1.9');
    autoUpdaterMock.allowPrerelease = true;
    autoUpdaterMock.allowDowngrade = true;
    autoUpdaterMock.checkForUpdates.mockReset();
    // Like electron-updater, a completed check emits its result event.
    autoUpdaterMock.checkForUpdates.mockImplementation(async () => {
      autoUpdaterMock.emit('update-not-available', {});
    });
    appMock.isPackaged = true;
    sendMock.mockReset();
    ipcHandlers.clear();
    autoUpdaterMock.removeAllListeners();
    autoUpdaterMock.downloadUpdate.mockClear();
    autoUpdaterMock.quitAndInstall.mockClear();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    loggerMock.error.mockClear();
    loggerMock.debug.mockClear();
  });

  afterEach(() => {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  });

  it('registers IPC handlers and broadcasts initial state on initialize', async () => {
    const updater = new AppUpdater();
    updater.initialize();

    expect(ipcMainMock.handle).toHaveBeenCalledWith('app-update:get-state', expect.any(Function));
    expect(ipcMainMock.handle).toHaveBeenCalledWith('app-update:check', expect.any(Function));
    expect(ipcMainMock.handle).toHaveBeenCalledWith('app-update:download', expect.any(Function));
    expect(ipcMainMock.handle).toHaveBeenCalledWith('app-update:install', expect.any(Function));

    const getState = getIpcHandler('app-update:get-state');
    const state = await getState();

    expect(state.currentVersion).toBe('1.1.9');
    expect(state.status).toBe('idle');
    expect(sendMock).toHaveBeenCalledWith(
      APP_UPDATE_STATE_CHANNEL,
      expect.objectContaining({
        status: 'idle',
        currentVersion: '1.1.9',
      })
    );
  });

  it('runs startup auto-check only for packaged app', async () => {
    vi.useFakeTimers();
    const updater = new AppUpdater(500);
    updater.initialize();

    updater.startAutoCheck();
    await vi.advanceTimersByTimeAsync(500);

    expect(autoUpdaterMock.checkForUpdates).toHaveBeenCalledTimes(1);

    appMock.isPackaged = false;
    updater.startAutoCheck();
    await vi.advanceTimersByTimeAsync(500);

    expect(autoUpdaterMock.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('maps update events to state and broadcasts progress', async () => {
    const updater = new AppUpdater();
    updater.initialize();

    autoUpdaterMock.emit('update-available', {
      version: '1.2.0',
      releaseNotes: 'Bug fixes',
    });

    let state = await getIpcHandler('app-update:get-state')();
    expect(state.status).toBe('available');
    expect(state.availableVersion).toBe('1.2.0');

    autoUpdaterMock.emit('download-progress', {
      percent: 42.5,
      transferred: 425,
      total: 1000,
    });

    state = await getIpcHandler('app-update:get-state')();
    expect(state.status).toBe('downloading');
    expect(state.downloadPercent).toBe(42.5);

    autoUpdaterMock.emit('update-downloaded', {
      version: '1.2.0',
    });

    state = await getIpcHandler('app-update:get-state')();
    expect(state.status).toBe('downloaded');
    expect(state.downloadPercent).toBe(100);
  });


  it('classifies manual network check failures and keeps raw diagnostics out of state', async () => {
    const updater = new AppUpdater();
    updater.initialize();

    autoUpdaterMock.checkForUpdates.mockRejectedValueOnce(new Error('net::ERR_CONNECTION_CLOSED'));

    const check = getIpcHandler('app-update:check');
    const state = await check();

    expect(state.status).toBe('error');
    expect(state.errorKind).toBe('network');
    expect(state.errorOperation).toBe('manual-check');
    expect(state.message).toContain('Could not reach the update server');
    expect(state.error).toBeUndefined();
    expect(loggerMock.error.mock.calls.at(-1)?.[0]).toContain('net::ERR_CONNECTION_CLOSED');
  });

  it('ignores duplicate provider error events without overwriting the original operation', async () => {
    const updater = new AppUpdater();
    updater.initialize();

    const providerError = new Error('net::ERR_CONNECTION_CLOSED');
    autoUpdaterMock.checkForUpdates.mockRejectedValueOnce(providerError);

    const check = getIpcHandler('app-update:check');
    const state = await check();

    expect(state.status).toBe('error');
    expect(state.errorKind).toBe('network');
    expect(state.errorOperation).toBe('manual-check');
    expect(loggerMock.error).toHaveBeenCalledTimes(1);

    sendMock.mockClear();
    autoUpdaterMock.emit('error', providerError);

    const finalState = await getIpcHandler('app-update:get-state')();
    expect(finalState.status).toBe('error');
    expect(finalState.errorKind).toBe('network');
    expect(finalState.errorOperation).toBe('manual-check');
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('classifies missing latest metadata as a release-preparing safe error', async () => {
    const updater = new AppUpdater();
    updater.initialize();

    autoUpdaterMock.checkForUpdates.mockRejectedValueOnce(
      new Error('Cannot find latest-mac.yml in the latest GitHub release assets'),
    );

    const check = getIpcHandler('app-update:check');
    const state = await check();

    expect(state.status).toBe('error');
    expect(state.errorKind).toBe('release-preparing');
    expect(state.message).toContain('still being prepared');
    expect(state.message).not.toContain('latest-mac.yml');
    expect(state.error).toBeUndefined();
    expect(loggerMock.error.mock.calls.at(-1)?.[0]).toContain('latest-mac.yml');
  });

  it('accepts install only after update-downloaded and triggers quitAndInstall', async () => {
    vi.useFakeTimers();
    const updater = new AppUpdater();
    updater.initialize();

    const install = getIpcHandler('app-update:install');

    const beforeDownload = await install();
    expect(beforeDownload).toEqual({ accepted: false });

    autoUpdaterMock.emit('update-downloaded', {
      version: '1.2.0',
    });

    const accepted = await install();
    expect(accepted).toEqual({ accepted: true });

    const stateAfterInstall = await getIpcHandler('app-update:get-state')();
    expect(stateAfterInstall.status).toBe('installing');
    expect(stateAfterInstall.message).toBe('Installing update and restarting...');

    await vi.advanceTimersByTimeAsync(100);
    expect(autoUpdaterMock.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it('maps synchronous install invocation failure to updater error state', async () => {
    vi.useFakeTimers();
    const updater = new AppUpdater();
    updater.initialize();

    autoUpdaterMock.emit('update-downloaded', {
      version: '1.2.0',
    });

    autoUpdaterMock.quitAndInstall.mockImplementation(() => {
      throw new Error('install boom');
    });

    const install = getIpcHandler('app-update:install');
    const accepted = await install();
    expect(accepted).toEqual({ accepted: true });

    await vi.advanceTimersByTimeAsync(100);

    const state = await getIpcHandler('app-update:get-state')();
    expect(state.status).toBe('error');
    expect(state.errorKind).toBe('install');
    expect(state.errorOperation).toBe('install');
    expect(state.message).toContain('could not restart to install');
    expect(state.error).toBeUndefined();
    expect(loggerMock.error.mock.calls.at(-1)?.[0]).toContain('install boom');
  });

  describe('update channel', () => {
    const channelFile = () => path.join(userDataDir, 'app-update-channel.v1.json');
    const readSavedChannel = () => JSON.parse(fs.readFileSync(channelFile(), 'utf8')).channel;
    const setChannel = (channel: unknown) => getIpcHandler('app-update:set-channel')({}, channel);

    it('defaults to stable without a saved preference and applies the stable policy', async () => {
      const updater = new AppUpdater();
      updater.initialize();

      const state = await getIpcHandler('app-update:get-state')();
      expect(state.updateChannel).toBe('stable');
      expect(state.currentVersionIsPrerelease).toBe(false);
      expect(autoUpdaterMock.allowPrerelease).toBe(false);
      expect(autoUpdaterMock.allowDowngrade).toBe(false);
      expect(ipcMainMock.handle).toHaveBeenCalledWith('app-update:set-channel', expect.any(Function));
    });

    it('loads a saved beta preference on initialize', async () => {
      fs.writeFileSync(channelFile(), JSON.stringify({ channel: 'beta' }));
      const updater = new AppUpdater();
      updater.initialize();

      expect(updater.getState().updateChannel).toBe('beta');
      expect(autoUpdaterMock.allowPrerelease).toBe(true);
      expect(autoUpdaterMock.allowDowngrade).toBe(false);
    });

    it('flags a running pre-release build', () => {
      appMock.getVersion.mockImplementation(() => '1.4.90-beta.3');
      const updater = new AppUpdater();

      expect(updater.getState().currentVersionIsPrerelease).toBe(true);
      expect(updater.getState().currentVersion).toBe('1.4.90-beta.3');
    });

    it('re-applies the channel policy before every check', async () => {
      const policyAtCheck: Array<{ allowPrerelease: boolean; allowDowngrade: boolean }> = [];
      autoUpdaterMock.checkForUpdates.mockImplementation(async () => {
        policyAtCheck.push({
          allowPrerelease: autoUpdaterMock.allowPrerelease,
          allowDowngrade: autoUpdaterMock.allowDowngrade,
        });
        autoUpdaterMock.emit('update-not-available', {});
      });
      const updater = new AppUpdater();
      updater.initialize();

      autoUpdaterMock.allowPrerelease = true;
      autoUpdaterMock.allowDowngrade = true;
      await getIpcHandler('app-update:check')();
      await setChannel('beta');
      autoUpdaterMock.allowDowngrade = true;
      await getIpcHandler('app-update:check')();

      expect(policyAtCheck).toEqual([
        { allowPrerelease: false, allowDowngrade: false },
        { allowPrerelease: true, allowDowngrade: false },
        { allowPrerelease: true, allowDowngrade: false },
      ]);
    });

    it('persists, applies and re-checks when switching to beta while idle', async () => {
      const updater = new AppUpdater();
      updater.initialize();

      const result = await setChannel('beta');

      expect(result.accepted).toBe(true);
      expect(result.persisted).toBe(true);
      expect(result.state.updateChannel).toBe('beta');
      expect(readSavedChannel()).toBe('beta');
      expect(autoUpdaterMock.allowPrerelease).toBe(true);
      expect(autoUpdaterMock.checkForUpdates).toHaveBeenCalledTimes(1);
      expect(sendMock).toHaveBeenCalledWith(
        APP_UPDATE_STATE_CHANNEL,
        expect.objectContaining({ updateChannel: 'beta' }),
      );

      // Survives a restart (a fresh updater reads the saved file).
      const restarted = new AppUpdater();
      restarted.initialize();
      expect(restarted.getState().updateChannel).toBe('beta');
    });

    it('replaces a beta offer with the stable result when switching back to stable', async () => {
      fs.writeFileSync(channelFile(), JSON.stringify({ channel: 'beta' }));
      autoUpdaterMock.checkForUpdates.mockImplementation(async () => {
        if (autoUpdaterMock.allowPrerelease) {
          autoUpdaterMock.emit('update-available', { version: '1.2.0-beta.1' });
        } else {
          autoUpdaterMock.emit('update-not-available', {});
        }
      });
      const updater = new AppUpdater();
      updater.initialize();

      await getIpcHandler('app-update:check')();
      expect(updater.getState().status).toBe('available');
      expect(updater.getState().availableVersion).toBe('1.2.0-beta.1');

      const result = await setChannel('stable');

      expect(result.accepted).toBe(true);
      expect(result.state.updateChannel).toBe('stable');
      expect(result.state.status).toBe('no-update');
      expect(result.state.availableVersion).toBeNull();
      expect(autoUpdaterMock.allowPrerelease).toBe(false);
      expect(autoUpdaterMock.allowDowngrade).toBe(false);
      expect(readSavedChannel()).toBe('stable');
    });

    it('re-checks after an error state', async () => {
      const updater = new AppUpdater();
      updater.initialize();
      autoUpdaterMock.checkForUpdates.mockRejectedValueOnce(new Error('net::ERR_CONNECTION_CLOSED'));
      await getIpcHandler('app-update:check')();
      expect(updater.getState().status).toBe('error');

      const result = await setChannel('beta');

      expect(result.accepted).toBe(true);
      expect(autoUpdaterMock.checkForUpdates).toHaveBeenCalledTimes(2);
    });

    it('refuses a change while checking, downloading, downloaded or installing', async () => {
      vi.useFakeTimers();
      let finishCheck: () => void = () => {};
      autoUpdaterMock.checkForUpdates.mockImplementation(
        () => new Promise<void>((resolve) => {
          finishCheck = resolve;
        }),
      );
      const updater = new AppUpdater();
      updater.initialize();

      const expectRefused = async (status: string) => {
        expect(updater.getState().status).toBe(status);
        const result = await setChannel('beta');
        expect(result).toEqual({ accepted: false, persisted: false, state: expect.objectContaining({ status }) });
        expect(result.state.updateChannel).toBe('stable');
        expect(autoUpdaterMock.allowPrerelease).toBe(false);
        expect(fs.existsSync(channelFile())).toBe(false);
      };

      const pendingCheck = getIpcHandler('app-update:check')();
      await expectRefused('checking');
      finishCheck();
      await pendingCheck;

      autoUpdaterMock.emit('download-progress', { percent: 10, transferred: 10, total: 100 });
      await expectRefused('downloading');

      autoUpdaterMock.emit('update-downloaded', { version: '1.2.0' });
      await expectRefused('downloaded');

      await getIpcHandler('app-update:install')();
      await expectRefused('installing');

      expect(autoUpdaterMock.checkForUpdates).toHaveBeenCalledTimes(1);
    });

    it('starts with no staged update and marks one staged on update-downloaded', () => {
      const updater = new AppUpdater();
      updater.initialize();
      expect(updater.getState().updateStaged).toBe(false);

      autoUpdaterMock.emit('update-downloaded', { version: '1.2.0' });

      expect(updater.getState().updateStaged).toBe(true);
      expect(sendMock).toHaveBeenCalledWith(
        APP_UPDATE_STATE_CHANNEL,
        expect.objectContaining({ status: 'downloaded', updateStaged: true }),
      );
    });

    it.each([
      ['available', async () => { autoUpdaterMock.emit('update-available', { version: '1.2.0' }); }],
      ['no-update', async () => { autoUpdaterMock.emit('update-not-available', {}); }],
      ['error', async () => { throw new Error('net::ERR_CONNECTION_CLOSED'); }],
    ])('keeps the channel locked after a staged download and a manual check ending in %s', async (endStatus, checkOutcome) => {
      fs.writeFileSync(channelFile(), JSON.stringify({ channel: 'beta' }));
      const updater = new AppUpdater();
      updater.initialize();

      autoUpdaterMock.emit('update-downloaded', { version: '1.2.0-beta.1' });
      autoUpdaterMock.checkForUpdates.mockImplementationOnce(checkOutcome);
      await getIpcHandler('app-update:check')();
      expect(updater.getState().status).toBe(endStatus);
      expect(updater.getState().updateStaged).toBe(true);
      autoUpdaterMock.checkForUpdates.mockClear();

      const result = await setChannel('stable');

      expect(result.accepted).toBe(false);
      expect(result.persisted).toBe(false);
      expect(result.state.updateChannel).toBe('beta');
      expect(result.state.updateStaged).toBe(true);
      expect(updater.getState().updateChannel).toBe('beta');
      expect(autoUpdaterMock.allowPrerelease).toBe(true);
      expect(readSavedChannel()).toBe('beta');
      expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled();
    });

    it('refuses an invalid channel value', async () => {
      const updater = new AppUpdater();
      updater.initialize();

      for (const value of ['nightly', '', null, 42, { channel: 'beta' }]) {
        const result = await setChannel(value);
        expect(result.accepted).toBe(false);
        expect(result.persisted).toBe(false);
      }
      expect(updater.getState().updateChannel).toBe('stable');
      expect(fs.existsSync(channelFile())).toBe(false);
      expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled();
    });

    it('still applies the channel for the session when saving fails', async () => {
      const updater = new AppUpdater();
      updater.initialize();
      appMock.getPath.mockImplementation(() => path.join(userDataDir, 'missing', 'dir'));

      const result = await setChannel('beta');

      expect(result.accepted).toBe(true);
      expect(result.persisted).toBe(false);
      expect(result.state.updateChannel).toBe('beta');
      expect(autoUpdaterMock.allowPrerelease).toBe(true);
      expect(autoUpdaterMock.checkForUpdates).toHaveBeenCalledTimes(1);
      expect(loggerMock.error).toHaveBeenCalledWith(
        '[updater] Failed to save the update channel preference.',
        expect.anything(),
      );
    });

    it('does not re-check in an unpackaged runtime', async () => {
      appMock.isPackaged = false;
      const updater = new AppUpdater();
      updater.initialize();

      const result = await setChannel('beta');

      expect(result.accepted).toBe(true);
      expect(result.persisted).toBe(true);
      expect(result.state.status).toBe('idle');
      expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled();
    });

    it('never assigns autoUpdater.channel', async () => {
      const channelSetter = vi.fn();
      Object.defineProperty(autoUpdaterMock, 'channel', {
        configurable: true,
        get: () => null,
        set: channelSetter,
      });
      try {
        fs.writeFileSync(channelFile(), JSON.stringify({ channel: 'beta' }));
        const updater = new AppUpdater();
        updater.initialize();
        await getIpcHandler('app-update:check')();
        expect((await setChannel('stable')).accepted).toBe(true);
        expect((await setChannel('beta')).accepted).toBe(true);

        expect(autoUpdaterMock.checkForUpdates).toHaveBeenCalledTimes(3);
        expect(channelSetter).not.toHaveBeenCalled();
      } finally {
        delete (autoUpdaterMock as { channel?: unknown }).channel;
      }
    });
  });
});
