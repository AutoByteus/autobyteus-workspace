import { describe, expect, it } from 'vitest';
import type { NodeServerStatus } from '../../../shared/nodeUpdateContract';
import type { NodeAutoUpdateEntry } from '../../../shared/nodeAutoUpdateTypes';
import {
  decideNodeAutoUpdate,
  isSupersededFailure,
  NODE_AUTO_UPDATE_PENDING_TIMEOUT_MS,
  NODE_DID_NOT_FINISH_REASON,
  reconcileNodeAutoUpdate,
} from '../decideNodeAutoUpdate';

const V = '1.6.0';
const REQUESTED_AT = '2026-11-01T10:00:00.000Z';
const requestedAtMs = Date.parse(REQUESTED_AT);

const older = (overrides: Partial<NodeServerStatus> = {}): NodeServerStatus => ({
  inPlaceUpdate: 'available',
  version: '1.5.0',
  target: { version: V, relation: 'newer' },
  update: { state: 'idle', targetVersion: null, step: null, code: null, message: null },
  ...overrides,
});
const entry = (overrides: Partial<NodeAutoUpdateEntry> = {}): NodeAutoUpdateEntry => ({
  version: V, requestedAt: REQUESTED_AT, outcome: 'PENDING', reason: null, read: false, ...overrides,
});
const update = (state: NonNullable<NodeServerStatus['update']>['state'], extra: Partial<NonNullable<NodeServerStatus['update']>> = {}) =>
  ({ state, targetVersion: V, step: null, code: null, message: null, ...extra });

describe('decideNodeAutoUpdate (DS-003 step 3)', () => {
  it('requests an older node that can update in place with no attempt at the version', () => {
    expect(decideNodeAutoUpdate(older(), V, null)).toBe('request');
  });

  it.each<[string, NodeServerStatus]>([
    ['in-place update unavailable', older({ inPlaceUpdate: 'unavailable' })],
    ['the starter did not answer', older({ inPlaceUpdate: 'error' })],
    ['the same version', older({ version: V, target: { version: V, relation: 'same' } })],
    ['a newer node (no downgrade)', older({ version: '1.7.0', target: { version: V, relation: 'older' } })],
    ['no target relation', older({ target: undefined })],
    ['a target for another version', older({ target: { version: '1.5.9', relation: 'newer' } })],
    ['an update running', older({ update: update('running') })],
    ['an update blocker', older({ updateBlocker: { code: 'RUNS_ACTIVE', message: 'Agents are running.' } })],
  ])('skips: %s', (_name, status) => {
    expect(decideNodeAutoUpdate(status, V, null)).toBe('skip');
  });

  it.each<[NodeAutoUpdateEntry['outcome'], 'request' | 'skip']>([
    ['PENDING', 'skip'],
    ['AUTO_FAILED', 'skip'],
    ['AUTO_UPDATED', 'request'],
  ])('one attempt per version: an entry %s for the version → %s', (outcome, expected) => {
    expect(decideNodeAutoUpdate(older(), V, entry({ outcome }))).toBe(expected);
  });

  it('an attempt at an older version does not block the new one', () => {
    expect(decideNodeAutoUpdate(older(), V, entry({ version: '1.5.5', outcome: 'AUTO_FAILED' }))).toBe('request');
    expect(decideNodeAutoUpdate(older(), V, entry({ version: '1.5.5', outcome: 'PENDING' }))).toBe('request');
  });
});

