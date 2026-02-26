import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../handlers', () => ({
  handleSegmentStart: vi.fn(),
  handleSegmentContent: vi.fn(),
  handleSegmentEnd: vi.fn(),
  handleToolApprovalRequested: vi.fn(),
  handleToolApproved: vi.fn(),
  handleToolDenied: vi.fn(),
  handleToolExecutionStarted: vi.fn(),
  handleToolExecutionSucceeded: vi.fn(),
  handleToolExecutionFailed: vi.fn(),
  handleToolLog: vi.fn(),
  handleAgentStatus: vi.fn(),
  handleAssistantComplete: vi.fn(),
  handleTodoListUpdate: vi.fn(),
  handleError: vi.fn(),
  handleInterAgentMessage: vi.fn(),
  handleSystemTaskNotification: vi.fn(),
  handleTeamStatus: vi.fn(),
  handleTaskPlanEvent: vi.fn(),
  handleArtifactPersisted: vi.fn(),
  handleArtifactUpdated: vi.fn(),
}));

import { TeamStreamingService } from '../TeamStreamingService';
import * as handlers from '../handlers';

const createWsClient = () => {
  const callbacks = new Map<string, (payload?: any) => void>();
  const wsClient = {
    state: 'disconnected',
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    on: vi.fn((event: string, cb: (payload?: any) => void) => {
      callbacks.set(event, cb);
    }),
    off: vi.fn(),
  } as any;
  return { wsClient, callbacks };
};

const createMember = (agentId: string) => ({
  config: {
    agentDefinitionId: 'def-1',
    agentDefinitionName: `Agent ${agentId}`,
    llmModelIdentifier: 'gpt-4',
    workspaceId: null,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
    isLocked: false,
  },
  state: {
    agentId,
    currentStatus: 'uninitialized',
    conversation: {
      id: agentId,
      messages: [],
      createdAt: '2026-02-14T00:00:00.000Z',
      updatedAt: '',
      agentDefinitionId: 'def-1',
      agentName: `Agent ${agentId}`,
    },
  },
  isSending: true,
  conversation: { messages: [], updatedAt: '' },
});

