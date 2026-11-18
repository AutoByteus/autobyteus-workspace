import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentContext } from '~/types/agent/AgentContext';
import { createAgentRunStream, type AgentRunStream } from '../agentRunStreamReconnection';
import { ConnectionState } from '../transport';
import { FakeSocketClient } from './fakeSocketClient';
import {
  hidePage, installPageVisibilityControl, removePageVisibilityControl, showPage,
} from '~/services/liveStreamLifecycle/__tests__/pageVisibilityTestControl';

const io = vi.hoisted(() => ({
  projection: vi.fn(),
  queries: [] as string[],
  ws: null as any, // the socket double the mocked WebSocketClient constructor returns
}));
vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: async ({ query }: { query: { definitions: Array<{ name?: { value: string } }> } }) => {
      const operation = query.definitions[0]?.name?.value ?? '';
      io.queries.push(operation);
      if (operation === 'GetRunProjection') return { data: { getRunProjection: await io.projection() }, errors: [] };
      if (operation === 'GetRunFileChanges') return { data: { getRunFileChanges: [] }, errors: [] };
      throw new Error(`Unexpected query ${operation}`);
    },
  }),
}));
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }));
// The store's own stream (P-004 case) gets the same socket double.
vi.mock('~/services/agentStreaming/transport', async (original) => ({
  ...await original<object>(),
  WebSocketClient: class { constructor() { return io.ws; } },
}));
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ agentWs: 'ws://node.test/ws/agent' }), bindingRevision: 1 }),
}));
vi.mock('~/composables/useToasts', () => ({ useToasts: () => ({ addToast: vi.fn() }) }));

const runId = 'run-1';
const storedProjection = (assistantText: string) => ({
  runId,
  conversation: [
    { kind: 'message', role: 'user', content: 'Run the long build', messageId: 'client_msg-1', dedupeKey: 'client_msg-1', ts: 100 },
    { kind: 'message', role: 'assistant', content: assistantText, ts: 101 },
  ],
  activities: [],
  lastActivityAt: null,
  hasEarlierActiveTraceEvents: false,
});

/**
 * autobyteus-434 and the Agent Connect Rule, with autobyteus-461 SR-087: every connection starts with the run's own
 * stream snapshot (its stored part, its unconfirmed turns' frames, its base), then its numbered frames after the base.
 * So an attempt just opens the socket: the snapshot is the catch-up, and nothing is read beside it.
 */
