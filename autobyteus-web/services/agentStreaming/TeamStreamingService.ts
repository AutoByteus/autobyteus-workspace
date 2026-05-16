/**
 * TeamStreamingService - Facade for agent team WebSocket streaming.
 *
 * Connects to team endpoint and routes events to appropriate team members
 * by canonical nested source route/path identity, with run IDs used only
 * after route resolution for runtime correlation.
 */

import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { ToolApprovalTarget } from '~/types/segments';
import { WebSocketClient, ConnectionState, type IWebSocketClient } from './transport';
import {
  parseServerMessage,
  serializeClientMessage,
  type ServerMessage,
  type TeamClientMessage,
  type InterruptGenerationPayload,
} from './protocol';
import {
  handleSegmentStart,
  handleSegmentContent,
  handleSegmentEnd,
  handleToolApprovalRequested,
  handleToolApproved,
  handleToolDenied,
  handleToolExecutionStarted,
  handleToolExecutionSucceeded,
  handleToolExecutionFailed,
  handleToolExecutionInterrupted,
  handleToolLog,
  handleAgentStatus,
  handleCompactionStatus,
  handleAssistantComplete,
  handleTurnCompleted,
  handleTurnInterrupted,
  handleExternalUserMessage,
  handleTodoListUpdate,
  handleError,
  handleInterAgentMessage,
  handleTeamCommunicationMessage,
  handleSystemTaskNotification,
  handleTeamStatus,
  handleTaskPlanEvent,
  handleFileChange,
} from './handlers';
import { handleBrowserToolExecutionSucceeded } from './browser/browserToolExecutionSucceededHandler';

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

export interface TeamStreamingServiceOptions {
  wsClient?: IWebSocketClient;
}

export interface TeamInterruptGenerationTarget {
  targetMemberRouteKey: string;
  targetMemberRunId?: string | null;
}

export class TeamStreamingService {
  private wsClient: IWebSocketClient;
  private teamContext: AgentTeamContext | null = null;
  private wsEndpoint: string;
  private readonly approvalTokenByInvocationId = new Map<string, unknown>();
  private readonly approvalTargetByInvocationId = new Map<string, ToolApprovalTarget>();

  /**
   * Create a TeamStreamingService.
   *
   * @param wsEndpoint - WebSocket endpoint from runtime config (e.g., 'ws://localhost:8000/ws/agent-team')
   * @param options - Optional configuration for testing
   */
  constructor(wsEndpoint: string, options: TeamStreamingServiceOptions = {}) {
    this.wsClient = options.wsClient || new WebSocketClient();
    this.wsEndpoint = wsEndpoint;
  }

  get connectionState(): ConnectionState {
    return this.wsClient.state;
  }

  attachContext(teamContext: AgentTeamContext): void {
    this.teamContext = teamContext;
  }

  /**
   * Connect to a team's WebSocket stream.
   */
  connect(teamRunId: string, teamContext: AgentTeamContext): void {
    this.teamContext = teamContext;

    this.wsClient.on('onMessage', this.handleMessage);
    this.wsClient.on('onConnect', this.handleConnect);
    this.wsClient.on('onDisconnect', this.handleDisconnect);
    this.wsClient.on('onError', this.handleError);

    const url = `${this.wsEndpoint}/${teamRunId}`;
    this.wsClient.connect(url);
  }

  disconnect(): void {
    this.wsClient.off('onMessage', this.handleMessage);
    this.wsClient.off('onConnect', this.handleConnect);
    this.wsClient.off('onDisconnect', this.handleDisconnect);
    this.wsClient.off('onError', this.handleError);

    this.wsClient.disconnect();
    this.teamContext = null;
    this.approvalTokenByInvocationId.clear();
    this.approvalTargetByInvocationId.clear();
  }

