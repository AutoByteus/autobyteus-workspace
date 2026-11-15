import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { LiveStreamReconnectScheduler } from '~/services/liveStreamLifecycle/liveStreamReconnectScheduler';
import { loadRunStoredState, type RunStoredState } from '~/services/runHydration/runStoredStateLoader';
import { hydrateRunFileChanges } from '~/services/runHydration/runFileChangeHydrationService';
import {
  primeRecentEventMonitorBaseline,
  resetRecentEventMonitorBaseline,
} from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';
import { overlayPendingUserMessages } from './handlers/userMessageProjection';
import { AgentStreamingService, type AgentStreamingServiceOptions } from './AgentStreamingService';
import { ConnectionState } from './transport';

/**
 * The reconnection of one agent run's stream (autobyteus-434). The agent stream sends no snapshot, so
 * an attempt the scheduler drives catches up while the socket is closed: it loads the run's stored
 * state, commits it into the live context (config and status stay; `AGENT_STATUS` follows the open),
 * then opens the socket. Nothing on the stream can land during the load, so nothing races it.
 *
 * Every socket open is the success point, whoever started it. `agentRunStore.connectToAgentStream` is
 * the only connect entry; its `requestConnect()` never connects a stream in a loss streak without the
 * catch-up (the Agent Connect Rule).
 */
export class AgentRunStreamReconnection {
  private readonly reconnect: LiveStreamReconnectScheduler;
  private readonly stopListening: () => void;
  private disposed = false;

  constructor(
    private readonly runId: string,
    private readonly service: AgentStreamingService,
  ) {
    this.reconnect = new LiveStreamReconnectScheduler({
      attempt: () => { void this.attempt(); },
      resynchronize: () => this.resynchronize(),
    });
    this.stopListening = service.onConnectionChange((event) => {
      if (event.kind === 'opened') this.reconnect.connected();
      else if (event.kind === 'bound') { if (this.catchUpWhenBound) { this.catchUpWhenBound = false; void this.catchUpBound(); } }
      else if (event.retryable) this.reconnect.connectionLost();
      else this.reconnect.startOver();
    });
  }

  /** The store's connect request, decided by the stream's reconnection state. */
  requestConnect(): void {
    switch (this.reconnect.state) {
      case 'waiting':
        // Lost with a wait pending: catch up, then open, now.
        this.reconnect.attemptNow();
        return;
      case 'held':
      case 'attempting':
      case 'connected':
        // Hidden: the page resume attempts. Attempting: that attempt connects. Connected: nothing to do.
        return;
      case 'idle': {
        // Never lost, or closed on purpose: a plain connect (its caller has just hydrated, or this is the first one).
        const context = useAgentContextsStore().getRun(this.runId);
        if (!context) return;
        this.reconnect.startOver();
        this.service.connect(this.runId, context);
      }
    }
  }

  /**
   * A connect that catches up once the node has bound the stream (autobyteus-461 CR-461-098). A delegator's view opens a
   * delegated run as its own run (rule 2) after its open's reads; a message that restored the run before the node bound
   * the stream (its delegator's), and its turn, are in neither the open's read nor the stream. So once bound (the
   * node's `CONNECTED`), the stored state is read again and committed: when the run is not mid-turn, and only when no
   * live event changed the conversation during the read (else read again, a bounded number of times). Live events after
   * the binding arrive on the stream as always. A stream already bound reads now.
   */
  requestCatchUpConnect(): void {
    if (this.service.connectionState === ConnectionState.CONNECTED) { void this.catchUpBound(); return; }
    this.catchUpWhenBound = true;
    this.requestConnect();
  }

  private catchUpWhenBound = false;

