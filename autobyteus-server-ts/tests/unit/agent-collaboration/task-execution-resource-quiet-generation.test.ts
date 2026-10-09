import { describe, expect, it } from 'vitest';
import { AgentInputUserMessage } from 'autobyteus-ts/agent/message/agent-input-user-message.js';
import { RootTaskExecutionResourceScope } from '../../../src/agent-collaboration/execution/task/root-task-execution-resource-scope.js';
import { createRootExecutionPhysicalScope } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import { nestedReleaseScenario } from '../../fixtures/task-release-generation-fixtures.js';

const message = () => new AgentInputUserMessage('Summarize completed work');
/** DONE on Task A: the Task side closes its agent runs, then this root stops exactly those. */
const doneScope = (f: Awaited<ReturnType<typeof nestedReleaseScenario>>) => {
  f.resources.close('A');
  return new RootTaskExecutionResourceScope(f.adapter, f.resources);
};
describe.each(['agent', 'agent_team', 'agent_org'] as const)('%s quiet-generation exact Task release', kind => {
  it('coordinator-only follow-up preserves verified nested Agent/Team/grandchild proof and separately stops sibling helper', async () => {
    const f = await nestedReleaseScenario(kind), history = JSON.stringify(f.tree);
    expect(f.oldTeam.isTerminated()).toBe(true); expect(f.oldNested.isTerminated()).toBe(true);
    expect([...f.active.keys()].sort()).toEqual(['A-helper', 'B-worker', 'borrowed', f.managerId].sort());
    await f.adapter.restoreChain('A-lead', () => undefined);
    const current = f.getManaged('A-team')!;
    expect(current).not.toBe(f.oldTeam);
    expect(await current.postMessage(message(), 'A-lead')).toMatchObject({ accepted: true });
    // A second quiet/follow-up cycle must carry the same exact terminal receipts, not just one replacement.
    const prepared = await current.tryPrepareTerminationIfQuiescent();
    expect(await prepared!.commit().finish()).toMatchObject({ accepted: true });
    f.retireTerminated();
    // Parent registry notices the terminated child and retires it on the normal quiet path.
    if (f.rootTeam) await f.rootTeam.tryShutDownDirectTaskExecutionIfQuiet({ teamRunId: 'A-team' });
    await f.adapter.restoreChain('A-lead', () => undefined);
    expect(await f.getManaged('A-team')!.postMessage(message(), 'A-lead')).toMatchObject({ accepted: true });
    const scope = doneScope(f);
    expect(await scope.releaseTaskExecutions(f.requested)).toEqual(f.requested.map(execution => ({ execution, stopped: true })));
    expect(await scope.releaseTaskExecutions([{ agentRunId: 'A-child' }, { teamRunId: 'A-nested' }])).toEqual([
      { execution: { agentRunId: 'A-child' }, stopped: true }, { execution: { teamRunId: 'A-nested' }, stopped: true }]);
    expect(f.acquired.filter(r => ['A-child', 'A-nested-lead', 'A-grand'].includes(r.runId))).toHaveLength(3);
    expect([...f.active.keys()].sort()).toEqual(['B-worker', 'borrowed', f.managerId].sort());
    expect(JSON.stringify(f.tree)).toBe(history); if (f.rootTeam) expect(f.rootTeam.isActive()).toBe(true);
    expect(await f.getManaged('A-team')!.releaseDirectTaskExecution({ agentRunId: 'never-owned' })).toEqual({ accepted: false, code: 'EXACT_RELEASE_AUTHORITY_UNAVAILABLE' });
    // A new root/startup host has no runtime-local terminal receipts: history/absence alone proves nothing.
    const fresh = await f.factory.beginMaterialization({ physicalScope: current.context.physicalScope, teamNode: current.context.teamNode,
      callbacks: f.callbacks, handoffs: [], activationMode: 'restore' }).prepare();
    fresh.commitAfterDurability();
    expect(await fresh.teamRun.releaseOwnedRuntime()).toMatchObject({ accepted: true });
    expect(await fresh.teamRun.releaseDirectTaskExecution({ agentRunId: 'A-child' })).toEqual({ accepted: false, code: 'EXACT_RELEASE_AUTHORITY_UNAVAILABLE' });
    if (f.rootTeam) expect(() => fresh.teamRun.inheritReleasedTaskExecutionProof(f.rootTeam))
      .toThrow('exact verified terminal Team placement');
    const wrongRoot = await f.factory.beginMaterialization({ physicalScope: createRootExecutionPhysicalScope({
      root: { rootSubjectKind: kind === 'agent' ? 'agent_org' : 'agent', rootRunId: 'root' }, ancestorTeamRunIds: ['A-team'] }),
      teamNode: current.context.teamNode, callbacks: f.callbacks, handoffs: [], activationMode: 'restore' }).prepare();
    wrongRoot.commitAfterDurability();
    expect(() => wrongRoot.teamRun.inheritReleasedTaskExecutionProof(f.oldTeam)).toThrow('exact verified terminal Team placement');
    expect(await wrongRoot.teamRun.releaseOwnedRuntime()).toMatchObject({ accepted: true });
    await cleanProtected(f);
  });

  it.each(['A-child', 'A-grand'])('requires current restored descendant %s proof; failed stop retries same exact generation, never historical success', async id => {
    const f = await nestedReleaseScenario(kind), history = JSON.stringify(f.tree);
    await f.adapter.restoreChain(id, () => undefined);
    const restored = f.active.get(id); expect(restored).toBeDefined();
    expect(f.acquired.filter(r => r.runId === id)).toHaveLength(2);
    f.stopFailures.add(restored);
    const scope = doneScope(f);
    const first = await scope.releaseTaskExecutions(f.requested);
    expect(first.find(o => 'agentRunId' in o.execution && o.execution.agentRunId === id)?.stopped).toBe(false);
    expect(f.active.get(id)).toBe(restored); expect(restored.alive).toBe(true);
    expect(f.active.has('A-helper')).toBe(false);
    f.stopFailures.delete(restored);
    expect((await scope.releaseTaskExecutions(f.requested)).every(o => o.stopped)).toBe(true);
    const stops = f.stopped.length, acquisitions = f.acquired.length;
    expect((await scope.releaseTaskExecutions(f.requested)).every(o => o.stopped)).toBe(true);
    expect(f.stopped).toHaveLength(stops); expect(f.acquired).toHaveLength(acquisitions);
    expect(restored.alive).toBe(false); expect([...f.active.keys()].sort()).toEqual(['B-worker', 'borrowed', f.managerId].sort());
    expect(JSON.stringify(f.tree)).toBe(history); if (f.rootTeam) expect(f.rootTeam.isActive()).toBe(true);
    await cleanProtected(f);
  });
});

async function cleanProtected(f: Awaited<ReturnType<typeof nestedReleaseScenario>>) {
  // Only fixture-owned controlled runs; no production root Stop or provider process.
  for (const run of [...f.active.values()]) expect(await f.stop(run)).toMatchObject({ accepted: true });
}
