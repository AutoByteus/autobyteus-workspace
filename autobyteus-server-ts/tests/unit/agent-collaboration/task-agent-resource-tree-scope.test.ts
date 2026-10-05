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
import { RootTaskAgentResourceScope } from '../../../src/agent-collaboration/execution/task/root-task-agent-resource-scope.js';
import { InMemoryTaskAgentResources } from '../../fixtures/task-agent-resource-fixtures.js';
const now = '2026-10-03T00:00:00.000Z';
const launch = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: 'test', llmConfig: null, autoExecuteTools: true, workspaceRootPath: null };
/** Dev data written by unshipped ticket builds may still carry a `taskLifetime` field; it is ignored and dropped. */
const devStamp = { taskLifetime: { lifetimeId: 'A', purpose: 'assignment' } };
const copy = (id: string, extra: object = {}) => ({
  address: `/${id}`, agentRunId: id, platformAgentRunId: null, startedAt: now,
  source: { kind: 'agent', agentDefinitionId: `definition-${id}`, launchConfiguration: launch }, ...extra,
});
const forest = () => [{
  address: '/workers', teamRunId: 'A-team', startedAt: now, ...devStamp,
  members: [{ address: '/workers/lead', agentRunId: 'A-lead', platformAgentRunId: null }],
  taskExecutions: [copy('A-child', devStamp)],
  source: { kind: 'agent_team', teamDefinitionId: 'workers', coordinatorAddress: '/workers/lead',
    members: [{ address: '/workers/lead', agentDefinitionId: 'lead' }], handoffs: [], defaultLaunchConfiguration: launch },
}, copy('A-helper'), copy('B-worker'), copy('borrowed')];
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
describe.each(['agent', 'agent_team', 'agent_org'] as const)('Task-free %s tree / index / release boundary (C-1)', kind => {
  it('reads dev trees carrying a Task field but keeps no Task data; the exact writer drops it', () => {
    const h = subject(kind);
    const binding = { execution: { root: { rootSubjectKind: kind, rootRunId: 'root' }, memberAddress: '/A-child', agentRunId: 'A-child' }, platformAgentRunId: 'provider-A' };
    const tree = h.decode(JSON.parse(JSON.stringify(h.adopt(h.tree, binding))));
    expect(JSON.stringify(tree)).not.toContain('taskLifetime');
    expect(h.getTasks(tree)[0].taskExecutions[0]).toMatchObject({ agentRunId: 'A-child', platformAgentRunId: 'provider-A' });
    expect(h.index.listTaskExecutionChainForAgent('A-child').map((e: any) => e.kind === 'agent' ? e.agentRunId : e.teamRunId)).toEqual(['A-child', 'A-team']);
    expect(h.index.listTaskExecutionChainForAgent(kind === 'agent' ? 'root' : 'manager')).toEqual([]);
  });

  it('answers ownership and helper questions only with execution facts: chain incl. pre-commit registration, copy at address', () => {
    const h = subject(kind);
    const adapter = adapterFor(kind, h);
    expect(adapter.ownershipChainFor('A-lead')).toEqual([{ teamRunId: 'A-team' }]);
    expect(adapter.ownershipChainFor('borrowed')).toEqual([{ agentRunId: 'borrowed' }]);
    expect(adapter.ownershipChainFor('not-yet-committed')).toEqual([]);
    expect(adapter.taskExecutionAt('/A-helper', [{ agentRunId: 'B-worker' }, { agentRunId: 'A-helper' }]))
      .toEqual({ root: { rootSubjectKind: kind, rootRunId: 'root' }, execution: { agentRunId: 'A-helper' }, ingressAgentRunId: 'A-helper' });
    expect(adapter.taskExecutionAt('/A-helper', [{ agentRunId: 'B-worker' }])).toBeNull();
    expect(adapter.registrationFor({ agentRunId: 'A-helper' })).toBeNull();
  });

  it('releases a nested exact child through its retained stopping host, never an input/wake lookup', async () => {
    const h = subject(kind);
    const release = vi.fn(async () => ({ accepted: true }));
    const cancel = vi.fn();
    const host = { releaseDirectTaskExecution: release, cancelDirectTaskExecution: cancel, isActive: () => false };
    const getManaged = vi.fn(() => host), getActive = vi.fn(() => null);
    const adapter = adapterFor(kind, h, { getManaged, getActive });
    adapter.cancelOwnedExecution({ agentRunId: 'A-child' });
    expect(await adapter.releaseOwnedExecution({ agentRunId: 'A-child' })).toEqual({ accepted: true });
    expect(getManaged).toHaveBeenCalledWith('A-team'); expect(getActive).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledExactlyOnceWith({ agentRunId: 'A-child' });
    expect(release).toHaveBeenCalledExactlyOnceWith({ agentRunId: 'A-child' });
  });
});

