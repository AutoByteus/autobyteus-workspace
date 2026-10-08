import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentInputUserMessage } from 'autobyteus-ts/agent/message/agent-input-user-message.js';
import { AgentRunEventType, type AgentRunEvent } from '../../../src/agent-execution/domain/agent-run-event.js';
import { createRootExecutionIdentity, createRootExecutionPhysicalScope, type RootSubjectKind } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import { FlatTeamExecutionFactory } from '../../../src/agent-team-execution/local/flat-team-execution-factory.js';
import type { TeamRun } from '../../../src/agent-team-execution/domain/team-run.js';
import type { TaskExecutionPreparationOperation } from '../../../src/agent-team-execution/domain/prepared-task-execution.js';
import { activateTeamMembers, releaseGenerationFixture } from '../../fixtures/task-release-generation-fixtures.js';
import { testAgentNode, testAgentTeamNode } from '../../fixtures/current-team-run-fixtures.js';
import { observeConfiguredHandles } from '../agent-org-execution/helpers/task-publication-handles.js';

afterEach(() => vi.restoreAllMocks());

// Actual directory / Team registries / factory / handles. Provider termination, business
// closure and client are controlled; this is not an all-root real-provider/UI acceptance.
type Placement = 'root-team' | 'nested-team' | 'nested-agent';
const kinds = ['agent', 'agent_team', 'agent_org'] as const;
const placements = ['root-team', 'nested-team', 'nested-agent'] as const;
const teamNode = (address: string, id: string, two = true) => {
  const memberBase = address === '/' ? '' : address;
  return testAgentTeamNode({
    address: address as never, teamRunId: id, coordinatorAddress: `${memberBase}/Lead` as never,
    children: [testAgentNode(`${memberBase}/Lead`, { agentRunId: `${id}-lead` }),
      ...(two ? [testAgentNode(`${memberBase}/Reader`, { agentRunId: `${id}-reader` })] : [])],
  });
};

