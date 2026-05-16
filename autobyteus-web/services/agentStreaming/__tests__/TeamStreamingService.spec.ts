import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamStreamingService } from '../TeamStreamingService';

const { handleBrowserToolExecutionSucceededMock, upsertTeamCommunicationMessageMock } = vi.hoisted(() => ({
  handleBrowserToolExecutionSucceededMock: vi.fn(),
  upsertTeamCommunicationMessageMock: vi.fn(),
}));

vi.mock('../browser/browserToolExecutionSucceededHandler', () => ({
  handleBrowserToolExecutionSucceeded: handleBrowserToolExecutionSucceededMock,
}));

vi.mock('~/stores/teamCommunicationStore', () => ({
  useTeamCommunicationStore: () => ({
    upsertFromBackendPayload: upsertTeamCommunicationMessageMock,
  }),
}));

describe('TeamStreamingService', () => {
  beforeEach(() => {
    handleBrowserToolExecutionSucceededMock.mockReset();
    upsertTeamCommunicationMessageMock.mockReset();
  });

  it('echoes captured approval token when approving tool invocation', () => {
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

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const teamContext = {
      focusedMemberRouteKey: 'worker-a',
      leafAgentContextsByRouteKey: new Map([
        [
          'worker-a',
          {
            state: { runId: 'agent-1', compactionStatus: null },
            conversation: { messages: [], updatedAt: '' },
          },
        ],
      ]),
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
            invocationId: 'inv-1',
            invocationVersion: 1,
            targetMemberRouteKey: 'worker-a',
          },
        },
      }),
    );

    service.approveTool('inv-1', { memberRouteKey: 'worker-a' });

    expect(wsClient.send).toHaveBeenCalledTimes(1);
    const outbound = JSON.parse(wsClient.send.mock.calls[0][0]);
    expect(outbound.type).toBe('APPROVE_TOOL');
    expect(outbound.payload.invocation_id).toBe('inv-1');
    expect(outbound.payload.member_route_key).toBe('worker-a');
    expect(outbound.payload.approval_token).toMatchObject({
      teamRunId: 'run-1',
      invocationId: 'inv-1',
      targetMemberRouteKey: 'worker-a',
    });
  });

  it('uses the approval request source route when approving after focus changes', () => {
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

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const reviewLeadConversation = { messages: [], updatedAt: '' } as any;
    const programManagerConversation = { messages: [], updatedAt: '' } as any;
    const teamContext = {
      focusedMemberRouteKey: 'program_manager',
      leafAgentContextsByRouteKey: new Map([
        [
          'program_manager',
          {
            state: { runId: 'pm-run-1', compactionStatus: null },
            conversation: programManagerConversation,
          },
        ],
        [
          'BuildSquad/review_lead',
          {
            state: { runId: 'review-run-1', compactionStatus: null },
            conversation: reviewLeadConversation,
          },
        ],
      ]),
    } as any;

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'TOOL_APPROVAL_REQUESTED',
        payload: {
          invocation_id: 'inv-nested',
          tool_name: 'run_bash',
          arguments: { command: 'pnpm test' },
          member_route_key: 'BuildSquad/review_lead',
          member_path: ['BuildSquad', 'review_lead'],
          source_route_key: 'BuildSquad/review_lead',
          source_path: ['BuildSquad', 'review_lead'],
        },
      }),
    );

    teamContext.focusedMemberRouteKey = 'program_manager';
    service.approveTool('inv-nested');

    expect(reviewLeadConversation.messages).toHaveLength(1);
    expect(programManagerConversation.messages).toHaveLength(0);
    const outbound = JSON.parse(wsClient.send.mock.calls[0][0]);
    expect(outbound.type).toBe('APPROVE_TOOL');
    expect(outbound.payload).toMatchObject({
      invocation_id: 'inv-nested',
      member_route_key: 'BuildSquad/review_lead',
      member_path: ['BuildSquad', 'review_lead'],
      source_route_key: 'BuildSquad/review_lead',
      source_path: ['BuildSquad', 'review_lead'],
    });
  });

  it('marks team subscription state on connect and disconnect callbacks', () => {
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

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const teamContext = {
      isSubscribed: false,
      focusedMemberRouteKey: 'worker-a',
      leafAgentContextsByRouteKey: new Map([
        [
          'worker-a',
          {
            state: { runId: 'agent-1', compactionStatus: null },
            conversation: { messages: [], updatedAt: '' },
          },
        ],
      ]),
    } as any;

    service.connect('team-1', teamContext);
    callbacks.get('onConnect')?.();
    expect(teamContext.isSubscribed).toBe(true);

    callbacks.get('onDisconnect')?.('closed');
    expect(teamContext.isSubscribed).toBe(false);
  });

  it('reattaches lifecycle callbacks to the latest team context', () => {
    const callbacks = new Map<string, (payload?: any) => void>();
    const wsClient = {
      state: 'connected',
      connect: vi.fn(),
      disconnect: vi.fn(),
      send: vi.fn(),
      on: vi.fn((event: string, cb: (payload?: any) => void) => {
        callbacks.set(event, cb);
      }),
      off: vi.fn(),
    } as any;

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const originalContext = {
      isSubscribed: false,
      focusedMemberRouteKey: 'worker-a',
      leafAgentContextsByRouteKey: new Map([
        [
          'worker-a',
          {
            state: { runId: 'agent-1', compactionStatus: null },
            conversation: { messages: [], updatedAt: '' },
          },
        ],
      ]),
    } as any;
    const replacementContext = {
      isSubscribed: false,
      focusedMemberRouteKey: 'worker-a',
      leafAgentContextsByRouteKey: new Map([
        [
          'worker-a',
          {
            state: { runId: 'agent-1' },
            conversation: { messages: [], updatedAt: '' },
          },
        ],
      ]),
    } as any;

    service.connect('team-1', originalContext);
    service.attachContext(replacementContext);

    callbacks.get('onConnect')?.();
    callbacks.get('onDisconnect')?.('closed');

    expect(originalContext.isSubscribed).toBe(false);
    expect(replacementContext.isSubscribed).toBe(false);
  });

  it('mirrors external user messages into the targeted team member conversation', () => {
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

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const professorConversation: { messages: any[]; updatedAt: string } = { messages: [], updatedAt: '' };
    const studentConversation: { messages: any[]; updatedAt: string } = { messages: [], updatedAt: '' };
    const teamContext = {
      isSubscribed: false,
      focusedMemberRouteKey: 'Student',
      leafAgentContextsByRouteKey: new Map([
        [
          'Professor',
          {
            state: { runId: 'prof-run-1', compactionStatus: null },
            conversation: professorConversation,
            isSending: false,
          },
        ],
        [
          'Student',
          {
            state: { runId: 'student-run-1', compactionStatus: null },
            conversation: studentConversation,
            isSending: false,
          },
        ],
      ]),
    } as any;

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'EXTERNAL_USER_MESSAGE',
        payload: {
          content: 'hello from telegram',
          received_at: '2026-03-10T20:15:00.000Z',
          agent_name: 'Professor',
          agent_id: 'prof-run-2',
        },
      }),
    );

    expect(professorConversation.messages).toHaveLength(1);
    expect(professorConversation.messages[0]).toMatchObject({
      type: 'user',
      text: 'hello from telegram',
    });
    expect(professorConversation.messages[0].timestamp.toISOString()).toBe('2026-03-10T20:15:00.000Z');
    expect((teamContext.leafAgentContextsByRouteKey.get('Professor') as any).state.runId).toBe('prof-run-2');
    expect((teamContext.leafAgentContextsByRouteKey.get('Professor') as any).isSending).toBe(true);
    expect(studentConversation.messages).toHaveLength(0);
  });

  it('routes successful tool execution through the browser-owned post-success handler', () => {
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

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const teamContext = {
      focusedMemberRouteKey: 'worker-a',
      leafAgentContextsByRouteKey: new Map([
        [
          'worker-a',
          {
            state: { runId: 'agent-1', compactionStatus: null },
            conversation: { messages: [], updatedAt: '' },
          },
        ],
      ]),
    } as any;

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'TOOL_EXECUTION_SUCCEEDED',
        payload: {
          invocation_id: 'call-1',
          tool_name: 'open_tab',
          result: {
            tab_id: 'browser-session-1',
            status: 'opened',
            url: 'https://example.com',
            title: 'Example',
          },
          agent_name: 'worker-a',
        },
      }),
    );

    expect(handleBrowserToolExecutionSucceededMock).toHaveBeenCalledWith({
      invocation_id: 'call-1',
      tool_name: 'open_tab',
      result: {
        tab_id: 'browser-session-1',
        status: 'opened',
        url: 'https://example.com',
        title: 'Example',
      },
      agent_name: 'worker-a',
    });
  });

  it('routes raw inter-agent messages only to the targeted member conversation', () => {
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

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const conversation = { messages: [], updatedAt: '' } as any;
    const teamContext = {
      focusedMemberRouteKey: 'worker-a',
      leafAgentContextsByRouteKey: new Map([
        [
          'worker-a',
          {
            state: { runId: 'receiver-run-1', compactionStatus: null },
            conversation,
          },
        ],
      ]),
    } as any;

    const payload = {
      message_id: 'message-1',
      team_run_id: 'team-1',
      sender_agent_id: 'sender-run-1',
      sender_agent_name: 'Reviewer',
      receiver_run_id: 'receiver-run-1',
      receiver_agent_name: 'Worker',
      recipient_role_name: 'worker-a',
      content: 'Please review the attached report.',
      message_type: 'handoff',
      reference_file_entries: [{ referenceId: 'ref-1', path: '/tmp/report.md', type: 'file' }],
      agent_name: 'worker-a',
      agent_id: 'receiver-run-1',
    };

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'INTER_AGENT_MESSAGE',
        payload,
      }),
    );

    expect(upsertTeamCommunicationMessageMock).not.toHaveBeenCalled();
    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0].segments[0]).toMatchObject({
      type: 'inter_agent_message',
      senderAgentRunId: 'sender-run-1',
      recipientRoleName: 'worker-a',
      content: 'Please review the attached report.',
      messageType: 'handoff',
    });
  });

  it('routes derived team communication messages to the team communication store', () => {
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

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const conversation = { messages: [], updatedAt: '' } as any;
    const teamContext = {
      focusedMemberRouteKey: 'worker-a',
      leafAgentContextsByRouteKey: new Map([
        [
          'worker-a',
          {
            state: { runId: 'receiver-run-1', compactionStatus: null },
            conversation,
          },
        ],
      ]),
    } as any;

    const payload = {
      messageId: 'message-1',
      teamRunId: 'team-1',
      senderRunId: 'sender-run-1',
      senderMemberName: 'Reviewer',
      receiverRunId: 'receiver-run-1',
      receiverMemberName: 'Worker',
      content: 'Please review the attached report.',
      messageType: 'handoff',
      createdAt: '2026-04-08T00:00:00.000Z',
      updatedAt: '2026-04-08T00:00:00.000Z',
      referenceFiles: [{ referenceId: 'ref-1', path: '/tmp/report.md', type: 'file', createdAt: '2026-04-08T00:00:00.000Z', updatedAt: '2026-04-08T00:00:00.000Z' }],
    };

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'TEAM_COMMUNICATION_MESSAGE',
        payload,
      }),
    );

    expect(upsertTeamCommunicationMessageMock).toHaveBeenCalledWith(payload);
    expect(conversation.messages).toHaveLength(0);
  });

  it('routes live parent-to-subteam communication payloads to the team communication store', () => {
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

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const programManagerConversation = { messages: [], updatedAt: '' } as any;
    const reviewLeadConversation = { messages: [], updatedAt: '' } as any;
    const teamContext = {
      focusedMemberRouteKey: 'program_manager',
      leafAgentContextsByRouteKey: new Map([
        [
          'program_manager',
          {
            state: { runId: 'program-manager-run', compactionStatus: null },
            conversation: programManagerConversation,
          },
        ],
        [
          'BuildSquad/review_lead',
          {
            state: { runId: 'review-lead-run', compactionStatus: null },
            conversation: reviewLeadConversation,
          },
        ],
      ]),
    } as any;

    const payload = {
      messageId: 'message-parent-to-subteam',
      teamRunId: 'team-1',
      senderRunId: 'program-manager-run',
      senderMemberKind: 'agent',
      senderMemberName: 'program_manager',
      senderMemberPath: ['program_manager'],
      senderMemberRouteKey: 'program_manager',
      receiverRunId: 'build-squad-run',
      receiverMemberKind: 'agent_team',
      receiverMemberName: 'BuildSquad',
      receiverMemberPath: ['BuildSquad'],
      receiverMemberRouteKey: 'BuildSquad',
      content: 'Reply with exactly token.',
      messageType: 'frontend_parent_to_subteam',
      createdAt: '2026-05-13T06:00:00.000Z',
      updatedAt: '2026-05-13T06:00:00.000Z',
      referenceFiles: [],
      source_path: ['program_manager'],
      source_route_key: 'program_manager',
    };

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'TEAM_COMMUNICATION_MESSAGE',
        payload,
      }),
    );

    expect(upsertTeamCommunicationMessageMock).toHaveBeenCalledWith(payload);
    expect(programManagerConversation.messages).toHaveLength(0);
    expect(reviewLeadConversation.messages).toHaveLength(0);
  });

  it('routes live member input echoes to the resolved nested leaf and upserts duplicate echoes by identity', () => {
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

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const programManagerConversation = { messages: [], updatedAt: '' } as any;
    const reviewLeadConversation = { messages: [], updatedAt: '' } as any;
    const teamContext = {
      focusedMemberRouteKey: 'program_manager',
      leafAgentContextsByRouteKey: new Map([
        [
          'program_manager',
          {
            state: { runId: 'program-manager-run', compactionStatus: null },
            conversation: programManagerConversation,
            isSending: false,
          },
        ],
        [
          'BuildSquad/review_lead',
          {
            state: { runId: 'review-lead-run', compactionStatus: null },
            conversation: reviewLeadConversation,
            isSending: false,
          },
        ],
      ]),
    } as any;

    const payload = {
      content: 'You received a message from sender name: program_manager, sender id: program-manager-run',
      received_at: '2026-05-13T06:30:00.000Z',
      message_id: 'member-input-1',
      dedupe_key: 'member_input:team-1:BuildSquad/review_lead:member-input-1',
      input_origin: 'inter_agent_delivery',
      agent_name: 'review_lead',
      agent_id: 'review-lead-run',
      member_route_key: 'BuildSquad/review_lead',
      member_path: ['BuildSquad', 'review_lead'],
      source_route_key: 'BuildSquad/review_lead',
      source_path: ['BuildSquad', 'review_lead'],
      sender_agent_id: 'program-manager-run',
      sender_agent_name: 'program_manager',
      parent_communication_message_id: 'team-message-1',
    };

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(JSON.stringify({ type: 'EXTERNAL_USER_MESSAGE', payload }));
    callbacks.get('onMessage')?.(JSON.stringify({ type: 'EXTERNAL_USER_MESSAGE', payload }));

    expect(programManagerConversation.messages).toHaveLength(0);
    expect(reviewLeadConversation.messages).toHaveLength(1);
    expect(reviewLeadConversation.messages[0]).toMatchObject({
      type: 'user',
      text: payload.content,
      messageId: 'member-input-1',
      dedupeKey: 'member_input:team-1:BuildSquad/review_lead:member-input-1',
    });
    expect(reviewLeadConversation.messages[0].timestamp.toISOString()).toBe('2026-05-13T06:30:00.000Z');
  });

  it('routes compaction lifecycle messages to the targeted member context', () => {
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

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const professorContext = {
      state: { runId: 'prof-run-1', compactionStatus: null },
      conversation: { messages: [], updatedAt: '' },
      isSending: false,
    };
    const studentContext = {
      state: { runId: 'student-run-1', compactionStatus: null },
      conversation: { messages: [], updatedAt: '' },
      isSending: false,
    };
    const teamContext = {
      focusedMemberRouteKey: 'Student',
      leafAgentContextsByRouteKey: new Map([
        ['Professor', professorContext],
        ['Student', studentContext],
      ]),
    } as any;

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'COMPACTION_STATUS',
        payload: {
          phase: 'completed',
          turn_id: 'turn-9',
          selected_block_count: 3,
          compacted_block_count: 2,
          agent_name: 'Professor',
          agent_id: 'prof-run-2',
        },
      }),
    );

    expect(professorContext.state.runId).toBe('prof-run-2');
    expect(professorContext.state.compactionStatus).toEqual({
      phase: 'completed',
      message: 'Memory compacted',
      turnId: 'turn-9',
      selectedBlockCount: 3,
      compactedBlockCount: 2,
      rawTraceCount: null,
      semanticFactCount: null,
      compactionAgentDefinitionId: null,
      compactionAgentName: null,
      compactionRuntimeKind: null,
      compactionModelIdentifier: null,
      compactionRunId: null,
      compactionTaskId: null,
      errorMessage: null,
    });
    expect(studentContext.state.compactionStatus).toBeNull();
  });
});
