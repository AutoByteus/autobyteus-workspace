import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamStreamingService } from '../TeamStreamingService';
import type { ServerMessage } from '../protocol';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

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

const createWsHarness = () => {
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
  return { callbacks, service, wsClient };
};

const createLogicalAgentContext = (memberName: string, runId: string): AgentContext => {
  const conversation = {
    id: runId,
    messages: [],
    createdAt: '2026-05-30T00:00:00.000Z',
    updatedAt: '2026-05-30T00:00:00.000Z',
    agentDefinitionId: `${memberName}-definition`,
    agentName: memberName,
    llmModelIdentifier: 'test-model',
  };
  return new AgentContext(
    {
      agentDefinitionId: `${memberName}-definition`,
      agentDefinitionName: memberName,
      llmModelIdentifier: 'test-model',
      runtimeKind: 'codex_app_server',
      workspaceId: null,
      workspaceMetadata: null,
      autoExecuteTools: true,
      skillAccessMode: 'NONE',
      isLocked: true,
      llmConfig: null,
    },
    new AgentRunState(runId, conversation),
  );
};

const createTeamContextWithWorker = () => {
  const coordinatorContext = createLogicalAgentContext('coordinator', 'coordinator-run-1');
  coordinatorContext.state.currentStatus = AgentStatus.Running;
  const workerContext = createLogicalAgentContext('worker', 'worker-run-1');
  const coordinatorNode = {
    memberKind: 'agent',
    memberName: 'coordinator',
    displayName: 'Coordinator',
    memberPath: ['coordinator'],
    memberRouteKey: 'coordinator',
    memberRunId: 'coordinator-run-1',
    agentDefinitionId: 'coordinator-definition',
    currentStatus: AgentStatus.Running,
  };
  const workerNode = {
    memberKind: 'agent',
    memberName: 'worker',
    displayName: 'Worker',
    memberPath: ['worker'],
    memberRouteKey: 'worker',
    memberRunId: 'worker-run-1',
    agentDefinitionId: 'worker-definition',
    currentStatus: AgentStatus.Offline,
  };
  return {
    currentStatus: AgentTeamStatus.Idle,
    focusedMemberRouteKey: 'worker',
    coordinatorMemberRouteKey: 'coordinator',
    memberTree: [coordinatorNode, workerNode],
    memberNodesByRouteKey: new Map([
      ['coordinator', coordinatorNode],
      ['worker', workerNode],
    ]),
    leafAgentContextsByRouteKey: new Map([
      ['coordinator', coordinatorContext],
      ['worker', workerContext],
    ]),
  } as any;
};

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
          member_route_key: 'worker-a',
          member_path: ['worker-a'],
          source_route_key: 'worker-a',
          source_path: ['worker-a'],
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

  it('serializes focused member interrupt with route-key target and optional run guard', () => {
    const wsClient = {
      state: 'disconnected',
      connect: vi.fn(),
      disconnect: vi.fn(),
      send: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as any;

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    service.interruptGeneration({
      targetMemberRouteKey: 'code_reviewer',
      targetMemberRunId: 'team-1::code_reviewer',
    });

    expect(wsClient.send).toHaveBeenCalledTimes(1);
    const outbound = JSON.parse(wsClient.send.mock.calls[0][0]);
    expect(outbound).toEqual({
      type: 'INTERRUPT_GENERATION',
      payload: {
        target_member_route_key: 'code_reviewer',
        target_member_run_id: 'team-1::code_reviewer',
      },
    });
  });

  it('requires a focused member route key for team interrupt serialization', () => {
    const wsClient = {
      state: 'disconnected',
      connect: vi.fn(),
      disconnect: vi.fn(),
      send: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as any;

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });

    expect(() =>
      service.interruptGeneration({
        targetMemberRouteKey: '   ',
      }),
    ).toThrow('target member route key is required');
    expect(wsClient.send).not.toHaveBeenCalled();
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
          member_route_key: 'Professor',
          member_path: ['Professor'],
          source_route_key: 'Professor',
          source_path: ['Professor'],
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

  it('does not route live member events through the focused member when canonical identity is absent', () => {
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
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
      const professorConversation: { messages: any[]; updatedAt: string } = { messages: [], updatedAt: '' };
      const studentConversation: { messages: any[]; updatedAt: string } = { messages: [], updatedAt: '' };
      const teamContext = {
        focusedMemberRouteKey: 'Student',
        leafAgentContextsByRouteKey: new Map([
          [
            'Professor',
            {
              state: { runId: 'prof-run-1', compactionStatus: null },
              conversation: professorConversation,
            },
          ],
          [
            'Student',
            {
              state: { runId: 'student-run-1', compactionStatus: null },
              conversation: studentConversation,
            },
          ],
        ]),
      } as any;

      service.connect('team-1', teamContext);
      callbacks.get('onMessage')?.(
        JSON.stringify({
          type: 'EXTERNAL_USER_MESSAGE',
          payload: {
            content: 'old payload without route identity',
            received_at: '2026-03-10T20:15:00.000Z',
            agent_name: 'Professor',
            agent_id: 'prof-run-2',
          },
        }),
      );

      expect(professorConversation.messages).toHaveLength(0);
      expect(studentConversation.messages).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith('No member context found for message, skipping');
    } finally {
      warnSpy.mockRestore();
    }
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
          member_route_key: 'worker-a',
          member_path: ['worker-a'],
          source_route_key: 'worker-a',
          source_path: ['worker-a'],
        },
      }),
    );

    expect(handleBrowserToolExecutionSucceededMock).toHaveBeenCalledWith(expect.objectContaining({
      invocation_id: 'call-1',
      tool_name: 'open_tab',
      result: {
        tab_id: 'browser-session-1',
        status: 'opened',
        url: 'https://example.com',
        title: 'Example',
      },
      agent_name: 'worker-a',
    }));
  });

  it('does not clear stale team/member error from live non-status activity', () => {
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
      state: {
        runId: 'prof-run-1',
        currentStatus: AgentStatus.Error,
        canInterrupt: true,
        compactionStatus: null,
      },
      conversation: { messages: [], updatedAt: '' },
      isSending: false,
    };
    const studentContext = {
      state: {
        runId: 'student-run-1',
        currentStatus: AgentStatus.Error,
        canInterrupt: true,
        compactionStatus: null,
      },
      conversation: { messages: [], updatedAt: '' },
      isSending: false,
    };
    const teamContext = {
      currentStatus: AgentTeamStatus.Error,
      focusedMemberRouteKey: 'Student',
      leafAgentContextsByRouteKey: new Map([
        ['Professor', professorContext],
        ['Student', studentContext],
      ]),
    } as any;

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'SEGMENT_START',
        payload: {
          id: 'segment-1',
          turn_id: 'turn-1',
          segment_type: 'text',
          agent_name: 'Professor',
          agent_id: 'prof-run-1',
          member_route_key: 'Professor',
          member_path: ['Professor'],
          source_route_key: 'Professor',
          source_path: ['Professor'],
        },
      }),
    );

    expect(teamContext.currentStatus).toBe(AgentTeamStatus.Error);
    expect(professorContext.state.currentStatus).toBe(AgentStatus.Error);
    expect(professorContext.state.canInterrupt).toBe(true);
    expect(professorContext.isSending).toBe(false);
    expect(studentContext.state.currentStatus).toBe(AgentStatus.Error);
    expect(studentContext.state.canInterrupt).toBe(true);
  });

  it('does not repair stale member error from focused-member fallback without explicit identity', () => {
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
    const focusedContext = {
      state: {
        runId: 'focused-run-1',
        currentStatus: AgentStatus.Error,
        canInterrupt: true,
        compactionStatus: null,
      },
      conversation: { messages: [], updatedAt: '' },
      isSending: false,
    };
    const teamContext = {
      currentStatus: AgentTeamStatus.Error,
      focusedMemberRouteKey: 'Focused',
      leafAgentContextsByRouteKey: new Map([
        ['Focused', focusedContext],
      ]),
    } as any;

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'SEGMENT_START',
        payload: {
          id: 'segment-without-member-id',
          turn_id: 'turn-1',
          segment_type: 'text',
        },
      }),
    );

    expect(focusedContext.state.currentStatus).toBe(AgentStatus.Error);
    expect(focusedContext.state.canInterrupt).toBe(true);
    expect(focusedContext.isSending).toBe(false);
    expect(teamContext.currentStatus).toBe(AgentTeamStatus.Error);
    expect(focusedContext.conversation.messages).toHaveLength(0);
  });

  it('does not promote non-error team/member lifecycle status from live activity alone', () => {
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
    const memberContext = {
      state: {
        runId: 'member-run-1',
        currentStatus: AgentStatus.Idle,
        canInterrupt: false,
        compactionStatus: null,
      },
      conversation: { messages: [], updatedAt: '' },
      isSending: false,
    };
    const teamContext = {
      currentStatus: AgentTeamStatus.Idle,
      focusedMemberRouteKey: 'worker-a',
      leafAgentContextsByRouteKey: new Map([
        ['worker-a', memberContext],
      ]),
    } as any;

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'SEGMENT_START',
        payload: {
          id: 'segment-1',
          turn_id: 'turn-1',
          segment_type: 'text',
          agent_name: 'worker-a',
          agent_id: 'member-run-1',
          member_route_key: 'worker-a',
          member_path: ['worker-a'],
          source_route_key: 'worker-a',
          source_path: ['worker-a'],
        },
      }),
    );

    expect(teamContext.currentStatus).toBe(AgentTeamStatus.Idle);
    expect(memberContext.state.currentStatus).toBe(AgentStatus.Idle);
    expect(memberContext.isSending).toBe(false);
  });

  it('applies backend-owned agent status to a structural subteam node by route key', () => {
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

    const buildSquadNode = {
      memberKind: 'agent_team',
      memberName: 'BuildSquad',
      displayName: 'BuildSquad',
      memberRouteKey: 'BuildSquad',
      memberPath: ['BuildSquad'],
      children: [],
      currentStatus: AgentStatus.Offline,
    };
    const teamContext = {
      currentStatus: AgentTeamStatus.Idle,
      focusedMemberRouteKey: 'program_manager',
      leafAgentContextsByRouteKey: new Map(),
      memberNodesByRouteKey: new Map([
        ['BuildSquad', buildSquadNode],
      ]),
    } as any;

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'AGENT_STATUS',
        payload: {
          status: 'initializing',
          can_interrupt: false,
          member_route_key: 'BuildSquad',
          member_path: ['BuildSquad'],
          source_route_key: 'BuildSquad',
          source_path: ['BuildSquad'],
        },
      }),
    );

    expect(buildSquadNode.currentStatus).toBe(AgentStatus.Initializing);
    expect(teamContext.currentStatus).toBe(AgentTeamStatus.Idle);
  });

  it('applies backend-owned team status to a structural subteam node by source path', () => {
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

    const buildSquadNode = {
      memberKind: 'agent_team',
      memberName: 'BuildSquad',
      displayName: 'BuildSquad',
      memberRouteKey: 'BuildSquad',
      memberPath: ['BuildSquad'],
      children: [],
      currentStatus: AgentStatus.Offline,
    };
    const teamContext = {
      currentStatus: AgentTeamStatus.Idle,
      focusedMemberRouteKey: 'program_manager',
      leafAgentContextsByRouteKey: new Map(),
      memberNodesByRouteKey: new Map([
        ['BuildSquad', buildSquadNode],
      ]),
    } as any;

    const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'TEAM_STATUS',
        payload: {
          status: 'initializing',
          source_path: ['BuildSquad'],
        },
      }),
    );

    expect(buildSquadNode.currentStatus).toBe(AgentStatus.Initializing);
    expect(teamContext.currentStatus).toBe(AgentTeamStatus.Idle);
  });

  it('does not convert team transport errors into lifecycle errors', () => {
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
      currentStatus: AgentTeamStatus.Running,
      focusedMemberRouteKey: 'worker-a',
      leafAgentContextsByRouteKey: new Map([
        [
          'worker-a',
          {
            state: {
              runId: 'member-run-1',
              currentStatus: AgentStatus.Running,
              canInterrupt: true,
              compactionStatus: null,
            },
            conversation: { messages: [], updatedAt: '' },
          },
        ],
      ]),
    } as any;

    service.connect('team-1', teamContext);
    callbacks.get('onConnect')?.();
    callbacks.get('onError')?.(new Error('socket failed'));
    callbacks.get('onDisconnect')?.('network reset');

    expect(teamContext.currentStatus).toBe(AgentTeamStatus.Running);
    expect(teamContext.leafAgentContextsByRouteKey.get('worker-a')?.state.currentStatus).toBe(AgentStatus.Running);
    expect(teamContext.isSubscribed).toBe(false);
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
      member_route_key: 'worker-a',
      member_path: ['worker-a'],
      source_route_key: 'worker-a',
      source_path: ['worker-a'],
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

  it('projects task-agent stream identity into a transient context and removes it after offline settlement', () => {
    const { callbacks, service } = createWsHarness();
    const teamContext = createTeamContextWithWorker();
    const workerContext = teamContext.leafAgentContextsByRouteKey.get('worker');

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'AGENT_STATUS',
        payload: {
          status: 'running',
          can_interrupt: true,
          agent_id: 'task-agent-run-1',
          agent_name: 'worker',
          member_route_key: 'worker',
          member_path: ['worker'],
          source_route_key: 'worker',
          source_path: ['worker'],
          task_agent_instance_id: 'task-agent-instance-1',
          task_agent_run_id: 'task-agent-run-1',
          task_id: 'task-1',
        },
      }),
    );

    const taskContext = teamContext.leafAgentContextsByRouteKey.get('task-agent-run-1');
    const taskNode = teamContext.memberNodesByRouteKey.get('task-agent-run-1');
    expect(taskContext).toBeTruthy();
    expect(taskContext.state.currentStatus).toBe(AgentStatus.Running);
    expect(taskNode).toMatchObject({
      isTaskAgentInstance: true,
      memberRouteKey: 'task-agent-run-1',
      memberRunId: 'task-agent-run-1',
      taskAgentInstanceId: 'task-agent-instance-1',
      taskAgentRunId: 'task-agent-run-1',
      taskId: 'task-1',
      logicalMemberRouteKey: 'worker',
    });
    expect(teamContext.memberTree.map((node: any) => node.memberRouteKey)).toContain('task-agent-run-1');
    expect(workerContext.state.runId).toBe('worker-run-1');

    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'EXTERNAL_USER_MESSAGE',
        payload: {
          content: 'Task-agent work packet',
          received_at: '2026-05-30T08:00:00.000Z',
          message_id: 'work-packet-1',
          agent_name: 'worker',
          agent_id: 'task-agent-run-1',
          member_route_key: 'worker',
          member_path: ['worker'],
          source_route_key: 'worker',
          source_path: ['worker'],
        },
      }),
    );

    expect(taskContext.conversation.messages).toHaveLength(1);
    expect(taskContext.conversation.messages[0]).toMatchObject({
      type: 'user',
      text: 'Task-agent work packet',
      messageId: 'work-packet-1',
    });
    expect(workerContext.conversation.messages).toHaveLength(0);

    teamContext.focusedMemberRouteKey = 'task-agent-run-1';
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'AGENT_STATUS',
        payload: {
          status: 'offline',
          can_interrupt: false,
          agent_id: 'task-agent-run-1',
          agent_name: 'worker',
          member_route_key: 'worker',
          member_path: ['worker'],
          source_route_key: 'worker',
          source_path: ['worker'],
          task_agent_instance_id: 'task-agent-instance-1',
          task_agent_run_id: 'task-agent-run-1',
          task_id: 'task-1',
        },
      }),
    );

    expect(teamContext.leafAgentContextsByRouteKey.has('task-agent-run-1')).toBe(false);
    expect(teamContext.memberNodesByRouteKey.has('task-agent-run-1')).toBe(false);
    expect(teamContext.memberTree.map((node: any) => node.memberRouteKey)).not.toContain('task-agent-run-1');
    expect(teamContext.focusedMemberRouteKey).toBe('coordinator');
  });

  it('does not let identity-less task-agent status poison the logical member context before projection exists', () => {
    const { callbacks, service } = createWsHarness();
    const teamContext = createTeamContextWithWorker();
    const workerContext = teamContext.leafAgentContextsByRouteKey.get('worker');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      service.connect('team-1', teamContext);
      callbacks.get('onMessage')?.(
        JSON.stringify({
          type: 'AGENT_STATUS',
          payload: {
            status: 'initializing',
            can_interrupt: false,
            agent_id: 'team-1__worker__task_0001',
            agent_name: 'worker',
            member_route_key: 'worker',
            member_path: ['worker'],
            source_route_key: 'worker',
            source_path: ['worker'],
          },
        }),
      );

      expect(workerContext.state.runId).toBe('worker-run-1');
      expect(workerContext.state.currentStatus).toBe(AgentStatus.Offline);
      expect(workerContext.conversation.messages).toHaveLength(0);
      expect(teamContext.leafAgentContextsByRouteKey.has('team-1__worker__task_0001')).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith('No member context found for message, skipping');

      callbacks.get('onMessage')?.(
        JSON.stringify({
          type: 'AGENT_STATUS',
          payload: {
            status: 'running',
            can_interrupt: true,
            agent_id: 'team-1__worker__task_0001',
            agent_name: 'worker',
            member_route_key: 'worker',
            member_path: ['worker'],
            source_route_key: 'worker',
            source_path: ['worker'],
            task_agent_instance_id: 'task-agent-instance-1',
            task_agent_run_id: 'team-1__worker__task_0001',
            task_id: 'task_0001',
          },
        }),
      );

      const taskContext = teamContext.leafAgentContextsByRouteKey.get('team-1__worker__task_0001');
      expect(taskContext).toBeTruthy();
      expect(taskContext?.state.currentStatus).toBe(AgentStatus.Running);
      expect(workerContext.state.runId).toBe('worker-run-1');
      expect(workerContext.state.currentStatus).toBe(AgentStatus.Offline);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('creates the transient task-agent context from a work-packet echo that carries task-agent identity', () => {
    const { callbacks, service } = createWsHarness();
    const teamContext = createTeamContextWithWorker();
    const workerContext = teamContext.leafAgentContextsByRouteKey.get('worker');

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'EXTERNAL_USER_MESSAGE',
        payload: {
          content: 'Delegated task work packet',
          received_at: '2026-05-30T08:00:00.000Z',
          message_id: 'work-packet-with-task-agent-identity',
          agent_name: 'worker',
          agent_id: 'task-agent-run-from-packet',
          member_route_key: 'worker',
          member_path: ['worker'],
          source_route_key: 'worker',
          source_path: ['worker'],
          task_agent_instance_id: 'task-agent-instance-from-packet',
          task_agent_run_id: 'task-agent-run-from-packet',
          task_id: 'task-from-packet',
        },
      }),
    );

    const taskContext = teamContext.leafAgentContextsByRouteKey.get('task-agent-run-from-packet');
    expect(taskContext).toBeTruthy();
    expect(taskContext.conversation.messages).toHaveLength(1);
    expect(taskContext.conversation.messages[0]).toMatchObject({
      type: 'user',
      text: 'Delegated task work packet',
    });
    expect(teamContext.memberNodesByRouteKey.get('task-agent-run-from-packet')).toMatchObject({
      isTaskAgentInstance: true,
      logicalMemberRouteKey: 'worker',
      taskId: 'task-from-packet',
    });
    expect(workerContext.conversation.messages).toHaveLength(0);
    expect(workerContext.state.runId).toBe('worker-run-1');
  });

  it('repairs a missing task-agent node when the task-agent context already exists', () => {
    const { callbacks, service } = createWsHarness();
    const teamContext = createTeamContextWithWorker();

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'AGENT_STATUS',
        payload: {
          status: 'running',
          can_interrupt: true,
          agent_id: 'task-agent-run-repair',
          agent_name: 'worker',
          member_route_key: 'worker',
          member_path: ['worker'],
          source_route_key: 'worker',
          source_path: ['worker'],
          task_agent_instance_id: 'task-agent-instance-repair',
          task_agent_run_id: 'task-agent-run-repair',
          task_id: 'task-repair',
        },
      }),
    );
    const existingTaskContext = teamContext.leafAgentContextsByRouteKey.get('task-agent-run-repair');
    expect(existingTaskContext).toBeTruthy();

    teamContext.memberNodesByRouteKey.delete('task-agent-run-repair');
    teamContext.memberTree = teamContext.memberTree.filter((node: any) => node.memberRouteKey !== 'task-agent-run-repair');

    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'SEGMENT_START',
        payload: {
          id: 'task-agent-repair-segment',
          turn_id: 'turn-repair',
          segment_type: 'text',
          agent_id: 'task-agent-run-repair',
          agent_name: 'worker',
          member_route_key: 'worker',
          member_path: ['worker'],
          source_route_key: 'worker',
          source_path: ['worker'],
          task_agent_instance_id: 'task-agent-instance-repair',
          task_agent_run_id: 'task-agent-run-repair',
          task_id: 'task-repair',
        },
      }),
    );

    expect(teamContext.leafAgentContextsByRouteKey.get('task-agent-run-repair')).toBe(existingTaskContext);
    expect(teamContext.memberNodesByRouteKey.get('task-agent-run-repair')).toMatchObject({
      isTaskAgentInstance: true,
      logicalMemberRouteKey: 'worker',
      taskAgentRunId: 'task-agent-run-repair',
    });
    expect(teamContext.memberTree.map((node: any) => node.memberRouteKey)).toContain('task-agent-run-repair');
  });

  it('routes typed task-agent tool approval requests and approval commands by task-agent run identity', () => {
    const { callbacks, service, wsClient } = createWsHarness();
    const teamContext = createTeamContextWithWorker();
    const workerContext = teamContext.leafAgentContextsByRouteKey.get('worker');
    const approvalMessage = {
      type: 'TOOL_APPROVAL_REQUESTED',
      payload: {
        invocation_id: 'tool-approval-1',
        tool_name: 'read_file',
        turn_id: 'turn-tool-1',
        arguments: { path: '/tmp/task-agent-input.txt' },
        agent_id: 'task-agent-run-tool',
        agent_name: 'worker',
        member_route_key: 'worker',
        member_path: ['worker'],
        source_route_key: 'worker',
        source_path: ['worker'],
        task_agent_instance_id: 'task-agent-instance-tool',
        task_agent_run_id: 'task-agent-run-tool',
        task_id: 'task-tool',
      },
    } satisfies ServerMessage;

    service.connect('team-1', teamContext);
    callbacks.get('onMessage')?.(JSON.stringify(approvalMessage));

    const taskContext = teamContext.leafAgentContextsByRouteKey.get('task-agent-run-tool');
    expect(taskContext).toBeTruthy();
    expect(workerContext.conversation.messages).toHaveLength(0);
    expect(taskContext.conversation.messages).toHaveLength(1);
    const toolSegment = (taskContext.conversation.messages[0] as any).segments[0];
    expect(toolSegment).toMatchObject({
      invocationId: 'tool-approval-1',
      status: 'awaiting-approval',
      approvalTarget: {
        memberRouteKey: 'worker',
        sourceRouteKey: 'worker',
        taskAgentRunId: 'task-agent-run-tool',
      },
    });

    service.approveTool('tool-approval-1');

    const outbound = JSON.parse(wsClient.send.mock.calls[0][0]);
    expect(outbound).toMatchObject({
      type: 'APPROVE_TOOL',
      payload: {
        invocation_id: 'tool-approval-1',
        member_route_key: 'worker',
        source_route_key: 'worker',
        task_agent_run_id: 'task-agent-run-tool',
      },
    });
  });

  it('keeps parallel same-member task-agent instances distinct until each settles', () => {
    const { callbacks, service } = createWsHarness();
    const teamContext = createTeamContextWithWorker();

    service.connect('team-1', teamContext);
    for (const taskNumber of [1, 2]) {
      callbacks.get('onMessage')?.(
        JSON.stringify({
          type: 'AGENT_STATUS',
          payload: {
            status: 'running',
            can_interrupt: true,
            agent_id: `task-agent-run-${taskNumber}`,
            agent_name: 'worker',
            member_route_key: 'worker',
            member_path: ['worker'],
            source_route_key: 'worker',
            source_path: ['worker'],
            task_agent_instance_id: `task-agent-instance-${taskNumber}`,
            task_agent_run_id: `task-agent-run-${taskNumber}`,
            task_id: `task-${taskNumber}`,
          },
        }),
      );
    }

    const firstContext = teamContext.leafAgentContextsByRouteKey.get('task-agent-run-1');
    const secondContext = teamContext.leafAgentContextsByRouteKey.get('task-agent-run-2');
    expect(firstContext).toBeTruthy();
    expect(secondContext).toBeTruthy();
    expect(teamContext.memberNodesByRouteKey.get('task-agent-run-1')?.displayName).toContain('task-1');
    expect(teamContext.memberNodesByRouteKey.get('task-agent-run-2')?.displayName).toContain('task-2');

    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'SEGMENT_START',
        payload: {
          id: 'task-2-segment',
          turn_id: 'turn-task-2',
          segment_type: 'text',
          agent_id: 'task-agent-run-2',
          agent_name: 'worker',
          member_route_key: 'worker',
          member_path: ['worker'],
          source_route_key: 'worker',
          source_path: ['worker'],
          task_agent_instance_id: 'task-agent-instance-2',
          task_agent_run_id: 'task-agent-run-2',
          task_id: 'task-2',
        },
      }),
    );

    expect(firstContext.conversation.messages).toHaveLength(0);
    expect(secondContext.conversation.messages).toHaveLength(1);

    callbacks.get('onMessage')?.(
      JSON.stringify({
        type: 'AGENT_STATUS',
        payload: {
          status: 'offline',
          can_interrupt: false,
          agent_id: 'task-agent-run-1',
          agent_name: 'worker',
          member_route_key: 'worker',
          member_path: ['worker'],
          source_route_key: 'worker',
          source_path: ['worker'],
          task_agent_instance_id: 'task-agent-instance-1',
          task_agent_run_id: 'task-agent-run-1',
          task_id: 'task-1',
        },
      }),
    );

    expect(teamContext.leafAgentContextsByRouteKey.has('task-agent-run-1')).toBe(false);
    expect(teamContext.memberNodesByRouteKey.has('task-agent-run-1')).toBe(false);
    expect(teamContext.leafAgentContextsByRouteKey.has('task-agent-run-2')).toBe(true);
    expect(teamContext.memberNodesByRouteKey.has('task-agent-run-2')).toBe(true);
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
          member_route_key: 'Professor',
          member_path: ['Professor'],
          source_route_key: 'Professor',
          source_path: ['Professor'],
        },
      }),
    );

    expect(professorContext.state.runId).toBe('prof-run-2');
    expect(professorContext.state.compactionStatus).toEqual({
      activityId: 'compaction:turn:prof-run-2:turn-9',
      phase: 'completed',
      message: 'Memory compacted',
      turnId: 'turn-9',
      compactionOperationId: null,
      requestedTurnId: null,
      executionTurnId: null,
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
