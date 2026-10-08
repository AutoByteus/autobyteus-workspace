import { describe, expect, it } from 'vitest';
import { AgentInputUserMessage } from 'autobyteus-ts/agent/message/agent-input-user-message.js';
import { RootTaskAgentResourceScope } from '../../../src/agent-collaboration/execution/task/root-task-agent-resource-scope.js';
import { RootTaskExecutionLifecycle } from '../../../src/agent-collaboration/execution/task/root-task-execution-lifecycle.js';
import { createRootExecutionPhysicalScope } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import { nestedReleaseScenario } from '../../fixtures/task-release-generation-fixtures.js';

const message = () => new AgentInputUserMessage('Summarize completed work');
/** DONE on Task A: the Task side closes its agent runs, then this root stops exactly those. */
const doneScope = (f: Awaited<ReturnType<typeof nestedReleaseScenario>>) => {
  f.resources.close('A');
  return new RootTaskAgentResourceScope(f.adapter, f.resources);
};
describe.each(['agent', 'agent_team', 'agent_org'] as const)('%s released-generation exact Task release', kind => {
  it('a reactivated Team generation carries the verified nested Agent/Team/grandchild proof of the released one into the next DONE', async () => {
    const f = await nestedReleaseScenario(kind), history = JSON.stringify(f.tree);
    await f.resources.markStarted({ teamRunId: 'A-team' });
    // Every copy is live until DONE: nothing was stopped for being quiet.
    expect(f.firstTeam.isActive()).toBe(true); expect(f.firstNested.isActive()).toBe(true);
    expect([...f.active.keys()].sort()).toEqual(['A-child', 'A-grand', 'A-helper', 'A-lead', 'A-nested-lead', 'B-worker', 'borrowed', f.managerId].sort());
    // First DONE stops the live Team generation with its nested children.
    expect((await doneScope(f).releaseTaskAgentResources(f.requested)).every(outcome => outcome.stopped)).toBe(true);
    expect(f.firstTeam.isTerminated()).toBe(true); expect(f.firstNested.isTerminated()).toBe(true);
    // Reactivation: the Task is reopened and the assigner's message restores a new Team generation.
    f.resources.setTaskOpen('A');
    const lifecycle = new RootTaskExecutionLifecycle(f.adapter, { taskAgentResources: f.resources });
    expect(await lifecycle.deliverToExactTarget(f.managerId, 'A-lead', () => lifecycle.withLiveChain('A-lead',
      () => f.getManaged('A-team')!.postMessage(message(), 'A-lead')))).toMatchObject({ accepted: true });
    const current = f.getManaged('A-team')!;
    expect(current).not.toBe(f.firstTeam);
    expect(current.isActive()).toBe(true);
    // Second DONE: the new generation is stopped and the still-closed nested children report the first generation's proof.
    const scope = doneScope(f);
    expect(await scope.releaseTaskAgentResources(f.requested)).toEqual(f.requested.map(agentRun => ({ agentRun, stopped: true })));
    expect(current.isTerminated()).toBe(true);
    expect(await scope.releaseTaskAgentResources([{ agentRunId: 'A-child' }, { teamRunId: 'A-nested' }])).toEqual([
      { agentRun: { agentRunId: 'A-child' }, stopped: true }, { agentRun: { teamRunId: 'A-nested' }, stopped: true }]);
    expect(f.acquired.filter(r => ['A-child', 'A-nested-lead', 'A-grand'].includes(r.runId)).map(r => r.runId).sort()).toEqual(['A-child', 'A-grand', 'A-nested-lead']);
    expect([...f.active.keys()].sort()).toEqual(['B-worker', 'borrowed', f.managerId].sort());
    expect(JSON.stringify(f.tree)).toBe(history); if (f.rootTeam) expect(f.rootTeam.isActive()).toBe(true);
    expect(await current.releaseDirectTaskExecution({ agentRunId: 'never-owned' })).toEqual({ accepted: false, code: 'EXACT_RELEASE_AUTHORITY_UNAVAILABLE' });
    // A new root/startup host has no runtime-local terminal receipts: history/absence alone proves nothing.
    const fresh = await f.factory.beginMaterialization({ physicalScope: current.context.physicalScope, teamNode: current.context.teamNode,
      callbacks: f.callbacks, handoffs: [], activationMode: 'restore', prepareConfiguredAgents: false }).prepare();
    fresh.commitAfterDurability();
    expect(await fresh.teamRun.releaseOwnedRuntime()).toMatchObject({ accepted: true });
    expect(await fresh.teamRun.releaseDirectTaskExecution({ agentRunId: 'A-child' })).toEqual({ accepted: false, code: 'EXACT_RELEASE_AUTHORITY_UNAVAILABLE' });
    if (f.rootTeam) expect(() => fresh.teamRun.inheritReleasedTaskExecutionProof(f.rootTeam))
      .toThrow('exact verified terminal Team placement');
    const wrongRoot = await f.factory.beginMaterialization({ physicalScope: createRootExecutionPhysicalScope({
      root: { rootSubjectKind: kind === 'agent' ? 'agent_org' : 'agent', rootRunId: 'root' }, ancestorTeamRunIds: ['A-team'] }),
      teamNode: current.context.teamNode, callbacks: f.callbacks, handoffs: [], activationMode: 'restore', prepareConfiguredAgents: false }).prepare();
    wrongRoot.commitAfterDurability();
    expect(() => wrongRoot.teamRun.inheritReleasedTaskExecutionProof(f.firstTeam)).toThrow('exact verified terminal Team placement');
    expect(await wrongRoot.teamRun.releaseOwnedRuntime()).toMatchObject({ accepted: true });
    lifecycle.closeExternalAdmission();
    await cleanProtected(f);
  });

  it.each(['A-child', 'A-grand'])('a live descendant %s needs no restore; a failed stop retries the same exact run, never historical success', async id => {
    const f = await nestedReleaseScenario(kind), history = JSON.stringify(f.tree);
    // The copy stayed live: restoring its chain is a no-op and acquires nothing.
    await f.adapter.restoreChain(id, () => undefined);
    const live = f.active.get(id); expect(live?.alive).toBe(true);
    expect(f.acquired.filter(r => r.runId === id)).toHaveLength(1);
    f.stopFailures.add(live);
    const scope = doneScope(f);
    const first = await scope.releaseTaskAgentResources(f.requested);
    expect(first.find(o => 'agentRunId' in o.agentRun && o.agentRun.agentRunId === id)?.stopped).toBe(false);
    expect(f.active.get(id)).toBe(live); expect(live.alive).toBe(true);
    expect(f.active.has('A-helper')).toBe(false);
    f.stopFailures.delete(live);
    expect((await scope.releaseTaskAgentResources(f.requested)).every(o => o.stopped)).toBe(true);
    const stops = f.stopped.length, acquisitions = f.acquired.length;
    expect((await scope.releaseTaskAgentResources(f.requested)).every(o => o.stopped)).toBe(true);
    expect(f.stopped).toHaveLength(stops); expect(f.acquired).toHaveLength(acquisitions);
    expect(live.alive).toBe(false); expect([...f.active.keys()].sort()).toEqual(['B-worker', 'borrowed', f.managerId].sort());
    expect(JSON.stringify(f.tree)).toBe(history); if (f.rootTeam) expect(f.rootTeam.isActive()).toBe(true);
    await cleanProtected(f);
  });
});

async function cleanProtected(f: Awaited<ReturnType<typeof nestedReleaseScenario>>) {
  // Only fixture-owned controlled runs; no production root Stop or provider process.
  for (const run of [...f.active.values()]) expect(await f.stop(run)).toMatchObject({ accepted: true });
}