async function fixture(kind: RootSubjectKind, placement: Placement) {
  const f = releaseGenerationFixture(kind);
  const listeners = new Map<string, (event: AgentRunEvent) => void>();
  const control: { mode: 'pending' | 'failed' | null; hold: Promise<void> | null } = { mode: null, hold: null };
  let targetIds: string[] = [];
  const emit = (id: string, status: 'idle' | 'offline') => listeners.get(id)?.({
    eventType: AgentRunEventType.AGENT_STATUS, runId: id, payload: { status }, statusHint: status === 'idle' ? 'IDLE' : null,
  });
  f.manager.releaseExactRun = vi.fn(async (run: any) => {
    if (run.runId === targetIds[0]) {
      if (control.hold) await control.hold;
      if (control.mode === 'pending') return { accepted: false, code: 'CONTROLLED_EXACT_RELEASE_PENDING' };
      if (control.mode === 'failed') throw new Error('Controlled exact provider stop failed');
    }
    const wasActive = run.isActive();
    const result = await f.stop(run);
    if (result.accepted && wasActive) emit(run.runId, 'offline');
    return result;
  });
  f.providerEvents.subscribe = (run, listener) => {
    listeners.set(run.runId, listener); emit(run.runId, 'idle');
    return () => { listeners.delete(run.runId); };
  };
  const scope = (ids: string[]) => createRootExecutionPhysicalScope({ root: f.root, ancestorTeamRunIds: ids });
  const rootTask = (node: ReturnType<typeof teamNode>) => f.teams.beginRootTaskTeam({
    task: { address: node.address, teamRunId: node.teamRunId, teamNode: node, handoffs: [] },
    physicalScope: scope([node.teamRunId]), callbacks: f.callbacks,
  });
  // A committed task Team has no started member; each member starts on its first work.
  const commit = async (operation: TaskExecutionPreparationOperation, directory = false, start: readonly string[] = []) => {
    const prepared = await operation.prepare();
    const count = f.callbacks.publishAgentEvent.mock.calls.length;
    prepared.sealForCommit(); prepared.commitAfterDurability();
    if (directory) f.teams.reserveTaskSubtree(prepared.preparedTeamRuns).commit();
    if (start.length) await activateTeamMembers(prepared.preparedTeamRuns[0], start);
    return { prepared, count };
  };
  let rootTeam: TeamRun | null = null;
  if (kind === 'agent_team') {
    const rootNode = testAgentTeamNode({ address: '/', teamRunId: 'root', coordinatorAddress: '/Manager',
      children: [testAgentNode('/Manager', { agentRunId: 'manager' })] });
    const prepared = await f.factory.beginMaterialization({ physicalScope: scope([]), teamNode: rootNode,
      handoffs: [], activationMode: 'fresh', callbacks: f.callbacks }).prepare();
    prepared.commitAfterDurability(); rootTeam = prepared.teamRun;
    await activateTeamMembers(rootTeam, ['manager']);
  } else {
    const prepared = await f.rootAgents.prepareConfigured(testAgentNode('/Manager', { agentRunId: 'manager' }), 'fresh');
    prepared.commitAfterDurability(); await prepared.handle.getOrCreateAgentRun();
  }
  // Independent current runs are not part of the target release assembly.
  for (const id of ['B-worker', 'borrowed']) {
    const node = testAgentNode(`/${id}`, { agentRunId: id });
    await commit(rootTeam ? rootTeam.beginTaskAgent({ address: node.address, agentRunId: id, sourceNode: node })
      : f.rootAgents.beginTaskPreparation({ address: node.address, agentRunId: id, sourceNode: node }));
  }
  let parent = rootTeam;
  let releaseParent: (() => Promise<unknown>) | null = null;
  if (placement !== 'root-team') {
    const host = teamNode('/Host', 'host', false);
    const owner = parent;
    const op = parent ? parent.beginTaskTeam({ address: host.address, teamRunId: host.teamRunId, teamNode: host, handoffs: [] }) : rootTask(host);
    parent = (await commit(op, !parent, ['host-lead'])).prepared.preparedTeamRuns[0];
    releaseParent = () => owner ? owner.releaseDirectTaskExecution({ teamRunId: host.teamRunId }) : f.teams.releaseTask(host.teamRunId);
  }
  const node = teamNode(placement === 'root-team' ? '/Workers' : '/Host/Workers', 'target');
  const agent = testAgentNode('/Host/Worker', { agentRunId: 'target-agent' });
  const reference = placement === 'nested-agent' ? { agentRunId: agent.agentRunId } : { teamRunId: node.teamRunId };
  targetIds = placement === 'nested-agent' ? [agent.agentRunId] : node.children.map(n => n.kind === 'agent' ? n.agentRunId : 'invalid');
  const operation = placement === 'nested-agent'
    ? parent!.beginTaskAgent({ address: agent.address, agentRunId: agent.agentRunId, sourceNode: agent })
    : parent ? parent.beginTaskTeam({ address: node.address, teamRunId: node.teamRunId, teamNode: node, handoffs: [] }) : rootTask(node);
  const { prepared, count } = await commit(operation, !parent, placement === 'nested-agent' ? [] : targetIds);
  const statuses = () => f.callbacks.publishAgentEvent.mock.calls
    .filter(([identity, event]) => targetIds.includes(identity.agentRunId) && event.kind === 'agent_run' && event.event.eventType === AgentRunEventType.AGENT_STATUS)
    .map(([identity, event]) => ({ id: identity.agentRunId, address: identity.memberAddress, root: identity.root, status: event.event.payload.status }));
  expect(f.callbacks.publishAgentEvent.mock.calls.slice(count)
    .filter(([, event]) => event.kind === 'agent_run').map(([id]) => id.agentRunId)).toEqual(targetIds);
  const idle = statuses(); expect(idle.map(s => s.status)).toEqual(targetIds.map(() => 'idle'));
  f.callbacks.publishAgentEvent.mockClear();
  const acquired = [...f.acquired];
  const release = () => parent ? parent.releaseDirectTaskExecution(reference) : f.teams.releaseTask(node.teamRunId);
  const input = () => (placement === 'nested-agent' ? parent! : prepared.preparedTeamRuns[0])
    .postMessage(new AgentInputUserMessage('Late input must not wake closed work'), targetIds[0]);
  const assertProtected = () => {
    for (const id of ['manager', 'B-worker', 'borrowed', ...(placement !== 'root-team' ? ['host-lead'] : [])]) {
      expect(f.active.get(id)?.isActive()).toBe(true);
      expect(f.stopped.some(run => run.runId === id)).toBe(false);
    }
    expect(f.acquired).toEqual(acquired); // No reprepare/provider reacquisition on cleanup retry.
  };
  return { ...f, control, prepared, operation, targetIds, idle, statuses, release, input, releaseParent, commit, assertProtected, acquired };
}