function adapterFor(kind: Kind, h: ReturnType<typeof subject>, teams: { getManaged: unknown; getActive: unknown } = { getManaged: () => null, getActive: () => null }) {
  const common = { root: { rootSubjectKind: kind, rootRunId: 'root' }, getTree: () => h.tree, getIndex: () => h.index,
    teams: { getManaged: teams.getManaged, get: teams.getActive }, tokenUsageReadiness: {}, memoryLocator: {},
    config: { rootTeam: { address: '/', children: [] }, children: [] }, callbacks: {} };
  return kind === 'agent_team' ? new TeamTaskExecutionAdapter({ ...common, rootTeamRunId: 'root',
    teamRunResolver: teams, config: {}, tokenUsageMigrationReadiness: {} } as never)
    : kind === 'agent_org' ? new AgentOrgTaskExecutionAdapter(common as never)
    : new StandaloneRootTaskExecutionAdapter(common as never);
}

const scopeOver = (adapter: object, resources = new InMemoryTaskAgentResources()) =>
  ({ resources, scope: new RootTaskAgentResourceScope(adapter as never, resources) });

it('invokes every retained exact authority regardless of liveness; one failed target never blocks its sibling (AR9-F02b)', async () => {
  let resolve!: () => void;
  const pending = new Promise<void>(done => { resolve = done; });
  const registrations = new Map(['owned-A', 'helper-A'].map(agentRunId => [agentRunId, { target: { execution: { agentRunId } }, ownedAgentRunIds: [agentRunId],
    operation: { cancel: vi.fn(), release: vi.fn(async () => {
      if (agentRunId === 'owned-A') throw new Error('private release failed'); return { accepted: true };
    }) } }]));
  const physical = vi.fn(async (ref: { agentRunId: string }) => { if (ref.agentRunId === 'owned-A') await pending; return { accepted: true }; });
  const adapter = { registrationFor: (ref: { agentRunId: string }) => registrations.get(ref.agentRunId) ?? null,
    cancelOwnedExecution: vi.fn(), releaseOwnedExecution: physical };
  const { resources, scope } = scopeOver(adapter);
  resources.addTask('A');
  await resources.linkAgentRun({ role: 'assigned', taskId: 'A', assignedBy: 'manager', hostRoot: { rootSubjectKind: 'agent', rootRunId: 'root' }, agentRun: { agentRunId: 'owned-A' } });
  await resources.linkAgentRun({ role: 'broughtIn', creator: { agentRunId: 'owned-A' }, hostRoot: { rootSubjectKind: 'agent', rootRunId: 'root' }, agentRun: { agentRunId: 'helper-A' } });
  let finished = false;
  const result = scope.releaseTaskAgentResources(resources.close('A')).then(r => { finished = true; return r; });
  expect([...registrations.values()].every(r => r.operation.cancel.mock.calls.length === 1)).toBe(true);
  expect(adapter.cancelOwnedExecution).toHaveBeenCalledTimes(2);
  for (let n = 0; n < 12; n++) await Promise.resolve();
  expect(finished).toBe(false); expect(physical).toHaveBeenCalledTimes(2);
  resolve();
  expect(await result).toEqual([
    { agentRun: { agentRunId: 'owned-A' }, stopped: false, error: { code: 'TASK_RELEASE_FAILED', message: 'private release failed' } },
    { agentRun: { agentRunId: 'helper-A' }, stopped: true }]);
});

