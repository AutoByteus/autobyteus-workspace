import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeAutoUpdateRecord } from '../nodeAutoUpdateRecord';

const { loggerMock } = vi.hoisted(() => ({ loggerMock: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../../logger', () => ({ logger: loggerMock }));

let userData = '';
const filePath = (): string => path.join(userData, 'node-auto-updates.json');
const entry = { version: '1.6.0', requestedAt: '2026-11-01T10:00:00.000Z', outcome: 'AUTO_UPDATED' as const, reason: null, read: false };

describe('NodeAutoUpdateRecord', () => {
  beforeEach(() => {
    userData = fs.mkdtempSync(path.join(os.tmpdir(), 'node-auto-update-record-'));
    loggerMock.warn.mockClear();
  });
  afterEach(() => fs.rmSync(userData, { recursive: true, force: true }));

  it('starts empty without a file, quietly', () => {
    expect(new NodeAutoUpdateRecord(userData).all()).toEqual({});
    expect(loggerMock.warn).not.toHaveBeenCalled();
  });

  it.each([
    ['not JSON', '{oops'],
    ['an unknown shape', JSON.stringify({ entries: [] })],
    ['no entries', JSON.stringify({ version: 1 })],
  ])('starts empty with a warning when the file is %s', (_name, content) => {
    fs.writeFileSync(filePath(), content);
    expect(new NodeAutoUpdateRecord(userData).all()).toEqual({});
    expect(loggerMock.warn).toHaveBeenCalledOnce();
  });

  it('drops invalid entries and reads optional fields tolerantly', () => {
    fs.writeFileSync(filePath(), JSON.stringify({ entries: {
      good: { version: '1.6.0', requestedAt: entry.requestedAt, outcome: 'AUTO_FAILED', reason: 7, read: 'yes' },
      badOutcome: { ...entry, outcome: 'DONE' },
      noVersion: { ...entry, version: '' },
      notObject: 3,
    } }));
    expect(new NodeAutoUpdateRecord(userData).all()).toEqual({
      good: { version: '1.6.0', requestedAt: entry.requestedAt, outcome: 'AUTO_FAILED', reason: null, read: false },
    });
  });

  it('writes atomically and reads back what it wrote', () => {
    const record = new NodeAutoUpdateRecord(userData);
    record.set('node-a', entry);
    expect(fs.readdirSync(userData)).toEqual(['node-auto-updates.json']);
    expect(new NodeAutoUpdateRecord(userData).get('node-a')).toEqual(entry);
  });

  it('marks an outcome read once; a pending entry has nothing to mark', () => {
    const record = new NodeAutoUpdateRecord(userData);
    record.set('node-a', entry);
    record.set('node-b', { ...entry, outcome: 'PENDING' });
    expect(record.markRead('node-a')).toBe(true);
    expect(record.markRead('node-a')).toBe(false);
    expect(record.markRead('node-b')).toBe(false);
    expect(record.markRead('missing')).toBe(false);
    expect(new NodeAutoUpdateRecord(userData).get('node-a')?.read).toBe(true);
  });

  it('drops the entries of nodes that are no longer registered', () => {
    const record = new NodeAutoUpdateRecord(userData);
    record.set('node-a', entry);
    record.set('node-b', entry);
    expect(record.retain(new Set(['node-a', 'node-b']))).toBe(false);
    expect(record.retain(new Set(['node-a']))).toBe(true);
    expect(Object.keys(new NodeAutoUpdateRecord(userData).all())).toEqual(['node-a']);
  });
});
