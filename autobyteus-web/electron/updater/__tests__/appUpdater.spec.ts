import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppUpdater } from '../appUpdater';
import { ManagedUpdateSession } from '../../application/managedUpdateSession';
import { ApplicationShutdown } from '../../application/applicationShutdown';
import { ManagedStageGone } from '../linuxManagedInstall';
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
    setFeedURL: ReturnType<typeof vi.fn>;
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
    setFeedURL: vi.fn(),
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
      on: vi.fn(),
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
  autoUpdater: { on: vi.fn() },
  ipcMain: ipcMainMock,
  BrowserWindow: browserWindowMock,
  net: { isOnline: () => true },
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
    autoUpdaterMock.setFeedURL.mockClear();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    loggerMock.error.mockClear();
    loggerMock.debug.mockClear();
  });

  afterEach(() => {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  });

  it('managed verification is the only readiness authority; automatic download never invokes native install', async () => {
    let receipt!: (value: any) => void;
    const writer = {
      stage: vi.fn(() => new Promise<any>(resolve => { receipt = resolve; })),
      activate: vi.fn(async () => ({ version: '1.1.10', sha256: 'new' })),
      status: vi.fn(), discard: vi.fn(async () => {}) };
    const stop = vi.fn(async () => {}), quit = vi.fn(), requestReopen = vi.fn();
    const session = new ManagedUpdateSession({ restartMoment: {watch:vi.fn(),cancel:vi.fn()}, writer, shutdown: new ApplicationShutdown(stop, vi.fn()),
      initialSettings: { automaticUpdate: false, updateChannel: 'stable' }, serverGone: () => true,
      quit, requestReopen, notifyQuit: vi.fn(), exit: vi.fn(), report: vi.fn() });
    const updater = new AppUpdater({ managedSession: session }); updater.initialize();
    updater.setAutomaticUpdate(true);
    expect(updater.getState().activationMode).toBe('managed-restart');
    expect(autoUpdaterMock.autoInstallOnAppQuit).toBe(false);
    autoUpdaterMock.emit('update-available', { version: '1.1.10' });
    autoUpdaterMock.emit('update-downloaded', { version: '1.1.10', downloadedFile: '/cache/image' });
    expect(updater.getState()).toMatchObject({ status: 'downloading', updateStaged: false });
    expect(updater.installUpdateAndRestart()).toEqual({ accepted: false });
    receipt({ id: 'stage', baseline: 'old', channel: 'stable', identity: { version: '1.1.10', sha256: 'new' } });
    await vi.waitFor(() => expect(updater.getState()).toMatchObject({ status: 'downloaded', updateStaged: true }));
    expect(stop).not.toHaveBeenCalled(); expect(quit).not.toHaveBeenCalled(); expect(autoUpdaterMock.quitAndInstall).not.toHaveBeenCalled();
    // Repeated found/ready events and toggling on are not immediate-ready bypasses.
    autoUpdaterMock.emit('update-available', { version: '1.1.10' });
    updater.setAutomaticUpdate(true);
    expect(stop).not.toHaveBeenCalled();
    session.willQuit({ preventDefault() {} });
    await vi.waitFor(() => expect(quit).toHaveBeenCalledOnce());
    expect(writer.activate).toHaveBeenCalledOnce(); expect(requestReopen).not.toHaveBeenCalled();
    expect(autoUpdaterMock.quitAndInstall).not.toHaveBeenCalled();
  });

  it('opt-out during verification restores manual actions after the stale receipt settles', async () => {
    const candidate = { id: 'stale', baseline: 'old', channel: 'stable' as const, identity: { version: '1.1.10', sha256: 'new' } };
    let resolve!: (stage: typeof candidate) => void;
    const writer = { activate: vi.fn(), status: vi.fn(), discard: vi.fn(async () => {}),
      stage: vi.fn(async () => ({ ...candidate, id: 'fresh' })).mockImplementationOnce(() => new Promise(r => { resolve = r; })) };
    const quit = vi.fn(), session = new ManagedUpdateSession({ restartMoment: {watch:vi.fn(),cancel:vi.fn()}, writer, shutdown: new ApplicationShutdown(async () => {}, vi.fn()),
      initialSettings: { automaticUpdate: false, updateChannel: 'stable' }, serverGone: () => true,
      quit, requestReopen: vi.fn(), notifyQuit: vi.fn(), exit: vi.fn(), report: vi.fn() });
    const updater = new AppUpdater({ managedSession: session }); updater.initialize(); updater.setAutomaticUpdate(true);
    const offer = () => autoUpdaterMock.emit('update-available', { version: '1.1.10' });
    const deliver = async () => { autoUpdaterMock.emit('update-downloaded', { version: '1.1.10', downloadedFile: '/cache/image' }); };
    autoUpdaterMock.downloadUpdate.mockImplementationOnce(deliver);
    offer();
    await vi.waitFor(() => expect(writer.stage).toHaveBeenCalledOnce());
    updater.setAutomaticUpdate(false);
    await updater.checkForUpdates(); await updater.downloadUpdate();
    expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled(); expect(autoUpdaterMock.downloadUpdate).toHaveBeenCalledOnce();
    resolve(candidate);
    await vi.waitFor(() => expect(updater.getState()).toMatchObject({ status: 'available', updateStaged: false, automaticUpdate: false }));
    expect(writer.discard).toHaveBeenCalledWith(candidate); expect(updater.installUpdateAndRestart().accepted).toBe(false);
    autoUpdaterMock.checkForUpdates.mockImplementationOnce(async () => { offer(); });
    await updater.checkForUpdates(); expect(autoUpdaterMock.checkForUpdates).toHaveBeenCalledOnce();
    autoUpdaterMock.downloadUpdate.mockImplementationOnce(deliver);
    await updater.downloadUpdate(); await vi.waitFor(() => expect(updater.getState().updateStaged).toBe(true));
    expect(writer.stage).toHaveBeenCalledTimes(2); session.willQuit({ preventDefault() {} });
    await vi.waitFor(() => expect(quit).toHaveBeenCalledOnce()); expect(writer.activate).not.toHaveBeenCalled();
  });

  it('lost managed receipt clears provisional failure across restart and re-stages a cached update automatically', async () => {
    const candidate = { id: 'stage', baseline: 'old', channel: 'stable' as const, identity: { version: '1.1.10', sha256: 'new' } };
    const writer = {  stage: vi.fn(async () => candidate),
      activate: vi.fn(async () => { throw new ManagedStageGone('gone'); }),
      status: vi.fn(async () => ({ version: '1.1.9', sha256: 'old' })), discard: vi.fn(async () => {}) };
    const quit = vi.fn();
    const makeSession = () => new ManagedUpdateSession({ restartMoment: {watch:vi.fn(),cancel:vi.fn()}, writer, shutdown: new ApplicationShutdown(async () => {}, vi.fn()),
      initialSettings: { automaticUpdate: true, updateChannel: 'stable' }, serverGone: () => true,
      quit, requestReopen: vi.fn(), notifyQuit: vi.fn(), exit: vi.fn(), report: vi.fn() });
    const session = makeSession(), updater = new AppUpdater({ managedSession: session }); updater.initialize(); updater.setAutomaticUpdate(true);
    autoUpdaterMock.emit('update-available', { version: '1.1.10' });
    autoUpdaterMock.emit('update-downloaded', { version: '1.1.10', downloadedFile: '/cache/image' });
    await vi.waitFor(() => expect(updater.getState().updateStaged).toBe(true));
    session.willQuit({ preventDefault() {} });
    await vi.waitFor(() => expect(quit).toHaveBeenCalledOnce());
    autoUpdaterMock.removeAllListeners();
    const restarted = new AppUpdater({ managedSession: makeSession() }); restarted.initialize();
    expect(restarted.getState().notification?.outcome).toBeNull();
    expect(restarted.getState().automaticUpdate).toBe(true);
    autoUpdaterMock.downloadUpdate.mockImplementationOnce(async () => {
      autoUpdaterMock.emit('update-downloaded', { version: '1.1.10', downloadedFile: '/cache/image' });
    });
    autoUpdaterMock.emit('update-available', { version: '1.1.10' });
    await vi.waitFor(() => expect(restarted.getState().updateStaged).toBe(true));
    expect(writer.stage).toHaveBeenCalledTimes(2);
    expect(autoUpdaterMock.quitAndInstall).not.toHaveBeenCalled();
  });

  describe('managed failure continuation (CRR-001, BEH-004)', () => {
    // Actual updater/session/shutdown/persistence owners; only OS, downloader and writer edges are doubled.
    // The synthetic profile is removed by the outer afterEach. This is not packaged or writer E2E.
    const candidate = { id: 'stage', baseline: 'old', channel: 'stable' as const,
      identity: { version: '1.1.10', sha256: 'new' } };
    const record = () => JSON.parse(fs.readFileSync(path.join(userDataDir, 'app-update-notification.json'), 'utf8'));
    function start() {
      autoUpdaterMock.removeAllListeners();
      autoUpdaterMock.downloadUpdate.mockClear();
      autoUpdaterMock.checkForUpdates.mockImplementationOnce(async () => {
        autoUpdaterMock.emit('update-available', { version: candidate.identity.version });
      });
      autoUpdaterMock.downloadUpdate.mockImplementationOnce(async () => {
        autoUpdaterMock.emit('update-downloaded', { version: candidate.identity.version, downloadedFile: '/synthetic/cache.AppImage' });
      });
      const writer = {
        stage: vi.fn(async () => candidate), activate: vi.fn(async () => candidate.identity),
        status: vi.fn(async () => ({ version: '1.1.9', sha256: 'old' })), discard: vi.fn(async () => {}) };
      const stop = vi.fn(async () => {});
      const hooks = { serverGone: vi.fn(() => true), quit: vi.fn(), requestReopen: vi.fn(),
        notifyQuit: vi.fn(), exit: vi.fn(), report: vi.fn() };
      const session = new ManagedUpdateSession({ restartMoment: {watch:vi.fn(),cancel:vi.fn()}, writer, shutdown: new ApplicationShutdown(stop, vi.fn()),
        initialSettings: { automaticUpdate: false, updateChannel: 'stable' }, ...hooks });
      const updater = new AppUpdater({ managedSession: session, platform: 'linux', appUpdateConfigPath: null });
      updater.initialize();
      return { writer, stop, hooks, session, updater };
    }
    async function failAutomaticInstall() {
      const s = start(); s.writer.activate.mockRejectedValue(new Error('definite refusal'));
      s.updater.setAutomaticUpdate(true);
      await s.updater.checkForUpdates();
      await vi.waitFor(() => expect(s.updater.getState().updateStaged).toBe(true));
      s.session.willQuit({ preventDefault() {} });
      await vi.waitFor(() => expect(s.hooks.quit).toHaveBeenCalledOnce());
      expect(record().automaticFailure).toMatchObject({ version: '1.1.10', step: 'install' });
      return record().automaticFailure;
    }
    it.each(['ordinary quit', 'manual refusal', 'manual receipt loss', 'manual success'] as const)(
      'retains the automatic block after explicit Download, while allowing %s', async (action) => {
        const failure = await failAutomaticInstall();
        const s = start(); await s.updater.checkForUpdates();
        expect(autoUpdaterMock.downloadUpdate).not.toHaveBeenCalled();
        await s.updater.downloadUpdate();
        await vi.waitFor(() => expect(s.updater.getState().updateStaged).toBe(true));
        expect(s.writer.activate).not.toHaveBeenCalled();
        if (action === 'ordinary quit') {
          s.session.willQuit({ preventDefault() {} });
          await vi.waitFor(() => expect(s.hooks.quit).toHaveBeenCalledOnce());
          expect(s.writer.activate).not.toHaveBeenCalled();
          expect(s.hooks.requestReopen).not.toHaveBeenCalled();
        } else {
          if (action === 'manual refusal') s.writer.activate.mockRejectedValue(new Error('refused'));
          if (action === 'manual receipt loss') s.writer.activate.mockRejectedValue(new ManagedStageGone('gone'));
          expect(s.updater.installUpdateAndRestart()).toEqual({ accepted: true });
          await vi.waitFor(() => expect(s.hooks.exit).toHaveBeenCalledWith(76));
          expect(s.writer.activate).toHaveBeenCalledOnce();
          expect(s.hooks.requestReopen).toHaveBeenCalledOnce();
          if (action !== 'manual success') {
            expect(s.updater.getState().notification?.outcome).toBe('MANUAL_INSTALL_FAILED');
            // The manual outcome hides AUTO_FAILED in the row, not the separate permanent block.
            const continued = start(); await continued.updater.checkForUpdates();
            expect(autoUpdaterMock.downloadUpdate).not.toHaveBeenCalled();
            await continued.updater.downloadUpdate();
            await vi.waitFor(() => expect(continued.updater.getState().updateStaged).toBe(true));
            continued.session.willQuit({ preventDefault() {} });
            await vi.waitFor(() => expect(continued.hooks.quit).toHaveBeenCalledOnce());
            expect(continued.writer.activate).not.toHaveBeenCalled();
          }
        }
        expect(record().automaticFailure).toEqual(failure);
        expect(record().automatic).toBeNull();
        expect(autoUpdaterMock.quitAndInstall).not.toHaveBeenCalled();
      });
    it.each(['unknown commit', 'stop failed', 'server exit unconfirmed'] as const)(
      'allows a later ordinary exit after manual %s, without retry or relaunch', async (failure) => {
        const s = start(); s.updater.setAutomaticUpdate(true);
        if (failure === 'unknown commit') {
          s.writer.activate.mockRejectedValue(new Error('lost reply'));
          s.writer.status.mockRejectedValue(new Error('status unavailable'));
        } else {
          s.hooks.serverGone.mockReturnValue(false);
          if (failure === 'stop failed') s.stop.mockRejectedValue(new Error('stop failed'));
        }
        await s.updater.checkForUpdates();
        await vi.waitFor(() => expect(s.updater.getState().updateStaged).toBe(true));
        expect(s.updater.installUpdateAndRestart()).toEqual({ accepted: true });
        await vi.waitFor(() => expect(s.hooks.report).toHaveBeenCalledOnce());
        expect(s.updater.getState().updateStaged).toBe(false);
        expect(s.updater.installUpdateAndRestart()).toEqual({ accepted: false });
        // A late downloader event cannot begin another transaction in the failed session.
        autoUpdaterMock.emit('update-downloaded', { version: '1.1.10', downloadedFile: '/synthetic/cache.AppImage' });
        await Promise.resolve();
        s.session.willQuit({ preventDefault() {} });
        if (failure === 'unknown commit') {
          await vi.waitFor(() => expect(s.hooks.quit).toHaveBeenCalledOnce());
          const reentry = { preventDefault: vi.fn() }; s.session.willQuit(reentry);
          expect(reentry.preventDefault).not.toHaveBeenCalled();
          expect(s.hooks.exit).not.toHaveBeenCalled();
          expect(s.writer.status).toHaveBeenCalledOnce();
        } else {
          await vi.waitFor(() => expect(s.hooks.exit).toHaveBeenCalledWith(1));
          expect(s.hooks.quit).not.toHaveBeenCalled();
        }
        expect(s.writer.activate).toHaveBeenCalledTimes(failure === 'unknown commit' ? 1 : 0);
        expect(s.writer.stage).toHaveBeenCalledOnce();
        expect(s.stop).toHaveBeenCalledOnce();
        expect(s.hooks.notifyQuit).toHaveBeenCalledOnce();
        expect(s.hooks.requestReopen).not.toHaveBeenCalled();
        expect(autoUpdaterMock.quitAndInstall).not.toHaveBeenCalled();
      });
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
    const updater = new AppUpdater({ autoCheckDelayMs: 500 });
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

  it('awaits preparation before installation and does not install when preparation fails', async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    const prepare = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const updater = new AppUpdater({ prepareForInstall: prepare });
    updater.initialize(); autoUpdaterMock.emit('update-downloaded', { version: '1.2.0' });
    updater.installUpdateAndRestart(); await vi.advanceTimersByTimeAsync(100);
    expect(prepare).toHaveBeenCalledOnce(); expect(autoUpdaterMock.quitAndInstall).not.toHaveBeenCalled();
    finish(); await vi.advanceTimersByTimeAsync(0);
    expect(autoUpdaterMock.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it('turns failed preparation into install error without invoking installation', async () => {
    vi.useFakeTimers();
    const updater = new AppUpdater({ prepareForInstall: async () => { throw new Error('cleanup incomplete'); } });
    updater.initialize(); autoUpdaterMock.emit('update-downloaded', { version: '1.2.0' });
    updater.installUpdateAndRestart(); await vi.advanceTimersByTimeAsync(100);
    expect(autoUpdaterMock.quitAndInstall).not.toHaveBeenCalled(); expect(updater.getState().errorKind).toBe('install');
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

  describe('update notification (DS-004)', () => {
    const notificationFile = () => path.join(userDataDir, 'app-update-notification.json');
    const githubConfig = () => {
      const file = path.join(userDataDir, 'app-update.yml');
      fs.writeFileSync(file, 'owner: AutoByteus\nrepo: autobyteus-workspace\nprovider: github\nupdaterCacheDirName: autobyteus-updater\n');
      return file;
    };
    const state = () => getIpcHandler('app-update:get-state')();

    it('records a found version as a waiting, unread notification with the GitHub release page', async () => {
      new AppUpdater({ appUpdateConfigPath: githubConfig() }).initialize();
      autoUpdaterMock.emit('update-available', { version: '1.2.0', releaseNotes: 'Notes' });

      expect((await state()).notification).toMatchObject({
        version: '1.2.0', fromVersion: '1.1.9', read: false, state: 'waiting', handledVersion: null,
        releasePageUrl: 'https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.2.0',
      });
      expect(JSON.parse(fs.readFileSync(notificationFile(), 'utf8'))).toMatchObject({ version: '1.2.0', read: false });
    });

    it('marks it read and keeps it after a restart, then handles it when the app runs the new version', async () => {
      new AppUpdater({ appUpdateConfigPath: null }).initialize();
      autoUpdaterMock.emit('update-available', { version: '1.2.0' });
      expect((await getIpcHandler('app-update:mark-notification-read')()).notification).toMatchObject({ read: true });

      autoUpdaterMock.removeAllListeners();
      new AppUpdater({ appUpdateConfigPath: null }).initialize();
      expect((await state()).notification).toMatchObject({ version: '1.2.0', read: true, state: 'waiting' });

      autoUpdaterMock.removeAllListeners();
      appMock.getVersion.mockImplementation(() => '1.2.0');
      new AppUpdater({ appUpdateConfigPath: null }).initialize();
      expect((await state()).notification).toMatchObject({ version: '1.2.0', state: 'handled', handledVersion: '1.2.0' });

      expect((await getIpcHandler('app-update:clear-notification')()).notification).toBeNull();
      expect(fs.existsSync(notificationFile())).toBe(false);
    });

    it('a newer version replaces the waiting notification and makes it unread again (REQ-005)', async () => {
      new AppUpdater({ appUpdateConfigPath: null }).initialize();
      autoUpdaterMock.emit('update-available', { version: '1.2.0' });
      await getIpcHandler('app-update:mark-notification-read')();
      autoUpdaterMock.emit('update-available', { version: '1.3.0' });
      expect((await state()).notification).toMatchObject({ version: '1.3.0', read: false, state: 'waiting' });
    });

    it('removes a waiting notification when the version is no longer offered and nothing was updated (DEC-015)', async () => {
      new AppUpdater({ appUpdateConfigPath: null }).initialize();
      autoUpdaterMock.emit('update-available', { version: '1.2.0' });
      autoUpdaterMock.emit('update-not-available', {});
      expect((await state()).notification).toBeNull();
    });

    it('refuses to clear a waiting notification', async () => {
      new AppUpdater({ appUpdateConfigPath: null }).initialize();
      autoUpdaterMock.emit('update-available', { version: '1.2.0' });
      expect((await getIpcHandler('app-update:clear-notification')()).notification).toMatchObject({ state: 'waiting' });
    });

    it('Download after a restart re-checks first, then downloads only when the update is available', async () => {
      fs.writeFileSync(notificationFile(), JSON.stringify({
        version: '1.2.0', fromVersion: '1.1.9', foundAt: '2026-10-20T10:00:00.000Z', read: true, handledVersion: null, handledAt: null,
      }));
      new AppUpdater({ appUpdateConfigPath: null }).initialize();
      autoUpdaterMock.checkForUpdates.mockImplementationOnce(async () => {
        autoUpdaterMock.emit('update-available', { version: '1.2.0' });
      });

      const result = await getIpcHandler('app-update:download')();
      expect(autoUpdaterMock.checkForUpdates).toHaveBeenCalledTimes(1);
      expect(autoUpdaterMock.downloadUpdate).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('downloading');
    });

    it('Download after a restart shows the check result and downloads nothing when no update is offered', async () => {
      fs.writeFileSync(notificationFile(), JSON.stringify({
        version: '1.2.0', fromVersion: '1.1.9', foundAt: '2026-10-20T10:00:00.000Z', read: true, handledVersion: null, handledAt: null,
      }));
      new AppUpdater({ appUpdateConfigPath: null }).initialize();
      const result = await getIpcHandler('app-update:download')();
      expect(autoUpdaterMock.downloadUpdate).not.toHaveBeenCalled();
      expect(result.status).toBe('no-update');
      expect(result.notification).toBeNull();
    });

    it('checks the generic test feed and gives no release page under it (REQ-019, DEC-017)', async () => {
      new AppUpdater({ testFeedUrl: 'http://127.0.0.1:8123/', appUpdateConfigPath: githubConfig() }).initialize();
      expect(autoUpdaterMock.setFeedURL).toHaveBeenCalledWith({ provider: 'generic', url: 'http://127.0.0.1:8123/' });
      autoUpdaterMock.emit('update-available', { version: '1.2.0' });
      expect((await state()).notification).toMatchObject({ version: '1.2.0', releasePageUrl: null });
    });

    it('never sets a feed URL without the test feed', () => {
      new AppUpdater({ appUpdateConfigPath: null }).initialize();
      expect(autoUpdaterMock.setFeedURL).not.toHaveBeenCalled();
    });

    it('a found update never downloads by itself (REQ-015)', async () => {
      new AppUpdater({ appUpdateConfigPath: null }).initialize();
      autoUpdaterMock.emit('update-available', { version: '1.2.0' });
      await getIpcHandler('app-update:mark-notification-read')();
      expect(autoUpdaterMock.downloadUpdate).not.toHaveBeenCalled();
      expect(autoUpdaterMock.autoDownload).toBe(false);
    });
  });
});