describe('AgentRunStreamReconnection', () => {
  let ws: FakeSocketClient;
  let stream: AgentRunStream;
  let context: AgentContext;

  const shown = (): string => JSON.stringify(context.state.conversation.messages);
  const flush = () => vi.advanceTimersByTimeAsync(0);
  const projectionReads = () => io.queries.filter((name) => name === 'GetRunProjection').length;
  /** The node's snapshot of the run at `base` (live `sequenceId`; null: a stopped run). */
  const snapshot = (assistantText: string, base = 0, turnFrames: unknown[] = [], sequenceId: string | null = 'live-1') =>
    ws.message('AGENT_STREAM_SNAPSHOT', { stored: storedProjection(assistantText), turn_frames: turnFrames,
      base_sequence: base, live_sequence_id: sequenceId });
  const start = (id: string, turn: string, sequence: number) => ({ type: 'SEGMENT_START', payload: { id, turn_id: turn, segment_type: 'text' }, sequence });
  const content = (id: string, turn: string, delta: string, sequence: number) =>
    ({ type: 'SEGMENT_CONTENT', payload: { id, turn_id: turn, segment_type: 'text', delta }, sequence });

  beforeEach(() => {
    vi.useFakeTimers();
    installPageVisibilityControl();
    setActivePinia(createPinia());
    io.queries.length = 0;
    io.projection.mockReset();
    io.projection.mockResolvedValue(storedProjection('stored answer'));
    ws = new FakeSocketClient();
    io.ws = ws;
    context = useAgentContextsStore().upsertProjectionContext({
      runId,
      config: {
        agentDefinitionId: 'agent-def', agentDefinitionName: 'Builder', llmModelIdentifier: 'model',
        runtimeKind: 'codex_app_server', workspaceId: 'ws-1', autoExecuteTools: false, llmConfig: null, isLocked: true,
      } as never,
      conversation: { id: runId, messages: [], createdAt: '2026-11-08T00:00:00.000Z', updatedAt: '2026-11-08T00:00:00.000Z' } as never,
      status: AgentStatus.Running,
    });
    stream = createAgentRunStream(runId, 'ws://node.test/ws/agent', { wsClient: ws });
  });
  afterEach(() => {
    stream.reconnection.dispose();
    stream.service.disconnect();
    removePageVisibilityControl();
    vi.useRealTimers();
  });

  /** The owner's first connect (idle): a plain connect, then the open. */
  const openAsOwner = () => {
    stream.reconnection.requestConnect();
    ws.open();
  };

  it('an owner connect on an idle stream connects, and reads nothing beside the stream', () => {
    stream.reconnection.requestConnect();
    expect(ws.connects).toBe(1);
    expect(projectionReads()).toBe(0);
  });

  it('the snapshot shows the stored part, replays the unconfirmed turn, and the frames after its base continue it', async () => {
    openAsOwner();
    snapshot('confirmed answer', 2, [start('seg-1', 'turn-2', 1), content('seg-1', 'turn-2', 'live ', 2)]);
    ws.frame('SEGMENT_CONTENT', { id: 'seg-1', turn_id: 'turn-2', segment_type: 'text', delta: 'and on' }, 3);
    // Coalesced content covers a range of frames.
    ws.frame('SEGMENT_CONTENT_BATCH', { items: [{ id: 'seg-1', turn_id: 'turn-2', segment_type: 'text', delta: ' more' }] }, 4, 6);
    await flush();
    expect(shown()).toContain('Run the long build');
    expect(shown()).toContain('confirmed answer');
    expect(shown()).toContain('live and on more');
    expect(projectionReads()).toBe(0);
  });

  it('a frame at or below the base is already shown; a gap reopens the stream for a fresh snapshot', async () => {
    openAsOwner();
    snapshot('stored', 3);
    ws.frame('SEGMENT_START', { id: 'seg-old', turn_id: 'turn-1', segment_type: 'text' }, 3);
    await flush();
    expect(shown()).not.toContain('seg-old');
    ws.frame('SEGMENT_START', { id: 'seg-gap', turn_id: 'turn-1', segment_type: 'text' }, 5);
    expect(ws.state).toBe(ConnectionState.DISCONNECTED);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(ws.connects).toBe(2);
    ws.open();
    snapshot('after the gap', 5);
    await flush();
    expect(shown()).toContain('after the gap');
  });

  it('after a loss the attempt just opens: the new snapshot replaces what was shown', async () => {
    openAsOwner();
    snapshot('stored', 0);
    ws.frame('SEGMENT_START', { id: 'seg-old', turn_id: 'turn-1', segment_type: 'text' }, 1);
    ws.frame('SEGMENT_CONTENT', { id: 'seg-old', turn_id: 'turn-1', segment_type: 'text', delta: 'shown before the loss' }, 2);
    ws.lose();

    await vi.advanceTimersByTimeAsync(1_000);
    expect(ws.connects).toBe(2);
    expect(projectionReads()).toBe(0);
    ws.open();
    snapshot('stored answer', 9);
    await flush();
    expect(shown()).toContain('stored answer');
    expect(shown()).not.toContain('shown before the loss');
  });

  it('a restore while the stream is open sends one in-band snapshot of the new sequence, with no gap', async () => {
    openAsOwner();
    snapshot('before the stop', 4, [], 'live-1');
    snapshot('after the restore', 0, [], 'live-2');
    ws.frame('SEGMENT_START', { id: 'seg-new', turn_id: 'turn-9', segment_type: 'text' }, 1);
    ws.frame('SEGMENT_CONTENT', { id: 'seg-new', turn_id: 'turn-9', segment_type: 'text', delta: 'resumed' }, 2);
    await flush();
    expect(shown()).toContain('after the restore');
    expect(shown()).toContain('resumed');
    expect(ws.connects).toBe(1);
  });

  it('a stopped run\'s snapshot is its whole stored conversation, and no frame follows it', async () => {
    openAsOwner();
    snapshot('the whole conversation', 0, [], null);
    ws.frame('SEGMENT_START', { id: 'seg-x', turn_id: 'turn-1', segment_type: 'text' }, 1);
    await flush();
    expect(shown()).toContain('the whole conversation');
    expect(ws.state).toBe(ConnectionState.DISCONNECTED);
  });

  it('P-004: a connect request during a wait connects at once; while held it attempts nothing', async () => {
    openAsOwner();
    ws.lose();
    stream.reconnection.requestConnect();
    await flush();
    expect(ws.connects).toBe(2);
    ws.open();

    hidePage();
    ws.lose();
    stream.reconnection.requestConnect();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(ws.connects).toBe(2);
    showPage();
    await flush();
    expect(ws.connects).toBe(3);
  });

  it('P-005 and N-6: an owner-opened stream re-syncs after ≥ 30 s hidden; pending admissions are rejected and a waiting Stop is held until the rebind\'s status (autobyteus-533 D-W7)', async () => {
    openAsOwner();
    const admission = stream.service.sendMessageAwaitingAdmission('hi @helper', [], [], { messageId: 'm-1', dedupeKey: 'm-1' });
    const admissionRejected = expect(admission).rejects.toThrow('Agent stream is re-synchronizing.');
    const outcomes: string[] = [];
    void stream.service.interruptGeneration('interrupt-1').then((outcome) => outcomes.push(outcome.kind));

    hidePage();
    await vi.advanceTimersByTimeAsync(30_000);
    showPage();
    await admissionRejected;
    await flush();
    expect(ws.connects).toBe(2);
    expect(outcomes).toEqual([]);
    ws.open();
    ws.message('AGENT_STATUS', { recoverableBlock: null, status: 'idle' });
    await flush();
    expect(outcomes).toEqual(['connection_lost']);
  });

  it('a short hide (< 30 s) of a connected stream does nothing', async () => {
    openAsOwner();
    hidePage();
    await vi.advanceTimersByTimeAsync(29_000);
    showPage();
    await flush();
    expect(ws.connects).toBe(1);
  });

  it('N-7: the context removed during a wait ends the attempt idle: no open, no retry, and a later connect is plain', async () => {
    openAsOwner();
    ws.lose();
    useAgentContextsStore().removeRun(runId);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(ws.connects).toBe(1);

    context = useAgentContextsStore().upsertProjectionContext({
      runId, config: context.config, conversation: context.state.conversation, status: AgentStatus.Running,
    });
    stream.reconnection.requestConnect();
    expect(ws.connects).toBe(2);
  });

  it('a non-retryable close (4004/4005) is not retried', async () => {
    openAsOwner();
    ws.lose(false);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(ws.connects).toBe(1);
  });
});

