import type { AgentContext } from '~/types/agent/AgentContext';
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
