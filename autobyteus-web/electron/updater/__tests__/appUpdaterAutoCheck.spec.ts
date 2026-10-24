import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_UPDATE_IPC_SET_AUTO_CHECK, APP_UPDATE_STATE_CHANNEL } from '../appUpdateController';

/** The app's automatic checks through `AppUpdater` (DS-005): state, IPC, sources, quiet errors, busy. */
const { appMock, handlers, send, updater, online } = vi.hoisted(() => {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  const handlerMap = new Map<string, (...args: any[]) => any>();
  const autoUpdater = {
    autoDownload: false, autoInstallOnAppQuit: false, allowPrerelease: false, allowDowngrade: false, logger: undefined as unknown,
    checkForUpdates: vi.fn(), downloadUpdate: vi.fn(), quitAndInstall: vi.fn(), setFeedURL: vi.fn(),
    on: (event: string, listener: (...args: any[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
    },
    emit: (event: string, ...args: any[]) => { for (const listener of listeners.get(event) ?? []) listener(...args); },
    reset: () => listeners.clear(),
  };
  return {
    appMock: { isPackaged: true, getVersion: vi.fn(() => '1.1.9'), getPath: vi.fn(() => '') },
    handlers: handlerMap,
    send: vi.fn(),
    updater: autoUpdater,
    online: { value: true },
  };
});

vi.mock('electron', () => ({
  app: appMock,
  ipcMain: {
    removeHandler: (channel: string) => handlers.delete(channel),
    handle: (channel: string, handler: (...args: any[]) => any) => handlers.set(channel, handler),
  },
  BrowserWindow: { getAllWindows: () => [{ isDestroyed: () => false, webContents: { send } }] },
  net: { isOnline: () => online.value },
}));
vi.mock('electron-updater', () => ({ autoUpdater: updater }));
vi.mock('../../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { AppUpdater } from '../appUpdater';

const MINUTE = 60_000;
let userData = '';

describe('AppUpdater automatic checks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    userData = fs.mkdtempSync(path.join(os.tmpdir(), 'app-updater-auto-'));
    appMock.getPath.mockImplementation(() => userData);
    appMock.isPackaged = true;
    online.value = true;
    handlers.clear();
    send.mockReset();
    updater.reset();
    updater.checkForUpdates.mockReset();
    updater.checkForUpdates.mockImplementation(async () => { updater.emit('update-not-available', {}); });
    updater.downloadUpdate.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(userData, { recursive: true, force: true });
  });

  it('reports the schedule settings in its state and follows a change made through IPC', async () => {
    const appUpdater = new AppUpdater();
    appUpdater.initialize();
    expect(appUpdater.getState().autoCheck).toEqual({ enabled: true, intervalMinutes: 60 });

    const state = await handlers.get(APP_UPDATE_IPC_SET_AUTO_CHECK)!({}, { enabled: false, intervalMinutes: 120 });
    expect(state.autoCheck).toEqual({ enabled: false, intervalMinutes: 120 });
    expect(send).toHaveBeenLastCalledWith(APP_UPDATE_STATE_CHANNEL, expect.objectContaining({
      autoCheck: { enabled: false, intervalMinutes: 120 } }));
    expect(JSON.parse(fs.readFileSync(path.join(userData, 'app-update-checks.json'), 'utf8')))
      .toEqual({ enabled: false, intervalMinutes: 120 });

    const refused = await handlers.get(APP_UPDATE_IPC_SET_AUTO_CHECK)!({}, { enabled: true, intervalMinutes: 5 });
    expect(refused.autoCheck).toEqual({ enabled: false, intervalMinutes: 120 });
  });

  it('checks at launch and then periodically, with no click or restart (REQ-012)', async () => {
    const appUpdater = new AppUpdater();
    appUpdater.initialize();
    appUpdater.startAutoCheck();
    await vi.advanceTimersByTimeAsync(8_000);
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60 * MINUTE);
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(2);
  });

  it('makes no automatic request when off; Check for Updates still works (REQ-013)', async () => {
    const appUpdater = new AppUpdater();
    appUpdater.initialize();
    await handlers.get(APP_UPDATE_IPC_SET_AUTO_CHECK)!({}, { enabled: false, intervalMinutes: 60 });
    appUpdater.startAutoCheck();
    await vi.advanceTimersByTimeAsync(24 * 60 * MINUTE);
    expect(updater.checkForUpdates).not.toHaveBeenCalled();
    await appUpdater.checkForUpdates('manual');
    expect(updater.checkForUpdates).toHaveBeenCalledOnce();
  });

  it('a failed periodic check is recorded as periodic-check (quiet) with the time it finished (REQ-025)', async () => {
    const appUpdater = new AppUpdater();
    appUpdater.initialize();
    appUpdater.startAutoCheck();
    await vi.advanceTimersByTimeAsync(8_000);
    updater.checkForUpdates.mockImplementation(async () => { throw new Error('getaddrinfo ENOTFOUND github.com'); });
    vi.setSystemTime(new Date('2026-10-23T12:00:00.000Z'));
    await vi.advanceTimersByTimeAsync(60 * MINUTE);
    expect(appUpdater.getState()).toMatchObject({ status: 'error', errorOperation: 'periodic-check' });
    expect(appUpdater.getState().checkedAt).toBe(new Date(Date.now()).toISOString());
  });

  it('sets checkedAt when a check finished, not when it starts (REQ-015)', async () => {
    let finish!: () => void;
    updater.checkForUpdates.mockImplementation(() => new Promise<void>((resolve) => {
      finish = () => { updater.emit('update-not-available', {}); resolve(); };
    }));
    const appUpdater = new AppUpdater();
    appUpdater.initialize();
    const checking = appUpdater.checkForUpdates('manual');
    updater.emit('checking-for-update');
    expect(appUpdater.getState()).toMatchObject({ status: 'checking', checkedAt: null });
    finish();
    await checking;
    expect(appUpdater.getState().status).toBe('no-update');
    expect(appUpdater.getState().checkedAt).not.toBeNull();
  });

  it('is busy while downloading or with a downloaded update, so no periodic check runs (REQ-014)', async () => {
    const appUpdater = new AppUpdater();
    appUpdater.initialize();
    expect(appUpdater.isBusy()).toBe(false);
    updater.emit('update-downloaded', { version: '1.2.0' });
    expect(appUpdater.isBusy()).toBe(true);
    appUpdater.startAutoCheck();
    await vi.advanceTimersByTimeAsync(8_000 + 3 * 60 * MINUTE);
    expect(updater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('skips while offline', async () => {
    online.value = false;
    const appUpdater = new AppUpdater();
    appUpdater.initialize();
    appUpdater.startAutoCheck();
    await vi.advanceTimersByTimeAsync(8_000 + 60 * MINUTE);
    expect(updater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('a periodic check that finds an update never downloads or installs it (REQ-023, AC-021)', async () => {
    updater.checkForUpdates.mockImplementation(async () => { updater.emit('update-available', { version: '1.2.0' }); });
    const appUpdater = new AppUpdater();
    appUpdater.initialize();
    appUpdater.startAutoCheck();
    await vi.advanceTimersByTimeAsync(8_000 + 5 * 60 * MINUTE);
    expect(appUpdater.getState().status).toBe('available');
    expect(updater.downloadUpdate).not.toHaveBeenCalled();
    expect(updater.quitAndInstall).not.toHaveBeenCalled();
  });

  it('schedules nothing in an unpackaged runtime', async () => {
    appMock.isPackaged = false;
    const appUpdater = new AppUpdater();
    appUpdater.initialize();
    appUpdater.startAutoCheck();
    await vi.advanceTimersByTimeAsync(8_000 + 60 * MINUTE);
    expect(updater.checkForUpdates).not.toHaveBeenCalled();
  });
});
