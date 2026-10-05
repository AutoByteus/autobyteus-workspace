import { expect, it } from 'vitest';
import { createRootExecutionPhysicalScope } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import { releaseGenerationFixture } from '../../fixtures/task-release-generation-fixtures.js';
import { testAgentNode, testAgentTeamNode } from '../../fixtures/current-team-run-fixtures.js';

it.each(['success', 'failed-first', 'rejecting-second'] as const)('starts all acquired private members before slow first drain (%s), retries only exact failed controls', async mode => {
  let unblock!: () => void;
  const slow = new Promise<void>(resolve => { unblock = resolve; }), calls: string[] = [];
  let fail = true;
  const f = releaseGenerationFixture('agent_team', async id => {
    calls.push(id);
    if (id === 'first') await slow;
    if (fail && ((mode === 'failed-first' && id === 'first') || (mode === 'rejecting-second' && id === 'second'))) {
      throw new Error(`Controlled exact ${id} abort failure`);
    }
    return { kind: 'aborted' };
  });
  const node = testAgentTeamNode({ address: '/', teamRunId: 'root', coordinatorAddress: '/First',
    children: [testAgentNode('/First', { agentRunId: 'first' }), testAgentNode('/Second', { agentRunId: 'second' })] });
  const op = f.factory.beginMaterialization({ physicalScope: createRootExecutionPhysicalScope({ root: f.root, ancestorTeamRunIds: [] }),
    teamNode: node, handoffs: [], activationMode: 'fresh', callbacks: f.callbacks, prepareConfiguredAgents: true });
  const prepared = await op.prepare();
  expect(f.acquired.map(r => r.runId)).toEqual(['first', 'second']); expect(f.active.size).toBe(0);
  const release = op.release(); let settled = false;
  void release.then(() => { settled = true; }, () => { settled = true; });
  try {
    for (let n = 0; n < 30; n++) await Promise.resolve();
    expect(calls).toEqual(['first', 'second']); expect(settled).toBe(false);
  } finally { unblock(); }
  if (mode === 'success') expect(await release).toEqual({ accepted: true });
  else await expect(release).rejects.toThrow('Team private members could not all be released');
  fail = false;
  expect(await op.release()).toEqual({ accepted: true });
  expect(calls).toEqual(mode === 'success' ? ['first', 'second'] : ['first', 'second', mode === 'failed-first' ? 'first' : 'second']);
  expect(await op.release()).toEqual({ accepted: true });
  expect(f.acquired).toHaveLength(2); expect(f.active.size).toBe(0);
  expect(() => prepared.commitAfterDurability()).toThrow('not publishable');
  await expect(op.prepare()).rejects.toThrow('cancelled');
});

it('retains acquired second member after preparation/binding rejection and initiates its abort despite a slow failing first member', async () => {
  let unblock!: () => void, fail = true;
  const slow = new Promise<void>(resolve => { unblock = resolve; }), calls: string[] = [];
  const f = releaseGenerationFixture('agent_team', async id => {
    calls.push(id);
    if (id === 'first') { await slow; if (fail) throw Error('Controlled first cleanup failure'); }
    return { kind: 'aborted' };
  }, 'second');
  const node = testAgentTeamNode({ address: '/', teamRunId: 'root', coordinatorAddress: '/First',
    children: [testAgentNode('/First', { agentRunId: 'first' }), testAgentNode('/Second', { agentRunId: 'second' })] });
  const op = f.factory.beginMaterialization({ physicalScope: createRootExecutionPhysicalScope({ root: f.root, ancestorTeamRunIds: [] }),
    teamNode: node, handoffs: [], activationMode: 'fresh', callbacks: f.callbacks, prepareConfiguredAgents: true });
  await expect(op.prepare()).rejects.toThrow('valid provider conversation identity');
  expect(f.acquired.map(r => r.runId)).toEqual(['first', 'second']);
  const release = op.release();
  const rejected = expect(release).rejects.toThrow('Team private members could not all be released');
  try {
    for (let n = 0; n < 30; n++) await Promise.resolve();
    expect(calls).toEqual(['first', 'second']); expect(f.active.size).toBe(0);
  } finally { unblock(); }
  await rejected; fail = false;
  expect(await op.release()).toEqual({ accepted: true });
  expect(await op.release()).toEqual({ accepted: true });
  expect(calls).toEqual(['first', 'second', 'first']); expect(f.acquired).toHaveLength(2);
  expect(f.active.size).toBe(0); await expect(op.prepare()).rejects.toThrow('cancelled');
});