  sendMessage(
    content: string,
    targetMemberRouteKey?: string,
    contextFilePaths?: string[],
    imageUrls?: string[],
    identity?: { messageId?: string; dedupeKey?: string },
  ): void {
    const message: TeamClientMessage = {
      type: 'SEND_MESSAGE',
      payload: {
        content,
        context_file_paths: contextFilePaths,
        image_urls: imageUrls,
        target_member_route_key: targetMemberRouteKey,
        message_id: identity?.messageId,
        dedupe_key: identity?.dedupeKey,
      },
    };
    this.wsClient.send(serializeClientMessage(message));
  }

  approveTool(invocationId: string, target?: ToolApprovalTarget | null, reason?: string): void {
    const approvalToken = this.approvalTokenByInvocationId.get(invocationId);
    const approvalTarget = this.resolveApprovalTarget(invocationId, target);
    const message: TeamClientMessage = {
      type: 'APPROVE_TOOL',
      payload: {
        invocation_id: invocationId,
        ...this.toToolActionSelectorPayload(approvalTarget),
        reason,
        approval_token: approvalToken as any,
      },
    };
    this.wsClient.send(serializeClientMessage(message));
    this.approvalTokenByInvocationId.delete(invocationId);
    this.approvalTargetByInvocationId.delete(invocationId);
  }

  denyTool(invocationId: string, target?: ToolApprovalTarget | null, reason?: string): void {
    const approvalToken = this.approvalTokenByInvocationId.get(invocationId);
    const approvalTarget = this.resolveApprovalTarget(invocationId, target);
    const message: TeamClientMessage = {
      type: 'DENY_TOOL',
      payload: {
        invocation_id: invocationId,
        ...this.toToolActionSelectorPayload(approvalTarget),
        reason,
        approval_token: approvalToken as any,
      },
    };
    this.wsClient.send(serializeClientMessage(message));
    this.approvalTokenByInvocationId.delete(invocationId);
    this.approvalTargetByInvocationId.delete(invocationId);
  }

  interruptGeneration(target: TeamInterruptGenerationTarget): void {
    const targetMemberRouteKey = target.targetMemberRouteKey.trim();
    if (!targetMemberRouteKey) {
      throw new Error('Cannot interrupt generation: target member route key is required.');
    }

    const payload: InterruptGenerationPayload = {
      target_member_route_key: targetMemberRouteKey,
    };
    const targetMemberRunId = target.targetMemberRunId?.trim();
    if (targetMemberRunId) {
      payload.target_member_run_id = targetMemberRunId;
    }

    const message: TeamClientMessage = {
      type: 'INTERRUPT_GENERATION',
      payload,
    };
    this.wsClient.send(serializeClientMessage(message));
  }

