import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  createTeamExecutionAddress,
  toTeamExecutionAddressDto,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import { TeamStreamingService } from '../TeamStreamingService';
import {
  buildCurrentTaskExecutionTeam,
  currentTaskExecutionRootTeamRunId,
  taskTeamCoordinatorAddress,
  taskTeamEvent,
} from './currentTaskExecutionFixture';

const {
  handleBrowserToolExecutionSucceededMock,
  upsertTeamCommunicationMessageMock,
  runHistoryStoreMock,
} = vi.hoisted(() => ({
  handleBrowserToolExecutionSucceededMock: vi.fn(),
  upsertTeamCommunicationMessageMock: vi.fn(),
  runHistoryStoreMock: { applyRunNavigationEffect: vi.fn() },
}));

vi.mock('../browser/browserToolExecutionSucceededHandler', () => ({
  handleBrowserToolExecutionSucceeded: handleBrowserToolExecutionSucceededMock,
}));
vi.mock('~/stores/teamCommunicationStore', () => ({
  useTeamCommunicationStore: () => ({ upsertFromBackendPayload: upsertTeamCommunicationMessageMock }),
}));
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => runHistoryStoreMock }));

const teacherAddress = () => createTeamExecutionAddress({
  rootTeamRunId: currentTaskExecutionRootTeamRunId,
  memberAddress: '/Teacher',
});

const studentAddress = (taskTeamRunIds: readonly string[] = []) => createTeamExecutionAddress({
  rootTeamRunId: currentTaskExecutionRootTeamRunId,
  taskTeamRunIds,
  memberAddress: '/StudentStudyGroup/student_one',
});

const persistentBinding = (address: TeamExecutionAddress) => ({
  kind: 'persistent_agent',
  execution_address: toTeamExecutionAddressDto(address),
});

const taskTeamBinding = (address: TeamExecutionAddress, agentRunId = 'task-team-student-one-run') => ({
  kind: 'task_team_agent',
  execution_address: toTeamExecutionAddressDto(address),
  agent_run_id: agentRunId,
});

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
  const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
  const team = buildCurrentTaskExecutionTeam();
  service.connect(team.executions.getRootTeamRunId(), team);
  const teacher = team.executions.getAgentContext(teacherAddress())!;
  return { callbacks, service, team, teacher, wsClient };
};

const emit = (callbacks: Map<string, (payload?: any) => void>, type: string, payload: Record<string, unknown>) =>
  callbacks.get('onMessage')?.(JSON.stringify({ type, payload }));