for (const kind of kinds) for (const placement of placements) describe(`${kind} ${placement} terminal publication`, () => {
  it('forwards exact terminal transitions and keeps successful release idempotent', async () => {
    const f = await fixture(kind, placement);
    expect(await f.release()).toEqual({ accepted: true });
    expect(f.statuses()).toEqual(f.idle.map(s => ({ ...s, status: 'offline' })));
    f.assertProtected();
    const stops = f.manager.releaseExactRun.mock.calls.length;
    expect(await f.release()).toEqual({ accepted: true });
    expect(await f.operation.release()).toEqual({ accepted: true });
    expect(f.manager.releaseExactRun).toHaveBeenCalledTimes(stops);
    expect(f.statuses()).toHaveLength(f.targetIds.length);
    await expect(f.operation.prepare()).rejects.toThrow('cancelled');
    f.assertProtected();
  });

  it.each(['pending', 'failed'] as const)('retains live event delivery and exact authority across %s stop and retry', async mode => {
    const f = await fixture(kind, placement); f.control.mode = mode;
    if (mode === 'pending') expect(await f.release()).toMatchObject({ accepted: false });
    else await expect(f.release()).rejects.toBeInstanceOf(Error);
    expect(f.statuses()).toEqual(f.idle.slice(1).map(s => ({ ...s, status: 'offline' })));
    expect(f.active.get(f.targetIds[0])?.isActive()).toBe(true);
    if (f.prepared.preparedTeamRuns.length) expect(f.prepared.preparedTeamRuns[0].isTerminated()).toBe(false);
    await expect(f.input()).rejects.toThrow();
    f.assertProtected();
    const exactOutstanding = f.acquired.find(run => run.runId === f.targetIds[0]);
    f.manager.releaseExactRun.mockClear(); f.control.mode = null;
    expect(await f.release()).toEqual({ accepted: true });
    expect(f.manager.releaseExactRun.mock.calls.length).toBeGreaterThan(0);
    expect(f.manager.releaseExactRun.mock.calls.every(([run]) => run === exactOutstanding)).toBe(true);
    expect(f.statuses()).toEqual([...f.idle.slice(1), f.idle[0]].map(s => ({ ...s, status: 'offline' })));
    const stops = f.manager.releaseExactRun.mock.calls.length;
    expect(await f.release()).toEqual({ accepted: true });
    expect(f.manager.releaseExactRun).toHaveBeenCalledTimes(stops);
    f.assertProtected();
  });
});

it.each(kinds)('%s recursive committed teardown preserves parent/child/Agent terminal callbacks through every gate', async kind => {
  const f = await fixture(kind, 'nested-team');
  const child = f.prepared.preparedTeamRuns[0];
  const node = testAgentNode('/Host/Workers/Grand', { agentRunId: 'grand-agent' });
  const grand = child.beginTaskAgent({ address: node.address, agentRunId: node.agentRunId, sourceNode: node });
  await f.commit(grand);
  f.callbacks.publishAgentEvent.mockClear();
  const acquired = [...f.acquired];
  // The lifetime owner cancels all registered controls before it initiates/drains release.
  f.operation.cancel(); grand.cancel();
  expect(await Promise.all([f.releaseParent!(), f.operation.release(), grand.release()]))
    .toEqual([{ accepted: true }, { accepted: true }, { accepted: true }]);
  const terminal = f.callbacks.publishAgentEvent.mock.calls.filter(([, event]) =>
    event.kind === 'agent_run' && event.event.eventType === AgentRunEventType.AGENT_STATUS);
  expect(terminal.map(([id]) => id.agentRunId).sort()).toEqual(['grand-agent', 'host-lead', ...f.targetIds].sort());
  for (const [identity, event] of terminal) {
    expect(identity.root).toEqual(f.root); expect(event.event.payload.status).toBe('offline');
    expect(f.active.has(identity.agentRunId)).toBe(false);
  }
  for (const id of ['manager', 'B-worker', 'borrowed']) {
    expect(f.active.get(id)?.isActive()).toBe(true);
    expect(f.stopped.some(run => run.runId === id)).toBe(false);
  }
  expect(await f.releaseParent!()).toEqual({ accepted: true });
  expect(await f.operation.release()).toEqual({ accepted: true });
  expect(await grand.release()).toEqual({ accepted: true });
  expect(f.acquired).toEqual(acquired); expect(f.callbacks.publishAgentEvent.mock.calls).toHaveLength(terminal.length);
});