describe('TeamStreamingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('echoes captured approval token when approving tool invocation', () => {
    const { wsClient, callbacks } = createWsClient();

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const teamContext = {
      focusedMemberName: 'worker-a',
      members: new Map([['worker-a', createMember('agent-1')]]),
      currentStatus: 'idle',
    } as any;

    service.connect('team-1', teamContext);
    const onMessage = callbacks.get('onMessage');
    expect(onMessage).toBeTruthy();

    onMessage?.(
      JSON.stringify({
        type: 'TOOL_APPROVAL_REQUESTED',
        payload: {
          invocation_id: 'inv-1',
          tool_name: 'run_bash',
          arguments: { command: 'pwd' },
          agent_name: 'worker-a',
          approval_token: {
            teamRunId: 'run-1',
            runVersion: 2,
            invocationId: 'inv-1',
            invocationVersion: 1,
            targetMemberName: 'worker-a',
          },
        },
      }),
    );

    service.approveTool('inv-1', 'worker-a');

    expect(wsClient.send).toHaveBeenCalledTimes(1);
    const outbound = JSON.parse(wsClient.send.mock.calls[0][0]);
    expect(outbound.type).toBe('APPROVE_TOOL');
    expect(outbound.payload.invocation_id).toBe('inv-1');
    expect(outbound.payload.agent_name).toBe('worker-a');
    expect(outbound.payload.approval_token).toMatchObject({
      teamRunId: 'run-1',
      runVersion: 2,
      invocationId: 'inv-1',
      targetMemberName: 'worker-a',
    });
  });

  it('uses token target member name for approval payload when caller passes a different agent name', () => {
    const { wsClient, callbacks } = createWsClient();

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const teamContext = {
      focusedMemberName: 'sub-team/worker-a',
      members: new Map([['sub-team/worker-a', createMember('agent-1')]]),
      currentStatus: 'idle',
    } as any;

    service.connect('team-1', teamContext);
    const onMessage = callbacks.get('onMessage');
    expect(onMessage).toBeTruthy();

    onMessage?.(
      JSON.stringify({
        type: 'TOOL_APPROVAL_REQUESTED',
        payload: {
          invocation_id: 'inv-2',
          tool_name: 'run_bash',
          arguments: { command: 'pwd' },
          approval_token: {
            teamRunId: 'run-1',
            runVersion: 2,
            invocationId: 'inv-2',
            invocationVersion: 1,
            targetMemberName: 'worker-a',
          },
        },
      }),
    );

    service.approveTool('inv-2', 'sub-team/worker-a');

    expect(wsClient.send).toHaveBeenCalledTimes(1);
    const outbound = JSON.parse(wsClient.send.mock.calls[0][0]);
    expect(outbound.type).toBe('APPROVE_TOOL');
    expect(outbound.payload.invocation_id).toBe('inv-2');
    expect(outbound.payload.agent_name).toBe('worker-a');
  });

  it('does not fallback to focused member for member-scoped events with missing identity', () => {
    const { wsClient, callbacks } = createWsClient();
    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });

    const focused = createMember('agent-focused');
    const teamContext = {
      focusedMemberName: 'focused',
      members: new Map([
        ['focused', focused],
        ['worker-a', createMember('agent-1')],
      ]),
      currentStatus: 'idle',
    } as any;

    service.connect('team-1', teamContext);
    const onMessage = callbacks.get('onMessage');

    onMessage?.(
      JSON.stringify({
        type: 'AGENT_STATUS',
        payload: {
          new_status: 'processing',
          event_scope: 'member_scoped',
        },
      }),
    );

    expect(handlers.handleAgentStatus).not.toHaveBeenCalled();
    expect(focused.conversation.updatedAt).toBe('');
  });

  it('dispatches team-scoped events without member resolution', () => {
    const { wsClient, callbacks } = createWsClient();
    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });

    const teamContext = {
      focusedMemberName: 'focused',
      members: new Map(),
      currentStatus: 'idle',
    } as any;

    service.connect('team-1', teamContext);
    const onMessage = callbacks.get('onMessage');

    onMessage?.(
      JSON.stringify({
        type: 'TEAM_STATUS',
        payload: {
          new_status: 'processing',
          event_scope: 'team_scoped',
        },
      }),
    );

    expect(handlers.handleTeamStatus).toHaveBeenCalledTimes(1);
    expect(handlers.handleAgentStatus).not.toHaveBeenCalled();
  });

  it('handles artifact protocol events in team streaming', () => {
    const { wsClient, callbacks } = createWsClient();
    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });

    const teamContext = {
      focusedMemberName: 'worker-a',
      members: new Map([['worker-a', createMember('agent-1')]]),
      currentStatus: 'idle',
    } as any;

    service.connect('team-1', teamContext);
    const onMessage = callbacks.get('onMessage');

    onMessage?.(
      JSON.stringify({
        type: 'ARTIFACT_PERSISTED',
        payload: {
          artifact_id: 'art-1',
          path: '/tmp/a.txt',
          agent_id: 'agent-1',
          agent_name: 'worker-a',
          type: 'file',
        },
      }),
    );

    onMessage?.(
      JSON.stringify({
        type: 'ARTIFACT_UPDATED',
        payload: {
          artifact_id: 'art-1',
          path: '/tmp/a.txt',
          agent_id: 'agent-1',
          agent_name: 'worker-a',
          type: 'file',
        },
      }),
    );

    expect(handlers.handleArtifactPersisted).toHaveBeenCalledTimes(1);
    expect(handlers.handleArtifactUpdated).toHaveBeenCalledTimes(1);
  });

  it('drops older envelope sequence events for the same team run', () => {
    const { wsClient, callbacks } = createWsClient();
    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });

    const teamContext = {
      focusedMemberName: 'worker-a',
      members: new Map([['worker-a', createMember('agent-1')]]),
      currentStatus: 'idle',
    } as any;

    service.connect('team-1', teamContext);
    const onMessage = callbacks.get('onMessage');

    onMessage?.(
      JSON.stringify({
        type: 'AGENT_STATUS',
        payload: {
          new_status: 'processing',
          agent_name: 'worker-a',
          event_scope: 'member_scoped',
          team_stream_event_envelope: {
            team_run_id: 'run-1',
            run_version: 1,
            sequence: 3,
            source_node_id: 'node-a',
            origin: 'local',
            event_type: 'AGENT_STATUS',
            received_at: '2026-02-14T12:00:00.000Z',
          },
        },
      }),
    );

    onMessage?.(
      JSON.stringify({
        type: 'AGENT_STATUS',
        payload: {
          new_status: 'idle',
          agent_name: 'worker-a',
          event_scope: 'member_scoped',
          team_stream_event_envelope: {
            team_run_id: 'run-1',
            run_version: 1,
            sequence: 2,
            source_node_id: 'node-a',
            origin: 'local',
            event_type: 'AGENT_STATUS',
            received_at: '2026-02-14T12:00:01.000Z',
          },
        },
      }),
    );

    expect(handlers.handleAgentStatus).toHaveBeenCalledTimes(1);
  });

  it('creates synthetic nested member context from member_route_key and dispatches member-scoped event', () => {
    const { wsClient, callbacks } = createWsClient();
    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });

    const parentMember = createMember('agent-parent');
    const teamContext = {
      teamId: 'team-1',
      focusedMemberName: 'coordinator',
      members: new Map([
        ['coordinator', createMember('agent-coordinator')],
        ['sub-team', parentMember],
      ]),
      currentStatus: 'idle',
    } as any;

    service.connect('team-1', teamContext);
    const onMessage = callbacks.get('onMessage');

    onMessage?.(
      JSON.stringify({
        type: 'AGENT_STATUS',
        payload: {
          new_status: 'processing',
          agent_name: 'worker-b',
          agent_id: 'agent-worker-b',
          member_route_key: 'sub-team/worker-b',
          event_scope: 'member_scoped',
        },
      }),
    );

    expect(handlers.handleAgentStatus).toHaveBeenCalledTimes(1);
    expect(teamContext.members.has('sub-team/worker-b')).toBe(true);
    const nested = teamContext.members.get('sub-team/worker-b');
    expect(nested?.state.agentId).toBe('agent-worker-b');
  });
});
