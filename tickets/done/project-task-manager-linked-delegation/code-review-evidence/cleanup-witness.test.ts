/** Evidence only. Execute from temporary server tests/unit/reviewer; not acceptance. */
import { expect, it, vi } from 'vitest';
import { AgentInputUserMessage } from 'autobyteus-ts/agent/message/agent-input-user-message.js';
import { FlatTeamExecutionFactory } from '../../../src/agent-team-execution/local/flat-team-execution-factory.js';
import { TeamRunResolver } from '../../../src/agent-team-execution/services/team-run-resolver.js';
import { TeamExecutionIndex } from '../../../src/agent-team-execution/services/team-execution-index.js';
import { TeamTaskExecutionAdapter } from '../../../src/agent-team-execution/task-delegation/team-task-execution-adapter.js';
import { RootTaskLifetimeScope } from '../../../src/agent-collaboration/execution/task/root-task-lifetime-scope.js';
import { createRootExecutionPhysicalScope, createTeamRootExecutionIdentity } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import { AgentRunActivationCandidate } from '../../../src/agent-execution/services/agent-run-activation-candidate.js';
import { projectTaskAgentExecution, projectTaskTeamExecution } from '../../../src/agent-collaboration/execution/task/task-execution-tree-projection.js';
import { testActivationManager } from '../../fixtures/agent-run-preparation-fixtures.js';
import { testAgentNode, testAgentTeamNode, testExecutionTree, testMemberExecutionContext, testTeamRunConfig } from '../../fixtures/current-team-run-fixtures.js';

function fixture(abort?: (id: string) => Promise<{kind: "aborted"}>) {
  const active = new Map<string, any>();
  const create = async ({ runId }: any) => {
    const run = { runId, alive: true, isActive() { return this.alive; }, bindExecutionAdmissionFence: vi.fn(),
      subscribeToEvents: () => () => undefined, getStatusSnapshot: () => ({ status: 'idle' }),
      getInputStateSnapshot: () => null, postUserMessage: async () => ({ accepted: true }) };
    return new AgentRunActivationCandidate({ runId, runtimeKind: 'autobyteus' as never, platformAgentRunId: null,
      publish: () => { active.set(runId, run); return run as never; }, abort: async () => abort ? abort(runId) : ({ kind: 'aborted' }) });
  };
  const stop = async (run: any) => { run.alive = false; active.delete(run.runId); return { accepted: true }; };
  const termination = (run: any) => ({ cancel: () => undefined, commit: () => ({ finish: () => stop(run) }) });
  const manager = testActivationManager({ newPreparation: create, restorePreparation: (c: any) => create({ runId: c.runId }),
    getActiveRun: (id: string) => active.get(id), releaseExactRun: stop,
    tryPrepareAgentRunTerminationIfQuiescent: async (run: any) => termination(run), prepareAgentRunTermination: async (run: any) => termination(run) });
  const callbacks = { assertExecutionInputAllowed: () => undefined, publishAgentEvent: vi.fn(), commitPlatformBindingChange: async () => undefined,
    buildMemberExecutionContext: async ({ identity }: any) => testMemberExecutionContext({ memberAddress: identity.memberAddress, agentRunId: identity.agentRunId, rootTeamRunId: 'root' }) };
  const factory = new FlatTeamExecutionFactory({ agentRunManager: manager as never, activityInspector: { inspect: () => ({ kind: 'present' }) } as never,
    memoryLocator: { getLocation: (_scope: unknown, id: string) => ({ memoryDir: `/tmp/review-unused-${id}` }) } as never });
  return { factory, callbacks, manager, active };
}
const scope = createRootExecutionPhysicalScope({ root: createTeamRootExecutionIdentity('root'), ancestorTeamRunIds: [] });