describe('agentRunStore.connectToAgentStream (P-004 through the store)', () => {
  let ws: FakeSocketClient;
  beforeEach(() => {
    vi.useFakeTimers();
    installPageVisibilityControl();
    setActivePinia(createPinia());
    io.queries.length = 0;
    io.projection.mockReset();
    ws = new FakeSocketClient();
    io.ws = ws;
  });
  afterEach(() => {
    removePageVisibilityControl();
    vi.useRealTimers();
  });

  it('a history read during a wait shows the gap\'s events: it opens at once, and the snapshot carries them', async () => {
    const { useAgentRunStore } = await import('~/stores/agentRunStore');
    const context = useAgentContextsStore().upsertProjectionContext({
      runId,
      config: {
        agentDefinitionId: 'agent-def', agentDefinitionName: 'Builder', llmModelIdentifier: 'model',
        runtimeKind: 'codex_app_server', workspaceId: 'ws-1', autoExecuteTools: false, llmConfig: null, isLocked: true,
      } as never,
      conversation: { id: runId, messages: [], createdAt: '2026-11-08T00:00:00.000Z', updatedAt: '2026-11-08T00:00:00.000Z' } as never,
      status: AgentStatus.Running,
    });
    const store = useAgentRunStore();
    store.connectToAgentStream(runId);
    ws.open();
    ws.lose();
    expect(store.isAgentStreamReady(runId)).toBe(false);

    store.connectToAgentStream(runId); // reconcileDiscoveredActiveRuns: active run, stream not ready
    await vi.advanceTimersByTimeAsync(0);
    expect(ws.connects).toBe(2);
    ws.open();
    ws.message('AGENT_STREAM_SNAPSHOT', { stored: storedProjection('the gap\'s answer'), turn_frames: [], base_sequence: 7, live_sequence_id: 'live-1' });
    await vi.advanceTimersByTimeAsync(0);
    expect(io.queries.filter((name) => name === 'GetRunProjection')).toHaveLength(0);
    expect(JSON.stringify(context.state.conversation.messages)).toContain('the gap\'s answer');
    store.disconnectAgentStream(runId);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(ws.connects).toBe(2);
  });
});
