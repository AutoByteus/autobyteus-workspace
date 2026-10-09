import { vi } from 'vitest';
import { AgentInputUserMessage } from 'autobyteus-ts/agent/message/agent-input-user-message.js';
import { AgentRunActivationCandidate } from '../../src/agent-execution/services/agent-run-activation-candidate.js';
import { FlatTeamExecutionFactory } from '../../src/agent-team-execution/local/flat-team-execution-factory.js';
import { RootAgentExecutionRegistry } from '../../src/agent-collaboration/execution/backends/root-agent-execution-registry.js';
import { RootTeamExecutionDirectory } from '../../src/agent-collaboration/execution/backends/root-team-execution-directory.js';
import { TeamRunResolver } from '../../src/agent-team-execution/services/team-run-resolver.js';
import { TeamExecutionIndex } from '../../src/agent-team-execution/services/team-execution-index.js';
import { AgentOrgExecutionIndex } from '../../src/agent-org-execution/services/agent-org-execution-index.js';
import { StandaloneRootExecutionIndex } from '../../src/standalone-agent-run-root/services/standalone-root-execution-index.js';
import { TeamTaskExecutionAdapter } from '../../src/agent-team-execution/task-delegation/team-task-execution-adapter.js';
import { AgentOrgTaskExecutionAdapter } from '../../src/agent-org-execution/services/agent-org-task-execution-adapter.js';
import { StandaloneRootTaskExecutionAdapter } from '../../src/standalone-agent-run-root/services/standalone-root-task-execution-adapter.js';
import { MemberCollaborationContext, MemberExecutionContext } from '../../src/agent-collaboration/execution/domain/member-execution-context.js';
import { createRootExecutionIdentity, createRootExecutionPhysicalScope, type RootSubjectKind } from '../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import { projectTaskAgentExecution, projectTaskTeamExecution } from '../../src/agent-collaboration/execution/task/task-execution-tree-projection.js';
import { taskExecutionReferenceKey } from '../../src/agent-collaboration/execution/task/task-execution-reference.js';
import { testActivationManager } from './agent-run-preparation-fixtures.js';
import { InMemoryTaskExecutionResources } from './task-execution-resource-fixtures.js';
import { testAgentNode, testAgentTeamNode, testExecutionTree, testTeamRunConfig } from './current-team-run-fixtures.js';
import { testAgentOrgExecutionTree, testOrgAgentNode } from './current-agent-org-run-fixtures.js';

/** Concrete local factory/registries/quiet/restore; provider and business admission boundaries controlled. */
export function releaseGenerationFixture(kind: RootSubjectKind = 'agent_team', abort?: (id: string) => Promise<any>, rejectBindingFor?: string) {
  const root = createRootExecutionIdentity({ rootSubjectKind: kind, rootRunId: 'root' });
  const active = new Map<string, any>(), acquired: any[] = [], stopped: any[] = [];
  const stopFailures = new Set<any>();
  /** Provider event subscription seam: Team members subscribe when first work activates them. */
  const providerEvents: { subscribe: ((run: any, listener: (event: any) => void) => () => void) | null } = { subscribe: null };
  const create = async ({ runId }: any) => {
    const run: any = { runId, alive: true, isActive() { return this.alive; }, bindExecutionAdmissionFence: vi.fn(),
      subscribeToEvents: (listener: (event: any) => void) => providerEvents.subscribe ? providerEvents.subscribe(run, listener) : () => undefined,
      getStatusSnapshot: () => ({ status: 'idle' }),
      getInputStateSnapshot: () => null, postUserMessage: async () => ({ accepted: true }) };
    acquired.push(run);
    return new AgentRunActivationCandidate({ runId, runtimeKind: (runId === rejectBindingFor ? 'claude_agent_sdk' : 'autobyteus') as never, platformAgentRunId: null,
      publish: () => { active.set(runId, run); return run as never; },
      abort: async () => abort ? abort(runId) : ({ kind: 'aborted' }) });
  };
  const stop = vi.fn(async (run: any) => {
    stopped.push(run);
    if (stopFailures.has(run)) return { accepted: false, code: 'CONTROLLED_EXACT_RELEASE_PENDING' };
    run.alive = false; if (active.get(run.runId) === run) active.delete(run.runId);
    return { accepted: true };
  });
  const termination = (run: any) => ({ cancel: () => undefined, commit: () => ({ finish: () => stop(run) }) });
  const manager = testActivationManager({ newPreparation: create, restorePreparation: (c: any) => create({ runId: c.runId }),
    getActiveRun: (id: string) => active.get(id), releaseExactRun: stop,
    tryPrepareAgentRunTerminationIfQuiescent: async (run: any) => termination(run), prepareAgentRunTermination: async (run: any) => termination(run) });
  const callbacks = { assertExecutionInputAllowed: () => undefined, publishAgentEvent: vi.fn(), commitPlatformBindingChange: async () => undefined,
    buildMemberExecutionContext: async ({ identity }: any) => new MemberExecutionContext({ identity, teamScoped: true,
      collaboration: new MemberCollaborationContext({ deliverLogicalMessage: async () => ({ accepted: true }) }),
      tasks: { root: identity.root, delegateToNewCopy: async () => { throw Error('Not a business dispatch witness.'); }, assignToExistingCopy: async () => { throw Error('Not a business dispatch witness.'); } } as never }) };
  const dependencies = { agentRunManager: manager as never, activityInspector: { inspect: () => ({ kind: 'present' }) } as never,
    memoryLocator: { getLocation: (_scope: unknown, id: string) => ({ memoryDir: `/tmp/test-unused-${id}` }) } as never };
  const factory = new FlatTeamExecutionFactory(dependencies);
  const teams = new RootTeamExecutionDirectory(factory);
  const rootAgents = new RootAgentExecutionRegistry({ root, callbacks, ...dependencies });
  return { root, kind, factory, callbacks, manager, active, acquired, stopped, stop, stopFailures, teams, rootAgents, providerEvents };
}

