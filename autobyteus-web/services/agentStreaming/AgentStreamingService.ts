/**
 * AgentStreamingService - Facade for single agent WebSocket streaming.
 * 
 * Layer 4 of the architecture - wires all layers together and provides
 * a simple API for the store layer to use.
 */

import type { AgentContext } from '~/types/agent/AgentContext';
import type { CollaboratorMentionDto } from '~/utils/collaborators/collaboratorMentionText';
import { WebSocketClient, ConnectionState, type IWebSocketClient } from './transport';
import {
  serializeClientMessage,
  type ServerMessage,
  type ClientMessage,
  type InterruptGenerationCommandAckPayload,
  type InterruptOutcome,
  type PendingInterruptCommand,
  type SendMessageCommandAckPayload,
} from './protocol';
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport';
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth';
import { collaboratorAddRejectionOf } from '~/services/collaborators/collaboratorAddFailures';
import { dispatchAgentStreamMessage } from './agentStreamMessageProjector';
import { parseAgentStreamMessage } from './protocol/agentStreamEnvelope';
import { AgentStreamSequencing } from './agentStreamSequencing';
import { applyAgentStreamSnapshot } from './agentStreamSnapshotApplication';
import {
  admitInterruptCommand,
  InterruptsAwaitingRebind,
  settlePendingInterruptAck,
} from './interruptCommandAdmission';

const shouldLogStreaming = (): boolean => {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  if (w.__AUTOBYTEUS_DEBUG_STREAMING__ === true) return true;
  try {
    return w.localStorage?.getItem('autobyteus.debug.streaming') === 'true';
  } catch {
    return false;
  }
};