  private handleMessage = (raw: string): void => {
    if (!this.teamContext) return;

    try {
      const message = parseServerMessage(raw);
      this.trackApprovalRequest(message);
      this.logMessage(message);
      this.dispatchMessage(message, this.teamContext);
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  };

  private handleConnect = (): void => {
    console.log('Team WebSocket connected');
    if (this.teamContext) {
      this.teamContext.isSubscribed = true;
    }
  };

  private handleDisconnect = (reason?: string): void => {
    console.log('Team WebSocket disconnected:', reason);
    if (this.teamContext) {
      this.teamContext.isSubscribed = false;
    }
  };

  private handleError = (error: Error): void => {
    console.error('Team WebSocket error:', error);
  };

  private logMessage(message: ServerMessage): void {
    if (!shouldLogStreaming()) return;

    switch (message.type) {
      case 'SEGMENT_START': {
        const { id, turn_id, segment_type, metadata } = message.payload;
        console.log('[stream][team][segment:start]', { id, turn_id, segment_type, metadata, payload: message.payload });
        break;
      }
      case 'SEGMENT_CONTENT': {
        const { id, turn_id, delta } = message.payload;
        console.log('[stream][team][segment:content]', {
          id,
          turn_id,
          deltaLen: delta?.length ?? 0,
          deltaSample: summarizeDelta(delta || ''),
          payload: message.payload,
        });
        break;
      }
      case 'SEGMENT_END': {
        const { id, turn_id, metadata } = message.payload;
        console.log('[stream][team][segment:end]', { id, turn_id, metadata, payload: message.payload });
        break;
      }
      default:
        console.log('[stream][team][message]', { type: message.type, payload: message.payload });
        break;
    }
  }

  private trackApprovalRequest(message: ServerMessage): void {
    if (message.type !== 'TOOL_APPROVAL_REQUESTED') return;
    const payload = message.payload as {
      invocation_id?: string;
      approval_token?: unknown;
      member_route_key?: string;
      member_path?: string[];
      source_route_key?: string;
      source_path?: string[];
    };
    if (!payload?.invocation_id) return;
    if (payload.approval_token) {
      this.approvalTokenByInvocationId.set(payload.invocation_id, payload.approval_token);
    }

    const approvalTarget = this.normalizeApprovalTarget({
      memberRouteKey: payload.member_route_key,
      memberPath: payload.member_path,
      sourceRouteKey: payload.source_route_key,
      sourcePath: payload.source_path,
    });
    if (approvalTarget) {
      this.approvalTargetByInvocationId.set(payload.invocation_id, approvalTarget);
    }
  }

  private resolveApprovalTarget(
    invocationId: string,
    target?: ToolApprovalTarget | null,
  ): ToolApprovalTarget | null {
    return this.normalizeApprovalTarget(target ?? null)
      ?? this.approvalTargetByInvocationId.get(invocationId)
      ?? null;
  }

  private normalizeApprovalTarget(target: ToolApprovalTarget | null): ToolApprovalTarget | null {
    if (!target) {
      return null;
    }
    const memberPath = Array.isArray(target.memberPath)
      ? target.memberPath.map((part) => String(part).trim()).filter(Boolean)
      : null;
    const sourcePath = Array.isArray(target.sourcePath)
      ? target.sourcePath.map((part) => String(part).trim()).filter(Boolean)
      : null;
    const memberRouteKey = target.memberRouteKey?.trim() || memberPath?.join('/') || null;
    const sourceRouteKey = target.sourceRouteKey?.trim() || sourcePath?.join('/') || null;

    if (!memberRouteKey && !sourceRouteKey && !memberPath?.length && !sourcePath?.length) {
      return null;
    }

    return {
      memberRouteKey,
      memberPath: memberPath?.length ? memberPath : null,
      sourceRouteKey,
      sourcePath: sourcePath?.length ? sourcePath : null,
    };
  }

  private toToolActionSelectorPayload(target: ToolApprovalTarget | null): Partial<NonNullable<Extract<TeamClientMessage, { type: 'APPROVE_TOOL' }>['payload']>> {
    if (!target) {
      return {};
    }
    return {
      member_route_key: target.memberRouteKey || undefined,
      member_path: target.memberPath || undefined,
      source_route_key: target.sourceRouteKey || undefined,
      source_path: target.sourcePath || undefined,
    };
  }

  /**
   * Route message to the appropriate team member using canonical source route/path identity.
   */
  private getMemberContext(message: ServerMessage): AgentContext | null {
    if (!this.teamContext) return null;

    // Use type assertion since route/source metadata is present only on team-scoped payloads.
    const payload = 'payload' in message ? message.payload as {
      agent_id?: string;
      agent_name?: string;
      member_route_key?: string;
      source_route_key?: string;
      source_path?: string[];
      member_path?: string[];
    } : null;
    const sourceRouteKey = payload?.source_route_key || payload?.member_route_key;
    const sourcePath = Array.isArray(payload?.source_path) && payload.source_path.length > 0
      ? payload.source_path
      : Array.isArray(payload?.member_path)
        ? payload.member_path
        : null;
    const routeKeyFromPath = sourcePath?.map((segment) => String(segment).trim()).filter(Boolean).join('/') || '';
    const memberRunId = payload?.agent_id;

    const routedMatch = (sourceRouteKey || routeKeyFromPath)
      ? this.teamContext.leafAgentContextsByRouteKey.get(sourceRouteKey || routeKeyFromPath)
      : null;
    if (routedMatch) {
      if (memberRunId && routedMatch.state.runId !== memberRunId) {
        routedMatch.state.runId = memberRunId;
      }
      return routedMatch;
    }

    return null;
  }

  private dispatchMessage(message: ServerMessage, teamContext: AgentTeamContext): void {
    if (message.type === 'TEAM_STATUS') {
      handleTeamStatus(message.payload, teamContext);
      return;
    }

    if (message.type === 'TASK_PLAN_EVENT') {
      handleTaskPlanEvent(message.payload, teamContext);
      return;
    }

    if (message.type === 'TEAM_COMMUNICATION_MESSAGE') {
      handleTeamCommunicationMessage(message.payload);
      return;
    }

    const memberContext = this.getMemberContext(message);

    if (!memberContext) {
      console.warn('No member context found for message, skipping');
      return;
    }

    memberContext.conversation.updatedAt = new Date().toISOString();

    switch (message.type) {
      case 'SEGMENT_START':
        handleSegmentStart(message.payload, memberContext);
        break;

      case 'SEGMENT_CONTENT':
        handleSegmentContent(message.payload, memberContext);
        break;

      case 'SEGMENT_END':
        handleSegmentEnd(message.payload, memberContext);
        break;

      case 'TOOL_APPROVAL_REQUESTED':
        handleToolApprovalRequested(message.payload, memberContext);
        break;

      case 'TOOL_APPROVED':
        handleToolApproved(message.payload, memberContext);
        break;

      case 'TOOL_DENIED':
        handleToolDenied(message.payload, memberContext);
        break;

      case 'TOOL_EXECUTION_STARTED':
        handleToolExecutionStarted(message.payload, memberContext);
        break;

      case 'TOOL_EXECUTION_SUCCEEDED':
        handleToolExecutionSucceeded(message.payload, memberContext);
        void handleBrowserToolExecutionSucceeded(message.payload);
        break;

      case 'TOOL_EXECUTION_FAILED':
        handleToolExecutionFailed(message.payload, memberContext);
        break;

      case 'TOOL_EXECUTION_INTERRUPTED':
        handleToolExecutionInterrupted(message.payload, memberContext);
        break;

      case 'TOOL_LOG':
        handleToolLog(message.payload, memberContext);
        break;

      case 'AGENT_STATUS':
        handleAgentStatus(message.payload, memberContext);
        break;

      case 'COMPACTION_STATUS':
        handleCompactionStatus(message.payload, memberContext);
        break;

      case 'TURN_STARTED':
        break;

      case 'TURN_COMPLETED':
        handleTurnCompleted(message.payload, memberContext);
        break;

      case 'TURN_INTERRUPTED':
        handleTurnInterrupted(message.payload, memberContext);
        break;

      case 'ASSISTANT_COMPLETE':
        handleAssistantComplete(message.payload, memberContext);
        break;

      case 'EXTERNAL_USER_MESSAGE':
        handleExternalUserMessage(message.payload, memberContext);
        break;

      case 'TODO_LIST_UPDATE':
        handleTodoListUpdate(message.payload, memberContext);
        break;

      case 'ERROR':
        handleError(message.payload, memberContext);
        break;

      case 'INTER_AGENT_MESSAGE':
        handleInterAgentMessage(message.payload, memberContext);
        break;

      case 'SYSTEM_TASK_NOTIFICATION':
        handleSystemTaskNotification(message.payload, memberContext);
        break;

      case 'FILE_CHANGE':
        handleFileChange(message.payload, memberContext);
        break;

      case 'CONNECTED':
        break;

      default:
        console.warn('Unhandled team message type:', (message as any).type);
    }
  }
}