/** Team members start on first work: deliver one input to each exact member, as a teammate or seed would. */
export async function activateTeamMembers(teamRun: { postMessage(message: AgentInputUserMessage, agentRunId: string): Promise<{ accepted: boolean }> }, agentRunIds: readonly string[]) {
  for (const agentRunId of agentRunIds) {
    const result = await teamRun.postMessage(new AgentInputUserMessage('Work for this member'), agentRunId);
    if (!result.accepted) throw new Error(`Team member '${agentRunId}' did not accept its first work.`);
  }
}
const now = '2026-10-03T00:00:00.000Z';
/** Saved conversations are present (the restore precondition), as the registries' controlled inspector says. */
const presentConversation = { inspect: () => ({ kind: 'present' }) };
const agentSource = (n: any) => ({ kind: 'agent', agentDefinitionId: n.agentDefinitionId,
  launchConfiguration: { runtimeKind: n.runtimeKind, llmModelIdentifier: n.llmModelIdentifier, llmConfig: n.llmConfig,
    autoExecuteTools: n.autoExecuteTools, workspaceRootPath: n.workspaceRootPath } });
const teamSource = (n: any) => ({ kind: 'agent_team', teamDefinitionId: n.teamDefinitionId,
  coordinatorAddress: n.coordinatorAddress, defaultLaunchConfiguration: n.defaultLaunchConfiguration, handoffs: [],
  members: n.children.map((c: any) => ({ address: c.address, agentDefinitionId: c.agentDefinitionId })) });

