import { describe, expect, it, vi } from 'vitest';
import { AgentInputUserMessage } from 'autobyteus-ts/agent/message/agent-input-user-message.js';
import { RuntimeKind } from '../../../src/runtime-management/runtime-kind-enum.js';
import { AgentRunEventType } from '../../../src/agent-execution/domain/agent-run-event.js';
import { AgentRunActivationCandidate } from '../../../src/agent-execution/services/agent-run-activation-candidate.js';
import { FlatTeamExecutionFactory } from '../../../src/agent-team-execution/local/flat-team-execution-factory.js';
import type { TeamRun } from '../../../src/agent-team-execution/domain/team-run.js';
import { RootTeamExecutionDirectory } from '../../../src/agent-collaboration/execution/backends/root-team-execution-directory.js';
import { MemberCollaborationContext, MemberExecutionContext } from '../../../src/agent-collaboration/execution/domain/member-execution-context.js';
import type { CollaborationAgentPlatformBindingChange } from '../../../src/agent-collaboration/execution/domain/collaboration-agent-platform-binding.js';
import { createRootExecutionIdentity, createRootExecutionPhysicalScope, type RootSubjectKind } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import { projectTaskTeamExecution } from '../../../src/agent-collaboration/execution/task/task-execution-tree-projection.js';
import { adoptStandaloneRootPlatformBinding, replaceStandaloneRootPlatformBindingWithoutConversation } from '../../../src/standalone-agent-run-root/services/standalone-root-tree-mutator.js';
import { adoptAgentOrgPlatformBinding, replaceAgentOrgPlatformBindingWithoutConversation } from '../../../src/agent-org-execution/services/agent-org-run-execution-tree-mutator.js';
import { adoptAgentPlatformBindingInTree, replaceAgentPlatformBindingWithoutConversationInTree } from '../../../src/agent-team-execution/services/team-run-execution-tree-mutator.js';
import { testActivationManager } from '../../fixtures/agent-run-preparation-fixtures.js';
import { testAgentNode, testAgentTeamNode, testExecutionTree } from '../../fixtures/current-team-run-fixtures.js';
import { testAgentOrgExecutionTree, testOrgAgentNode } from '../../fixtures/current-agent-org-run-fixtures.js';

// Actual Team factory, root directory / Team-hosted registry, configured handles, activation planner and
// each root's binding mutator. Only the provider runtime (AgentRun candidates) and the saved
// conversation inspector are controlled. Desktop-app status is user verification (AC-007).
const COPY = 'copy';
const MEMBERS = ['lead', 'reviewer', 'writer'] as const;
type Member = typeof MEMBERS[number];
const runIdOf = (member: Member) => `${COPY}-${member}`;
const now = '2026-10-08T00:00:00.000Z';

const copyNode = (bindings: Partial<Record<Member, string>> = {}) => testAgentTeamNode({
  address: '/Workers', teamRunId: COPY, coordinatorAddress: '/Workers/lead',
  children: MEMBERS.map(member => testAgentNode(`/Workers/${member}`, {
    agentRunId: runIdOf(member), runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: bindings[member] ?? null,
  })),
});

/** A catalog copy, as `delegate_task` records it (an Agent root accepts only collaborators or catalog copies). */
const catalogSource = (node: ReturnType<typeof copyNode>) => ({ kind: 'agent_team', teamDefinitionId: node.teamDefinitionId,
  coordinatorAddress: node.coordinatorAddress, defaultLaunchConfiguration: node.defaultLaunchConfiguration, handoffs: [],
  members: node.children.map(child => ({ address: child.address, agentDefinitionId: (child as { agentDefinitionId: string }).agentDefinitionId })) });

