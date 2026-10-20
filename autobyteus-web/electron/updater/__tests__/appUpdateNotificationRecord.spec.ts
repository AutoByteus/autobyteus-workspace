import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { loggerMock } = vi.hoisted(() => ({ loggerMock: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../../logger', () => ({ logger: loggerMock }));

import { AppUpdateNotificationRecord } from '../appUpdateNotificationRecord';

const noLink = () => null;
const at = (iso: string) => () => new Date(iso);

describe('AppUpdateNotificationRecord', () => {
  let dir = '';
  const file = () => path.join(dir, 'app-update-notification.json');
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-update-record-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); vi.clearAllMocks(); });

  it('writes the exact current shape and reads it back after a restart', () => {
    new AppUpdateNotificationRecord(dir, '1.5.6', at('2026-10-20T10:00:00.000Z')).recordFound('1.5.7');
    expect(JSON.parse(fs.readFileSync(file(), 'utf8'))).toEqual({
      version: '1.5.7', fromVersion: '1.5.6', foundAt: '2026-10-20T10:00:00.000Z', read: false, handledVersion: null, handledAt: null,
    });
    expect(new AppUpdateNotificationRecord(dir, '1.5.6').toNotification(noLink)).toMatchObject({ version: '1.5.7', state: 'waiting' });
  });

  it('does not re-create the same waiting version (no change, no write)', () => {
    const record = new AppUpdateNotificationRecord(dir, '1.5.6');
    expect(record.recordFound('1.5.7')).toBe(true);
    record.markRead();
    expect(record.recordFound('1.5.7')).toBe(false);
    expect(record.toNotification(noLink)?.read).toBe(true);
  });

  it('becomes handled at start when the running version changed', () => {
    new AppUpdateNotificationRecord(dir, '1.5.6').recordFound('1.5.7');
    const restarted = new AppUpdateNotificationRecord(dir, '1.5.7', at('2026-10-21T08:00:00.000Z'));
    expect(restarted.toNotification(noLink)).toMatchObject({ state: 'handled', handledVersion: '1.5.7' });
    expect(JSON.parse(fs.readFileSync(file(), 'utf8')).handledAt).toBe('2026-10-21T08:00:00.000Z');
  });

  it('a no-update result removes a waiting record (nothing was updated) and keeps a handled one', () => {
    new AppUpdateNotificationRecord(dir, '1.5.6').recordFound('1.5.7');
    expect(new AppUpdateNotificationRecord(dir, '1.5.6').recordNotAvailable()).toBe(true);
    expect(fs.existsSync(file())).toBe(false);
    new AppUpdateNotificationRecord(dir, '1.5.6').recordFound('1.5.7');
    const handled = new AppUpdateNotificationRecord(dir, '1.5.7');
    expect(handled.recordNotAvailable()).toBe(false);
    expect(handled.toNotification(noLink)?.state).toBe('handled');
  });

  it('clear removes only a handled record; markRead touches only a waiting one', () => {
    const record = new AppUpdateNotificationRecord(dir, '1.5.6');
    record.recordFound('1.5.7');
    expect(record.clear()).toBe(false);
    const restarted = new AppUpdateNotificationRecord(dir, '1.5.7');
    expect(restarted.markRead()).toBe(false);
    expect(restarted.clear()).toBe(true);
    expect(restarted.toNotification(noLink)).toBeNull();
  });

  it('reads a malformed or unknown-shape file as no notification, with a warning', () => {
    fs.writeFileSync(file(), '{oops');
    expect(new AppUpdateNotificationRecord(dir, '1.5.6').toNotification(noLink)).toBeNull();
    fs.writeFileSync(file(), JSON.stringify({ version: '1.5.7', read: 'no' }));
    expect(new AppUpdateNotificationRecord(dir, '1.5.6').toNotification(noLink)).toBeNull();
    expect(loggerMock.warn).toHaveBeenCalledTimes(2);
  });

  it('passes the found version to the release link resolver', () => {
    const record = new AppUpdateNotificationRecord(dir, '1.5.6');
    record.recordFound('1.5.7');
    expect(record.toNotification((version) => `link-${version}`)?.releasePageUrl).toBe('link-1.5.7');
  });
});
