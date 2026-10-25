import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { AppUpdateCheckSchedule, APP_UPDATE_LAUNCH_CHECK_DELAY_MS } from '../appUpdateCheckSchedule';
import { loadAppUpdateCheckSettings } from '../appUpdateCheckSettingsStore';

const MINUTE = 60_000;

describe('AppUpdateCheckSchedule (DS-005, REQ-012..014)', () => {
  let userData = '';
  let busy: boolean;
  let online: boolean;
  let sources: string[];

  const schedule = () => new AppUpdateCheckSchedule({
    userDataPath: userData,
    target: {
      checkForUpdates: vi.fn(async (source: string) => { sources.push(source); }),
      isBusy: () => busy,
    },
    isOnline: () => online,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    userData = fs.mkdtempSync(path.join(os.tmpdir(), 'app-update-schedule-'));
    busy = false;
    online = true;
    sources = [];
  });
  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(userData, { recursive: true, force: true });
  });

  it('is on, every 60 minutes, by default: checks 8 s after start, then every interval', async () => {
    const s = schedule();
    expect(s.settings()).toEqual({ enabled: true, intervalMinutes: 60 });
    s.start();
    await vi.advanceTimersByTimeAsync(APP_UPDATE_LAUNCH_CHECK_DELAY_MS - 1);
    expect(sources).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(sources).toEqual(['startup']);
    await vi.advanceTimersByTimeAsync(60 * MINUTE - 1);
    expect(sources).toEqual(['startup']);
    await vi.advanceTimersByTimeAsync(1);
    expect(sources).toEqual(['startup', 'periodic']);
    await vi.advanceTimersByTimeAsync(120 * MINUTE);
    expect(sources).toEqual(['startup', 'periodic', 'periodic', 'periodic']);
    s.stop();
  });

  it('makes no automatic check at all when off (REQ-013)', async () => {
    const s = schedule();
    s.setSettings({ enabled: false, intervalMinutes: 60 });
    s.start();
    await vi.advanceTimersByTimeAsync(48 * 60 * MINUTE);
    expect(sources).toEqual([]);
  });

  it('skips a check while an app update is busy or the machine is offline, and tries again an interval later (REQ-014)', async () => {
    const s = schedule();
    busy = true;
    s.start();
    await vi.advanceTimersByTimeAsync(APP_UPDATE_LAUNCH_CHECK_DELAY_MS);
    expect(sources).toEqual([]);
    busy = false;
    online = false;
    await vi.advanceTimersByTimeAsync(60 * MINUTE);
    expect(sources).toEqual([]);
    online = true;
    await vi.advanceTimersByTimeAsync(60 * MINUTE);
    expect(sources).toEqual(['periodic']);
    s.stop();
  });

  it('saves a new interval, re-arms from the last check and tells its listener', async () => {
    const s = schedule();
    const listener = vi.fn();
    s.onChange(listener);
    s.start();
    await vi.advanceTimersByTimeAsync(APP_UPDATE_LAUNCH_CHECK_DELAY_MS);
    await vi.advanceTimersByTimeAsync(10 * MINUTE);
    expect(s.setSettings({ enabled: true, intervalMinutes: 15 })).toEqual({ accepted: true, persisted: true });
    expect(listener).toHaveBeenCalledOnce();
    expect(loadAppUpdateCheckSettings(userData)).toEqual({ enabled: true, intervalMinutes: 15 });
    await vi.advanceTimersByTimeAsync(5 * MINUTE - 1);
    expect(sources).toEqual(['startup']);
    await vi.advanceTimersByTimeAsync(1);
    expect(sources).toEqual(['startup', 'periodic']);
    s.stop();
  });

  it('turning off stops the timer; turning on again resumes from the last check', async () => {
    const s = schedule();
    s.start();
    await vi.advanceTimersByTimeAsync(APP_UPDATE_LAUNCH_CHECK_DELAY_MS);
    s.setSettings({ enabled: false, intervalMinutes: 60 });
    await vi.advanceTimersByTimeAsync(3 * 60 * MINUTE);
    expect(sources).toEqual(['startup']);
    s.setSettings({ enabled: true, intervalMinutes: 60 });
    await vi.advanceTimersByTimeAsync(0);
    expect(sources).toEqual(['startup', 'periodic']);
    s.stop();
  });

  it('refuses an invalid value without saving or telling the listener', () => {
    const s = schedule();
    const listener = vi.fn();
    s.onChange(listener);
    for (const value of [null, {}, { enabled: true, intervalMinutes: 14 }, { enabled: true, intervalMinutes: 1441 },
      { enabled: 'yes', intervalMinutes: 60 }, { enabled: true, intervalMinutes: 30.5 }]) {
      expect(s.setSettings(value)).toEqual({ accepted: false, persisted: false });
    }
    expect(listener).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(userData, 'app-update-checks.json'))).toBe(false);
  });

  it('keeps the settings after a restart; reads an invalid file as the default', () => {
    schedule().setSettings({ enabled: false, intervalMinutes: 240 });
    expect(schedule().settings()).toEqual({ enabled: false, intervalMinutes: 240 });
    fs.writeFileSync(path.join(userData, 'app-update-checks.json'), JSON.stringify({ enabled: true, intervalMinutes: 5 }));
    expect(schedule().settings()).toEqual({ enabled: true, intervalMinutes: 60 });
    fs.writeFileSync(path.join(userData, 'app-update-checks.json'), '{broken');
    expect(schedule().settings()).toEqual({ enabled: true, intervalMinutes: 60 });
  });

  it('never overlaps checks: a long check re-arms only when it finished', async () => {
    let finish!: () => void;
    const checkForUpdates = vi.fn((source: string) => {
      sources.push(source);
      return new Promise<void>((resolve) => { finish = resolve; });
    });
    const s = new AppUpdateCheckSchedule({ userDataPath: userData, target: { checkForUpdates, isBusy: () => false }, isOnline: () => true });
    s.setSettings({ enabled: true, intervalMinutes: 15 });
    s.start();
    await vi.advanceTimersByTimeAsync(APP_UPDATE_LAUNCH_CHECK_DELAY_MS + 60 * MINUTE);
    expect(checkForUpdates).toHaveBeenCalledOnce();
    s.setSettings({ enabled: true, intervalMinutes: 20 });
    expect(checkForUpdates).toHaveBeenCalledOnce();
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(checkForUpdates).toHaveBeenCalledTimes(2);
    s.stop();
  });

  it('a failing check is logged and the schedule goes on', async () => {
    const checkForUpdates = vi.fn(async () => { throw new Error('offline'); });
    const s = new AppUpdateCheckSchedule({ userDataPath: userData, target: { checkForUpdates, isBusy: () => false }, isOnline: () => true });
    s.start();
    await vi.advanceTimersByTimeAsync(APP_UPDATE_LAUNCH_CHECK_DELAY_MS + 60 * MINUTE);
    expect(checkForUpdates).toHaveBeenCalledTimes(2);
    s.stop();
  });
});
