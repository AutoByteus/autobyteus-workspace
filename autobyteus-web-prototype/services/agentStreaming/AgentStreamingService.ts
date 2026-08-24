/**
 * AgentStreamingService - Facade for single agent WebSocket streaming.
 * 
 * Layer 4 of the architecture - wires all layers together and provides
 * a simple API for the store layer to use.
 */

import type { AgentContext } from '~/types/agent/AgentContext';
import { WebSocketClient, ConnectionState, type IWebSocketClient } from './transport';
import {
  parseServerMessage,
  serializeClientMessage,
  type ServerMessage,
  type ClientMessage,
  type InterruptGenerationCommandAckPayload,
  type InterruptCommandTransportFailure,
  type PendingInterruptCommand,
} from './protocol';
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport';
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth';
import { dispatchAgentStreamMessage } from './agentStreamMessageProjector';
import {
  drainPendingInterruptTransportFailures,
  interruptCommandTargetsEqual,
  tryAdmitInterruptCommand,
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
  onInterruptCommandResult?: (ack: InterruptGenerationCommandAckPayload) => void;
  onInterruptCommandTransportFailure?: (failure: InterruptCommandTransportFailure) => void;
}

export class AgentStreamingService {
  private wsClient: IWebSocketClient;
  private context: AgentContext | null = null;
  private wsEndpoint: string;
  private runId: string | null = null;
  private readonly pendingInterruptCommands = new Map<string, PendingInterruptCommand>();
  private readonly onInterruptCommandResult: (ack: InterruptGenerationCommandAckPayload) => void;
  private readonly onInterruptCommandTransportFailure: (failure: InterruptCommandTransportFailure) => void;

  /**
   * Create an AgentStreamingService.
   * 
   * @param wsEndpoint - WebSocket endpoint from runtime config (e.g., 'ws://localhost:8000/ws/agent')
   * @param options - Optional configuration for testing
   */
  constructor(wsEndpoint: string, options: AgentStreamingServiceOptions = {}) {
    this.wsClient = options.wsClient || new WebSocketClient();
    this.wsEndpoint = wsEndpoint;
    this.onInterruptCommandResult = options.onInterruptCommandResult ?? (() => undefined);
    this.onInterruptCommandTransportFailure = options.onInterruptCommandTransportFailure
      ?? (() => undefined);
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
    this.drainPendingInterruptCommands('Interrupt was cancelled because the stream disconnected.');
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
    command?: { messageId: string; dedupeKey: string },
  ): void {
    const message: ClientMessage = {
      type: 'SEND_MESSAGE',
      payload: {
        content,
        context_file_paths: contextFilePaths,
        image_urls: imageUrls,
        message_id: command?.messageId ?? '',
        dedupe_key: command?.dedupeKey ?? '',
      },
    };
    this.wsClient.send(serializeClientMessage(message));
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

  /**
   * Interrupt the current generation.
   */
  interruptGeneration(commandId: string): boolean {
    const normalizedCommandId = commandId.trim();
    const entry: PendingInterruptCommand = {
      commandId: normalizedCommandId,
      target: { target_kind: 'standalone_run', run_id: this.runId ?? '' },
    };
    const message: ClientMessage = {
      type: 'INTERRUPT_GENERATION',
      payload: { command_id: normalizedCommandId },
    };
    return tryAdmitInterruptCommand({
      pending: this.pendingInterruptCommands,
      entry,
      getConnectionState: () => this.wsClient.state,
      send: () => this.wsClient.send(serializeClientMessage(message)),
      onTransportFailure: this.onInterruptCommandTransportFailure,
    });
  }

  // ============================================================================
  // Private Event Handlers
  // ============================================================================

  private handleMessage = (raw: string): void => {
    if (!this.context) return;

    try {
      const message = parseServerMessage(raw);
      if (
        message.type === 'AGENT_COMMAND_ACK'
        && message.payload.command_type === 'INTERRUPT_GENERATION'
      ) {
        this.handleInterruptCommandAck(message.payload);
        return;
      }
      this.logMessage(message);
      this.dispatchMessage(message, this.context);
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  };

  private handleConnect = (): void => {
    console.log('Agent WebSocket connected');
  };

  private handleDisconnect = (reason?: string): void => {
    console.log('Agent WebSocket disconnected:', reason);
    this.drainPendingInterruptCommands(
      reason || 'Interrupt result was lost because the stream disconnected.',
    );
  };

  private handleError = (error: Error): void => {
    console.error('Agent WebSocket error:', error);
  };

  private handleInterruptCommandAck(ack: InterruptGenerationCommandAckPayload): void {
    const pending = this.pendingInterruptCommands.get(ack.command_id);
    if (!pending || !interruptCommandTargetsEqual(pending.target, ack.target)) {
      console.warn('Ignoring unmatched interrupt command acknowledgement.', ack);
      return;
    }
    this.pendingInterruptCommands.delete(ack.command_id);
    this.onInterruptCommandResult(ack);
  }

  private drainPendingInterruptCommands(message: string): void {
    drainPendingInterruptTransportFailures({
      pending: this.pendingInterruptCommands,
      reason: {
        code: 'INTERRUPT_TRANSPORT_DISCONNECTED',
        connectionState: this.wsClient.state,
        message,
      },
      onTransportFailure: this.onInterruptCommandTransportFailure,
    });
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
