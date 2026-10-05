import { describe, expect, it, vi } from 'vitest';
import { RuntimeKind } from '../../../src/runtime-management/runtime-kind-enum.js';
import { testExecutionTree, testAgentNode } from '../../fixtures/current-team-run-fixtures.js';
import { testAgentOrgExecutionTree, testOrgAgentNode } from '../../fixtures/current-agent-org-run-fixtures.js';
import { validateTeamRunExecutionTreePayload } from '../../../src/run-history/store/team-run-execution-tree-schema.js';
import { validateAgentOrgRunExecutionTreePayload } from '../../../src/run-history/store/agent-org-run-execution-tree-schema.js';
import { validateStandaloneRootTreePayload } from '../../../src/standalone-agent-run-root/persistence/standalone-root-tree-schema.js';
import { adoptAgentPlatformBindingInTree } from '../../../src/agent-team-execution/services/team-run-execution-tree-mutator.js';
import { adoptAgentOrgPlatformBinding } from '../../../src/agent-org-execution/services/agent-org-run-execution-tree-mutator.js';
import { adoptStandaloneRootPlatformBinding } from '../../../src/standalone-agent-run-root/services/standalone-root-tree-mutator.js';
import { TeamExecutionIndex } from '../../../src/agent-team-execution/services/team-execution-index.js';
import { AgentOrgExecutionIndex } from '../../../src/agent-org-execution/services/agent-org-execution-index.js';
import { StandaloneRootExecutionIndex } from '../../../src/standalone-agent-run-root/services/standalone-root-execution-index.js';
import { TeamTaskExecutionAdapter } from '../../../src/agent-team-execution/task-delegation/team-task-execution-adapter.js';
import { AgentOrgTaskExecutionAdapter } from '../../../src/agent-org-execution/services/agent-org-task-execution-adapter.js';
import { StandaloneRootTaskExecutionAdapter } from '../../../src/standalone-agent-run-root/services/standalone-root-task-execution-adapter.js';
import { RootTaskLifetimeScope } from '../../../src/agent-collaboration/execution/task/root-task-lifetime-scope.js';
const now = '2026-10-03T00:00:00.000Z';
const launch = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: 'test', llmConfig: null, autoExecuteTools: true, workspaceRootPath: null };
const stamp = { lifetimeId: 'A', purpose: 'assignment' };
const copy = (id: string, lifetimeId?: string, purpose = 'assignment') => ({
  address: `/${id}`, agentRunId: id, platformAgentRunId: null, startedAt: now,
  source: { kind: 'agent', agentDefinitionId: `definition-${id}`, launchConfiguration: launch },
  ...(lifetimeId ? { taskLifetime: { lifetimeId, purpose } } : {}),
});
const forest = () => [{
  address: '/workers', teamRunId: 'A-team', startedAt: now, taskLifetime: stamp,
  members: [{ address: '/workers/lead', agentRunId: 'A-lead', platformAgentRunId: null }],
  taskExecutions: [copy('A-child', 'A', 'delegation')],
  source: { kind: 'agent_team', teamDefinitionId: 'workers', coordinatorAddress: '/workers/lead',
    members: [{ address: '/workers/lead', agentDefinitionId: 'lead' }], handoffs: [], defaultLaunchConfiguration: launch },
}, copy('A-helper', 'A', 'helper'), copy('B-worker', 'B'), copy('borrowed')];
type Kind = 'agent' | 'agent_team' | 'agent_org';
function subject(kind: Kind, tasks = forest()) {
  if (kind === 'agent_team') {
    const base = testExecutionTree({ rootTeamRunId: 'root', children: [testAgentNode('/manager', { agentRunId: 'manager' })], coordinatorAddress: '/manager' });
    const decode = (raw: any) => validateTeamRunExecutionTreePayload(raw, 'root');
    const tree = decode({ ...base, rootTeam: { ...base.rootTeam, taskExecutions: tasks } });
    return { tree, decode, getTasks: (t: any) => t.rootTeam.taskExecutions,
      index: new TeamExecutionIndex(tree), adopt: (t: any, binding: any) => adoptAgentPlatformBindingInTree({ tree: t, binding }).tree };
  }
  if (kind === 'agent_org') {
    const base = testAgentOrgExecutionTree({ orgRunId: 'root', members: [testOrgAgentNode('/manager', 'manager')] });
    const decode = (raw: any) => validateAgentOrgRunExecutionTreePayload(raw, 'root');
    const tree = decode({ ...base, rootOrg: { ...base.rootOrg, taskExecutions: tasks } });
    return { tree, decode, getTasks: (t: any) => t.rootOrg.taskExecutions,
      index: new AgentOrgExecutionIndex(tree), adopt: (t: any, binding: any) => adoptAgentOrgPlatformBinding({ tree: t, binding }).tree };
  }
  const decode = (raw: any) => validateStandaloneRootTreePayload(raw, 'root');
  const tree = decode({ subjectKind: 'agent', createdAt: now, host: { address: '/manager', agentRunId: 'root', agentDefinitionId: 'manager' }, collaborators: [], taskExecutions: tasks });
  return { tree, decode, getTasks: (t: any) => t.taskExecutions,
    index: new StandaloneRootExecutionIndex(tree), adopt: (t: any, binding: any) => adoptStandaloneRootPlatformBinding({ tree: t, binding }).tree };
}
describe.each(['agent', 'agent_team', 'agent_org'] as const)('concrete %s tree / index / cleanup boundary', kind => {
  it('retains exact stamps through current normalization and platform binding; includes transitive helpers but not B/borrowed/Manager', () => {
    const h = subject(kind);
    const binding = { execution: { root: { rootSubjectKind: kind, rootRunId: 'root' }, memberAddress: '/A-child', agentRunId: 'A-child' }, platformAgentRunId: 'provider-A' };
    const tree = h.decode(JSON.parse(JSON.stringify(h.adopt(h.tree, binding))));
    const tasks = h.getTasks(tree);
    expect(tasks[0].taskLifetime).toEqual(stamp);
    expect(tasks[0].taskExecutions[0]).toMatchObject({ taskLifetime: { lifetimeId: 'A', purpose: 'delegation' }, platformAgentRunId: 'provider-A' });
    expect(tasks[1].taskLifetime).toEqual({ lifetimeId: 'A', purpose: 'helper' });
    expect(h.index.taskLifetimeFor('A-lead')).toEqual(stamp);
    expect(h.index.taskLifetimeFor('A-child')?.lifetimeId).toBe('A');
    expect(h.index.taskLifetimeFor('borrowed')).toBeUndefined();
    expect(h.index.taskLifetimeFor(kind === 'agent' ? 'root' : 'manager')).toBeUndefined();
    expect(h.index.listOwnedTaskExecutions('A').map(e => e.kind === 'agent' ? e.agentRunId : e.teamRunId).sort()).toEqual(['A-child', 'A-helper', 'A-team']);
    const raw = JSON.parse(JSON.stringify(h.tree));
    h.getTasks(raw)[0].taskLifetime = null;
    expect(() => h.decode(raw)).toThrow('TASK_LIFETIME_INVALID');
  });
  it('rejects contradictory containment instead of stopping a foreign child', () => {
    const tasks = forest();
    const team = tasks[0];
    if (!('taskExecutions' in team)) throw new Error('Expected the first fixture execution to be a Team.');
    const child = team.taskExecutions[0];
    if (!child.taskLifetime) throw new Error('Expected the fixture child to have its Task lifetime.');
    child.taskLifetime.lifetimeId = 'B';
    const h = subject(kind, tasks);
    expect(() => h.index.listOwnedTaskExecutions('A')).toThrow('TASK_LIFETIME_CONFLICT');
  });
  it('releases a nested exact child through its retained stopping host, never an input/wake lookup', async () => {
    const h = subject(kind);
    const release = vi.fn(async () => ({ accepted: true }));
    const cancel = vi.fn();
    const host = { releaseDirectTaskExecution: release, cancelDirectTaskExecution: cancel, isActive: () => false };
    const getManaged = vi.fn(() => host), getActive = vi.fn(() => null);
    const common = { root: { rootSubjectKind: kind, rootRunId: 'root' }, getTree: () => h.tree, getIndex: () => h.index,
      teams: { getManaged, get: getActive }, tokenUsageReadiness: {}, memoryLocator: {} };
    const adapter = kind === 'agent_team' ? new TeamTaskExecutionAdapter({ ...common, rootTeamRunId: 'root',
      teamRunResolver: { getManaged, getActive }, config: {}, tokenUsageMigrationReadiness: {} } as never)
      : kind === 'agent_org' ? new AgentOrgTaskExecutionAdapter(common as never)
      : new StandaloneRootTaskExecutionAdapter(common as never);
    adapter.cancelOwnedExecution({ agentRunId: 'A-child' });
    expect(await adapter.releaseOwnedExecution({ agentRunId: 'A-child' })).toEqual({ accepted: true });
    expect(getManaged).toHaveBeenCalledWith('A-team'); expect(getActive).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledExactlyOnceWith({ agentRunId: 'A-child' });
    expect(release).toHaveBeenCalledExactlyOnceWith({ agentRunId: 'A-child' });
  });
});

