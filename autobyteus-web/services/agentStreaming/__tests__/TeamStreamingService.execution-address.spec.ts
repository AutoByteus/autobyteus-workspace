import { describe, expect, it, vi } from 'vitest';
import { TeamStreamingService } from '../TeamStreamingService';
import {
  buildTestTeamContext,
  testAgentNode,
} from '~/test-support/currentTeamTestFixtures';

const createHarness = (state = 'connected') => {
  const callbacks = new Map<string, (...payload: any[]) => void>();
  const wsClient = {
    state, connect: vi.fn(), disconnect: vi.fn(), send: vi.fn(),
    on: vi.fn((event: string, callback: (...payload: any[]) => void) => callbacks.set(event, callback)),
    off: vi.fn(),
  } as any;
  const service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
  const team = buildTestTeamContext({
    teamRunId: 'team-1', coordinatorAddress: '/worker',
    // Two own members; a run a member delegated is its own run, outside the Team's stream (autobyteus-461 rule 2).
    rootChildren: [testAgentNode('/worker', { agentRunId: 'worker-run' }), testAgentNode('/reviewer', { agentRunId: 'reviewer-run' })],
  });
  service.connect('team-1', team);
  /** The node's CONNECTED and snapshot for one connection, with every member's status. */
  const bind = (status = 'idle') => {
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'CONNECTED', payload: { session_id: 'session-1', root_team_run_id: 'team-1' },
    }));
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'TEAM_EXECUTION_VIEW_SNAPSHOT', payload: {
        root_team_run_id: 'team-1',
        base_change_sequence: 0, live_sequence_id: 'live-1', last_message_change_sequence: 0,
        execution_tree: team.view.getExecutionTree(),
        agent_input_states: [], agent_statuses: team.view.listAgentContextEntries().map((entry) => ({
          agent_run_id: entry.agentRunId,
          member_address: entry.memberAddress,
          status,
          trigger: null,
          tool_name: null,
          error_message: null,
          error_details: null, background_tasks_running: 0,
      recoverableBlock: null,
        })),
      },
    }));
  };
  bind();
  return { bind, callbacks, service, team, wsClient };
};

const sent = (wsClient: { send: ReturnType<typeof vi.fn> }, index = 0) =>
  JSON.parse(String(wsClient.send.mock.calls[index]?.[0]));

