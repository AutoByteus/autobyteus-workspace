import { expect, it, vi } from 'vitest';
import { AgentInputUserMessage } from 'autobyteus-ts/agent/message/agent-input-user-message.js';
import { AgentRunEventType } from '../../../src/agent-execution/domain/agent-run-event.js';
import { createRootExecutionPhysicalScope } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import { activateTeamMembers, releaseGenerationFixture } from '../../fixtures/task-release-generation-fixtures.js';
import { testAgentNode, testAgentTeamNode } from '../../fixtures/current-team-run-fixtures.js';

// Team preparation is scope-only: members are acquired only by their first work, after publication.
const twoMemberTeam = () => testAgentTeamNode({ address: '/', teamRunId: 'root', coordinatorAddress: '/First',
  children: [testAgentNode('/First', { agentRunId: 'first' }), testAgentNode('/Second', { agentRunId: 'second' })] });

it.each(['success', 'failed-first', 'rejecting-second'] as const)('starts every started member stop before a slow first drain (%s), retries only exact failed controls', async mode => {
  let unblock!: () => void;
  const slow = new Promise<void>(resolve => { unblock = resolve; }), calls: string[] = [];
  let fail = true;
  const f = releaseGenerationFixture('agent_team');
  f.manager.releaseExactRun = vi.fn(async (run: any) => {
    calls.push(run.runId);
    if (run.runId === 'first') await slow;
    if (fail && ((mode === 'failed-first' && run.runId === 'first') || (mode === 'rejecting-second' && run.runId === 'second'))) {
      throw new Error(`Controlled exact ${run.runId} stop failure`);
    }
    return f.stop(run);
  });
  const op = f.factory.beginMaterialization({ physicalScope: createRootExecutionPhysicalScope({ root: f.root, ancestorTeamRunIds: [] }),
    teamNode: twoMemberTeam(), handoffs: [], activationMode: 'fresh', callbacks: f.callbacks });
  const prepared = await op.prepare();
  expect(f.acquired).toEqual([]);
  prepared.commitAfterDurability();
  await activateTeamMembers(prepared.teamRun, ['first', 'second']);
  expect(f.acquired.map(r => r.runId)).toEqual(['first', 'second']); expect(f.active.size).toBe(2);
  const release = op.release(); let settled = false;
  void release.then(() => { settled = true; }, () => { settled = true; });
  try {
    for (let n = 0; n < 30; n++) await Promise.resolve();
    expect(calls).toEqual(['first', 'second']); expect(settled).toBe(false);
  } finally { unblock(); }
  if (mode === 'success') expect(await release).toEqual({ accepted: true });
  else await expect(release).rejects.toThrow('Owned Team exact release failed');
  fail = false;
  expect(await op.release()).toEqual({ accepted: true });
  expect(calls).toEqual(mode === 'success' ? ['first', 'second'] : ['first', 'second', mode === 'failed-first' ? 'first' : 'second']);
  expect(await op.release()).toEqual({ accepted: true });
  expect(f.acquired).toHaveLength(2); expect(f.active.size).toBe(0);
  expect(() => prepared.commitAfterDurability()).toThrow('not publishable');
  await expect(op.prepare()).rejects.toThrow('cancelled');
});

it('a member whose first-work activation fails releases its own acquired run and leaves started teammates running (AC-004)', async () => {
  const aborted: string[] = [];
  const f = releaseGenerationFixture('agent_team', async id => { aborted.push(id); return { kind: 'aborted' }; }, 'second');
  f.providerEvents.subscribe = (run, listener) => {
    listener({ eventType: AgentRunEventType.AGENT_STATUS, runId: run.runId, payload: { status: 'idle' }, statusHint: 'IDLE' });
    return () => undefined;
  };
  const op = f.factory.beginMaterialization({ physicalScope: createRootExecutionPhysicalScope({ root: f.root, ancestorTeamRunIds: [] }),
    teamNode: twoMemberTeam(), handoffs: [], activationMode: 'fresh', callbacks: f.callbacks });
  const prepared = await op.prepare();
  prepared.commitAfterDurability();
  await activateTeamMembers(prepared.teamRun, ['first']);
  const failed = await prepared.teamRun.postMessage(new AgentInputUserMessage('Handoff to second'), 'second');
  expect(failed).toMatchObject({ accepted: false, agentRunId: 'second' });
  expect(failed.message).toContain('valid provider conversation identity');
  expect(f.acquired.map(r => r.runId)).toEqual(['first', 'second']);
  expect(aborted).toEqual(['second']);
  expect([...f.active.keys()]).toEqual(['first']);
  const statuses = new Map(prepared.teamRun.getLeafAgentStatusSnapshots().map(s => [s.execution.agentRunId, s.details.status]));
  expect(statuses.get('first')).toBe('idle');
  expect(statuses.get('second')).toBe('error');
  expect(f.callbacks.publishAgentEvent).toHaveBeenCalledWith(expect.objectContaining({ agentRunId: 'second' }),
    expect.objectContaining({ kind: 'readiness_failure' }));
  expect(await op.release()).toEqual({ accepted: true });
  expect(f.active.size).toBe(0); expect(aborted).toEqual(['second']);
});
