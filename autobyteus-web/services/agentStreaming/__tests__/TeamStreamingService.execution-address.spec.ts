import { describe, expect, it, vi } from 'vitest';
import { TeamStreamingService } from '../TeamStreamingService';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

const addressCases = [
  {
    name: 'persistent member',
    address: createTeamExecutionAddress({
      rootTeamRunId: 'team-1',
      taskTeamRunIds: [],
      memberAddress: '/worker',
      taskAgentRunId: null,
    }),
  },
  {
    name: 'direct task Agent',
    address: createTeamExecutionAddress({
      rootTeamRunId: 'team-1',
      taskTeamRunIds: [],
      memberAddress: '/worker',
      taskAgentRunId: 'task-agent-run-1',
    }),
  },
  {
    name: 'outer task AgentTeam member',
    address: createTeamExecutionAddress({
      rootTeamRunId: 'team-1',
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: '/BuildSquad/reviewer',
      taskAgentRunId: null,
    }),
  },
  {
    name: 'nested task AgentTeam member',
    address: createTeamExecutionAddress({
      rootTeamRunId: 'team-1',
      taskTeamRunIds: ['task-team-outer', 'task-team-inner'],
      memberAddress: '/BuildSquad/ReviewCell/reviewer',
      taskAgentRunId: null,
    }),
  },
];

const createHarness = (state = 'connected') => {
  const callbacks = new Map<string, (payload?: any) => void>();
  const wsClient = {
    state,
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    on: vi.fn((event: string, callback: (payload?: any) => void) => callbacks.set(event, callback)),
    off: vi.fn(),
  } as any;
  const commandResults = vi.fn();
  const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', {
    wsClient,
    onInterruptCommandResult: commandResults,
  });
  service.connect('team-1', {
    teamRunId: 'team-1',
    config: {},
    rootTeam: { children: [] },
    memberNodesByAddress: new Map(),
    agentExecutionsByKey: new Map(),
    focusedExecutionAddress: addressCases[0]!.address,
    isActive: true,
    isSubscribed: true,
  } as any);
  return { callbacks, commandResults, service, wsClient };
};

const sent = (wsClient: { send: ReturnType<typeof vi.fn> }, index = 0) =>
  JSON.parse(String(wsClient.send.mock.calls[index]?.[0]));

describe('TeamStreamingService exact execution-address serialization', () => {
  it.each(addressCases)('preserves the complete $name address for SEND_MESSAGE', ({ address }) => {
    const { service, wsClient } = createHarness();

    service.sendMessage('perform exact work', address, ['/tmp/context.txt'], ['https://example.invalid/image.png'], {
      messageId: 'message-1',
      dedupeKey: 'dedupe-1',
    });

    expect(sent(wsClient)).toEqual({
      type: 'SEND_MESSAGE',
      payload: {
        content: 'perform exact work',
        context_file_paths: ['/tmp/context.txt'],
        image_urls: ['https://example.invalid/image.png'],
        execution_address: address,
        message_id: 'message-1',
        dedupe_key: 'dedupe-1',
      },
    });
  });

  it.each(addressCases)('preserves the complete $name address for INTERRUPT_GENERATION', ({ address }) => {
    const { service, wsClient } = createHarness();

    expect(service.interruptGeneration('interrupt-1', { executionAddress: address })).toBe(true);

    expect(sent(wsClient)).toEqual({
      type: 'INTERRUPT_GENERATION',
      payload: {
        command_id: 'interrupt-1',
        execution_address: address,
      },
    });
  });

  it.each(addressCases)('echoes the complete $name address for tool approval', ({ address }) => {
    const { callbacks, service, wsClient } = createHarness();
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'TOOL_APPROVAL_REQUESTED',
      payload: {
        invocation_id: 'invocation-1',
        tool_name: 'run_bash',
        arguments: { command: 'pwd' },
        execution_address: address,
        approval_token: { invocationId: 'invocation-1', invocationVersion: 1 },
      },
    }));

    service.approveTool('invocation-1', null, 'approved by user');

    expect(sent(wsClient)).toEqual({
      type: 'APPROVE_TOOL',
      payload: {
        invocation_id: 'invocation-1',
        execution_address: address,
        reason: 'approved by user',
        approval_token: { invocationId: 'invocation-1', invocationVersion: 1 },
      },
    });
  });

  it('preserves the exact explicit address for denial without deriving from focus', () => {
    const { service, wsClient } = createHarness();
    const address = addressCases[3]!.address;

    service.denyTool('invocation-denied', { executionAddress: address }, 'not approved');

    expect(sent(wsClient)).toEqual({
      type: 'DENY_TOOL',
      payload: {
        invocation_id: 'invocation-denied',
        execution_address: address,
        reason: 'not approved',
      },
    });
  });

  it('rejects a malformed address before SEND_MESSAGE transport', () => {
    const { service, wsClient } = createHarness();

    expect(() => service.sendMessage('must not send', {
      rootTeamRunId: 'team-1',
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: './relative-is-not-canonical',
      taskAgentRunId: null,
    })).toThrow("Invalid AgentTeam address './relative-is-not-canonical'.");
    expect(wsClient.send).not.toHaveBeenCalled();
  });

  it('rejects interrupt transport while disconnected without changing the address or sending', () => {
    const { service, wsClient } = createHarness('disconnected');

    expect(service.interruptGeneration('interrupt-disconnected', {
      executionAddress: addressCases[3]!.address,
    })).toBe(false);
    expect(wsClient.send).not.toHaveBeenCalled();
  });

  it('accepts only an acknowledgement matching the exact pending execution address', () => {
    const { callbacks, commandResults, service } = createHarness();
    const address = addressCases[3]!.address;
    expect(service.interruptGeneration('interrupt-ack', { executionAddress: address })).toBe(true);

    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'AGENT_COMMAND_ACK',
      payload: {
        command_type: 'INTERRUPT_GENERATION',
        command_id: 'interrupt-ack',
        state: 'accepted',
        target: {
          target_kind: 'team_member',
          team_run_id: 'team-1',
          execution_address: {
            ...address,
            taskTeamRunIds: ['task-team-outer'],
          },
        },
      },
    }));
    expect(commandResults).not.toHaveBeenCalled();

    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'AGENT_COMMAND_ACK',
      payload: {
        command_type: 'INTERRUPT_GENERATION',
        command_id: 'interrupt-ack',
        state: 'accepted',
        target: {
          target_kind: 'team_member',
          team_run_id: 'team-1',
          execution_address: address,
        },
      },
    }));
    expect(commandResults).toHaveBeenCalledOnce();
  });
});