for (const kind of kinds) it.each(['agent', 'team'] as const)(`${kind} keeps aborted nested %s callbacks private, including late callbacks`, async subject => {
  // Controlled handle events can occur during private prepare and after its abort. The
  // actual local owners/factories/gates must discard both, not relax the gate globally.
  const handles = observeConfiguredHandles();
  const root = createRootExecutionIdentity({ rootSubjectKind: kind, rootRunId: 'root' });
  const host = teamNode(kind === 'agent_team' ? '/' : '/Host', kind === 'agent_team' ? 'root' : 'host', false);
  const forward = vi.fn();
  const callbacks = { publishAgentEvent: forward, buildMemberExecutionContext: vi.fn(async () => ({} as never)), commitPlatformBindingChange: vi.fn() };
  const parent = await new FlatTeamExecutionFactory().beginMaterialization({
    teamNode: host, physicalScope: createRootExecutionPhysicalScope({ root, ancestorTeamRunIds: kind === 'agent_team' ? [] : ['host'] }),
    activationMode: 'fresh', handoffs: [], callbacks,
  }).prepare();
  parent.commitAfterDurability(); forward.mockClear();
  const target = teamNode('/Private', 'private', false);
  const agent = testAgentNode('/Private/Agent', { agentRunId: 'private-agent' });
  const operation = subject === 'team' ? parent.teamRun.beginTaskTeam({ address: target.address, teamRunId: target.teamRunId, teamNode: target, handoffs: [] })
    : parent.teamRun.beginTaskAgent({ address: agent.address, agentRunId: agent.agentRunId, sourceNode: agent });
  const prepared = await operation.prepare();
  expect(forward).not.toHaveBeenCalled();
  prepared.sealForCommit(); operation.cancel(); await prepared.abort();
  expect(await operation.release()).toEqual({ accepted: true });
  for (const [id, execution] of handles) if (id.startsWith('private-')) {
    execution.emit('offline'); execution.emit('running');
    expect(execution.handle.postMessage).not.toHaveBeenCalled();
  }
  expect(forward).not.toHaveBeenCalled();
  expect(() => prepared.commitAfterDurability()).toThrow();
  await expect(operation.prepare()).rejects.toThrow('cancelled');
});

it.each(kinds)('%s published Team initiates independent member stops before slow first drain without fabricating terminal status', async kind => {
  const f = await fixture(kind, 'root-team');
  let unblock!: () => void;
  f.control.hold = new Promise<void>(resolve => { unblock = resolve; });
  let settled = false;
  const release = f.release(); void release.then(() => { settled = true; }, () => { settled = true; });
  try {
    await vi.waitFor(() => expect(f.statuses()).toEqual(f.idle.slice(1).map(s => ({ ...s, status: 'offline' }))));
    expect(settled).toBe(false); expect(f.active.get(f.targetIds[0])?.isActive()).toBe(true);
    f.assertProtected();
  } finally { unblock(); }
  expect(await release).toEqual({ accepted: true }); f.assertProtected();
  expect(f.statuses()).toEqual([...f.idle.slice(1), f.idle[0]].map(s => ({ ...s, status: 'offline' })));
});
