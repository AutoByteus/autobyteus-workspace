import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NodeEntry } from '../../../types/node';
import type { NodeServerStatus } from '../../../shared/nodeUpdateContract';
import { NodeAutoUpdateRecord } from '../nodeAutoUpdateRecord';
import type { NodeUpdateClient, NodeUpdateRequestResult } from '../nodeUpdateClient';
import {
  NODE_AUTO_UPDATE_FIRST_PASS_MS,
  NODE_AUTO_UPDATE_FOLLOW_INTERVAL_MS,
  NODE_AUTO_UPDATE_FOLLOW_MAX_MS,
  NODE_AUTO_UPDATE_PASS_INTERVAL_MS,
  NodeAutoUpdater,
} from '../nodeAutoUpdater';

vi.mock('../../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const V = '1.6.0';
const node = (id: string, overrides: Partial<NodeEntry> = {}): NodeEntry => ({
  id, name: id, baseUrl: `http://${id}.test:8000`, nodeType: 'remote', autoUpdate: true,
  createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z', ...overrides,
});
const olderStatus = (overrides: Partial<NodeServerStatus> = {}): NodeServerStatus => ({
  inPlaceUpdate: 'available', version: '1.5.0', target: { version: V, relation: 'newer' },
  update: { state: 'idle', targetVersion: null, step: null, code: null, message: null }, ...overrides,
});
const running = (version = '1.5.0'): NodeServerStatus =>
  olderStatus({ version, update: { state: 'running', targetVersion: V, step: 'download', code: null, message: null } });
const updated = (): NodeServerStatus =>
  olderStatus({ version: V, target: { version: V, relation: 'same' }, update: { state: 'succeeded', targetVersion: V, step: null, code: null, message: null } });

let userData = '';
let nodes: NodeEntry[] = [];
/** What each node answers next (by base URL); a function is called at each ask. */
let answers: Record<string, NodeServerStatus | null | (() => NodeServerStatus | null | Promise<NodeServerStatus | null>)> = {};
let postResult: NodeUpdateRequestResult = { kind: 'accepted' };
const getStatus = vi.fn<NodeUpdateClient['getStatus']>();
const requestUpdate = vi.fn<NodeUpdateClient['requestUpdate']>();
const onChange = vi.fn();
let record: NodeAutoUpdateRecord;

function createUpdater(isPackaged = true): NodeAutoUpdater {
  return new NodeAutoUpdater({
    getNodes: () => nodes, appVersion: V, isPackaged, record, client: { getStatus, requestUpdate }, onChange,
  });
}
const getsFor = (id: string): number => getStatus.mock.calls.filter(([baseUrl]) => baseUrl === node(id).baseUrl).length;
const flush = async (): Promise<void> => { await vi.advanceTimersByTimeAsync(0); };

describe('NodeAutoUpdater (autobyteus-356, DS-003)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T10:00:00.000Z'));
    userData = fs.mkdtempSync(path.join(os.tmpdir(), 'node-auto-updater-'));
    record = new NodeAutoUpdateRecord(userData);
    // The embedded entry never updates automatically, even with the field (the loader drops it; this checks again).
    nodes = [node('embedded-local', { nodeType: 'embedded', autoUpdate: true }), node('a')];
    answers = { [node('a').baseUrl]: olderStatus() };
    postResult = { kind: 'accepted' };
    getStatus.mockReset().mockImplementation(async (baseUrl) => {
      const answer = answers[baseUrl];
      return typeof answer === 'function' ? answer() : answer ?? null;
    });
    requestUpdate.mockReset().mockImplementation(async () => postResult);
    onChange.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(userData, { recursive: true, force: true });
  });

  it('does nothing in an unpackaged build', async () => {
    createUpdater(false).start();
    await vi.advanceTimersByTimeAsync(3 * NODE_AUTO_UPDATE_PASS_INTERVAL_MS);
    expect(getStatus).not.toHaveBeenCalled();
  });

  it('first pass after 2 minutes: an older node with the switch on is asked to update to the desktop version (AC-004)', async () => {
    nodes.push(node('off', { autoUpdate: undefined }));
    answers[node('off').baseUrl] = olderStatus();
    createUpdater().start();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FIRST_PASS_MS - 1);
    expect(getStatus).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(getStatus).toHaveBeenCalledWith(node('a').baseUrl, V);
    expect(requestUpdate).toHaveBeenCalledExactlyOnceWith(node('a').baseUrl, V);
    expect(record.get('a')).toEqual({ version: V, requestedAt: '2026-11-01T10:02:00.000Z', outcome: 'PENDING', reason: null, read: false });
    expect(onChange).toHaveBeenLastCalledWith({ a: record.get('a') });
  });

  it.each<[string, NodeServerStatus]>([
    ['the same version', olderStatus({ version: V, target: { version: V, relation: 'same' } })],
    ['a newer version', olderStatus({ version: '1.7.0', target: { version: V, relation: 'older' } })],
    ['in-place update unavailable', olderStatus({ inPlaceUpdate: 'unavailable' })],
  ])('a node at %s gets no request (AC-004)', async (_name, status) => {
    answers[node('a').baseUrl] = status;
    createUpdater().start();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FIRST_PASS_MS);
    expect(getStatus).toHaveBeenCalledOnce();
    expect(requestUpdate).not.toHaveBeenCalled();
    expect(record.all()).toEqual({});
  });

  it('follows an accepted update every 10 s through the restart and records AUTO_UPDATED (AC-004)', async () => {
    createUpdater().start();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FIRST_PASS_MS);
    answers[node('a').baseUrl] = running();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FOLLOW_INTERVAL_MS);
    expect(getsFor('a')).toBe(2);
    answers[node('a').baseUrl] = null; // restarting: no answer, expected
    await vi.advanceTimersByTimeAsync(3 * NODE_AUTO_UPDATE_FOLLOW_INTERVAL_MS);
    expect(record.get('a')?.outcome).toBe('PENDING');
    answers[node('a').baseUrl] = running(V); // the trial on the new version
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FOLLOW_INTERVAL_MS);
    expect(record.get('a')?.outcome).toBe('PENDING');
    answers[node('a').baseUrl] = updated();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FOLLOW_INTERVAL_MS);

    expect(record.get('a')).toMatchObject({ outcome: 'AUTO_UPDATED', read: false, reason: null });
    const asked = getsFor('a');
    await vi.advanceTimersByTimeAsync(5 * NODE_AUTO_UPDATE_FOLLOW_INTERVAL_MS);
    expect(getsFor('a')).toBe(asked);
    expect(requestUpdate).toHaveBeenCalledOnce();
  });

  it('a trial that rolls back records AUTO_FAILED with the node reason and is not tried again for that version (AC-005)', async () => {
    createUpdater().start();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FIRST_PASS_MS);
    answers[node('a').baseUrl] = olderStatus({
      update: { state: 'failed', targetVersion: V, step: 'trial', code: 'TRIAL_FAILED', message: 'The new version did not start; rolled back to 1.5.0.' },
    });
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FOLLOW_INTERVAL_MS);
    expect(record.get('a')).toMatchObject({ outcome: 'AUTO_FAILED', reason: 'The new version did not start; rolled back to 1.5.0.' });

    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_PASS_INTERVAL_MS);
    expect(getsFor('a')).toBeGreaterThan(2);
    expect(requestUpdate).toHaveBeenCalledOnce();
  });

  it('a follow ends after 15 minutes with the entry pending; a later pass finds it unfinished and does not repeat', async () => {
    createUpdater().start();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FIRST_PASS_MS);
    answers[node('a').baseUrl] = running();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FOLLOW_MAX_MS + NODE_AUTO_UPDATE_FOLLOW_INTERVAL_MS);
    const asked = getsFor('a');
    await vi.advanceTimersByTimeAsync(10 * NODE_AUTO_UPDATE_FOLLOW_INTERVAL_MS);
    expect(getsFor('a')).toBe(asked);
    expect(record.get('a')?.outcome).toBe('PENDING');

    // The node stopped updating without reaching the version; the next hourly pass reconciles it (30 minutes passed).
    answers[node('a').baseUrl] = olderStatus();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_PASS_INTERVAL_MS);
    expect(record.get('a')).toMatchObject({ outcome: 'AUTO_FAILED', reason: 'The node did not finish the update.' });
    expect(requestUpdate).toHaveBeenCalledOnce();
  });

  it('a node being followed is skipped by a pass', async () => {
    const updater = createUpdater();
    updater.start();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FIRST_PASS_MS);
    answers[node('a').baseUrl] = running();
    const asked = getsFor('a');
    await updater.runPass();
    expect(getsFor('a')).toBe(asked);
  });

  it.each<[string, NodeUpdateRequestResult]>([
    ['refused before the start (409)', { kind: 'refused', code: 'UPDATE_RUNNING', message: 'An update is running.' }],
    ['not delivered (network error or timeout)', { kind: 'not-delivered', message: 'The operation was aborted due to timeout' }],
  ])('a request %s changes nothing and is tried again at the next pass', async (_name, result) => {
    postResult = result;
    createUpdater().start();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FIRST_PASS_MS);
    expect(requestUpdate).toHaveBeenCalledOnce();
    expect(record.all()).toEqual({});
    expect(onChange).not.toHaveBeenCalled();

    postResult = { kind: 'accepted' };
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_PASS_INTERVAL_MS);
    expect(requestUpdate).toHaveBeenCalledTimes(2);
    expect(record.get('a')?.outcome).toBe('PENDING');
  });

  it('an unreachable node gets no request and is tried again later (AC-005)', async () => {
    answers[node('a').baseUrl] = null;
    createUpdater().start();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FIRST_PASS_MS);
    expect(requestUpdate).not.toHaveBeenCalled();
    answers[node('a').baseUrl] = olderStatus();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_PASS_INTERVAL_MS);
    expect(requestUpdate).toHaveBeenCalledOnce();
  });

  it('passes never overlap, and nodes are checked one after another', async () => {
    nodes.push(node('b'));
    let answerA: (status: NodeServerStatus | null) => void = () => undefined;
    answers[node('a').baseUrl] = () => new Promise((resolve) => { answerA = resolve; });
    answers[node('b').baseUrl] = olderStatus({ version: V, target: { version: V, relation: 'same' } });
    const updater = createUpdater();
    const first = updater.runPass();
    expect(updater.runPass()).toBe(first);
    await flush();
    expect(getsFor('a')).toBe(1);
    expect(getsFor('b')).toBe(0);
    answerA(null);
    await first;
    expect(getsFor('b')).toBe(1);
  });

  it('a node whose switch turns on is checked at once', async () => {
    nodes[1] = node('a', { autoUpdate: undefined });
    const updater = createUpdater();
    updater.start();
    nodes = [nodes[0]!, node('a')];
    updater.nodesChanged();
    await flush();
    expect(requestUpdate).toHaveBeenCalledExactlyOnceWith(node('a').baseUrl, V);
  });

  it('a switch turned off while the node is asked sends no request', async () => {
    answers[node('a').baseUrl] = () => { nodes = [nodes[0]!, node('a', { autoUpdate: undefined })]; return olderStatus(); };
    await createUpdater().runPass();
    expect(getStatus).toHaveBeenCalledOnce();
    expect(requestUpdate).not.toHaveBeenCalled();
  });

  it('a removed node loses its entry and its follow', async () => {
    const updater = createUpdater();
    updater.start();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FIRST_PASS_MS);
    expect(record.get('a')).not.toBeNull();
    nodes = [nodes[0]!];
    updater.nodesChanged();
    expect(record.all()).toEqual({});
    expect(onChange).toHaveBeenLastCalledWith({});
    const asked = getStatus.mock.calls.length;
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FOLLOW_MAX_MS);
    expect(getStatus.mock.calls.length).toBe(asked);
  });

  it('412 RUN-02: a pass clears AUTO_FAILED for V once the node runs V (updated another way), and requests nothing (AC-001)', async () => {
    record.set('a', { version: V, requestedAt: '2026-11-01T09:00:00.000Z', outcome: 'AUTO_FAILED', reason: 'No server package was published for 1.6.0 (linux-arm64).', read: true });
    answers[node('a').baseUrl] = updated();
    await createUpdater().runPass();
    expect(record.get('a')).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith({});
    expect(requestUpdate).not.toHaveBeenCalled();
  });

  it('412 AC-004: a pass leaves AUTO_FAILED for V while the node is still older, and does not request V again', async () => {
    record.set('a', { version: V, requestedAt: '2026-11-01T09:00:00.000Z', outcome: 'AUTO_FAILED', reason: 'rolled back', read: true });
    await createUpdater().runPass();
    expect(record.get('a')?.outcome).toBe('AUTO_FAILED');
    expect(onChange).not.toHaveBeenCalled();
    expect(requestUpdate).not.toHaveBeenCalled();
  });

  it('412 AR-003: a pass of a desktop that moved past the failed version neither clears that failure nor needs to', async () => {
    const failedEarlier = { version: '1.5.5', requestedAt: '2026-11-01T09:00:00.000Z', outcome: 'AUTO_FAILED' as const, reason: 'x', read: true };
    record.set('a', failedEarlier);
    answers[node('a').baseUrl] = updated(); // the node already runs the desktop's V (> 1.5.5); asked ?target=V
    await createUpdater().runPass();
    expect(getStatus).toHaveBeenCalledExactlyOnceWith(node('a').baseUrl, V);
    expect(record.get('a')).toEqual(failedEarlier);
    expect(requestUpdate).not.toHaveBeenCalled();
  });

  describe('recheckFailure (412 DS-002)', () => {
    const failed = (version = V) => ({ version, requestedAt: '2026-11-01T09:00:00.000Z', outcome: 'AUTO_FAILED' as const, reason: 'No package.', read: true });

    it('(b) a switch-off node: asks ?target=<entry version>, removes the failure, broadcasts, never requests an update', async () => {
      nodes = [nodes[0]!, node('a', { autoUpdate: undefined })];
      record.set('a', failed('1.5.9'));
      answers[node('a').baseUrl] = olderStatus({ version: '1.5.9', target: { version: '1.5.9', relation: 'same' } });
      await createUpdater(false).recheckFailure('a'); // the switch and the packaged flag are not read
      expect(getStatus).toHaveBeenCalledExactlyOnceWith(node('a').baseUrl, '1.5.9');
      expect(record.get('a')).toBeNull();
      expect(onChange).toHaveBeenLastCalledWith({});
      expect(requestUpdate).not.toHaveBeenCalled();
    });

    it('a node that runs a newer version than the failed one is cleared too (AC-002)', async () => {
      record.set('a', failed('1.5.9'));
      answers[node('a').baseUrl] = olderStatus({ version: V, target: { version: '1.5.9', relation: 'older' } });
      await createUpdater().recheckFailure('a');
      expect(record.get('a')).toBeNull();
    });

    it.each<[string, NodeServerStatus | null]>([
      ['still older', olderStatus()],
      ['in its trial', olderStatus({ version: V, target: { version: V, relation: 'same' }, update: { state: 'running', targetVersion: V, step: 'trial', code: null, message: null } })],
      ['not reachable', null],
    ])('a node %s keeps its failure, with no broadcast', async (_name, status) => {
      record.set('a', failed());
      answers[node('a').baseUrl] = status;
      await createUpdater().recheckFailure('a');
      expect(record.get('a')?.outcome).toBe('AUTO_FAILED');
      expect(onChange).not.toHaveBeenCalled();
      expect(requestUpdate).not.toHaveBeenCalled();
    });

    it.each<[string, () => void]>([
      ['a pending entry', () => record.set('a', { ...failed(), outcome: 'PENDING' })],
      ['an automatic success', () => record.set('a', { ...failed(), outcome: 'AUTO_UPDATED' })],
      ['no entry', () => undefined],
      ['an entry whose node is gone', () => { record.set('gone', failed()); }],
    ])('does not ask the node for %s', async (_name, arrange) => {
      arrange();
      const updater = createUpdater();
      await updater.recheckFailure('a');
      await updater.recheckFailure('gone');
      expect(getStatus).not.toHaveBeenCalled();
    });

    it('does nothing after shutdown, or once stopped while it waits for the node', async () => {
      record.set('a', failed());
      let answer: (status: NodeServerStatus | null) => void = () => undefined;
      answers[node('a').baseUrl] = () => new Promise((resolve) => { answer = resolve; });
      const updater = createUpdater();
      const recheck = updater.recheckFailure('a');
      await flush();
      updater.stop();
      answer(updated());
      await recheck;
      expect(record.get('a')?.outcome).toBe('AUTO_FAILED');
      await updater.recheckFailure('a');
      expect(getStatus).toHaveBeenCalledOnce();
    });

    it('(c) AR-002: a pass that starts while a recheck waits does nothing for that node; a PENDING stored meanwhile is kept', async () => {
      nodes.push(node('b'));
      record.set('a', failed());
      let answer: (status: NodeServerStatus | null) => void = () => undefined;
      answers[node('a').baseUrl] = () => new Promise((resolve) => { answer = resolve; });
      const updater = createUpdater();
      const recheck = updater.recheckFailure('a');
      await flush();
      expect(getsFor('a')).toBe(1);

      await updater.runPass(); // a is held by the recheck; b is checked as usual
      expect(getsFor('a')).toBe(1);
      expect(getsFor('b')).toBe(1);

      // Another writer stored a new attempt for this node while the recheck waited.
      const pending = { version: '1.6.1', requestedAt: '2026-11-01T10:00:00.000Z', outcome: 'PENDING' as const, reason: null, read: false };
      record.set('a', pending);
      answer(updated());
      await recheck;
      expect(record.get('a')).toEqual(pending);
    });

    it('a second recheck while the first waits is dropped (the guard), and the guard is released after the answer', async () => {
      record.set('a', failed());
      let answer: (status: NodeServerStatus | null) => void = () => undefined;
      answers[node('a').baseUrl] = () => new Promise((resolve) => { answer = resolve; });
      const updater = createUpdater();
      const first = updater.recheckFailure('a');
      await flush();
      await updater.recheckFailure('a');
      expect(getsFor('a')).toBe(1);
      answer(null);
      await first;
      answers[node('a').baseUrl] = updated();
      await updater.recheckFailure('a');
      expect(getsFor('a')).toBe(2);
      expect(record.get('a')).toBeNull();
    });
  });

  it('stops its passes and follows at shutdown', async () => {
    const updater = createUpdater();
    updater.start();
    await vi.advanceTimersByTimeAsync(NODE_AUTO_UPDATE_FIRST_PASS_MS);
    updater.stop();
    const asked = getStatus.mock.calls.length;
    await vi.advanceTimersByTimeAsync(2 * NODE_AUTO_UPDATE_PASS_INTERVAL_MS);
    expect(getStatus.mock.calls.length).toBe(asked);
  });
});
