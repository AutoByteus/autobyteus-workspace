import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { TeamStreamingService } from '../TeamStreamingService';
import {
  buildTestTeamContext,
  testAgentNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';

const { handleBrowserToolExecutionSucceededMock, runHistoryStoreMock } = vi.hoisted(() => ({
  handleBrowserToolExecutionSucceededMock: vi.fn(),
  runHistoryStoreMock: { applyRunNavigationEffect: vi.fn() },
}));

vi.mock('../browser/browserToolExecutionSucceededHandler', () => ({
  handleBrowserToolExecutionSucceeded: handleBrowserToolExecutionSucceededMock,
}));
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => runHistoryStoreMock }));

const rootTeamRunId = 'classroom-run';
const teacherRunId = 'teacher-run';
const persistentStudentRunId = 'persistent-student-run';
const taskStudentRunId = 'task-student-run';

const createHarness = () => {
  const callbacks = new Map<string, (payload?: any) => void>();
  const wsClient = {
    state: 'connected',
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    on: vi.fn((event: string, callback: (payload?: any) => void) => callbacks.set(event, callback)),
    off: vi.fn(),
  } as any;
  const team = buildTestTeamContext({
    teamRunId: rootTeamRunId,
    coordinatorAddress: '/Teacher',
    rootChildren: [
      testAgentNode('/Teacher', { agentRunId: teacherRunId, displayName: 'Teacher' }),
      testAgentNode('/Student', { agentRunId: persistentStudentRunId, displayName: 'Student' }),
    ],
    tasks: [testTaskRecord({
      taskId: 'task-student-1',
      delegatorAgentRunId: teacherRunId,
      recipientAddress: '/Student',
      target: { agentRunId: taskStudentRunId },
      description: 'Solve the delegated problem.',
    })],
  });
  const recoveryRequired = vi.fn();
  const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', {
    wsClient,
    onStreamRecoveryRequired: recoveryRequired,
  });
  service.connect(rootTeamRunId, team);
  return { callbacks, recoveryRequired, service, team, wsClient };
};

const emit = (
  callbacks: Map<string, (payload?: any) => void>,
  type: string,
  payload: Record<string, unknown>,
) => callbacks.get('onMessage')?.(JSON.stringify({ type, payload }));

const snapshotPayload = (team: ReturnType<typeof buildTestTeamContext>, baseChangeSequence = team.view.getChangeSequence()) => ({
  root_team_run_id: rootTeamRunId,
  base_change_sequence: baseChangeSequence,
  execution_tree: team.view.getExecutionTree(),
  tasks: team.view.listTaskHistoryRows().map((row) => row.task),
  messages: team.view.listCommunicationMessages(),
  agent_statuses: team.view.listAgentContextEntries().map((entry) => ({
    agent_run_id: entry.agentRunId,
    member_address: entry.memberAddress,
    status: 'idle',
    trigger: null,
    tool_name: null,
    error_message: null,
    error_details: null,
  })),
});

const admitReady = (
  callbacks: Map<string, (payload?: any) => void>,
  team: ReturnType<typeof buildTestTeamContext>,
  baseChangeSequence = team.view.getChangeSequence(),
): void => {
  emit(callbacks, 'CONNECTED', { session_id: 'team-session-1', root_team_run_id: rootTeamRunId });
  emit(callbacks, 'TEAM_EXECUTION_VIEW_SNAPSHOT', snapshotPayload(team, baseChangeSequence));
};

const statusPayload = (changeSequence: number, agentRunId: string, status: string) => ({
  change_sequence: changeSequence,
  agent_run_id: agentRunId,
  status,
  trigger: null,
  tool_name: null,
  error_message: null,
  error_details: null,
});