function hostTree(kind: RootSubjectKind, bindings: Partial<Record<Member, string>>) {
  const node = copyNode(bindings);
  const task = projectTaskTeamExecution({ node, delegatorAgentRunId: 'manager', startedAt: now, source: catalogSource(node) as never });
  if (kind === 'agent') {
    return { subjectKind: 'agent', createdAt: now, host: { address: '/Manager', agentRunId: 'root', agentDefinitionId: 'manager' },
      collaborators: [], taskExecutions: [{ ...task, delegatorAgentRunId: 'root' }] } as any;
  }
  if (kind === 'agent_org') {
    const base = testAgentOrgExecutionTree({ orgRunId: 'root', members: [testOrgAgentNode('/Manager', 'manager')] });
    return { ...base, rootOrg: { ...base.rootOrg, taskExecutions: [task] } } as any;
  }
  const base = testExecutionTree({ rootTeamRunId: 'root', coordinatorAddress: '/Manager',
    children: [testAgentNode('/Manager', { agentRunId: 'manager' })] });
  return { ...base, rootTeam: { ...base.rootTeam, taskExecutions: [task] } } as any;
}

async function harness(kind: RootSubjectKind, saved: { bindings?: Partial<Record<Member, string>>; conversations?: Member[] } = {}) {
  const root = createRootExecutionIdentity({ rootSubjectKind: kind, rootRunId: 'root' });
  const active = new Map<string, any>();
  const created: string[] = [], restored: string[] = [];
  const conversations = new Set((saved.conversations ?? []).map(runIdOf));
  const control = { failStart: null as string | null };
  const providerRun = (runId: string) => {
    const run: any = { runId, alive: true, isActive() { return this.alive; }, bindExecutionAdmissionFence: vi.fn(),
      subscribeToEvents: (listener: (event: unknown) => void) => {
        listener({ eventType: AgentRunEventType.AGENT_STATUS, runId, payload: { status: 'idle' }, statusHint: 'IDLE' });
        return () => undefined;
      },
      getStatusSnapshot: () => ({ status: 'idle' }), getInputStateSnapshot: () => null,
      postUserMessage: async () => { conversations.add(runId); return { accepted: true }; },
      reserveUserMessage: async () => ({ reserved: true, reservation: { agentRunId: runId, cancel: vi.fn(),
        commit: () => ({ release: () => { conversations.add(runId); } }) } }) };
    return run;
  };
  let threads = 0;
  const candidate = (runId: string, platformAgentRunId: string, log: string[]) => {
    // Same shape as a real provider start failure (for example a retired AGY model).
    if (runId === control.failStart) throw new Error('AGY_MODEL_UNAVAILABLE: retired-model');
    log.push(runId);
    const run = providerRun(runId);
    return new AgentRunActivationCandidate({ runId, runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId,
      publish: () => { active.set(runId, run); return run; }, abort: async () => ({ kind: 'aborted' }) });
  };
  const stop = async (run: any) => { run.alive = false; active.delete(run.runId); return { accepted: true }; };
  const termination = (run: any) => ({ cancel: () => undefined, commit: () => ({ finish: () => stop(run) }) });
  const manager = testActivationManager({
    newPreparation: async ({ runId }: any) => candidate(runId, `thread-${runId}-${++threads}`, created),
    platformPreparation: async ({ runId, platformAgentRunId }: any) => candidate(runId, platformAgentRunId, restored),
    getActiveRun: (id: string) => active.get(id), releaseExactRun: stop,
    tryPrepareAgentRunTerminationIfQuiescent: async (run: any) => termination(run), prepareAgentRunTermination: async (run: any) => termination(run),
  });

  let tree = hostTree(kind, saved.bindings ?? {});
  const commitPlatformBindingChange = vi.fn(async (change: CollaborationAgentPlatformBindingChange) => {
    if (change.kind === 'adopt_or_retain') {
      const input = { tree, binding: change.binding } as any;
      tree = (kind === 'agent' ? adoptStandaloneRootPlatformBinding(input) : kind === 'agent_org'
        ? adoptAgentOrgPlatformBinding(input) : adoptAgentPlatformBindingInTree(input)).tree;
    } else {
      const input = { tree, replacement: change.replacement } as any;
      tree = kind === 'agent' ? replaceStandaloneRootPlatformBindingWithoutConversation(input) : kind === 'agent_org'
        ? replaceAgentOrgPlatformBindingWithoutConversation(input) : replaceAgentPlatformBindingWithoutConversationInTree(input);
    }
  });
  const callbacks = { assertExecutionInputAllowed: () => undefined, publishAgentEvent: vi.fn(), commitPlatformBindingChange,
    buildMemberExecutionContext: async ({ identity }: any) => new MemberExecutionContext({ identity, teamScoped: true,
      collaboration: new MemberCollaborationContext({ deliverLogicalMessage: async () => ({ accepted: true }) }),
      tasks: { root: identity.root, delegateToNewCopy: async () => { throw Error('Not a dispatch witness.'); }, assignToExistingCopy: async () => { throw Error('Not a dispatch witness.'); } } as never }) };
  const factory = new FlatTeamExecutionFactory({ agentRunManager: manager as never,
    activityInspector: { inspect: ({ agentRunId }: { agentRunId: string }) => ({ kind: conversations.has(agentRunId) ? 'present' : 'none' }) } as never,
    memoryLocator: { getLocation: (_scope: unknown, id: string) => ({ memoryDir: `/tmp/test-lazy-${id}` }) } as never });
  const teams = new RootTeamExecutionDirectory(factory);
  const scope = () => createRootExecutionPhysicalScope({ root, ancestorTeamRunIds: [COPY] });

  // A Team root hosts its copies itself (Team-hosted registry); Agent and Org roots host them in the directory.
  let hostTeam: TeamRun | null = null;
  if (kind === 'agent_team') {
    const prepared = await factory.beginMaterialization({ physicalScope: createRootExecutionPhysicalScope({ root, ancestorTeamRunIds: [] }),
      teamNode: testAgentTeamNode({ address: '/', teamRunId: 'root', coordinatorAddress: '/Manager', children: [testAgentNode('/Manager', { agentRunId: 'manager' })] }),
      handoffs: [], activationMode: 'fresh', callbacks }).prepare();
    prepared.commitAfterDurability(); hostTeam = prepared.teamRun;
  }

  async function delegate() {
    const task = { address: '/Workers' as const, teamRunId: COPY, teamNode: copyNode(), handoffs: [], message: new AgentInputUserMessage('Delegated work') };
    const operation = hostTeam ? hostTeam.beginTaskTeam(task) : teams.beginRootTaskTeam({ task, physicalScope: scope(), callbacks });
    const prepared = await operation.prepare();
    const createdAtPreparation = [...created];
    prepared.sealForCommit();
    const committed = prepared.commitAfterDurability();
    if (!hostTeam) teams.reserveTaskSubtree(prepared.preparedTeamRuns).commit();
    const statusesBeforeSeed = statusesOf(prepared.preparedTeamRuns[0]);
    const receipt = await committed.releaseWork(() => undefined);
    return { operation, prepared, copy: prepared.preparedTeamRuns[0], createdAtPreparation, statusesBeforeSeed, receipt };
  }
  const shutDownIfQuiet = () => hostTeam ? hostTeam.tryShutDownDirectTaskExecutionIfQuiet({ teamRunId: COPY }) : teams.tryShutDownRootTaskTeamIfQuiet(COPY);
  const restore = () => {
    const teamNode = copyNode(savedBindings() as Partial<Record<Member, string>>);
    return hostTeam ? hostTeam.restoreTaskTeam({ assertOpen: () => undefined, handoffs: [], teamNode })
      : teams.restoreRootTaskTeam({ assertOpen: () => undefined, teamNode, handoffs: [], physicalScope: scope(), callbacks });
  };
  const savedBindings = () => {
    const tasks = kind === 'agent' ? tree.taskExecutions : kind === 'agent_org' ? tree.rootOrg.taskExecutions : tree.rootTeam.taskExecutions;
    const copy = tasks.find((task: any) => task.teamRunId === COPY);
    return Object.fromEntries(copy.members.map((member: any) => [member.address.split('/').pop(), member.platformAgentRunId]));
  };
  return { control, active, created, restored, callbacks, commitPlatformBindingChange, delegate, shutDownIfQuiet, restore, savedBindings };
}