const summarizeDelta = (delta: string, maxLen = 120): string => {
  if (!delta) return '';
  const clean = delta.replace(/\n/g, '\\n');
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}…` : clean;
};

export interface AgentStreamingServiceOptions {
  /** Custom WebSocket client for testing */
  wsClient?: IWebSocketClient;
  /** Every SEND_MESSAGE acknowledgement, before it is projected onto the conversation. */
  onSendMessageCommandAck?: (ack: SendMessageCommandAckPayload) => void;
}

/**
 * What the service tells its owner about its socket: opened, bound (the node's `CONNECTED`: its session follows the run
 * from here on), or lost without being asked to close.
 */
export type AgentStreamConnectionEvent =
  | Readonly<{ kind: 'opened' }>
  | Readonly<{ kind: 'bound' }>
  | Readonly<{ kind: 'lost'; retryable: boolean }>;

export class AgentStreamingService {
  private wsClient: IWebSocketClient;
  private context: AgentContext | null = null;
  private wsEndpoint: string;
  private runId: string | null = null;
  private readonly pendingInterruptCommands = new Map<string, PendingInterruptCommand>();
  /** Stops lost with a connection this service reconnects: settled once the new connection's status is applied. */
  private readonly interruptsAwaitingRebind = new InterruptsAwaitingRebind();
  /** Held sends (with `@` mentions) waiting for their admission ack, by message ID. */
  private readonly pendingAdmissions = new Map<string, { resolve(): void; reject(error: Error): void }>();
  private readonly onSendMessageCommandAck: (ack: SendMessageCommandAckPayload) => void;
  private readonly connectionListeners = new Set<(event: AgentStreamConnectionEvent) => void>();
  /** Where the view is in the run's own stream: set by each snapshot, continued by its numbered frames (SR-087). */
  private readonly sequencing = new AgentStreamSequencing();

  /**
   * Create an AgentStreamingService.
   * 
   * @param wsEndpoint - WebSocket endpoint from runtime config (e.g., 'ws://localhost:8000/ws/agent')
   * @param options - Optional configuration for testing
   */
  constructor(wsEndpoint: string, options: AgentStreamingServiceOptions = {}) {
    this.wsClient = options.wsClient || new WebSocketClient();
    this.wsEndpoint = wsEndpoint;
    this.onSendMessageCommandAck = options.onSendMessageCommandAck ?? (() => undefined);
  }

  get connectionState(): ConnectionState {
    return this.wsClient.state;
  }

  get isReady(): boolean {
    return this.wsClient.state === ConnectionState.CONNECTED;
  }

  attachContext(context: AgentContext): void {
    this.context = context;
  }

  /** The owner's notifications of this socket opening or being lost (not of intentional closes). */
  onConnectionChange(listener: (event: AgentStreamConnectionEvent) => void): () => void {
    this.connectionListeners.add(listener);
    return () => { this.connectionListeners.delete(listener); };
  }

  /**
   * A quiet close for a re-synchronization: the loss bookkeeping (pending admissions rejected, waiting
   * Stops held until the rebind) without the loss notification; the context stays attached.
   */
  dropConnection(reason: string): void {
    this.wsClient.disconnect();
    this.rejectInFlight(reason, true);
  }

  /**
   * Connect to an agent's WebSocket stream.
   */
  connect(agentRunId: string, context: AgentContext): void {
    this.attachContext(context);
    this.runId = agentRunId.trim();
    
    this.wsClient.on('onMessage', this.handleMessage);
    this.wsClient.on('onConnect', this.handleConnect);
    this.wsClient.on('onDisconnect', this.handleDisconnect);
    this.wsClient.on('onError', this.handleError);

    const baseUrl = `${this.wsEndpoint}/${agentRunId}`;
    const credential = getActiveRemoteAccessCredential();
    const url = credential ? buildAuthenticatedWebSocketUrl(baseUrl, credential) : baseUrl;
    this.wsClient.connect(url);
  }

  /**
   * Disconnect from the WebSocket stream.
   */
  disconnect(): void {
    // Closed for good: no rebind follows, so every waiting or held Stop settles now (autobyteus-533 D-W7).
    this.interruptsAwaitingRebind.holdPending(this.pendingInterruptCommands);
    this.interruptsAwaitingRebind.settle();
    this.wsClient.off('onMessage', this.handleMessage);
    this.wsClient.off('onConnect', this.handleConnect);
    this.wsClient.off('onDisconnect', this.handleDisconnect);
    this.wsClient.off('onError', this.handleError);

    this.wsClient.disconnect();
    this.context = null;
    this.runId = null;
  }

  /**
   * Send a user message to the agent.
   */
  sendMessage(
    content: string,
    contextFilePaths?: string[],
    imageUrls?: string[],
    command?: { messageId: string; dedupeKey: string; mentions?: readonly CollaboratorMentionDto[] },
  ): void {
    const message: ClientMessage = {
      type: 'SEND_MESSAGE',
      payload: {
        content,
        context_file_paths: contextFilePaths,
        image_urls: imageUrls,
        message_id: command?.messageId ?? '',
        dedupe_key: command?.dedupeKey ?? '',
        ...(command?.mentions?.length ? { mentions: command.mentions.map((mention) => ({ ...mention })) } : {}),
      },
    };
    this.wsClient.send(serializeClientMessage(message));
  }

  /**
   * Sends and waits for the root's admission (a send with `@` mentions, AR-007): resolves when
   * the send is accepted; rejects with `CollaboratorAddRejection` when a mentioned collaborator
   * could not be added (nothing was posted), or with an error for any other rejection.
   */
  sendMessageAwaitingAdmission(
    content: string,
    contextFilePaths: string[],
    imageUrls: string[],
    command: { messageId: string; dedupeKey: string; mentions?: readonly CollaboratorMentionDto[] },
  ): Promise<void> {
    const admission = new Promise<void>((resolve, reject) => {
      this.pendingAdmissions.set(command.messageId, { resolve, reject });
    });
    try {
      this.sendMessage(content, contextFilePaths, imageUrls, command);
    } catch (error) {
      this.pendingAdmissions.delete(command.messageId);
      return Promise.reject(error);
    }
    return admission;
  }

  private settleAdmission(ack: SendMessageCommandAckPayload): void {
    const pending = this.pendingAdmissions.get(ack.message_id);
    if (!pending) return;
    this.pendingAdmissions.delete(ack.message_id);
    if (ack.accepted) pending.resolve();
    else pending.reject(collaboratorAddRejectionOf(ack) ?? new Error(ack.message ?? ack.code ?? 'The message was not accepted.'));
  }

  /**
   * Approve a tool invocation.
   */
  approveTool(invocationId: string, reason?: string): void {
    const message: ClientMessage = {
      type: 'APPROVE_TOOL',
      payload: { invocation_id: invocationId, reason },
    };
    this.wsClient.send(serializeClientMessage(message));
  }

  /**
   * Deny a tool invocation.
   */
  denyTool(invocationId: string, reason?: string): void {
    const message: ClientMessage = {
      type: 'DENY_TOOL',
      payload: { invocation_id: invocationId, reason },
    };
    this.wsClient.send(serializeClientMessage(message));
  }

  /** Stops the current generation; resolves with the Stop's outcome (it never rejects). */
  interruptGeneration(commandId: string): Promise<InterruptOutcome> {
    const normalizedCommandId = commandId.trim();
    const message: ClientMessage = {
      type: 'INTERRUPT_GENERATION',
      payload: { command_id: normalizedCommandId },
    };
    return admitInterruptCommand({
      pending: this.pendingInterruptCommands,
      commandId: normalizedCommandId,
      target: { target_kind: 'standalone_run', run_id: this.runId ?? '' },
      getConnectionState: () => this.wsClient.state,
      send: () => this.wsClient.send(serializeClientMessage(message)),
    });
  }

  // ============================================================================
  // Private Event Handlers
  // ============================================================================

  private handleMessage = (raw: string): void => {
    if (!this.context) return;

    try {
      const wire = parseAgentStreamMessage(raw);
      if (wire.type === 'AGENT_STREAM_SNAPSHOT') {
        // The run's snapshot (SR-087): its stored part and unconfirmed turns, then the frames after its base.
        this.sequencing.reset(wire.payload.base_sequence, wire.payload.live_sequence_id);
        const context = this.context;
        applyAgentStreamSnapshot(context.state.runId, context, wire.payload, (frame) => this.dispatchMessage(frame, context));
        return;
      }
      if (typeof wire.sequence === 'number') {
        const admission = this.sequencing.admit(wire as typeof wire & { sequence: number });
        if (admission.kind === 'gap') { this.reopen(admission.reason); return; }
        if (admission.kind === 'skip') return;
        for (const message of admission.messages) this.receive(message);
        return;
      }
      this.receive(wire as ServerMessage);
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  };

  private receive(message: ServerMessage): void {
    if (!this.context) return;
    if (
      message.type === 'AGENT_COMMAND_ACK'
      && message.payload.command_type === 'INTERRUPT_GENERATION'
    ) {
      this.handleInterruptCommandAck(message.payload);
      return;
    }
    if (message.type === 'AGENT_COMMAND_ACK' && message.payload.command_type === 'SEND_MESSAGE') {
      this.settleAdmission(message.payload);
      this.onSendMessageCommandAck(message.payload);
    }
    if (message.type === 'CONNECTED') this.notifyConnection({ kind: 'bound' });
    this.logMessage(message);
    this.dispatchMessage(message, this.context);
    // The new connection's status is on the context: Stops lost with the old one end, and the status decides.
    if (message.type === 'AGENT_STATUS') this.interruptsAwaitingRebind.settle();
  }

  /** A gap in the run's frames: close, and let the owner open the stream again for a fresh snapshot. */
  private reopen(reason: string): void {
    console.warn(reason);
    this.sequencing.clear();
    this.dropConnection(reason);
    this.notifyConnection({ kind: 'lost', retryable: true });
  }

  private handleConnect = (): void => {
    console.log('Agent WebSocket connected');
    this.notifyConnection({ kind: 'opened' });
  };

  private handleDisconnect = (reason: string | undefined, retryable: boolean): void => {
    console.log('Agent WebSocket disconnected:', reason);
    this.sequencing.clear();
    this.rejectInFlight(reason, retryable);
    this.notifyConnection({ kind: 'lost', retryable });
  };

  /** A loss: admissions fail; waiting Stops are held until the rebind when it recovers, else settled now. */
  private rejectInFlight(reason: string | undefined, recovers: boolean): void {
    this.interruptsAwaitingRebind.holdPending(this.pendingInterruptCommands);
    if (!recovers) this.interruptsAwaitingRebind.settle();
    for (const pending of this.pendingAdmissions.values()) {
      pending.reject(new Error(reason || 'Message admission was interrupted because the stream disconnected.'));
    }
    this.pendingAdmissions.clear();
  }

  private notifyConnection(event: AgentStreamConnectionEvent): void {
    for (const listener of [...this.connectionListeners]) listener(event);
  }

  private handleError = (error: Error): void => {
    console.error('Agent WebSocket error:', error);
  };

  private handleInterruptCommandAck(ack: InterruptGenerationCommandAckPayload): void {
    const settled = settlePendingInterruptAck(this.pendingInterruptCommands, {
      commandId: ack.command_id,
      target: ack.target,
      accepted: ack.state === 'accepted',
      detail: ack.state === 'accepted' ? '' : `[${ack.code}] ${ack.message}`,
    });
    if (!settled) console.warn('Ignoring unmatched interrupt command acknowledgement.', ack);
  }

  private logMessage(message: ServerMessage): void {
    if (!shouldLogStreaming()) return;

    switch (message.type) {
      case 'SYSTEM_INSTRUCTIONS_SUPPLIED': {
        const { trace_id, ts, content } = message.payload;
        console.log('[stream][system-instructions]', {
          type: message.type,
          trace_id,
          ts,
          contentLength: Array.from(content).length,
        });
        break;
      }
      case 'SEGMENT_START': {
        const { id, turn_id, segment_type, metadata } = message.payload;
        console.log('[stream][segment:start]', { id, turn_id, segment_type, metadata });
        break;
      }
      case 'SEGMENT_CONTENT': {
        const { id, turn_id, delta } = message.payload;
        console.log('[stream][segment:content]', {
          id,
          turn_id,
          deltaLen: delta?.length ?? 0,
          deltaSample: summarizeDelta(delta || ''),
        });
        break;
      }
      case 'SEGMENT_END': {
        const { id, turn_id, metadata } = message.payload;
        console.log('[stream][segment:end]', { id, turn_id, metadata });
        break;
      }
      default:
        console.log('[stream][message]', { type: message.type, payload: message.payload });
        break;
    }
  }

  /**
   * Dispatch a parsed message to the appropriate handler.
   */
  private dispatchMessage(message: ServerMessage, context: AgentContext): void {
    dispatchAgentStreamMessage(message, {
      kind: 'standalone',
      context,
      runId: context.state.runId,
    });
  }
}