export async function nestedReleaseScenario(kind: RootSubjectKind) {
  const f = releaseGenerationFixture(kind);
  const managerNode = testAgentNode('/Manager', { agentRunId: kind === 'agent' ? 'root' : 'manager' });
  const teamNode = testAgentTeamNode({ address: '/Workers', teamRunId: 'A-team', coordinatorAddress: '/Workers/Lead',
    children: [testAgentNode('/Workers/Lead', { agentRunId: 'A-lead' })] });
  const nestedNode = testAgentTeamNode({ address: '/Workers/Nested', teamRunId: 'A-nested', coordinatorAddress: '/Workers/Nested/Lead',
    children: [testAgentNode('/Workers/Nested/Lead', { agentRunId: 'A-nested-lead' })] });
  const childNode = testAgentNode('/Workers/Child', { agentRunId: 'A-child' });
  const grandNode = testAgentNode('/Workers/Nested/Grand', { agentRunId: 'A-grand' });
  let rootTeam: any = null, resolver: TeamRunResolver | null = null;
  if (kind === 'agent_team') {
    const rootNode = testAgentTeamNode({ address: '/', teamRunId: 'root', coordinatorAddress: '/Manager', children: [managerNode] });
    const prepared = await f.factory.beginMaterialization({ physicalScope: createRootExecutionPhysicalScope({ root: f.root, ancestorTeamRunIds: [] }),
      teamNode: rootNode, handoffs: [], activationMode: 'fresh', callbacks: f.callbacks }).prepare();
    prepared.commitAfterDurability(); rootTeam = prepared.teamRun;
    await activateTeamMembers(rootTeam, ['manager']);
  } else {
    const prepared = await f.rootAgents.prepareConfigured(managerNode, 'fresh');
    prepared.commitAfterDurability(); await prepared.handle.getOrCreateAgentRun();
  }
  const controls: any[] = [];
  async function commit(operation: any) {
    const prepared = await operation.prepare(); prepared.sealForCommit(); prepared.commitAfterDurability();
    return prepared;
  }
  const teamCommand = { address: teamNode.address, teamRunId: teamNode.teamRunId, handoffs: [], teamNode };
  const teamOp = rootTeam ? rootTeam.beginTaskTeam(teamCommand) : f.teams.beginRootTaskTeam({ task: teamCommand,
    physicalScope: createRootExecutionPhysicalScope({ root: f.root, ancestorTeamRunIds: ['A-team'] }), callbacks: f.callbacks });
  const oldTeam = (await commit(teamOp)).preparedTeamRuns[0];
  await activateTeamMembers(oldTeam, ['A-lead']); // The coordinator starts with the delegated work.
  if (!rootTeam) f.teams.reserveTaskSubtree([oldTeam]).commit();
  const childOp = oldTeam.beginTaskAgent({ address: childNode.address, agentRunId: 'A-child', sourceNode: childNode }); await commit(childOp);
  const nestedOp = oldTeam.beginTaskTeam({ address: nestedNode.address, teamRunId: 'A-nested', handoffs: [], teamNode: nestedNode });
  const oldNested = (await commit(nestedOp)).preparedTeamRuns[0];
  await activateTeamMembers(oldNested, ['A-nested-lead']);
  const grandOp = oldNested.beginTaskAgent({ address: grandNode.address, agentRunId: 'A-grand', sourceNode: grandNode }); await commit(grandOp);
  if (!rootTeam) f.teams.reserveTaskSubtree([oldNested]).commit();
  const copies = ['A-helper', 'B-worker', 'borrowed'].map(id => testAgentNode(`/${id}`, { agentRunId: id }));
  for (const node of copies) {
    const input = { address: node.address, agentRunId: node.agentRunId, sourceNode: node };
    const op = rootTeam ? rootTeam.beginTaskAgent(input) : f.rootAgents.beginTaskPreparation(input);
    await commit(op); if (node.agentRunId === 'A-helper') controls.push({ execution: { agentRunId: 'A-helper' }, operation: op });
  }
  for (const [execution, operation] of [[{ teamRunId: 'A-team' }, teamOp], [{ agentRunId: 'A-child' }, childOp],
    [{ teamRunId: 'A-nested' }, nestedOp], [{ agentRunId: 'A-grand' }, grandOp]] as const) {
    controls.push({ execution, operation });
  }
  const agentProjection = (n: any) => projectTaskAgentExecution({ address: n.address, agentRunId: n.agentRunId,
    delegatorAgentRunId: managerNode.agentRunId, startedAt: now, source: agentSource(n) as never });
  const nested = { ...projectTaskTeamExecution({ node: nestedNode, delegatorAgentRunId: 'A-lead', startedAt: now,
    source: teamSource(nestedNode) as never }), taskExecutions: [agentProjection(grandNode)] };
  const task = { ...projectTaskTeamExecution({ node: teamNode, delegatorAgentRunId: managerNode.agentRunId, startedAt: now,
    source: teamSource(teamNode) as never }), taskExecutions: [agentProjection(childNode), nested] };
  const tasks = [task, agentProjection(copies[0]), agentProjection(copies[1]), agentProjection(copies[2])];
  let tree: any, index: any, adapter: any;
  if (rootTeam) {
    const base = testExecutionTree({ rootTeamRunId: 'root', children: [managerNode], coordinatorAddress: '/Manager' });
    tree = { ...base, rootTeam: { ...base.rootTeam, taskExecutions: tasks } }; index = new TeamExecutionIndex(tree);
    resolver = new TeamRunResolver({ rootTeamRun: rootTeam, getIndex: () => index });
    resolver.registerManaged(oldTeam); resolver.registerManaged(oldNested);
    adapter = new TeamTaskExecutionAdapter({ rootTeamRunId: 'root', config: testTeamRunConfig({ rootTeamRunId: 'root', children: [managerNode], coordinatorAddress: '/Manager' }),
      getIndex: () => index, teamRunResolver: resolver, requireTeamRun: async (id: string) => { const run = resolver!.getActive(id); if (!run) throw Error('Missing active host'); return run; },
      tokenUsageMigrationReadiness: {}, publish: vi.fn(), activityInspector: presentConversation } as never);
  } else {
    if (kind === 'agent_org') {
      const base = testAgentOrgExecutionTree({ orgRunId: 'root', members: [testOrgAgentNode('/Manager', 'manager')] });
      tree = { ...base, rootOrg: { ...base.rootOrg, taskExecutions: tasks } }; index = new AgentOrgExecutionIndex(tree);
    } else {
      tree = { subjectKind: 'agent', createdAt: now, host: { address: '/Manager', agentRunId: 'root', agentDefinitionId: 'manager' }, collaborators: [], taskExecutions: tasks };
      index = new StandaloneRootExecutionIndex(tree);
    }
    const options = { root: f.root, rootAgents: f.rootAgents, teams: f.teams, callbacks: f.callbacks, getTree: () => tree, getIndex: () => index, tokenUsageReadiness: {}, publishTaskExecutionsClosed: vi.fn(), publishTaskExecutionsReopened: vi.fn(), activityInspector: presentConversation };
    adapter = kind === 'agent_org' ? new AgentOrgTaskExecutionAdapter(options as never) : new StandaloneRootTaskExecutionAdapter(options as never);
  }
  // Original exact controls observed at the root registration boundary, not reconstructed by lookup.
  vi.spyOn(adapter, 'registrationFor').mockImplementation((ref: any) => {
    const control = controls.find(c => taskExecutionReferenceKey(c.execution) === taskExecutionReferenceKey(ref));
    return control ? { target: { root: f.root, execution: control.execution, ingressAgentRunId: '' }, ownedAgentRunIds: [], operation: control.operation } : null;
  });
  // The Task side alone knows which runs belong to Task A (assigned Team, its delegated copies, helper) and Task B.
  const resources = new InMemoryTaskExecutionResources();
  resources.addTask('A'); resources.addTask('B');
  const hostRoot = f.root, assigned = { role: 'assigned' as const, assignedBy: managerNode.agentRunId, hostRoot };
  await resources.linkNewTaskExecution({ ...assigned, taskId: 'A', execution: { teamRunId: 'A-team' }, teamCoordinatorAgentRunId: 'A-lead' });
  for (const agentRun of [{ agentRunId: 'A-child' }, { teamRunId: 'A-nested' }, { agentRunId: 'A-grand' }]) {
    await resources.linkNewTaskExecution({ role: 'delegated', creator: { teamRunId: 'A-team' }, hostRoot, execution: agentRun });
  }
  await resources.linkNewTaskExecution({ role: 'broughtIn', creator: { teamRunId: 'A-team' }, hostRoot, execution: { agentRunId: 'A-helper' } });
  await resources.linkNewTaskExecution({ ...assigned, taskId: 'B', execution: { agentRunId: 'B-worker' } });
  const quiet = rootTeam ? await rootTeam.tryShutDownDirectTaskExecutionIfQuiet({ teamRunId: 'A-team' })
    : await f.teams.tryShutDownRootTaskTeamIfQuiet('A-team');
  if (!quiet) throw Error('Fixture must reach actual verified quiet shutdown');
  if (resolver) resolver.unregisterTerminated(); else f.teams.unregisterTerminated();
  const getManaged = (id: string) => resolver ? resolver.getManaged(id) : f.teams.getManaged(id);
  return { ...f, tree, adapter, rootTeam, resources, getManaged, retireTerminated: () => resolver ? resolver.unregisterTerminated() : f.teams.unregisterTerminated(), oldTeam, oldNested, managerId: managerNode.agentRunId,
    requested: [{ teamRunId: 'A-team' }, { agentRunId: 'A-child' }, { teamRunId: 'A-nested' }, { agentRunId: 'A-grand' }, { agentRunId: 'A-helper' }] };
}