const statusesOf = (run: TeamRun) => Object.fromEntries(run.getLeafAgentStatusSnapshots()
  .map(snapshot => [snapshot.execution.memberAddress!.split('/').pop(), snapshot.details.status]));
const work = (text: string) => new AgentInputUserMessage(text);

describe.each(['agent', 'agent_team', 'agent_org'] as const)('%s root: delegated Team copy members start on first work', kind => {
  it('delegation starts only the coordinator; the others stay Offline with no AgentRun or provider binding (AC-001, AC-003, QR-001)', async () => {
    const f = await harness(kind);
    const d = await f.delegate();
    expect(d.createdAtPreparation).toEqual([]);
    expect(d.prepared.stagedPlatformBindings).toEqual([]);
    expect(d.statusesBeforeSeed).toEqual({ lead: 'offline', reviewer: 'offline', writer: 'offline' });
    expect(d.receipt).toMatchObject({ accepted: true, agentRunId: runIdOf('lead') });
    expect(f.created).toEqual([runIdOf('lead')]);
    expect([...f.active.keys()]).toEqual([runIdOf('lead')]);
    expect(statusesOf(d.copy)).toEqual({ lead: 'idle', reviewer: 'offline', writer: 'offline' });
    expect(f.savedBindings()).toEqual({ lead: expect.stringMatching(/^thread-copy-lead-/), reviewer: null, writer: null });
    expect(f.commitPlatformBindingChange).toHaveBeenCalledTimes(1);
  });

  it('a handoff starts the not-started member (initializing, then idle) and adopts its binding; untouched members stay Offline (AC-002)', async () => {
    const f = await harness(kind);
    const d = await f.delegate();
    f.callbacks.publishAgentEvent.mockClear();
    await expect(d.copy.postMessage(work('Review this'), runIdOf('reviewer'))).resolves.toMatchObject({ accepted: true });
    expect(f.created).toEqual([runIdOf('lead'), runIdOf('reviewer')]);
    expect(statusesOf(d.copy)).toEqual({ lead: 'idle', reviewer: 'idle', writer: 'offline' });
    expect(f.savedBindings()).toEqual({ lead: expect.any(String), reviewer: expect.stringMatching(/^thread-copy-reviewer-/), writer: null });
    const reviewerStatuses = f.callbacks.publishAgentEvent.mock.calls
      .filter(([identity, event]) => identity.agentRunId === runIdOf('reviewer') && (event.kind === 'status_overlay' || event.kind === 'agent_run'))
      .map(([, event]) => event.kind === 'status_overlay' ? event.snapshot.details.status : event.event.payload.status);
    expect(reviewerStatuses).toEqual(['initializing', 'idle']);
  });

  it('a not-started member that cannot start rejects the delivery and shows error; the coordinator is unaffected (AC-004)', async () => {
    const f = await harness(kind);
    const d = await f.delegate();
    f.control.failStart = runIdOf('writer');
    const result = await d.copy.postMessage(work('Write it'), runIdOf('writer'));
    expect(result).toMatchObject({ accepted: false, agentRunId: runIdOf('writer') });
    expect(statusesOf(d.copy)).toEqual({ lead: 'idle', reviewer: 'offline', writer: 'error' });
    expect([...f.active.keys()]).toEqual([runIdOf('lead')]);
    expect(f.savedBindings()).toEqual({ lead: expect.any(String), reviewer: null, writer: null });
  });

  it('teammate delivery (input reservation) starts the not-started recipient and adopts its binding (AC-002)', async () => {
    const f = await harness(kind);
    const d = await f.delegate();
    const result = await d.copy.reserveDirectAgentInput(runIdOf('reviewer'), work('Handoff: review this'));
    if (!result.reserved) throw new Error(`Reservation rejected: ${result.message}`);
    result.reservation.commit().release();
    expect(f.created).toEqual([runIdOf('lead'), runIdOf('reviewer')]);
    expect(statusesOf(d.copy)).toEqual({ lead: 'idle', reviewer: 'idle', writer: 'offline' });
    expect(f.savedBindings()).toEqual({ lead: expect.any(String), reviewer: expect.stringMatching(/^thread-copy-reviewer-/), writer: null });
  });

  it('teammate delivery to a not-started member that cannot start is rejected with the cause; the member shows error (AC-004)', async () => {
    const f = await harness(kind);
    const d = await f.delegate();
    f.control.failStart = runIdOf('writer');
    const result = await d.copy.reserveDirectAgentInput(runIdOf('writer'), work('Handoff: write it'));
    expect(result).toEqual({ reserved: false, code: 'AGENT_RUN_ACTIVATION_FAILED', message: expect.stringContaining('AGY_MODEL_UNAVAILABLE') });
    expect(statusesOf(d.copy)).toEqual({ lead: 'idle', reviewer: 'offline', writer: 'error' });
    expect([...f.active.keys()]).toEqual([runIdOf('lead')]);
    expect(f.savedBindings()).toEqual({ lead: expect.any(String), reviewer: null, writer: null });
    // The error clears once the member can start: a later delivery starts it normally.
    f.control.failStart = null;
    const retry = await d.copy.reserveDirectAgentInput(runIdOf('writer'), work('Handoff: write it'));
    expect(retry.reserved).toBe(true);
    expect(statusesOf(d.copy)).toEqual({ lead: 'idle', reviewer: 'offline', writer: 'idle' });
  });

  it('a coordinator that cannot start fails the delegated seed, which dispatch reports as a failed delegation (AC-004)', async () => {
    const f = await harness(kind);
    f.control.failStart = runIdOf('lead');
    const d = await f.delegate();
    expect(d.receipt).toMatchObject({ accepted: false, agentRunId: runIdOf('lead') });
    expect(f.created).toEqual([]);
    expect(f.active.size).toBe(0);
    expect(f.savedBindings()).toEqual({ lead: null, reviewer: null, writer: null });
    d.operation.cancel();
    expect(await d.operation.release()).toEqual({ accepted: true });
  });

  it('idle shutdown and restore of a copy with never-started members start only addressed members (AC-005)', async () => {
    const f = await harness(kind);
    const d = await f.delegate();
    const leadThread = f.savedBindings().lead;
    await expect(f.shutDownIfQuiet()).resolves.toBe(true);
    expect(f.active.size).toBe(0);
    const restored = await f.restore();
    expect(statusesOf(restored)).toEqual({ lead: 'offline', reviewer: 'offline', writer: 'offline' });
    expect(f.created).toEqual([runIdOf('lead')]); expect(f.restored).toEqual([]);
    await expect(restored.postMessage(work('Follow-up'), runIdOf('lead'))).resolves.toMatchObject({ accepted: true });
    expect(f.restored).toEqual([runIdOf('lead')]);
    await expect(restored.postMessage(work('First work for writer'), runIdOf('writer'))).resolves.toMatchObject({ accepted: true });
    expect(f.created).toEqual([runIdOf('lead'), runIdOf('writer')]);
    expect(statusesOf(restored)).toEqual({ lead: 'idle', reviewer: 'offline', writer: 'idle' });
    expect(f.savedBindings()).toEqual({ lead: leadThread, reviewer: null, writer: expect.stringMatching(/^thread-copy-writer-/) });
    expect(d.copy).not.toBe(restored);
  });

  it('a copy delegated before the change (all members bound, unused ones without conversation) restores lazily (AC-005)', async () => {
    const f = await harness(kind, {
      bindings: { lead: 'thread-legacy-lead', reviewer: 'thread-legacy-reviewer', writer: 'thread-legacy-writer' },
      conversations: ['lead'],
    });
    const restored = await f.restore();
    expect(statusesOf(restored)).toEqual({ lead: 'offline', reviewer: 'offline', writer: 'offline' });
    expect(f.created).toEqual([]); expect(f.restored).toEqual([]);
    await expect(restored.postMessage(work('Continue'), runIdOf('lead'))).resolves.toMatchObject({ accepted: true });
    expect(f.restored).toEqual([runIdOf('lead')]);
    await expect(restored.postMessage(work('Now review'), runIdOf('reviewer'))).resolves.toMatchObject({ accepted: true });
    expect(f.created).toEqual([runIdOf('reviewer')]);
    expect(statusesOf(restored)).toEqual({ lead: 'idle', reviewer: 'idle', writer: 'offline' });
    expect(f.savedBindings()).toEqual({ lead: 'thread-legacy-lead', reviewer: expect.stringMatching(/^thread-copy-reviewer-/), writer: 'thread-legacy-writer' });
  });
});
