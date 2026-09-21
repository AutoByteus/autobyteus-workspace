import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentInputUserMessage } from 'autobyteus-ts/agent/message/agent-input-user-message.js';
import { RuntimeKind } from '../../../src/runtime-management/runtime-kind-enum.js';
import { AgentRunEventType, type AgentRunEvent } from '../../../src/agent-execution/domain/agent-run-event.js';
import { AgentRunActivationCandidate } from '../../../src/agent-execution/services/agent-run-activation-candidate.js';
import { FlatTeamExecutionFactory } from '../../../src/agent-team-execution/local/flat-team-execution-factory.js';
import { materializeTeamRoot } from '../../../src/agent-team-execution/services/team-root-materializer.js';
import { MemberExecutionContextBuilder } from '../../../src/agent-team-execution/services/member-team-context-builder.js';
import { buildInitialTeamRunExecutionTree } from '../../../src/agent-team-execution/services/team-run-execution-tree-builder.js';
import { AgentOrgExecutionScopeBuilder } from '../../../src/agent-org-execution/services/agent-org-execution-scope-builder.js';
import { AgentOrgRunPersistenceCoordinator } from '../../../src/agent-org-execution/services/agent-org-run-persistence-coordinator.js';
import { validateAgentOrgStatePackage } from '../../../src/agent-org-execution/services/agent-org-state-package-validator.js';
import { AgentOrgTaskDelegationRecordsV1Store } from '../../../src/agent-org-execution/persistence/agent-org-task-delegation-records-v1-store.js';
import { AgentOrgCommunicationMessagesV1Store } from '../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-store.js';
import { AgentOrgRunExecutionTreeStore } from '../../../src/run-history/store/agent-org-run-execution-tree-store.js';
import { TeamRunExecutionTreeStore } from '../../../src/run-history/store/team-run-execution-tree-store.js';
import { TaskDelegationRecordsV1Store } from '../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js';
import { TeamCommunicationV1Store } from '../../../src/services/team-communication/team-communication-v1-store.js';
import { createTaskExecutionIdentityCapabilities } from '../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js';
import { createAgentOrgRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import { testAgentNode, testTeamRunConfig } from '../../fixtures/current-team-run-fixtures.js';
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from '../../fixtures/current-agent-org-run-fixtures.js';

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const fixture = () => {
  const dir = mkdtempSync(join(tmpdir(), 'collab-followup-readiness-')); dirs.push(dir);
  let treeFile = 'agent_org_run_execution_tree.json';
  const order: string[] = [];
  const inputs: string[] = [];
  const active = new Map<string, any>();
  let release: (() => void) | undefined;
  let blocked: string | undefined;
  let fail: string | undefined;
  let gate = Promise.resolve();
  const prepareNewAgentRun = vi.fn(async ({ runId }: { runId: string }) => {
    order.push(`prepare:${runId}`);
    if (runId === blocked) await gate;
    if (runId === fail) throw new Error('controlled readiness failure');
    let listener: ((event: AgentRunEvent) => void) | undefined;
    const acceptInput = () => {
      inputs.push(runId);
      listener?.({ eventType: AgentRunEventType.AGENT_STATUS, runId, payload: { status: 'idle' }, statusHint: 'IDLE' });
    };
    const run = {
      runId, isActive: () => active.has(runId), getStatusSnapshot: () => ({ status: 'idle' }),
      subscribeToEvents: (callback: (event: AgentRunEvent) => void) => { listener = callback; return () => { listener = undefined; }; },
      postUserMessage: async () => { acceptInput(); return { accepted: true }; },
      reserveUserMessage: async () => ({ reserved: true, reservation: {
        agentRunId: runId, cancel: vi.fn(), commit: () => ({ release: acceptInput }),
      } }),
      fenceForRootShutdown: async () => ({ accepted: true }),
      terminate: async () => { active.delete(runId); return { accepted: true }; },
    };
    return new AgentRunActivationCandidate({ runId, runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: `thread-${runId}`,
      publish: () => {
        // This is the actual package writer's bytes, checked before runtime publication.
        expect(readFileSync(join(dir, treeFile), 'utf8')).toContain(`thread-${runId}`);
        order.push(`publish:${runId}`); active.set(runId, run); return run as never;
      }, abort: async () => ({ kind: 'aborted' }),
    });
  });
  const dependencies = { agentRunManager: { prepareNewAgentRun } as never,
    activityInspector: { inspect: () => ({ kind: 'none' }) } as never,
    memoryLocator: { getLocation: () => ({ memoryDir: dir }) } as never,
    workspaceManager: { ensureWorkspaceByRootPath: async () => ({ workspaceId: 'ws' }) } as never };
  return { dir, order, inputs, active, prepareNewAgentRun, dependencies,
    useTeamTree() { treeFile = 'team_run_execution_tree.json'; },
    factory: new FlatTeamExecutionFactory(dependencies),
    block(id: string) { blocked = id; gate = new Promise<void>(resolve => { release = resolve; }); },
    release() { release?.(); }, fail(id: string) { fail = id; },
  };
};
const tasks = createTaskExecutionIdentityCapabilities({ allocateForAgentDefinition: async () => 'new-task-run' });
const org = async (f: ReturnType<typeof fixture>) => {
  const direct = (address: string, id: string) => { const n = testOrgAgentNode(address, id); return { ...n,
    launchConfiguration: { ...n.launchConfiguration, runtimeKind: RuntimeKind.CODEX_APP_SERVER } }; };
  const tree = testAgentOrgExecutionTree({ orgRunId: 'org-lazy', members: [direct('/director', 'director'), direct('/receiver', 'receiver'),
    testOrgTeamNode({ address: '/team', teamRunId: 'mounted', coordinatorAddress: '/team/lead',
      members: [direct('/team/lead', 'lead'), direct('/team/unused', 'unused')] })] });
  const state = validateAgentOrgStatePackage({ executionTree: tree,
    taskRecords: { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'org-lazy', records: [] },
    communicationMessages: { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'org-lazy', messages: [] } });
  const persistence = new AgentOrgRunPersistenceCoordinator({ orgRunId: 'org-lazy', orgMemoryDir: f.dir,
    executionTreeStore: new AgentOrgRunExecutionTreeStore(), taskRecordsStore: new AgentOrgTaskDelegationRecordsV1Store(),
    communicationStore: new AgentOrgCommunicationMessagesV1Store(), enterPersistenceFailStop: vi.fn() });
  return new AgentOrgExecutionScopeBuilder({ ...f.dependencies, flatTeamExecutionFactory: f.factory,
    taskExecutionIdentity: tasks, orgDefinitions: { getDefinitionById: async () => null }, teamDefinitions: { getDefinitionById: async () => null },
  }).build({ state, persistence, activationMode: 'fresh', persistInitialPackage: true });
};
const team = async (f: ReturnType<typeof fixture>, mode: 'fresh' | 'restore') => {
  f.useTeamTree();
  const config = testTeamRunConfig({ rootTeamRunId: 'team-lazy', coordinatorAddress: '/lead', children:
    ['lead', 'unused'].map(id => testAgentNode(`/${id}`, { agentRunId: id, runtimeKind: RuntimeKind.CODEX_APP_SERVER })) });
  return materializeTeamRoot({ config, tree: buildInitialTeamRunExecutionTree({ config, teamDefinitionName: 'Lazy Team', createdAt: '2026-09-13T00:00:00.000Z' }),
    tasks: { schemaVersion: 1, rootTeamRunId: 'team-lazy', records: [] }, messages: { schemaVersion: 1, rootTeamRunId: 'team-lazy', messages: [] },
    mode, persistInitialPackage: true, teamMemoryDir: f.dir, factory: f.factory,
    memberExecutionContextBuilder: new MemberExecutionContextBuilder({ getDefinitionById: async () => null } as never),
    taskExecutionIdentity: tasks, executionTreeStore: new TeamRunExecutionTreeStore(), taskRecordsStore: new TaskDelegationRecordsV1Store(),
    communicationStore: new TeamCommunicationV1Store(), onTerminated: vi.fn(),
  });
};
const identity = (id: string) => createCollaborationMemberExecutionIdentity({ root: createAgentOrgRootExecutionIdentity('org-lazy'), agentRunId: id, memberAddress: `/${id}` });

describe('fresh and restored configured scope use deferred readiness', () => {
  it('publishes the whole coordinator-free Org with four Offline/unstarted workers; inspection starts none', async () => {
    const f = fixture(); const run = await org(f);
    expect(run.isActive()).toBe(true);
    expect(run.getAgentStatusSnapshots()).toHaveLength(4);
    expect(run.getAgentStatusSnapshots().map(s => s.details.status)).toEqual(['offline', 'offline', 'offline', 'offline']);
    const snapshot = await run.openPackageSnapshotConnection(); snapshot.close();
    expect(f.prepareNewAgentRun).not.toHaveBeenCalled();
    expect(() => run.authorizeIdentity(identity('receiver'))).toThrow('not a live execution');
    expect(f.prepareNewAgentRun).not.toHaveBeenCalled();
    await expect(run.deliverLogicalMessage(identity('receiver'), { recipientAddress: '/director', content: 'unauthorized', messageType: 'message', referenceFiles: [] })).rejects.toThrow('not a live execution');
    expect(() => run.authorizeIdentity({ ...identity('director'), memberAddress: '/receiver' })).toThrow('not a live execution');
    expect(() => run.authorizeIdentity(createCollaborationMemberExecutionIdentity({ root: createAgentOrgRootExecutionIdentity('other-root'), memberAddress: '/director', agentRunId: 'director' }))).toThrow();
    expect(f.prepareNewAgentRun).not.toHaveBeenCalled();
    await expect(run.executeAgentCommand('director', { kind: 'post_message', message: new AgentInputUserMessage('start') })).resolves.toMatchObject({ accepted: true });
    await expect(run.deliverLogicalMessage(identity('director'), { recipientAddress: '/receiver', content: 'handoff', messageType: 'handoff', referenceFiles: [] })).resolves.toMatchObject({ accepted: true });
    await expect(run.deliverLogicalMessage(identity('director'), { recipientAddress: '/team', content: 'team work', messageType: 'handoff', referenceFiles: [] })).resolves.toMatchObject({ accepted: true });
    expect(f.inputs).toEqual(['director', 'receiver', 'lead']);
    expect(f.prepareNewAgentRun.mock.calls.map(([x]) => x.runId)).toEqual(['director', 'receiver', 'lead']);
    expect(run.getAgentStatusSnapshots().find(s => s.execution.agentRunId === 'unused')?.details.status).toBe('offline');
    expect(run.getCommunicationSnapshot().messages).toHaveLength(2);
  });
  it('fresh standalone Team stays unstarted until exact input; concurrent first input shares readiness', async () => {
    const f = fixture(); const run = await team(f, 'fresh');
    expect(run.isActive()).toBe(true); expect(f.prepareNewAgentRun).not.toHaveBeenCalled();
    f.block('lead');
    const send = () => run.executeAgentCommand('lead', { kind: 'post_message' as const, message: new AgentInputUserMessage('work') });
    const a = send(); const b = send();
    await vi.waitFor(() => expect(f.prepareNewAgentRun).toHaveBeenCalledTimes(1));
    expect(f.active.size).toBe(0); f.release();
    expect((await Promise.all([a, b])).every(r => r.accepted)).toBe(true);
    expect(f.inputs).toEqual(['lead', 'lead']); expect(f.active.has('unused')).toBe(false);
  });
  it('restores full Offline scope and durably readies only each addressed member', async () => {
    const f = fixture(); const run = await team(f, 'restore');
    expect(run.isActive()).toBe(true);
    expect(run.getLeafAgentStatusSnapshots().map(s => s.details.status)).toEqual(['offline', 'offline']);
    expect(f.prepareNewAgentRun).not.toHaveBeenCalled();
    expect(f.active.size).toBe(0);

    await expect(run.executeAgentCommand('lead', {
      kind: 'post_message', message: new AgentInputUserMessage('first retained work'),
    })).resolves.toMatchObject({ accepted: true });
    expect(f.prepareNewAgentRun.mock.calls.map(([input]) => input.runId)).toEqual(['lead']);
    expect([...f.active.keys()]).toEqual(['lead']);
    expect(run.getLeafAgentStatusSnapshots().map(s => s.details.status)).toEqual(['idle', 'offline']);

    await expect(run.executeAgentCommand('unused', {
      kind: 'post_message', message: new AgentInputUserMessage('later authorized work'),
    })).resolves.toMatchObject({ accepted: true });
    expect(f.prepareNewAgentRun.mock.calls.map(([input]) => input.runId)).toEqual(['lead', 'unused']);
    expect(f.inputs).toEqual(['lead', 'unused']);
    expect(f.order).toEqual(['prepare:lead', 'publish:lead', 'prepare:unused', 'publish:unused']);
    expect(run.getLeafAgentStatusSnapshots().map(s => s.details.status)).toEqual(['idle', 'idle']);
  });
  it('readiness rejection remains an error for the exact worker, without starting other members', async () => {
    const f = fixture(); const run = await org(f); f.fail('director');
    await expect(run.executeAgentCommand('director', { kind: 'post_message', message: new AgentInputUserMessage('work') })).resolves.toMatchObject({ accepted: false });
    expect(run.getAgentStatusSnapshots().find(s => s.execution.agentRunId === 'director')?.details.status).toBe('error');
    expect(f.active.size).toBe(0); expect(f.prepareNewAgentRun).toHaveBeenCalledTimes(1);
  });
  it.each(['org', 'team'] as const)('%s Stop before first use fences all unused workers without startup', async (kind) => {
    const f = fixture(); const run = kind === 'org' ? await org(f) : await team(f, 'fresh');
    await expect(run.terminate()).resolves.toMatchObject({ accepted: true });
    expect(run.isActive()).toBe(false);
    await expect(run.executeAgentCommand(kind === 'org' ? 'director' : 'lead', { kind: 'post_message', message: new AgentInputUserMessage('late') })).rejects.toThrow('not accepting');
    expect(f.prepareNewAgentRun).not.toHaveBeenCalled(); expect(f.inputs).toEqual([]);
  });

  it.each(['org', 'team'] as const)('%s Stop drains first readiness and leaves no published worker after success', async (kind) => {
    const f = fixture(); const run = kind === 'org' ? await org(f) : await team(f, 'fresh');
    const id = kind === 'org' ? 'director' : 'lead'; f.block(id);
    const input = run.executeAgentCommand(id, { kind: 'post_message', message: new AgentInputUserMessage('first') });
    await vi.waitFor(() => expect(f.prepareNewAgentRun).toHaveBeenCalledTimes(1));
    const stop = run.terminate(); f.release(); await input;
    await expect(stop).resolves.toMatchObject({ accepted: true });
    expect(run.isActive()).toBe(false); expect(f.active.size).toBe(0);
    await expect(run.executeAgentCommand(id, { kind: 'post_message', message: new AgentInputUserMessage('too late') })).rejects.toThrow('not accepting');
    expect(f.prepareNewAgentRun).toHaveBeenCalledTimes(1);
  });

});
