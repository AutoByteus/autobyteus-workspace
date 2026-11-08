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
 * autobyteus-434 DS-003 and the Agent Connect Rule: the agent stream sends no snapshot, so a scheduler-driven attempt
 * loads the stored state, commits it into the live context while the socket is closed, then opens. Every socket open is
 * the success point. A connect request during a loss streak goes through the catch-up.
 */
describe('AgentRunStreamReconnection', () => {
  let ws: FakeSocketClient;
  let stream: AgentRunStream;
  let context: AgentContext;

  const shown = (): string => JSON.stringify(context.state.conversation.messages);
  const flush = () => vi.advanceTimersByTimeAsync(0);
  const deliver = (type: string, payload: Record<string, unknown>) => ws.message(type, payload);
  const projectionReads = () => io.queries.filter((name) => name === 'GetRunProjection').length;

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

  it('an owner connect on an idle stream connects without a catch-up', () => {
    stream.reconnection.requestConnect();
    expect(ws.connects).toBe(1);
    expect(projectionReads()).toBe(0);
  });

  it('after a loss it loads and commits the stored state while the socket is closed, then opens', async () => {
    openAsOwner();
    deliver('SEGMENT_START', { id: 'seg-old', turn_id: 'turn-1', segment_type: 'text' });
    deliver('SEGMENT_CONTENT', { id: 'seg-old', turn_id: 'turn-1', segment_type: 'text', delta: 'shown before the loss' });
    ws.lose();

    await vi.advanceTimersByTimeAsync(1_000);
    expect(projectionReads()).toBe(1);
    expect(ws.connects).toBe(2);
    expect(shown()).toContain('stored answer');
    expect(shown()).toContain('Run the long build');
    expect(shown()).not.toContain('shown before the loss');
  });

  it('a failed load is a failed attempt: no open, and the next wait grows', async () => {
    openAsOwner();
    io.projection.mockRejectedValueOnce(new Error('node unreachable'));
    ws.lose();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(projectionReads()).toBe(1);
    expect(ws.connects).toBe(1);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(projectionReads()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(projectionReads()).toBe(2);
    expect(ws.connects).toBe(2);
  });

  it('AR-001(a): deltas the node keeps producing show after the open; the attempt reads once and does not stall', async () => {
    openAsOwner();
    ws.lose();
    // The node kept writing during the outage: the stored state already holds "part A".
    io.projection.mockResolvedValue(storedProjection('part A'));
    await vi.advanceTimersByTimeAsync(1_000);
    ws.open();
    deliver('AGENT_STATUS', { status: 'running', recoverableBlock: null });
    deliver('SEGMENT_START', { id: 'seg-2', turn_id: 'turn-1', segment_type: 'text' });
    deliver('SEGMENT_CONTENT', { id: 'seg-2', turn_id: 'turn-1', segment_type: 'text', delta: 'part B' });
    await flush();

    expect(projectionReads()).toBe(1);
    expect(shown().indexOf('Run the long build')).toBeLessThan(shown().indexOf('part A'));
    expect(shown().indexOf('part A')).toBeLessThan(shown().indexOf('part B'));
    // The open is the success point: the next loss waits 1 s again.
    ws.lose();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(projectionReads()).toBe(2);
  });

  it('P-004: a connect request during a wait catches up at once; while held it attempts nothing', async () => {
    openAsOwner();
    ws.lose();
    stream.reconnection.requestConnect();
    await flush();
    expect(projectionReads()).toBe(1);
    expect(ws.connects).toBe(2);
    ws.open();

    hidePage();
    ws.lose();
    stream.reconnection.requestConnect();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(projectionReads()).toBe(1);
    expect(ws.connects).toBe(2);
    showPage();
    await flush();
    expect(projectionReads()).toBe(2);
    expect(ws.connects).toBe(3);
  });

  it('P-005 and N-6: an owner-opened stream re-syncs after ≥ 30 s hidden; pending admissions and interrupts are rejected', async () => {
    const interruptFailures: unknown[] = [];
    stream.reconnection.dispose();
    stream.service.disconnect();
    stream = createAgentRunStream(runId, 'ws://node.test/ws/agent', {
      wsClient: ws, onInterruptCommandTransportFailure: (failure) => interruptFailures.push(failure),
    });
    openAsOwner();
    const admission = stream.service.sendMessageAwaitingAdmission('hi @helper', [], [], { messageId: 'm-1', dedupeKey: 'm-1' });
    const admissionRejected = expect(admission).rejects.toThrow('Agent stream is re-synchronizing.');
    expect(stream.service.interruptGeneration('interrupt-1')).toBe(true);

    hidePage();
    await vi.advanceTimersByTimeAsync(30_000);
    showPage();
    await admissionRejected;
    expect(interruptFailures).toEqual([expect.objectContaining({
      reason: expect.objectContaining({ message: 'Agent stream is re-synchronizing.' }),
    })]);
    expect(ws.state).toBe(ConnectionState.CONNECTING);
    await flush();
    expect(projectionReads()).toBe(1);
    expect(ws.connects).toBe(2);
  });

  it('a short hide (< 30 s) of a connected stream does nothing', async () => {
    openAsOwner();
    hidePage();
    await vi.advanceTimersByTimeAsync(29_000);
    showPage();
    await flush();
    expect(projectionReads()).toBe(0);
    expect(ws.connects).toBe(1);
  });

  it('N-7: the context removed during the load ends the attempt idle: no open, no retry, and a later connect is plain', async () => {
    openAsOwner();
    let finishLoad!: (value: unknown) => void;
    io.projection.mockReturnValueOnce(new Promise((resolve) => { finishLoad = resolve; }));
    ws.lose();
    await vi.advanceTimersByTimeAsync(1_000);
    useAgentContextsStore().removeRun(runId);
    finishLoad(storedProjection('late'));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(ws.connects).toBe(1);
    expect(projectionReads()).toBe(1);

    context = useAgentContextsStore().upsertProjectionContext({
      runId, config: context.config, conversation: context.state.conversation, status: AgentStatus.Running,
    });
    stream.reconnection.requestConnect();
    expect(ws.connects).toBe(2);
    expect(projectionReads()).toBe(1);
  });

  it('N-7: a socket started during the load is left to its own open, which is the success point', async () => {
    openAsOwner();
    let finishLoad!: (value: unknown) => void;
    io.projection.mockReturnValueOnce(new Promise((resolve) => { finishLoad = resolve; }));
    ws.lose();
    await vi.advanceTimersByTimeAsync(1_000);
    stream.service.connect(runId, context);
    ws.open();
    finishLoad(storedProjection('late'));
    await flush();
    expect(shown()).not.toContain('late');
    expect(ws.connects).toBe(2);
    // Connected: a hide ≥ 30 s re-syncs it.
    hidePage();
    await vi.advanceTimersByTimeAsync(30_000);
    showPage();
    await flush();
    expect(projectionReads()).toBe(2);
  });

  it('a non-retryable close (4004/4005) is not retried', async () => {
    openAsOwner();
    ws.lose(false);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(projectionReads()).toBe(0);
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
    io.projection.mockResolvedValue(storedProjection('the gap\'s answer'));
    ws = new FakeSocketClient();
    io.ws = ws;
  });
  afterEach(() => {
    removePageVisibilityControl();
    vi.useRealTimers();
  });

  it('a history read during a wait shows the gap\'s events: it triggers the catch-up attempt, not a plain connect', async () => {
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
    expect(io.queries.filter((name) => name === 'GetRunProjection')).toHaveLength(1);
    expect(ws.connects).toBe(2);
    expect(JSON.stringify(context.state.conversation.messages)).toContain('the gap\'s answer');
    store.disconnectAgentStream(runId);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(ws.connects).toBe(2);
  });
});