it('witness: genuine quiet shutdown / coordinator-only restoration makes exact historical descendant permanently pending', async () => {
  const f = fixture();
  const managerNode = testAgentNode('/Manager', { agentRunId: 'manager' });
  const teamNode = testAgentTeamNode({ address: '/Workers', teamRunId: 'A-team', coordinatorAddress: '/Workers/Lead', children: [testAgentNode('/Workers/Lead', { agentRunId: 'A-lead' })] });
  const childNode = testAgentNode('/Workers/Child', { agentRunId: 'A-child' });
  const rootNode = testAgentTeamNode({ address: '/', teamRunId: 'root', coordinatorAddress: '/Manager', children: [managerNode] });
  const rootPrep = await f.factory.beginMaterialization({ physicalScope: scope, teamNode: rootNode, handoffs: [], activationMode: 'fresh', callbacks: f.callbacks, prepareConfiguredAgents: false }).prepare();
  rootPrep.commitAfterDurability(); const root = rootPrep.teamRun;
  const taskOp = root.beginTaskTeam({ address: '/Workers', teamRunId: 'A-team', handoffs: [], teamNode });
  const task = await taskOp.prepare(); task.sealForCommit(); task.commitAfterDurability(); const oldTeam = task.preparedTeamRuns[0]!;
  const childOp = oldTeam.beginTaskAgent({ address: '/Workers/Child', agentRunId: 'A-child', sourceNode: childNode });
  const child = await childOp.prepare(); child.sealForCommit(); child.commitAfterDurability();
  const stamp = { lifetimeId: 'A', purpose: 'assignment' as const }, now = '2026-10-03T00:00:00.000Z';
  const projected: any = { ...projectTaskTeamExecution({ node: teamNode, delegatorAgentRunId: 'manager', startedAt: now, taskLifetime: stamp, source: { kind: 'agent_team', teamDefinitionId: teamNode.teamDefinitionId, coordinatorAddress: teamNode.coordinatorAddress, defaultLaunchConfiguration: teamNode.defaultLaunchConfiguration, handoffs: [], members: teamNode.children.map((n: any) => ({ address: n.address, agentDefinitionId: n.agentDefinitionId })) } }) };
  projected.taskExecutions = [projectTaskAgentExecution({ address: '/Workers/Child', agentRunId: 'A-child', delegatorAgentRunId: 'A-lead', startedAt: now, taskLifetime: { lifetimeId: 'A', purpose: 'delegation' }, source: null })];
  const base = testExecutionTree({ rootTeamRunId: 'root', children: [managerNode], coordinatorAddress: '/Manager' });
  const tree = { ...base, rootTeam: { ...base.rootTeam, taskExecutions: [projected] } }, index = new TeamExecutionIndex(tree);
  const resolver = new TeamRunResolver({ rootTeamRun: root, getIndex: () => index }); resolver.registerManaged(oldTeam);
  expect(await root.tryShutDownDirectTaskExecutionIfQuiet({ teamRunId: 'A-team' })).toBe(true); resolver.unregisterTerminated();
  expect(oldTeam.isTerminated()).toBe(true); expect(f.active.size).toBe(0);
  const adapter = new TeamTaskExecutionAdapter({ rootTeamRunId: 'root', config: testTeamRunConfig({ rootTeamRunId: 'root', children: [managerNode], coordinatorAddress: '/Manager' }),
    getIndex: () => index, teamRunResolver: resolver, requireTeamRun: async (id: string) => { const run = resolver.getActive(id); if (!run) throw Error('missing active host'); return run; },
    tokenUsageMigrationReadiness: {} } as never);
  await adapter.restoreChain('A-lead', () => undefined); const restored = resolver.getManaged('A-team')!;
  expect(restored).not.toBe(oldTeam); expect(await restored.postMessage(new AgentInputUserMessage('Summarize completed work'), 'A-lead')).toMatchObject({ accepted: true });
  expect(f.active.has('A-child')).toBe(false); expect(f.active.has('A-lead')).toBe(true);
  // Actual original controls retained by root registration; these supply terminal old-generation proof.
  vi.spyOn(adapter, 'registeredActivations').mockReturnValue([
    { plan: { link: { execution: { teamRunId: 'A-team' } }, taskLifetime: stamp }, operation: taskOp },
    { plan: { link: { execution: { agentRunId: 'A-child' } }, taskLifetime: stamp }, operation: childOp },
  ] as never);
  const releaseScope = new RootTaskLifetimeScope(adapter, { assertClosed: async () => undefined } as never);
  const requested = [{ teamRunId: 'A-team' }, { agentRunId: 'A-child' }];
  const first = await releaseScope.release('A', requested), retry = await releaseScope.release('A', [{ agentRunId: 'A-child' }]);
  console.log('NESTED_RESTORE_WITNESS', JSON.stringify({ first, retry, active: [...f.active.keys()], rootActive: root.isActive() }));
  expect(first).toEqual([{ execution: { teamRunId: 'A-team' }, cleanup: 'released' }, { execution: { agentRunId: 'A-child' }, cleanup: 'pending', error: expect.objectContaining({ code: 'EXACT_RELEASE_AUTHORITY_UNAVAILABLE' }) }]);
  expect(retry).toEqual([first[1]]); expect(f.active.size).toBe(0); expect(root.isActive()).toBe(true);
});

it('witness: partial private Team release waits for member 1 before initiating member 2 cleanup', async () => {
  let unblock!: () => void; const slow = new Promise<void>(resolve => { unblock = resolve; }), calls: string[] = [];
  const f = fixture(async (id: string) => { calls.push(id); if (id === 'first') await slow; return { kind: 'aborted' }; });
  const node = testAgentTeamNode({ address: '/', teamRunId: 'root', coordinatorAddress: '/First', children: [testAgentNode('/First', { agentRunId: 'first' }), testAgentNode('/Second', { agentRunId: 'second' })] });
  const op = f.factory.beginMaterialization({ physicalScope: scope, teamNode: node, handoffs: [], activationMode: 'fresh', callbacks: f.callbacks, prepareConfiguredAgents: true });
  await op.prepare(); const releasing = op.release();
  try { for (let n = 0; n < 30; n++) await Promise.resolve(); console.log('PRIVATE_RELEASE_BEFORE_FIRST_DRAIN', JSON.stringify(calls)); expect(calls).toEqual(['first']); }
  finally { unblock(); await releasing; }
  expect(calls).toEqual(['first', 'second']);
});
