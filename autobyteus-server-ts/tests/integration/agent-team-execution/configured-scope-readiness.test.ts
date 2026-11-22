import { testViewStreams } from "../../helpers/view-streams.js";
import { TeamChangeNoticeSource } from "../../../src/agent-team-execution/membership/team-change-notice-source.js";
import { NOT_DELEGATED } from "../../helpers/run-collaboration.js";
import { noDelegations, openTaskRecords } from "../../helpers/no-delegations.js";
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
import { TeamRunExecutionTreeStore } from '../../../src/run-history/store/team-run-execution-tree-store.js';
import { TeamCommunicationStore } from '../../../src/services/team-communication/team-communication-store.js';
import { testAgentNode, testTeamRunConfig } from '../../fixtures/current-team-run-fixtures.js';
import { testActivationManager } from '../../fixtures/agent-run-preparation-fixtures.js';
import { NO_FILES_RECEIVED, NO_PEER_CHANNEL, OFFERED_MODEL_EXECUTION_FACTORY } from "../../helpers/explicit-host-collaborators.js";
import { AgentRunMemoryLocator } from "../../../src/agent-collaboration/execution/services/agent-run-memory-locator.js";

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
      getInputStateSnapshot: () => null, bindExecutionAdmissionFence: vi.fn(),
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
  // The current activation contract (`beginActivation`) over this test's controlled candidates.
  const stop = async (run: any) => { await run.terminate(); return { accepted: true }; };
  const termination = (run: any) => ({ cancel: () => undefined, commit: () => ({ finish: () => stop(run) }) });
  const agentRunManager = testActivationManager({ newPreparation: prepareNewAgentRun,
    getActiveRun: (id: string) => active.get(id), releaseExactRun: stop,
    tryPrepareAgentRunTerminationIfQuiescent: async (run: any) => termination(run),
    prepareAgentRunTermination: async (run: any) => termination(run) });
  const dependencies = { agentRunManager: agentRunManager as never,
    activityInspector: { inspect: () => ({ kind: 'none' }) } as never,
    memoryLocator: { getMemoryDir: () => dir } as never,
    workspaceManager: { ensureWorkspaceByRootPath: async () => ({ workspaceId: 'ws' }) } as never };
  return { dir, order, inputs, active, prepareNewAgentRun, dependencies,
    useTeamTree() { treeFile = 'team_run_execution_tree.json'; },
    factory: new FlatTeamExecutionFactory({ executionFactory: OFFERED_MODEL_EXECUTION_FACTORY, ...dependencies }),
    block(id: string) { blocked = id; gate = new Promise<void>(resolve => { release = resolve; }); },
    release() { release?.(); }, fail(id: string) { fail = id; },
  };
};
const team = async (f: ReturnType<typeof fixture>, mode: 'fresh' | 'restore') => {
  f.useTeamTree();
  const config = testTeamRunConfig({ rootTeamRunId: 'team-lazy', coordinatorAddress: '/lead', children:
    ['lead', 'unused'].map(id => testAgentNode(`/${id}`, { agentRunId: id, runtimeKind: RuntimeKind.CODEX_APP_SERVER })) });
  return materializeTeamRoot({ changeNotices: new TeamChangeNoticeSource(), remoteChannel: NO_PEER_CHANNEL, receivedFiles: NO_FILES_RECEIVED, memoryLocator: new AgentRunMemoryLocator({ memoryDir: f.dir }), delegationIndex: noDelegations(), viewStreams: testViewStreams(), taskRecords: openTaskRecords(), config, tree: buildInitialTeamRunExecutionTree({ config, teamDefinitionName: 'Lazy Team', createdAt: '2026-09-13T00:00:00.000Z' }),
    messages: { schemaVersion: 1, rootTeamRunId: 'team-lazy', messages: [] },
    mode, persistInitialPackage: true, teamMemoryDir: f.dir, factory: f.factory,
    memberExecutionContextBuilder: new MemberExecutionContextBuilder({ getDefinitionById: async () => null } as never, NOT_DELEGATED), executionTreeStore: new TeamRunExecutionTreeStore(),
    communicationStore: new TeamCommunicationStore(), onTerminated: vi.fn(),
  });
};

describe('fresh and restored configured scope use deferred readiness', () => {
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
    const f = fixture(); const run = await team(f, 'fresh'); f.fail('lead');
    await expect(run.executeAgentCommand('lead', { kind: 'post_message', message: new AgentInputUserMessage('work') })).resolves.toMatchObject({ accepted: false });
    expect(run.getLeafAgentStatusSnapshots().find(s => s.execution.agentRunId === 'lead')?.details.status).toBe('error');
    expect(f.active.size).toBe(0); expect(f.prepareNewAgentRun).toHaveBeenCalledTimes(1);
  });
  // An Org's units are Team and agent runs of their own (org-teams-follow-definition): the Team root is the configured scope.
  it.each(['team'] as const)('%s Stop before first use fences all unused workers without startup', async () => {
    const f = fixture(); const run = await team(f, 'fresh');
    await expect(run.terminate()).resolves.toMatchObject({ accepted: true });
    expect(run.isActive()).toBe(false);
    await expect(run.executeAgentCommand('lead', { kind: 'post_message', message: new AgentInputUserMessage('late') })).rejects.toThrow('not accepting');
    expect(f.prepareNewAgentRun).not.toHaveBeenCalled(); expect(f.inputs).toEqual([]);
  });

  it.each(['team'] as const)('%s Stop drains first readiness and leaves no published worker after success', async () => {
    const f = fixture(); const run = await team(f, 'fresh');
    const id = 'lead'; f.block(id);
    const input = run.executeAgentCommand(id, { kind: 'post_message', message: new AgentInputUserMessage('first') });
    await vi.waitFor(() => expect(f.prepareNewAgentRun).toHaveBeenCalledTimes(1));
    const stop = run.terminate(); f.release(); await input;
    await expect(stop).resolves.toMatchObject({ accepted: true });
    expect(run.isActive()).toBe(false); expect(f.active.size).toBe(0);
    await expect(run.executeAgentCommand(id, { kind: 'post_message', message: new AgentInputUserMessage('too late') })).rejects.toThrow('not accepting');
    expect(f.prepareNewAgentRun).toHaveBeenCalledTimes(1);
  });

});