it('awaits independent private and published proof without letting one failed target prevent its sibling cleanup', async () => {
  let resolve!: () => void;
  const pending = new Promise<void>(done => { resolve = done; });
  const controls = ['owned-A', 'helper-A'].map(agentRunId => ({ plan: { taskLifetime: stamp,
    link: { execution: { agentRunId } } }, operation: { cancel: vi.fn(), release: vi.fn(async () => {
      if (agentRunId === 'owned-A') throw new Error('private release failed'); return { accepted: true };
    }) } }));
  const physical = vi.fn(async (ref: { agentRunId: string }) => { if (ref.agentRunId === 'owned-A') await pending; return { accepted: true }; });
  const adapter = { registeredActivations: () => controls, ownedExecutions: () => controls.map(c => c.plan.link.execution),
    linkForExecution: (ref: unknown) => ref, cancelOwnedExecution: vi.fn(), releaseOwnedExecution: physical };
  const scope = new RootTaskLifetimeScope(adapter as never, { assertClosed: async () => undefined } as never);
  let finished = false;
  const result = scope.release('A', controls.map(c => c.plan.link.execution)).then(r => { finished = true; return r; });
  for (let n = 0; n < 12; n++) await Promise.resolve();
  expect(finished).toBe(false); expect(physical).toHaveBeenCalledTimes(2);
  expect(controls.every(c => c.operation.cancel.mock.calls.length === 1)).toBe(true);
  resolve();
  expect(await result).toEqual([expect.objectContaining({ execution: { agentRunId: 'owned-A' }, cleanup: 'failed' }),
    { execution: { agentRunId: 'helper-A' }, cleanup: 'released' }]);
});