  private async catchUpBound(): Promise<void> {
    const contexts = useAgentContextsStore();
    for (let attempt = 0; attempt < CATCH_UP_ATTEMPTS && !this.disposed; attempt += 1) {
      const context = contexts.getRun(this.runId);
      if (!context) return;
      await untilSettled(context);
      if (this.disposed || contexts.getRun(this.runId) !== context) return;
      const before = conversationMark(context);
      let stored: RunStoredState;
      try {
        stored = await loadRunStoredState(this.runId, conversationDefaultsOf(context));
      } catch (error) {
        console.warn(`Agent stream catch-up for '${this.runId}' could not load the stored state.`, error);
        return;
      }
      if (this.disposed || contexts.getRun(this.runId) !== context) return;
      // A live event changed it during the read, or a turn began: read again once it settles.
      if (conversationMark(context) !== before || isMidTurn(context)) continue;
      commitStoredState(this.runId, context, stored);
      return;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stopListening();
    this.reconnect.dispose();
  }

  /** The scheduler's attempt. Each exit ends in one scheduler call; the open's is `connected()`. */
  private async attempt(): Promise<void> {
    const contexts = useAgentContextsStore();
    const context = contexts.getRun(this.runId);
    if (!context) {
      this.reconnect.startOver();
      return;
    }
    let stored: RunStoredState;
    try {
      stored = await loadRunStoredState(this.runId, conversationDefaultsOf(context));
    } catch (error) {
      if (this.disposed) return;
      console.warn(`Agent stream catch-up for '${this.runId}' could not load the stored state.`, error);
      this.reconnect.connectionLost();
      return;
    }
    if (this.disposed) return;
    if (contexts.getRun(this.runId) !== context) {
      this.reconnect.startOver();
      return;
    }
    // Defensive: no connect entry starts a socket during an attempt (Agent Connect Rule). Were one started,
    // its own open or loss reports to the scheduler; the catch-up must not overwrite what it already shows.
    if (this.service.connectionState !== ConnectionState.DISCONNECTED) return;
    if (!commitStoredState(this.runId, context, stored)) {
      this.reconnect.connectionLost();
      return;
    }
    this.service.connect(this.runId, context);
  }

  /** The page was hidden ≥ 30 s: drop the stream that looks open, then catch up and open again. */
  private resynchronize(): void {
    this.service.dropConnection('Agent stream is re-synchronizing.');
    this.reconnect.attemptNow();
  }
}

/** How many reads a catch-up after binding tries before it leaves the live stream to itself. */
const CATCH_UP_ATTEMPTS = 5;
const isMidTurn = (context: AgentContext): boolean =>
  context.state.currentStatus === AgentStatus.Running || context.state.currentStatus === AgentStatus.Initializing;
/** Waits while the run is mid-turn (its turn's events are still arriving and being stored), up to a bound. */
const untilSettled = async (context: AgentContext, boundMs = 30_000): Promise<void> => {
  const deadline = Date.now() + boundMs;
  while (isMidTurn(context) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 250));
};
/** What the view shows now, as one mark: a live event that lands during a read changes it. */
const conversationMark = (context: AgentContext): string => {
  const messages = context.state.conversation.messages;
  const last = messages.at(-1) as unknown as Record<string, unknown> | undefined;
  return `${messages.length}:${JSON.stringify(last ?? null).length}`;
};

const conversationDefaultsOf = (context: AgentContext) => ({
  agentDefinitionId: context.config.agentDefinitionId,
  agentName: context.config.agentDefinitionName,
  llmModelIdentifier: context.config.llmModelIdentifier,
});

/** The open path's commit steps (as `memberLoader`), keeping config and status; `false` on an activity conflict. */
const commitStoredState = (runId: string, context: AgentContext, stored: RunStoredState): boolean => {
  const activityResult = useAgentActivityStore().replaceProjectionActivitiesIfRevisions([{
    runId,
    expectedRevision: stored.expectedActivityRevision,
    activities: stored.activities,
  }]);
  if (activityResult === 'conflict') return false;
  const conversation = stored.conversation;
  // Held or queued input the view already showed stays shown (it may not be stored yet).
  overlayPendingUserMessages(conversation, context.state.conversation);
  resetRecentEventMonitorBaseline(context);
  context.state.conversation = conversation;
  context.state.hasEarlierActiveTraceEvents = stored.hasEarlierActiveTraceEvents;
  context.state.markEventMonitorPresentationChanged();
  primeRecentEventMonitorBaseline(context);
  hydrateRunFileChanges(runId, stored.fileChanges);
  return true;
};

export type AgentRunStream = Readonly<{
  service: AgentStreamingService;
  reconnection: AgentRunStreamReconnection;
}>;

/** One agent run's stream: its service and its reconnection, created (and disposed) together. */
export const createAgentRunStream = (
  runId: string,
  wsEndpoint: string,
  serviceOptions: AgentStreamingServiceOptions,
): AgentRunStream => {
  const service = new AgentStreamingService(wsEndpoint, serviceOptions);
  return Object.freeze({ service, reconnection: new AgentRunStreamReconnection(runId, service) });
};