describe('TeamStreamingService exact AgentRun command selection', () => {
  it.each(['worker-run', 'reviewer-run'])('serializes SEND_MESSAGE only with current AgentRun %s', (agentRunId) => {
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

  it('settles Team send only from the exact accepted member-input identity', async () => {
    const { callbacks, service } = createHarness();
    let settled = false;
    const admission = service.sendMessage('perform exact work', 'worker-run', [], [], {
      messageId: 'message-admission', dedupeKey: 'dedupe-admission',
    }).then(() => { settled = true; });
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'MEMBER_INPUT_MESSAGE', payload: {
        change_sequence: 1, recipient_agent_run_id: 'worker-run',
        message_id: 'different-message', dedupe_key: 'dedupe-admission', content: 'perform exact work',
        input_origin: 'user_message', received_at: '2026-09-01T00:00:00.000Z', context_file_paths: [],
        sender_agent_run_id: null, parent_communication_message_id: null,
      },
    }));
    await Promise.resolve();
    expect(settled).toBe(false);
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'MEMBER_INPUT_MESSAGE', payload: {
        change_sequence: 2, recipient_agent_run_id: 'worker-run',
        message_id: 'message-admission', dedupe_key: 'dedupe-admission', content: 'perform exact work',
        input_origin: 'user_message', received_at: '2026-09-01T00:00:01.000Z', context_file_paths: [],
        sender_agent_run_id: null, parent_communication_message_id: null,
      },
    }));
    await expect(admission).resolves.toBeUndefined();
    expect(settled).toBe(true);
  });

  it('rejects a pending Team send from the exact target-correlated command failure', async () => {
    const { callbacks, service } = createHarness();
    let rejected = false;
    const admission = service.sendMessage('preserve this prompt', 'reviewer-run', [], [], {
      messageId: 'message-rejected', dedupeKey: 'dedupe-rejected',
    }).catch((error) => { rejected = true; throw error; });
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'ERROR', payload: {
        code: 'TEAM_SEND_MESSAGE_REJECTED', message: 'wrong target',
        change_sequence: null, agent_run_id: 'worker-run',
        error_scope: null, error_effect: null, turn_id: null,
      },
    }));
    await Promise.resolve();
    expect(rejected).toBe(false);
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'ERROR', payload: {
        code: 'TEAM_SEND_MESSAGE_REJECTED', message: 'runtime is stopping',
        change_sequence: null, agent_run_id: 'reviewer-run',
        error_scope: null, error_effect: null, turn_id: null,
      },
    }));
    await expect(admission).rejects.toThrow('runtime is stopping');
  });

  it('CR-003: settles a mention send on identity although the root composed its content', async () => {
    const { callbacks, service } = createHarness();
    const admission = service.sendMessage('Ask @Product Team', 'worker-run', [], [], {
      messageId: 'message-mention', dedupeKey: 'dedupe-mention',
      mentions: [{ kind: 'agent_team', definition_id: 'product-team' }],
    });
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'MEMBER_INPUT_MESSAGE', payload: {
        change_sequence: 1, recipient_agent_run_id: 'worker-run',
        message_id: 'message-mention', dedupe_key: 'dedupe-mention',
        content: 'Ask @Product Team\n\n[Mentioned collaborators]\n- Product Team (Agent Team) at /product_team',
        input_origin: 'user_message', received_at: '2026-09-01T00:00:00.000Z', context_file_paths: [],
        sender_agent_run_id: null, parent_communication_message_id: null,
      },
    }));
    await expect(admission).resolves.toBeUndefined();
    // The next send from the same member is admitted (nothing is left pending).
    expect(() => service.sendMessage('next', 'worker-run', [], [], { messageId: 'next', dedupeKey: 'next' })).not.toThrow();
  });

  it('rejects a mention send whose collaborator could not be added with the name and reason', async () => {
    const { callbacks, service } = createHarness();
    const admission = service.sendMessage('Ask @Marketing Team', 'worker-run', [], [], {
      messageId: 'message-failed-add', dedupeKey: 'dedupe-failed-add',
      mentions: [{ kind: 'agent_team', definition_id: 'marketing-team' }],
    });
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'ERROR', payload: {
        code: 'COLLABORATOR_ADD_FAILED', message: 'Its model is not available.', collaborator_name: 'Marketing Team',
        change_sequence: null, agent_run_id: 'worker-run', error_scope: null, error_effect: null, turn_id: null,
      },
    }));
    await expect(admission).rejects.toMatchObject({
      name: 'CollaboratorAddRejection', collaboratorName: 'Marketing Team', reason: 'Its model is not available.',
    });
  });

  it('rejects pending Team admission on disconnect and never sends a second in-flight prompt to the target', async () => {
    const { callbacks, service, wsClient } = createHarness();
    const admission = service.sendMessage('first prompt', 'worker-run', [], [], {
      messageId: 'message-first', dedupeKey: 'dedupe-first',
    });
    expect(service.sendMessage('first prompt', 'worker-run', [], [], {
      messageId: 'message-first', dedupeKey: 'dedupe-first',
    })).toBe(admission);
    expect(() => service.sendMessage('second prompt', 'worker-run', [], [], {
      messageId: 'message-second', dedupeKey: 'dedupe-second',
    })).toThrow("AgentRun 'worker-run' already has a pending Team message admission.");
    expect(wsClient.send).toHaveBeenCalledTimes(1);
    callbacks.get('onDisconnect')?.('socket closed');
    await expect(admission).rejects.toThrow('socket closed');
  });

  it.each(['worker-run', 'reviewer-run'])('serializes INTERRUPT_GENERATION only with current AgentRun %s', (agentRunId) => {
    const { service, wsClient } = createHarness();
    void service.interruptGeneration('interrupt-1', { agentRunId });
    expect(sent(wsClient)).toEqual({
      type: 'INTERRUPT_GENERATION', payload: { command_id: 'interrupt-1', agent_run_id: agentRunId },
    });
  });

  it('uses one explicit current AgentRun for approval and denial', () => {
    const { service, wsClient } = createHarness();
    service.approveTool('invocation-1', { agentRunId: 'reviewer-run' }, 'approved by user');
    service.denyTool('invocation-2', { agentRunId: 'worker-run' }, 'not approved');
    expect(sent(wsClient, 0)).toEqual({
      type: 'APPROVE_TOOL', payload: {
        invocation_id: 'invocation-1', agent_run_id: 'reviewer-run', reason: 'approved by user',
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
        change_sequence: 1, agent_run_id: 'reviewer-run', invocation_id: 'invocation-tracked',
        tool_name: 'run_bash', turn_id: 'turn-1', arguments: { command: 'pwd' },
      },
    }));
    service.approveTool('invocation-tracked');
    expect(sent(wsClient)).toMatchObject({
      type: 'APPROVE_TOOL', payload: { invocation_id: 'invocation-tracked', agent_run_id: 'reviewer-run' },
    });
  });

  it('rejects missing, foreign, and persistent-substitution AgentRun IDs before transport', () => {
    const { service, wsClient } = createHarness();
    expect(() => service.sendMessage('must not send', 'missing-run')).toThrow("AgentRun 'missing-run' is not part of the current Team execution.");
    expect(() => service.approveTool('invocation', { agentRunId: 'foreign-run' })).toThrow("AgentRun 'foreign-run' is not part of the current Team execution.");
    expect(wsClient.send).not.toHaveBeenCalled();
  });

  it('answers an interrupt while the transport is disconnected as not_sent without sending', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { service, wsClient } = createHarness('disconnected');
    await expect(service.interruptGeneration('interrupt-disconnected', { agentRunId: 'reviewer-run' })).resolves.toEqual({ kind: 'not_sent' });
    expect(wsClient.send).not.toHaveBeenCalled();
  });

  it('answers an interrupt while the stream is not ready as not_sent without sending', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { callbacks, service, wsClient } = createHarness();
    callbacks.get('onDisconnect')?.('socket closed', true);
    await expect(service.interruptGeneration('interrupt-not-ready', { agentRunId: 'reviewer-run' })).resolves.toEqual({ kind: 'not_sent' });
    expect(wsClient.send).not.toHaveBeenCalled();
  });

  it('settles only from an acknowledgement matching the exact pending AgentRun: accepted, or refused with its detail', async () => {
    const { callbacks, service } = createHarness();
    const outcomes: unknown[] = [];
    void service.interruptGeneration('interrupt-ack', { agentRunId: 'reviewer-run' }).then((outcome) => outcomes.push(outcome));
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'AGENT_COMMAND_ACK', payload: {
        command_type: 'INTERRUPT_GENERATION', command_id: 'interrupt-ack', state: 'accepted', agent_run_id: 'worker-run',
      },
    }));
    await Promise.resolve();
    expect(outcomes).toEqual([]);
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'AGENT_COMMAND_ACK', payload: {
        command_type: 'INTERRUPT_GENERATION', command_id: 'interrupt-ack', state: 'accepted', agent_run_id: 'reviewer-run',
      },
    }));
    void service.interruptGeneration('interrupt-failed', { agentRunId: 'worker-run' }).then((outcome) => outcomes.push(outcome));
    callbacks.get('onMessage')?.(JSON.stringify({
      type: 'AGENT_COMMAND_ACK', payload: {
        command_type: 'INTERRUPT_GENERATION', command_id: 'interrupt-failed', state: 'failed', agent_run_id: 'worker-run',
        code: 'RUNTIME_COMMAND_FAILED', message: 'Failed to interrupt.',
      },
    }));
    await Promise.resolve();
    expect(outcomes).toEqual([{ kind: 'accepted' }, { kind: 'refused', detail: '[RUNTIME_COMMAND_FAILED] Failed to interrupt.' }]);
  });

  describe('a Stop waiting when the connection is lost (autobyteus-533 D-W7)', () => {
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const waitingStop = () => {
      const harness = createHarness();
      const outcomes: string[] = [];
      void harness.service.interruptGeneration('interrupt-held', { agentRunId: 'reviewer-run' })
        .then((outcome) => outcomes.push(outcome.kind));
      return { ...harness, outcomes };
    };

    it('is held across a retryable loss and settled connection_lost after the snapshot that makes the stream ready', async () => {
      const { bind, callbacks, outcomes, service, team } = waitingStop();
      callbacks.get('onDisconnect')?.('network reset', true);
      await flush();
      expect(outcomes).toEqual([]);
      callbacks.get('onConnect')?.();
      callbacks.get('onMessage')?.(JSON.stringify({ type: 'CONNECTED', payload: { session_id: 'session-2', root_team_run_id: 'team-1' } }));
      await flush();
      expect(outcomes).toEqual([]);
      bind('running');
      expect(service.isReady).toBe(true);
      expect(team.view.getAgentContext('reviewer-run')?.state.currentStatus).toBe('running');
      await flush();
      expect(outcomes).toEqual(['connection_lost']);
      service.disconnect();
    });

    it.each([
      ['a non-retryable loss', (h: ReturnType<typeof waitingStop>) => h.callbacks.get('onDisconnect')?.('closed', false)],
      ['disconnect()', (h: ReturnType<typeof waitingStop>) => h.service.disconnect()],
      ['a held Stop and then disconnect()', (h: ReturnType<typeof waitingStop>) => {
        h.callbacks.get('onDisconnect')?.('network reset', true)
        h.service.disconnect()
      }],
    ])('is settled at once on %s', async (_case, close) => {
      const harness = waitingStop();
      close(harness);
      await flush();
      expect(harness.outcomes).toEqual(['connection_lost']);
      harness.service.disconnect();
    });

    it('is settled at once when the stream enters reopen-required (the store replaces this service)', async () => {
      const harness = waitingStop();
      (harness.service as any).enterReopenRequired(false);
      await flush();
      expect(harness.outcomes).toEqual(['connection_lost']);
      harness.service.disconnect();
    });
  });
});
