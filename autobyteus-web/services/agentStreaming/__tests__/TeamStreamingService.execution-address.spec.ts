import { describe, expect, it, vi } from 'vitest';
import { TeamStreamingService } from '../TeamStreamingService';
import {
  buildTestTeamContext,
  testAgentNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';

const createHarness = (state = 'connected') => {
  const callbacks = new Map<string, (payload?: any) => void>();
  const wsClient = {
    state, connect: vi.fn(), disconnect: vi.fn(), send: vi.fn(),
    on: vi.fn((event: string, callback: (payload?: any) => void) => callbacks.set(event, callback)),
    off: vi.fn(),
  } as any;
  const commandResults = vi.fn();
  const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', {
    wsClient, onInterruptCommandResult: commandResults,
  });
  const team = buildTestTeamContext({
    teamRunId: 'team-1', coordinatorAddress: '/worker',
    rootChildren: [testAgentNode('/worker', { agentRunId: 'worker-run' })],
    tasks: [testTaskRecord({
      taskId: 'task-1', delegatorAgentRunId: 'worker-run', recipientAddress: '/worker',
      target: { agentRunId: 'task-agent-run-1' },
    })],
  });
  service.connect('team-1', team);
  callbacks.get('onMessage')?.(JSON.stringify({
    type: 'CONNECTED', payload: { session_id: 'session-1', root_team_run_id: 'team-1' },
  }));
  callbacks.get('onMessage')?.(JSON.stringify({
    type: 'TEAM_EXECUTION_VIEW_SNAPSHOT', payload: {
      root_team_run_id: 'team-1',
      base_change_sequence: 0,
      execution_tree: team.view.getExecutionTree(),
      tasks: team.view.listTaskHistoryRows().map((row) => row.task),
      messages: [],
      agent_statuses: team.view.listAgentContextEntries().map((entry) => ({
        agent_run_id: entry.agentRunId,
        member_address: entry.memberAddress,
        status: 'idle',
        trigger: null,
        tool_name: null,
        error_message: null,
        error_details: null,
      })),
    },
  }));
  return { callbacks, commandResults, service, wsClient };
};

const sent = (wsClient: { send: ReturnType<typeof vi.fn> }, index = 0) =>
  JSON.parse(String(wsClient.send.mock.calls[index]?.[0]));

describe('TeamStreamingService exact AgentRun command selection', () => {
  it.each(['worker-run', 'task-agent-run-1'])('serializes SEND_MESSAGE only with current AgentRun %s', (agentRunId) => {
    const { service, wsClient } = createHarness();
    service.sendMessage('perform exact work', agentRunId, ['/tmp/context.txt'], ['https://example.invalid/image.png'], {
      messageId: 'message-1', dedupeKey: 'dedupe-1',
    });
    expect(sent(wsClient)).toEqual({
      type: 'SEND_MESSAGE', payload: {
        content: 'perform exact work', context_file_paths: ['/tmp/context.txt'],
        image_urls: ['https://example.invalid/image.png'], agent_run_id: agentRunId,
        message_id: 'message-1', dedupe_key: 'dedupe-1',
      },
    });
  });

  it.each(['worker-run', 'task-agent-run-1'])('serializes INTERRUPT_GENERATION only with current AgentRun %s', (agentRunId) => {
    const { service, wsClient } = createHarness();
    expect(service.interruptGeneration('interrupt-1', { agentRunId })).toBe(true);
    expect(sent(wsClient)).toEqual({
      type: 'INTERRUPT_GENERATION', payload: { command_id: 'interrupt-1', agent_run_id: agentRunId },
    });
  });

  it('uses one explicit current AgentRun for approval and denial', () => {
    const { service, wsClient } = createHarness();
    service.approveTool('invocation-1', { agentRunId: 'task-agent-run-1' }, 'approved by user');
    service.denyTool('invocation-2', { agentRunId: 'worker-run' }, 'not approved');
    expect(sent(wsClient, 0)).toEqual({
      type: 'APPROVE_TOOL', payload: {
        invocation_id: 'invocation-1', agent_run_id: 'task-agent-run-1', reason: 'approved by user',
      },
    });
    expect(sent(wsClient, 1)).toEqual({
      type: 'DENY_TOOL', payload: {
        invocation_id: 'invocation-2', agent_run_id: 'worker-run', reason: 'not approved',
      },
    });
  });

  it('tracks a tool request to its exact AgentRun when no explicit decision target is supplied', () => {
    const { callbacks, service, wsClient } = createHarness();
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'TOOL_APPROVAL_REQUESTED', payload: {
        change_sequence: 1, agent_run_id: 'task-agent-run-1', invocation_id: 'invocation-tracked',
        tool_name: 'run_bash', turn_id: 'turn-1', arguments: { command: 'pwd' },
      },
    }));
    service.approveTool('invocation-tracked');
    expect(sent(wsClient)).toMatchObject({
      type: 'APPROVE_TOOL', payload: { invocation_id: 'invocation-tracked', agent_run_id: 'task-agent-run-1' },
    });
  });

  it('rejects missing, foreign, and persistent-substitution AgentRun IDs before transport', () => {
    const { service, wsClient } = createHarness();
    expect(() => service.sendMessage('must not send', 'missing-run')).toThrow("AgentRun 'missing-run' is not part of the current Team execution.");
    expect(() => service.approveTool('invocation', { agentRunId: 'foreign-run' })).toThrow("AgentRun 'foreign-run' is not part of the current Team execution.");
    expect(wsClient.send).not.toHaveBeenCalled();
  });

  it('rejects interrupt transport while disconnected without sending', () => {
    const { service, wsClient } = createHarness('disconnected');
    expect(service.interruptGeneration('interrupt-disconnected', { agentRunId: 'task-agent-run-1' })).toBe(false);
    expect(wsClient.send).not.toHaveBeenCalled();
  });

  it('accepts only an acknowledgement matching the exact pending AgentRun', () => {
    const { callbacks, commandResults, service } = createHarness();
    expect(service.interruptGeneration('interrupt-ack', { agentRunId: 'task-agent-run-1' })).toBe(true);
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'AGENT_COMMAND_ACK', payload: {
        command_type: 'INTERRUPT_GENERATION', command_id: 'interrupt-ack', state: 'accepted', agent_run_id: 'worker-run',
      },
    }));
    expect(commandResults).not.toHaveBeenCalled();
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'AGENT_COMMAND_ACK', payload: {
        command_type: 'INTERRUPT_GENERATION', command_id: 'interrupt-ack', state: 'accepted', agent_run_id: 'task-agent-run-1',
      },
    }));
    expect(commandResults).toHaveBeenCalledOnce();
  });
});