it('retains verified quiet Team cleanup authority across directory eviction, then replaces it only on a new publication', async () => {
  const { TeamRunResolver } = await import('../../../src/agent-team-execution/services/team-run-resolver.js');
  const { RootTeamExecutionDirectory } = await import('../../../src/agent-collaboration/execution/backends/root-team-execution-directory.js');
  const old = { teamRunId: 'quiet-team', isActive: () => false, isTerminated: () => true,
    cancelRuntimeActivation: vi.fn(), releaseOwnedRuntime: vi.fn(async () => ({ accepted: true })) };
  const replacement = { ...old, inheritReleasedTaskExecutionProof: vi.fn(), isActive: () => true, isTerminated: () => false };
  const resolver = new TeamRunResolver({ rootTeamRun: { teamRunId: 'root', isTerminated: () => false } as never, getIndex: vi.fn() as never });
  resolver.registerManaged(old as never); resolver.unregisterTerminated();
  expect(resolver.getActive('quiet-team')).toBeNull(); expect(resolver.getManaged('quiet-team')).toBe(old);
  resolver.registerManaged(replacement as never); expect(resolver.getManaged('quiet-team')).toBe(replacement);
  expect(replacement.inheritReleasedTaskExecutionProof).toHaveBeenCalledExactlyOnceWith(old);
  const directory = new RootTeamExecutionDirectory({} as never);
  directory.reserveTaskSubtree([old as never]).commit(); directory.unregisterTerminated();
  expect(directory.get('quiet-team')).toBeNull(); expect(directory.getManaged('quiet-team')).toBe(old);
  expect(await directory.releaseTask('quiet-team')).toEqual({ accepted: true });
  expect(old.releaseOwnedRuntime).toHaveBeenCalledOnce();
  directory.reserveTaskSubtree([replacement as never]).commit();
  expect(directory.getManaged('quiet-team')).toBe(replacement);
  expect(replacement.inheritReleasedTaskExecutionProof).toHaveBeenCalledTimes(2);
});