describe('reconcileNodeAutoUpdate (DS-003 step 2)', () => {
  const soon = requestedAtMs + 60_000;

  it('changes nothing without a pending entry for the version', () => {
    expect(reconcileNodeAutoUpdate(null, older({ version: V }), V, soon)).toBeNull();
    expect(reconcileNodeAutoUpdate(entry({ outcome: 'AUTO_FAILED' }), older({ version: V }), V, soon)).toBeNull();
    expect(reconcileNodeAutoUpdate(entry({ version: '1.5.5' }), older({ version: V }), V, soon)).toBeNull();
  });

  it('the node runs the version with no update running → AUTO_UPDATED, unread', () => {
    expect(reconcileNodeAutoUpdate(entry({ read: true }), older({ version: V, update: update('idle', { targetVersion: null }) }), V, soon))
      .toEqual(entry({ outcome: 'AUTO_UPDATED', reason: null, read: false }));
  });

  it('the update succeeded for the version → AUTO_UPDATED', () => {
    expect(reconcileNodeAutoUpdate(entry(), older({ update: update('succeeded') }), V, soon)?.outcome).toBe('AUTO_UPDATED');
  });

  it('a node in its trial (on the version, update still running) is not updated yet', () => {
    expect(reconcileNodeAutoUpdate(entry(), older({ version: V, update: update('running', { step: 'trial' }) }), V, soon)).toBeNull();
  });

  it.each([
    ['failed with a message', update('failed', { code: 'TRIAL_FAILED', message: 'The new version did not start; rolled back.' }), 'The new version did not start; rolled back.'],
    ['failed with only a code', update('failed', { code: 'VERIFY_FAILED' }), 'VERIFY_FAILED'],
    ['refused', update('refused', { code: 'SIGNATURE', message: 'The package signature is not valid.' }), 'The package signature is not valid.'],
    ['failed with nothing said', update('failed'), 'The node update failed.'],
  ])('the update %s for the version → AUTO_FAILED with the node reason', (_name, nodeUpdate, reason) => {
    expect(reconcileNodeAutoUpdate(entry(), older({ update: nodeUpdate }), V, soon))
      .toEqual(entry({ outcome: 'AUTO_FAILED', reason, read: false }));
  });

  it('a failure of another version leaves the entry pending', () => {
    expect(reconcileNodeAutoUpdate(entry(), older({ update: update('failed', { targetVersion: '1.5.5' }) }), V, soon)).toBeNull();
  });

  it('30 minutes with no update running and not on the version → AUTO_FAILED "did not finish"', () => {
    const late = requestedAtMs + NODE_AUTO_UPDATE_PENDING_TIMEOUT_MS;
    expect(reconcileNodeAutoUpdate(entry(), older(), V, late - 1)).toBeNull();
    expect(reconcileNodeAutoUpdate(entry(), older(), V, late)).toEqual(entry({ outcome: 'AUTO_FAILED', reason: NODE_DID_NOT_FINISH_REASON }));
  });

  it('a running update is never timed out', () => {
    expect(reconcileNodeAutoUpdate(entry(), older({ update: update('running') }), V, requestedAtMs + 2 * NODE_AUTO_UPDATE_PENDING_TIMEOUT_MS)).toBeNull();
  });
});

describe('isSupersededFailure (autobyteus-412, FU-003)', () => {
  const failed = entry({ outcome: 'AUTO_FAILED', reason: 'No server package was published for 1.6.0 (linux-arm64).', read: true });
  const runsV = (overrides: Partial<NodeServerStatus> = {}): NodeServerStatus =>
    older({ version: V, target: { version: V, relation: 'same' }, ...overrides });

  it.each<[string, NodeServerStatus]>([
    ['RUN-02: the node runs V after its own update succeeded', runsV({ update: update('succeeded') })],
    ['the node runs V, no update on record (a new image)', runsV({ update: update('idle', { targetVersion: null }) })],
    ['the node runs a newer version (AC-002)', older({ version: '1.7.0', target: { version: V, relation: 'older' } })],
    ['the node runs V, a later update of another version failed', runsV({ update: update('failed', { targetVersion: '1.6.1' }) })],
    ['the node runs V and gives no update state', runsV({ update: undefined })],
  ])('cleared: %s', (_name, status) => {
    expect(isSupersededFailure(failed, status)).toBe(true);
  });

  it.each<[string, NodeAutoUpdateEntry | null, NodeServerStatus]>([
    ['the node is still older than V (AC-004)', failed, older()],
    ['the node runs V in its trial (update running; it can roll back)', failed, runsV({ update: update('running', { step: 'trial' }) })],
    ['AR-003: a pass of a desktop at V+1 (target V+1, node runs V+1) leaves the V failure',
      failed, older({ version: '1.7.0', target: { version: '1.7.0', relation: 'same' } })],
    ['no target in the answer', failed, runsV({ target: undefined })],
    ['no entry', null, runsV()],
    ['a pending entry', entry(), runsV()],
    ['an automatic success', entry({ outcome: 'AUTO_UPDATED' }), runsV()],
  ])('not cleared: %s', (_name, current, status) => {
    expect(isSupersededFailure(current, status)).toBe(false);
  });
});