it('reports stopped when the root holds no authority at all, and refuses runs that are not closed', async () => {
  const adapter = { registrationFor: () => null, cancelOwnedExecution: vi.fn(),
    releaseOwnedExecution: vi.fn(async () => ({ accepted: false, code: 'EXACT_RELEASE_AUTHORITY_UNAVAILABLE' })) };
  const { resources, scope } = scopeOver(adapter);
  resources.addTask('A');
  await resources.linkAgentRun({ role: 'assigned', taskId: 'A', assignedBy: 'manager', hostRoot: { rootSubjectKind: 'agent', rootRunId: 'root' }, agentRun: { agentRunId: 'gone' } });
  expect(await scope.releaseTaskAgentResources([{ agentRunId: 'gone' }])).toEqual([
    { agentRun: { agentRunId: 'gone' }, stopped: false, error: expect.objectContaining({ code: 'TASK_AGENT_RESOURCE_NOT_CLOSED' }) }]);
  expect(adapter.releaseOwnedExecution).not.toHaveBeenCalled();
  expect(await scope.releaseTaskAgentResources(resources.close('A'))).toEqual([{ agentRun: { agentRunId: 'gone' }, stopped: true }]);
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

it('fences owned input and messages in every root from the Task side alone, with no per-root state', async () => {
  const resources = new InMemoryTaskAgentResources();
  resources.addTask('A'); resources.addTask('B');
  const hostRoot = { rootSubjectKind: 'agent' as const, rootRunId: 'root' };
  await resources.linkAgentRun({ role: 'assigned', taskId: 'A', assignedBy: 'manager', hostRoot, agentRun: { teamRunId: 'A-team' }, coordinatorAgentRunId: 'A-lead' });
  await resources.linkAgentRun({ role: 'assigned', taskId: 'B', assignedBy: 'manager', hostRoot, agentRun: { agentRunId: 'B-worker' } });
  const chains: Record<string, object[]> = { 'A-lead': [{ teamRunId: 'A-team' }], 'B-worker': [{ agentRunId: 'B-worker' }], borrowed: [{ agentRunId: 'borrowed' }] };
  const rootAdapter = { ownershipChainFor: (id: string) => chains[id] ?? [] };
  const first = new RootTaskAgentResourceScope(rootAdapter as never, resources);
  const second = new RootTaskAgentResourceScope(rootAdapter as never, resources);
  expect(() => first.assertInputAllowed('A-lead')).not.toThrow();
  expect(() => first.assertMessageScope('A-lead', 'B-worker')).toThrow(expect.objectContaining({ code: 'TASK_AGENT_RESOURCE_CONFLICT' }));
  expect(() => first.assertMessageScope('A-lead', 'borrowed')).not.toThrow();
  resources.close('A');
  for (const scope of [first, second]) {
    expect(() => scope.assertInputAllowed('A-lead')).toThrow(expect.objectContaining({ code: 'TASK_AGENT_RESOURCE_CLOSED' }));
    expect(() => scope.assertInputAllowed('B-worker')).not.toThrow();
    expect(() => scope.assertInputAllowed('manager')).not.toThrow();
  }
  expect(Object.keys(first).sort()).toEqual(['adapter', 'resources']);
  // A damaged Task file fails closed for unknown copies only; unowned agents are never checked.
  resources.damaged.add('C');
  expect(() => first.assertInputAllowed('borrowed')).toThrow(expect.objectContaining({ code: 'TASK_AGENT_RESOURCES_UNAVAILABLE' }));
  expect(() => first.assertInputAllowed('B-worker')).not.toThrow();
  expect(() => first.assertInputAllowed('manager')).not.toThrow();
  const unbound = new RootTaskAgentResourceScope(rootAdapter as never);
  expect(() => unbound.assertInputAllowed('A-lead')).not.toThrow();
  expect(unbound.ownerOf('A-lead')).toBeNull();
});
