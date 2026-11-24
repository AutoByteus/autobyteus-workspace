import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentContext } from '~/types/agent/AgentContext';
import { FakeSocketClient } from './fakeSocketClient';

const io = vi.hoisted(() => ({ ws: null as any }));
vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: async ({ query }: { query: { definitions: Array<{ name?: { value: string } }> } }) => {
      const operation = query.definitions[0]?.name?.value ?? '';
      if (operation === 'GetRunFileChanges') return { data: { getRunFileChanges: [] }, errors: [] };
      throw new Error(`Unexpected query ${operation}`);
    },
    mutate: vi.fn(),
  }),
}));
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }));
vi.mock('~/services/agentStreaming/transport', async (original) => ({
  ...await original<object>(),
  WebSocketClient: class { constructor() { return io.ws; } },
}));
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ agentWs: 'ws://node.test/ws/agent' }), bindingRevision: 1 }),
}));

const runId = 'run-1';

/**
 * autobyteus-540: a message to an agent run leaves only on a bound stream (the node's `CONNECTED` on the current
 * connection), and a send lost with its connection is decided after the rebind's snapshot.
 */
describe('agent stream send delivery (autobyteus-540)', () => {
  let ws: FakeSocketClient;
  let context: AgentContext;
  const flush = () => vi.advanceTimersByTimeAsync(0);

  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    ws = new FakeSocketClient();
    io.ws = ws;
    context = useAgentContextsStore().upsertProjectionContext({
      runId,
      config: {
        agentDefinitionId: 'agent-def', agentDefinitionName: 'Builder', llmModelIdentifier: 'model',
        runtimeKind: 'autobyteus', workspaceId: 'ws-1', autoExecuteTools: false, llmConfig: null, isLocked: true,
      } as never,
      conversation: { id: runId, messages: [], createdAt: '2026-11-18T00:00:00.000Z', updatedAt: '2026-11-18T00:00:00.000Z' } as never,
      status: AgentStatus.Idle,
    });
  });
  afterEach(() => {
    useAgentRunStore().disconnectAgentStream(runId);
    vi.useRealTimers();
  });

  const sentMessages = () => ws.send.mock.calls.map(([raw]) => JSON.parse(String(raw))).filter((m) => m.type === 'SEND_MESSAGE');
  const bind = (session = 's-1') => ws.message('CONNECTED', { agent_id: runId, session_id: session });
  const status = (value: string) => ws.message('AGENT_STATUS', { recoverableBlock: null, status: value, background_tasks_running: 0 });
  const stored = (messages: Array<{ role: 'user' | 'assistant'; content: string; messageId?: string }>) => ({
    runId, activities: [], lastActivityAt: null, hasEarlierActiveTraceEvents: false,
    conversation: messages.map((message, index) => ({ kind: 'message', ts: 100 + index, ...message,
      ...(message.messageId ? { dedupeKey: message.messageId } : {}) })),
  });
  const snapshot = (messages: Parameters<typeof stored>[0], inputState: Record<string, unknown> | null) =>
    ws.message('AGENT_STREAM_SNAPSHOT', { stored: stored(messages), input_state: inputState, turn_frames: [], base_sequence: 0,
      live_sequence_id: inputState ? 'live-1' : null });
  const inputState = (entries: Array<{ messageId: string; content: string }>) => ({
    run_instance_id: 'instance-1', revision: 3, recoverableBlock: null,
    entries: entries.map((entry, index) => ({ sequence: index + 1, message_id: entry.messageId, dedupe_key: entry.messageId,
      turn_id: null, state: 'queued', content: entry.content, sender_type: 'user', accepted_at: '2026-11-23T16:55:09.000Z', file_attachments: [] })),
  });
  /** A bound stream, then a send from the composer through the store; returns the send's message id. */
  const sendBound = async (text: string) => {
    useAgentRunStore().connectToAgentStream(runId);
    ws.open(); bind(); status('running');
    context.requirement = text;
    const sending = useAgentRunStore().sendUserInputAndSubscribe(runId);
    await flush();
    const sent = sentMessages().at(-1)!;
    return { sending, messageId: sent.payload.message_id as string };
  };
  const userTexts = () => context.state.conversation.messages.filter((m) => m.type === 'user').map((m) => (m as { text: string }).text);

  describe('ready means bound (D-1, AC-001)', () => {
    it('a send on an open socket waits for CONNECTED, then exactly one SEND_MESSAGE leaves; the message shows at once', async () => {
      useAgentRunStore().connectToAgentStream(runId);
      ws.open();
      context.requirement = 'Run the build';
      const sending = useAgentRunStore().sendUserInputAndSubscribe(runId);
      await vi.advanceTimersByTimeAsync(500);
      expect(sentMessages()).toEqual([]);
      expect(userTexts()).toEqual(['Run the build']);
      bind();
      await flush();
      expect(sentMessages()).toHaveLength(1);
      expect(sentMessages()[0].payload).toMatchObject({ content: 'Run the build' });
      ws.message('AGENT_COMMAND_ACK', { command_type: 'SEND_MESSAGE', run_id: runId, message_id: sentMessages()[0].payload.message_id,
        dedupe_key: sentMessages()[0].payload.dedupe_key, state: 'accepted', accepted: true, duplicate: false });
      await sending;
      expect(context.messageNotDelivered).toBeNull();
    });

    it('a bound stream sends at once (QR-002)', async () => {
      const { sending } = await sendBound('at once');
      expect(sentMessages()).toHaveLength(1);
      void sending;
    });

    it('not bound within 10 s: nothing leaves; the message is removed, the draft is back, notice (a), status unchanged (AC-004)', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      useAgentRunStore().connectToAgentStream(runId);
      ws.open();
      context.requirement = 'never sent';
      const sending = useAgentRunStore().sendUserInputAndSubscribe(runId);
      await vi.advanceTimersByTimeAsync(10_000);
      await sending;
      expect(sentMessages()).toEqual([]);
      expect(userTexts()).toEqual([]);
      expect(context.requirement).toBe('never sent');
      expect(context.messageNotDelivered).toBe('not_sent');
      expect(context.submissionPending).toBe(false);
      expect(context.state.currentStatus).toBe(AgentStatus.Idle);
      expect(JSON.stringify(context.state.conversation.messages)).not.toContain('Error Occurred');
    });
  });

  describe('a send lost with its connection is decided after the rebind (D-3, D-8, AC-003)', () => {
    const loseAndRebind = async () => {
      ws.lose(true);
      await vi.advanceTimersByTimeAsync(1_000); // the reconnection's first wait (autobyteus-434)
      ws.open(); bind('s-2'); status('running');
      await flush();
    };

    it('the node stored it: it shows once, no notice, the box untouched', async () => {
      const { sending, messageId } = await sendBound('stored one');
      await loseAndRebind();
      snapshot([{ role: 'user', content: 'stored one', messageId }], inputState([]));
      await sending;
      expect(userTexts()).toEqual(['stored one']);
      expect(context.messageNotDelivered).toBeNull();
      expect(context.requirement).toBe('');
    });

    it('a native/AGY/ACP run queued it while Running and the ack and input state were lost: found through the snapshot\'s input state, never "not sent"', async () => {
      const { sending, messageId } = await sendBound('queued one');
      await loseAndRebind();
      snapshot([{ role: 'user', content: 'the running turn\'s input' }], inputState([{ messageId, content: 'queued one' }]));
      await sending;
      expect(userTexts()).toEqual(['the running turn\'s input', 'queued one']);
      expect(context.messageNotDelivered).toBeNull();
    });

    it('the node tells its input state and does not have it: not sent, draft back, notice (a)', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { sending } = await sendBound('lost one');
      await loseAndRebind();
      snapshot([], inputState([]));
      await sending;
      expect(context.messageNotDelivered).toBe('not_sent');
      expect(context.requirement).toBe('lost one');
      expect(userTexts()).toEqual([]);
      expect(context.state.currentStatus).toBe(AgentStatus.Running);
    });

    it('the node cannot tell its input state (run not active, or a peer run) and the message is missing: unknown, draft back, notice (b)', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { sending } = await sendBound('maybe one');
      await loseAndRebind();
      snapshot([], null);
      await sending;
      expect(context.messageNotDelivered).toBe('unknown');
      expect(context.requirement).toBe('maybe one');
    });

    it('closed for good before the answer: unknown at once', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { sending } = await sendBound('closed one');
      useAgentRunStore().disconnectAgentStream(runId);
      await sending;
      expect(context.messageNotDelivered).toBe('unknown');
      expect(context.requirement).toBe('closed one');
    });
  });

  describe('the snapshot\'s input state replaces the shown pending input (D-8, ARCH-REV-002 note)', () => {
    const queuedFrame = (revision: number, entries: Array<{ messageId: string; content: string }>) =>
      ws.message('AGENT_INPUT_STATE', { ...inputState(entries), revision });

    it('with an input state: a pending message the node no longer holds (a node restart) is not kept', async () => {
      useAgentRunStore().connectToAgentStream(runId);
      ws.open(); bind(); status('running');
      snapshot([], inputState([]));
      queuedFrame(4, [{ messageId: 'client_old', content: 'held before the restart' }]);
      expect(userTexts()).toEqual(['held before the restart']);
      ws.lose(true);
      await vi.advanceTimersByTimeAsync(1_000);
      ws.open(); bind('s-2'); status('idle');
      snapshot([], { ...inputState([]), run_instance_id: 'instance-2', revision: 0 });
      expect(userTexts()).toEqual([]);
    });

    it('without one (a stopped run, a peer relay): the pending input the page showed stays, as before', async () => {
      useAgentRunStore().connectToAgentStream(runId);
      ws.open(); bind(); status('running');
      snapshot([], inputState([]));
      queuedFrame(4, [{ messageId: 'client_old', content: 'still pending' }]);
      ws.lose(true);
      await vi.advanceTimersByTimeAsync(1_000);
      ws.open(); bind('s-2'); status('offline');
      snapshot([], null);
      expect(userTexts()).toEqual(['still pending']);
    });

    it('an input state at a revision the page already saw is still applied to the new conversation', async () => {
      useAgentRunStore().connectToAgentStream(runId);
      ws.open(); bind(); status('running');
      snapshot([], inputState([]));
      queuedFrame(4, [{ messageId: 'client_q', content: 'queued' }]);
      ws.lose(true);
      await vi.advanceTimersByTimeAsync(1_000);
      ws.open(); bind('s-2'); status('running');
      snapshot([], { ...inputState([{ messageId: 'client_q', content: 'queued' }]), revision: 4 });
      expect(userTexts()).toEqual(['queued']);
    });
  });

  describe('the returned draft and its notice (D-4, AC-004, AC-005)', () => {
    it('brings back text and skill tags as typed; a draft typed meanwhile is kept', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      useAgentRunStore().connectToAgentStream(runId);
      ws.open();
      context.requirement = 'with a tag';
      context.requestedSkillNames = ['code-review'];
      const first = useAgentRunStore().sendUserInputAndSubscribe(runId);
      await flush();
      expect(context.requestedSkillNames).toEqual([]);
      await vi.advanceTimersByTimeAsync(10_000);
      await first;
      expect(context.requirement).toBe('with a tag');
      expect(context.requestedSkillNames).toEqual(['code-review']);

      context.requirement = 'second';
      context.requestedSkillNames = [];
      const second = useAgentRunStore().sendUserInputAndSubscribe(runId);
      await flush();
      expect(context.messageNotDelivered).toBeNull(); // a new send clears the notice
      context.requirement = 'typed meanwhile';
      await vi.advanceTimersByTimeAsync(10_000);
      await second;
      expect(context.requirement).toBe('typed meanwhile');
      expect(context.messageNotDelivered).toBe('not_sent');
    });

    it('the notice and the restored draft survive a later snapshot that replaces the conversation', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { sending } = await sendBound('keep me');
      ws.lose(true);
      await vi.advanceTimersByTimeAsync(1_000);
      ws.open(); bind('s-2'); status('idle');
      snapshot([], inputState([]));
      await sending;
      snapshot([{ role: 'assistant', content: 'later' }], inputState([]));
      await flush();
      expect(context.messageNotDelivered).toBe('not_sent');
      expect(context.requirement).toBe('keep me');
    });
  });

  describe('the readiness entry the store sends through (D-1)', () => {
    it('ensureAgentStreamConnected waits for the node\'s CONNECTED, not for the open socket', async () => {
      const ready = vi.fn();
      void useAgentRunStore().ensureAgentStreamConnected(runId).then(ready);
      ws.open();
      await vi.advanceTimersByTimeAsync(200);
      expect(ready).not.toHaveBeenCalled();
      ws.message('CONNECTED', { agent_id: runId, session_id: 's-1' });
      await flush();
      expect(ready).toHaveBeenCalledOnce();
      expect(context.state.runId).toBe(runId);
    });
  });
});
