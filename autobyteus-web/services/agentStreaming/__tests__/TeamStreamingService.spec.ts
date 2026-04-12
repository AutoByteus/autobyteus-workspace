import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamStreamingService } from '../TeamStreamingService';

const { handleBrowserToolExecutionSucceededMock } = vi.hoisted(() => ({
  handleBrowserToolExecutionSucceededMock: vi.fn(),
}));

vi.mock('../browser/browserToolExecutionSucceededHandler', () => ({
  handleBrowserToolExecutionSucceeded: handleBrowserToolExecutionSucceededMock,
}));

describe('TeamStreamingService', () => {
  beforeEach(() => {
    handleBrowserToolExecutionSucceededMock.mockReset();
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
      focusedMemberName: 'worker-a',
      members: new Map([
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
    expect(outbound.payload.approval_token).toMatchObject({
      teamRunId: 'run-1',
      runVersion: 2,
      invocationId: 'inv-1',
      targetMemberName: 'worker-a',
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
      focusedMemberName: 'worker-a',
      members: new Map([
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
      focusedMemberName: 'worker-a',
      members: new Map([
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
      focusedMemberName: 'worker-a',
      members: new Map([
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
      focusedMemberName: 'Student',
      members: new Map([
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
    expect((teamContext.members.get('Professor') as any).state.runId).toBe('prof-run-2');
    expect((teamContext.members.get('Professor') as any).isSending).toBe(true);
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
      focusedMemberName: 'worker-a',
      members: new Map([
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
      focusedMemberName: 'Student',
      members: new Map([
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
      compactionModelIdentifier: null,
      errorMessage: null,
    });
    expect(studentContext.state.compactionStatus).toBeNull();
  });
});
