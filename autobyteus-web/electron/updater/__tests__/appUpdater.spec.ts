import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_UPDATE_STATE_CHANNEL, AppUpdater } from '../appUpdater';

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

describe('AppUpdater', () => {
  beforeEach(() => {
    vi.useRealTimers();
    appMock.isPackaged = true;
    sendMock.mockReset();
    ipcHandlers.clear();
    autoUpdaterMock.removeAllListeners();
    autoUpdaterMock.checkForUpdates.mockClear();
    autoUpdaterMock.downloadUpdate.mockClear();
    autoUpdaterMock.quitAndInstall.mockClear();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    loggerMock.error.mockClear();
    loggerMock.debug.mockClear();
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
    expect(state.message).toBe('Failed to install update and restart.');
    expect(state.error).toBe('install boom');
  });
});