describe('TeamStreamingService current rooted event dispatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps WebSocket readiness separate from backend Team lifecycle', () => {
    const { callbacks, service, team } = createHarness();
    expect(service.isReady).toBe(false);
    expect(team.executions.isRootTeamActive()).toBe(true);

    callbacks.get('onConnect')?.();
    expect(service.isReady).toBe(false);
    emit(callbacks, 'CONNECTED', { session_id: 'team-session-1' });
    expect(service.isReady).toBe(true);

    emit(callbacks, 'TEAM_RUN_LIFECYCLE', { is_active: false });
    expect(team.executions.isRootTeamActive()).toBe(false);
    expect(runHistoryStoreMock.applyRunNavigationEffect).toHaveBeenCalledWith({
      kind: 'team_run', teamRunId: currentTaskExecutionRootTeamRunId, isActive: false,
    }, { kind: 'PRESENTATION' });

    callbacks.get('onDisconnect')?.('closed');
    expect(service.isReady).toBe(false);
    expect(team.executions.isRootTeamActive()).toBe(false);
  });

  it('projects status and content only through the exact persistent execution binding', () => {
    const { callbacks, teacher, team } = createHarness();
    const student = team.executions.getAgentContext(studentAddress())!;

    emit(callbacks, 'AGENT_STATUS', {
      agent_execution: persistentBinding(teacherAddress()),
      status: 'running', trigger: null, tool_name: null, error_message: null, error_details: null,
    });
    emit(callbacks, 'SEGMENT_CONTENT', {
      agent_execution: persistentBinding(teacherAddress()),
      segment_id: 'segment-teacher', turn_id: 'turn-1', segment_type: 'text', delta: 'Exact teacher output',
    });

    expect(teacher.state.currentStatus).toBe(AgentStatus.Running);
    expect(teacher.state.conversation.messages[0]?.segments[0]).toMatchObject({ content: 'Exact teacher output' });
    expect(student.state.conversation.messages).toHaveLength(0);
  });

  it('rejects an identity-less legacy Agent event instead of using the focused execution', () => {
    const { callbacks, teacher } = createHarness();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    emit(callbacks, 'AGENT_STATUS', {
      status: 'running', trigger: null, tool_name: null, error_message: null, error_details: null,
    });

    expect(teacher.state.currentStatus).not.toBe(AgentStatus.Running);
    expect(error).toHaveBeenCalledWith('Rejected invalid Team WebSocket message:', expect.anything());
    error.mockRestore();
  });

  it('mirrors an exact external user message into only its addressed conversation', () => {
    const { callbacks, teacher, team } = createHarness();
    const student = team.executions.getAgentContext(studentAddress())!;
    emit(callbacks, 'EXTERNAL_USER_MESSAGE', {
      execution_address: toTeamExecutionAddressDto(teacherAddress()),
      content: 'hello from telegram',
      received_at: '2026-08-11T00:01:00.000Z',
      provider: 'telegram', transport: 'telegram', account_id: 'account-1', peer_id: 'peer-1',
      thread_id: null, external_message_id: 'external-1', context_file_paths: [],
    });
    expect(teacher.state.conversation.messages.at(-1)).toMatchObject({
      type: 'user', text: 'hello from telegram',
    });
    expect(student.state.conversation.messages).toHaveLength(0);
  });

  it('routes successful tool execution through the browser-owned handler at the exact execution', () => {
    const { callbacks } = createHarness();
    emit(callbacks, 'TOOL_EXECUTION_SUCCEEDED', {
      agent_execution: persistentBinding(teacherAddress()),
      invocation_id: 'call-1', tool_name: 'open_tab', turn_id: 'turn-1', arguments: null,
      result: { tab_id: 'browser-session-1', url: 'https://example.com' },
    });
    expect(handleBrowserToolExecutionSucceededMock).toHaveBeenCalledWith(expect.objectContaining({
      invocation_id: 'call-1', tool_name: 'open_tab',
      result: { tab_id: 'browser-session-1', url: 'https://example.com' },
    }));
  });

  it('projects MEMBER_INPUT only into the exact persistent receiver', () => {
    const { callbacks, teacher, team } = createHarness();
    const address = studentAddress();
    const student = team.executions.getAgentContext(address)!;
    emit(callbacks, 'MEMBER_INPUT_MESSAGE', {
      execution_address: toTeamExecutionAddressDto(address),
      message_id: 'member-input-1',
      dedupe_key: 'member-input:root-team-run-1:member-input-1',
      content: 'You received a message from sender name: Teacher\nmessage:\nPlease solve this.',
      input_origin: 'inter_agent_delivery', received_at: '2026-08-11T00:02:00.000Z',
      context_file_paths: [], sender_address: toTeamExecutionAddressDto(teacherAddress()),
      parent_communication_message_id: 'team-message-1',
    });
    expect(student.state.conversation.messages.at(-1)).toMatchObject({
      type: 'user', messageId: 'member-input-1', text: expect.stringContaining('Please solve this.'),
    });
    expect(teacher.state.conversation.messages).toHaveLength(0);
  });

  it('materializes and routes MEMBER_INPUT only into the exact task-Team Agent binding', () => {
    const { callbacks, team } = createHarness();
    emit(callbacks, taskTeamEvent().type, taskTeamEvent().payload);
    const address = taskTeamCoordinatorAddress();
    emit(callbacks, 'AGENT_STATUS', {
      agent_execution: taskTeamBinding(address),
      status: 'running', trigger: null, tool_name: null, error_message: null, error_details: null,
    });
    const taskTeamStudent = team.executions.getAgentContext(address)!;
    const persistentStudent = team.executions.getAgentContext(studentAddress())!;

    emit(callbacks, 'MEMBER_INPUT_MESSAGE', {
      execution_address: toTeamExecutionAddressDto(address),
      message_id: 'member-input-task-team-1', dedupe_key: 'member-input:task-team:1',
      content: 'TASK_TEAM_PEER_REPLY', input_origin: 'inter_agent_delivery',
      received_at: '2026-08-11T00:03:00.000Z', context_file_paths: [],
      sender_address: toTeamExecutionAddressDto(createTeamExecutionAddress({
        rootTeamRunId: currentTaskExecutionRootTeamRunId,
        taskTeamRunIds: address.taskTeamRunIds,
        memberAddress: '/StudentStudyGroup/student_two',
      })),
      parent_communication_message_id: 'team-message-task-team-1',
    });

    expect(taskTeamStudent.state.conversation.messages.at(-1)).toMatchObject({
      type: 'user', messageId: 'member-input-task-team-1', text: 'TASK_TEAM_PEER_REPLY',
    });
    expect(persistentStudent.state.conversation.messages).toHaveLength(0);
  });

  it('rejects removed recipient-address fallback data before any member mutation', () => {
    const { callbacks, team } = createHarness();
    const address = studentAddress();
    const student = team.executions.getAgentContext(address)!;
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    emit(callbacks, 'MEMBER_INPUT_MESSAGE', {
      message_id: 'member-input-missing-execution', dedupe_key: 'member-input:legacy',
      content: 'must not use recipient identity as fallback', input_origin: 'inter_agent_delivery',
      received_at: '2026-08-11T00:04:00.000Z', context_file_paths: [],
      sender_address: null, parent_communication_message_id: null,
      recipient_address: toTeamExecutionAddressDto(address),
    });

    expect(student.state.conversation.messages).toHaveLength(0);
    expect(error).toHaveBeenCalledWith('Rejected invalid Team WebSocket message:', expect.anything());
    error.mockRestore();
  });

  it('forwards the exact snake-case Team communication projection to the store', () => {
    const { callbacks } = createHarness();
    const receiver = studentAddress(['task-team-outer']);
    emit(callbacks, 'TEAM_COMMUNICATION_MESSAGE', {
      message_id: 'team-message-1', sender_address: toTeamExecutionAddressDto(teacherAddress()),
      receiver_address: toTeamExecutionAddressDto(receiver), content: 'Coordinate the task Team.',
      message_type: 'assignment', created_at: '2026-08-11T00:05:00.000Z', reference_files: [],
    });
    expect(upsertTeamCommunicationMessageMock).toHaveBeenCalledWith({
      messageId: 'team-message-1', teamRunId: currentTaskExecutionRootTeamRunId,
      senderAddress: teacherAddress(), receiverAddress: receiver,
      content: 'Coordinate the task Team.', messageType: 'assignment',
      createdAt: '2026-08-11T00:05:00.000Z', referenceFiles: [],
    });
  });
});