describe('TeamStreamingService current AgentRun event dispatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('becomes ready only after the exact connected root and complete authoritative snapshot', () => {
    const { callbacks, service, team } = createHarness();
    expect(service.isReady).toBe(false);

    callbacks.get('onConnect')?.();
    expect(service.isReady).toBe(false);
    emit(callbacks, 'CONNECTED', { session_id: 'team-session-1', root_team_run_id: rootTeamRunId });
    expect(service.isReady).toBe(false);
    emit(callbacks, 'TEAM_EXECUTION_VIEW_SNAPSHOT', snapshotPayload(team));
    expect(service.isReady).toBe(true);

    emit(callbacks, 'TEAM_RUN_LIFECYCLE', { is_active: false });
    expect(team.view.isRootTeamActive()).toBe(false);
    expect(runHistoryStoreMock.applyRunNavigationEffect).toHaveBeenCalledWith({
      kind: 'team_run', teamRunId: rootTeamRunId, isActive: false,
    }, { kind: 'PRESENTATION' });

    callbacks.get('onDisconnect')?.('closed');
    expect(service.isReady).toBe(false);
    expect(team.view.isRootTeamActive()).toBe(false);
  });

  it('rejects a foreign connected root and cannot admit its snapshot', () => {
    const { callbacks, service, team } = createHarness();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    emit(callbacks, 'CONNECTED', { session_id: 'foreign-session', root_team_run_id: 'foreign-root' });
    emit(callbacks, 'TEAM_EXECUTION_VIEW_SNAPSHOT', snapshotPayload(team));

    expect(service.isReady).toBe(false);
    expect(error).toHaveBeenCalledWith('Rejected invalid Team WebSocket message:', expect.anything());
    error.mockRestore();
  });

  it('projects status and segment content only into the exact persistent AgentRun', () => {
    const { callbacks, team } = createHarness();
    admitReady(callbacks, team);
    const teacher = team.view.getAgentContext(teacherRunId)!;
    const persistentStudent = team.view.getAgentContext(persistentStudentRunId)!;
    const taskStudent = team.view.getAgentContext(taskStudentRunId)!;

    emit(callbacks, 'AGENT_STATUS', statusPayload(1, teacherRunId, 'running'));
    emit(callbacks, 'SEGMENT_START', {
      change_sequence: 2,
      agent_run_id: teacherRunId,
      segment_id: 'teacher-segment',
      turn_id: 'turn-1',
      segment_type: 'text',
      metadata: null,
    });
    emit(callbacks, 'SEGMENT_CONTENT', {
      change_sequence: 3,
      agent_run_id: teacherRunId,
      segment_id: 'teacher-segment',
      turn_id: 'turn-1',
      segment_type: 'text',
      delta: 'Exact teacher output',
    });

    expect(teacher.state.currentStatus).toBe(AgentStatus.Running);
    expect(teacher.state.conversation.messages[0]?.segments[0]).toMatchObject({
      content: 'Exact teacher output',
    });
    expect(persistentStudent.state.conversation.messages).toHaveLength(0);
    expect(taskStudent.state.conversation.messages).toHaveLength(0);
  });

  it('rejects a legacy identity-less Agent event instead of using the focused AgentRun', () => {
    const { callbacks, team } = createHarness();
    admitReady(callbacks, team);
    const teacher = team.view.getAgentContext(teacherRunId)!;
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    emit(callbacks, 'AGENT_STATUS', {
      change_sequence: 1,
      status: 'running',
      trigger: null,
      tool_name: null,
      error_message: null,
      error_details: null,
    });

    expect(teacher.state.currentStatus).not.toBe(AgentStatus.Running);
    expect(team.view.getChangeSequence()).toBe(0);
    expect(error).toHaveBeenCalledWith('Rejected invalid Team WebSocket message:', expect.anything());
    error.mockRestore();
  });

  it('projects an external user message only when AgentRun and logical member placement agree', () => {
    const { callbacks, team } = createHarness();
    admitReady(callbacks, team);
    const teacher = team.view.getAgentContext(teacherRunId)!;
    const persistentStudent = team.view.getAgentContext(persistentStudentRunId)!;

    emit(callbacks, 'EXTERNAL_USER_MESSAGE', {
      agent_run_id: teacherRunId,
      member_address: '/Teacher',
      content: 'hello from telegram',
      received_at: '2026-08-11T00:01:00.000Z',
      provider: 'telegram',
      transport: 'telegram',
      account_id: 'account-1',
      peer_id: 'peer-1',
      thread_id: null,
      external_message_id: 'external-1',
      context_file_paths: [],
    });

    expect(teacher.state.conversation.messages.at(-1)).toMatchObject({
      type: 'user', text: 'hello from telegram',
    });
    expect(persistentStudent.state.conversation.messages).toHaveLength(0);
  });

  it('routes successful tool execution through the browser owner for the exact AgentRun', () => {
    const { callbacks, team } = createHarness();
    admitReady(callbacks, team);
    emit(callbacks, 'TOOL_EXECUTION_SUCCEEDED', {
      change_sequence: 1,
      agent_run_id: teacherRunId,
      invocation_id: 'call-1',
      tool_name: 'open_tab',
      turn_id: 'turn-1',
      arguments: null,
      result: { tab_id: 'browser-session-1', url: 'https://example.com' },
    });
    expect(handleBrowserToolExecutionSucceededMock).toHaveBeenCalledWith(expect.objectContaining({
      invocation_id: 'call-1',
      tool_name: 'open_tab',
      result: { tab_id: 'browser-session-1', url: 'https://example.com' },
    }));
  });

  it('projects MEMBER_INPUT into the exact task AgentRun without persistent substitution', () => {
    const { callbacks, team } = createHarness();
    admitReady(callbacks, team);
    const taskStudent = team.view.getAgentContext(taskStudentRunId)!;
    const persistentStudent = team.view.getAgentContext(persistentStudentRunId)!;
    const teacher = team.view.getAgentContext(teacherRunId)!;

    emit(callbacks, 'MEMBER_INPUT_MESSAGE', {
      change_sequence: 1,
      recipient_agent_run_id: taskStudentRunId,
      message_id: 'member-input-1',
      dedupe_key: 'member-input:1',
      content: 'TASK_SCOPED_PEER_MESSAGE',
      input_origin: 'inter_agent_delivery',
      received_at: '2026-08-11T00:02:00.000Z',
      context_file_paths: [],
      sender_agent_run_id: teacherRunId,
      parent_communication_message_id: 'team-message-1',
    });

    expect(taskStudent.state.conversation.messages.at(-1)).toMatchObject({
      type: 'user', messageId: 'member-input-1', text: 'TASK_SCOPED_PEER_MESSAGE',
    });
    expect(persistentStudent.state.conversation.messages).toHaveLength(0);
    expect(teacher.state.conversation.messages).toHaveLength(0);
  });

  it('rejects removed recipient-address fallback before any AgentRun mutation', () => {
    const { callbacks, team } = createHarness();
    admitReady(callbacks, team);
    const taskStudent = team.view.getAgentContext(taskStudentRunId)!;
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    emit(callbacks, 'MEMBER_INPUT_MESSAGE', {
      change_sequence: 1,
      recipient_address: '/Student',
      message_id: 'member-input-legacy',
      dedupe_key: 'member-input:legacy',
      content: 'must not use address fallback',
      input_origin: 'inter_agent_delivery',
      received_at: '2026-08-11T00:03:00.000Z',
      context_file_paths: [],
      sender_agent_run_id: teacherRunId,
      parent_communication_message_id: null,
    });

    expect(taskStudent.state.conversation.messages).toHaveLength(0);
    expect(team.view.getChangeSequence()).toBe(0);
    expect(error).toHaveBeenCalledWith('Rejected invalid Team WebSocket message:', expect.anything());
    error.mockRestore();
  });

  it('adds the exact public Team communication record to the authoritative view once', () => {
    const { callbacks, team } = createHarness();
    admitReady(callbacks, team);
    emit(callbacks, 'TEAM_COMMUNICATION_MESSAGE', {
      change_sequence: 1,
      message: {
        message_id: 'team-message-1',
        sender_agent_run_id: teacherRunId,
        receiver_agent_run_id: taskStudentRunId,
        content: 'Coordinate the delegated task.',
        message_type: 'peer_message',
        created_at: '2026-08-11T00:04:00.000Z',
        reference_files: [],
      },
    });

    expect(team.view.listCommunicationMessages()).toEqual([{
      message_id: 'team-message-1',
      sender_agent_run_id: teacherRunId,
      receiver_agent_run_id: taskStudentRunId,
      content: 'Coordinate the delegated task.',
      message_type: 'peer_message',
      created_at: '2026-08-11T00:04:00.000Z',
      reference_files: [],
    }]);
  });

  it('acts on the first rejected gap effect once and cannot revive the failed instance', () => {
    const { callbacks, recoveryRequired, service, team, wsClient } = createHarness();
    admitReady(callbacks, team);

    emit(callbacks, 'AGENT_STATUS', statusPayload(2, teacherRunId, 'running'));

    expect(service.isReady).toBe(false);
    expect(service.isReopenRequired).toBe(true);
    expect(team.view.getChangeSequence()).toBe(0);
    expect(team.view.getAgentContext(teacherRunId)?.state.currentStatus).not.toBe(AgentStatus.Running);
    expect(wsClient.disconnect).toHaveBeenCalledTimes(1);
    expect(recoveryRequired).toHaveBeenCalledTimes(1);
    expect(recoveryRequired).toHaveBeenCalledWith({
      kind: 'team_stream_recovery_required',
      rootTeamRunId,
    });

    emit(callbacks, 'AGENT_STATUS', statusPayload(1, teacherRunId, 'running'));
    expect(recoveryRequired).toHaveBeenCalledTimes(1);
    expect(team.view.getChangeSequence()).toBe(0);
    expect(() => service.connect(rootTeamRunId, team)).toThrow('TEAM_STREAM_REOPEN_REQUIRED');
  });

  it('admits a candidate only after the exact expected snapshot base', async () => {
    const callbacks = new Map<string, (payload?: any) => void>();
    const wsClient = {
      state: 'connected', connect: vi.fn(), disconnect: vi.fn(), send: vi.fn(),
      on: vi.fn((event: string, callback: (payload?: any) => void) => callbacks.set(event, callback)),
      off: vi.fn(),
    } as any;
    const team = buildTestTeamContext({
      teamRunId: rootTeamRunId,
      coordinatorAddress: '/Teacher',
      rootChildren: [testAgentNode('/Teacher', { agentRunId: teacherRunId, displayName: 'Teacher' })],
    });
    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const readiness = service.connectCandidate(rootTeamRunId, team, 7);

    emit(callbacks, 'CONNECTED', { session_id: 'candidate-session', root_team_run_id: rootTeamRunId });
    emit(callbacks, 'TEAM_EXECUTION_VIEW_SNAPSHOT', snapshotPayload(team, 7));

    await expect(readiness).resolves.toBeUndefined();
    expect(service.isReady).toBe(true);
    expect(team.view.getChangeSequence()).toBe(7);
  });

  it('rejects and stops a candidate whose snapshot base does not match', async () => {
    const callbacks = new Map<string, (payload?: any) => void>();
    const wsClient = {
      state: 'connected', connect: vi.fn(), disconnect: vi.fn(), send: vi.fn(),
      on: vi.fn((event: string, callback: (payload?: any) => void) => callbacks.set(event, callback)),
      off: vi.fn(),
    } as any;
    const team = buildTestTeamContext({
      teamRunId: rootTeamRunId,
      coordinatorAddress: '/Teacher',
      rootChildren: [testAgentNode('/Teacher', { agentRunId: teacherRunId, displayName: 'Teacher' })],
    });
    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const readiness = service.connectCandidate(rootTeamRunId, team, 7);

    emit(callbacks, 'CONNECTED', { session_id: 'candidate-session', root_team_run_id: rootTeamRunId });
    emit(callbacks, 'TEAM_EXECUTION_VIEW_SNAPSHOT', snapshotPayload(team, 8));

    await expect(readiness).rejects.toThrow('TEAM_STREAM_SNAPSHOT_BASE_MISMATCH');
    expect(service.isReopenRequired).toBe(true);
    expect(wsClient.disconnect).toHaveBeenCalledTimes(1);
    expect(team.view.getChangeSequence()).toBe(0);
  });
});
