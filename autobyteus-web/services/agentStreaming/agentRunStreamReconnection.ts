import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { LiveStreamReconnectScheduler } from '~/services/liveStreamLifecycle/liveStreamReconnectScheduler';
import { AgentStreamingService, type AgentStreamingServiceOptions } from './AgentStreamingService';
import { ConnectionState } from './transport';

/**
 * The reconnection of one agent run's stream (autobyteus-434). Every connection starts with the run's own stream
 * snapshot (autobyteus-461 SR-087): its stored part, its unconfirmed turns' frames and its base, then the frames after
 * the base. So an attempt the scheduler drives just opens the socket; the snapshot is the catch-up, and nothing is
 * read beside it.
 *
 * Every socket open is the success point, whoever started it. `agentRunStore.connectToAgentStream` is
 * the only connect entry; its `requestConnect()` never connects a stream in a loss streak outside an attempt.
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
      attempt: () => { this.attempt(); },
      resynchronize: () => this.resynchronize(),
    });
    this.stopListening = service.onConnectionChange((event) => {
      if (event.kind === 'opened') this.reconnect.connected();
      else if (event.kind === 'bound') return;
      else if (event.retryable) this.reconnect.connectionLost();
      else this.reconnect.startOver();
    });
  }

  /** The store's connect request, decided by the stream's reconnection state. */
  requestConnect(): void {
    switch (this.reconnect.state) {
      case 'waiting':
        // Lost with a wait pending: open now (its snapshot catches up).
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

  /** The scheduler's attempt: open the socket; its snapshot catches up (SR-087). The open reports `connected()`. */
  private attempt(): void {
    const context = useAgentContextsStore().getRun(this.runId);
    if (!context || this.disposed) {
      this.reconnect.startOver();
      return;
    }
    // Defensive: no connect entry starts a socket during an attempt (Agent Connect Rule).
    if (this.service.connectionState !== ConnectionState.DISCONNECTED) return;
    this.service.connect(this.runId, context);
  }

  /** The page was hidden ≥ 30 s: drop the stream that looks open, then open again (its snapshot catches up). */
  private resynchronize(): void {
    this.service.dropConnection('Agent stream is re-synchronizing.');
    this.reconnect.attemptNow();
  }
}

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
