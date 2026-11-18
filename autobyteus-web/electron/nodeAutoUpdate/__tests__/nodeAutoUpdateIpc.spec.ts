import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NODE_AUTO_UPDATE_IPC_RECHECK } from '../../../shared/nodeAutoUpdateTypes';
import { registerNodeAutoUpdateIpc } from '../nodeAutoUpdateIpc';
import { NodeAutoUpdateRecord } from '../nodeAutoUpdateRecord';

vi.mock('../../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

/** autobyteus-412: the window's recheck is only a nudge into the main process; it carries an entry ID and nothing else. */
describe('registerNodeAutoUpdateIpc recheck', () => {
  let userData = '';
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
  const recheck = vi.fn();
  const onChange = vi.fn();
  let record: NodeAutoUpdateRecord;

  beforeEach(() => {
    userData = fs.mkdtempSync(path.join(os.tmpdir(), 'node-auto-update-ipc-'));
    record = new NodeAutoUpdateRecord(userData);
    record.set('remote-1', { version: '1.6.0', requestedAt: '2026-11-01T10:00:00.000Z', outcome: 'AUTO_FAILED', reason: 'x', read: true });
    handlers.clear();
    recheck.mockReset();
    onChange.mockReset();
    registerNodeAutoUpdateIpc({ handle: (channel, handler) => { handlers.set(channel, handler as never); } }, record, onChange, recheck);
  });
  afterEach(() => fs.rmSync(userData, { recursive: true, force: true }));

  it('forwards a string entry ID and returns nothing; the record is left to the updater', () => {
    expect(handlers.get(NODE_AUTO_UPDATE_IPC_RECHECK)!({}, 'remote-1')).toBeUndefined();
    expect(recheck).toHaveBeenCalledExactlyOnceWith('remote-1');
    expect(record.get('remote-1')?.outcome).toBe('AUTO_FAILED');
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([[undefined], [7], [{ entryId: 'remote-1' }]])('ignores a non-string argument (%j)', (argument) => {
    handlers.get(NODE_AUTO_UPDATE_IPC_RECHECK)!({}, argument);
    expect(recheck).not.toHaveBeenCalled();
  });
});
