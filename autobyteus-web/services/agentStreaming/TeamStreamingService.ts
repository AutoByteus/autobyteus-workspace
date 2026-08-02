/**
 * TeamStreamingService - Facade for agent team WebSocket streaming.
 *
 * Connects to team endpoint and routes events to appropriate team members
 * by canonical nested source route/path identity, with run IDs used only
 * after route resolution for runtime correlation.
 */

import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { ToolApprovalTarget } from '~/types/segments';
import { WebSocketClient, ConnectionState, type IWebSocketClient } from './transport';
import {
  parseServerMessage,
  serializeClientMessage,
  type ServerMessage,
  type TeamClientMessage,
  type InterruptGenerationPayload,
  type ConversationTargetAddressPayload,
} from './protocol';
import {
  handleTeamCommunicationMessage,
  handleTeamStatus,
} from './handlers';
import {
  extractTaskAgentIdentity,
  removeTaskAgentContext,
  shouldRemoveTaskAgentAfterMessage,
} from './teamTaskAgentContextProjection';
import { resolveTeamStreamMemberContext } from './teamStreamMemberContextResolver';
import { handleTaskExecutionProjectionMessage } from './teamTaskExecutionEventRouter';
import { removeTaskTeamExecutionProjection } from './teamTaskTeamExecutionProjection';
import { dispatchGenericTeamMemberMessage } from './teamStreamGenericMessageDispatcher';
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport';
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth';
import { normalizeAgentRuntimeStatus } from '~/services/runHydration/runtimeStatusNormalization';
import { getApolloClient } from '~/utils/apolloClient';
import { scheduleTaskDelegationRecordsRefresh } from '~/services/runHydration/taskDelegationHydrationService';
import type {
  ConversationTargetAddress,
  ConversationTargetSegment,
} from '~/types/agent/ConversationTargetAddress';
import { StreamContentPresentationScheduler } from './presentation/StreamContentPresentationScheduler';
import { projectStreamContentBatch } from './presentation/streamContentBatchProjector';
import { shouldFlushPendingContentBefore } from './presentation/streamContentPresentationFlushPolicy';

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

const toConversationTargetSegmentPayload = (
  segment: ConversationTargetSegment,
): ConversationTargetAddressPayload['segments'][number] => {
  if (segment.kind === 'member') {
    return {
      kind: 'member',
      ...(segment.memberRouteKey ? { member_route_key: segment.memberRouteKey } : {}),
      ...(segment.memberPath ? { member_path: [...segment.memberPath] } : {}),
    };
  }
  if (segment.kind === 'task_team') {
    return { kind: 'task_team', task_team_run_id: segment.taskTeamRunId };
  }
  return { kind: 'task_agent', task_agent_run_id: segment.taskAgentRunId };
};

const toConversationTargetAddressPayload = (
  address: ConversationTargetAddress,
): ConversationTargetAddressPayload => ({
  ...(address.parentTeamRunId ? { parent_team_run_id: address.parentTeamRunId } : {}),
  segments: address.segments.map(toConversationTargetSegmentPayload),
});

export class TeamStreamingService {
  private wsClient: IWebSocketClient;
  private teamContext: AgentTeamContext | null = null;
  private wsEndpoint: string;
  private readonly contentPresentationScheduler: StreamContentPresentationScheduler;
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
    this.contentPresentationScheduler = new StreamContentPresentationScheduler(
      projectStreamContentBatch,
    );
  }

  get connectionState(): ConnectionState {
    return this.wsClient.state;
  }

  attachContext(teamContext: AgentTeamContext): void {
    this.contentPresentationScheduler.flush();
    this.teamContext = teamContext;
  }

  /**
   * Connect to a team's WebSocket stream.
   */
  connect(teamRunId: string, teamContext: AgentTeamContext): void {
    this.attachContext(teamContext);

    this.wsClient.on('onMessage', this.handleMessage);
    this.wsClient.on('onConnect', this.handleConnect);
    this.wsClient.on('onDisconnect', this.handleDisconnect);
    this.wsClient.on('onError', this.handleError);

    const baseUrl = `${this.wsEndpoint}/${teamRunId}`;
    const credential = getActiveRemoteAccessCredential();
    const url = credential ? buildAuthenticatedWebSocketUrl(baseUrl, credential) : baseUrl;
    this.wsClient.connect(url);
  }

  disconnect(): void {
    this.contentPresentationScheduler.flush();
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
    conversationTargetAddress: ConversationTargetAddress,
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
        conversation_target_address: toConversationTargetAddressPayload(conversationTargetAddress),
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
      const receivedAt = message.type === 'SEGMENT_CONTENT'
        ? new Date().toISOString()
        : null;
      if (
        message.type !== 'SEGMENT_CONTENT'
        && shouldFlushPendingContentBefore(message.type)
      ) {
        this.contentPresentationScheduler.flush();
      }
      this.trackApprovalRequest(message);
      this.logMessage(message);
      this.dispatchMessage(message, this.teamContext, receivedAt);
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
    this.contentPresentationScheduler.flush();
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
      task_agent_run_id?: string;
      taskAgentRunId?: string;
      task_team_run_id?: string;
      taskTeamRunId?: string;
      team_route_key?: string;
      teamRouteKey?: string;
      team_path?: string[];
      teamPath?: string[];
      task_team_relative_member_route_key?: string;
      taskTeamRelativeMemberRouteKey?: string;
      task_team_relative_member_path?: string[];
      taskTeamRelativeMemberPath?: string[];
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
      taskAgentRunId: payload.task_agent_run_id ?? payload.taskAgentRunId,
      taskTeamRunId: payload.task_team_run_id ?? payload.taskTeamRunId,
      teamRouteKey: payload.team_route_key ?? payload.teamRouteKey,
      teamPath: payload.team_path ?? payload.teamPath,
      taskTeamRelativeMemberRouteKey: payload.task_team_relative_member_route_key ?? payload.taskTeamRelativeMemberRouteKey,
      taskTeamRelativeMemberPath: payload.task_team_relative_member_path ?? payload.taskTeamRelativeMemberPath,
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
    const taskAgentRunId = target.taskAgentRunId?.trim() || null;
    const taskTeamRunId = target.taskTeamRunId?.trim() || null;
    const teamPath = Array.isArray(target.teamPath)
      ? target.teamPath.map((part) => String(part).trim()).filter(Boolean)
      : null;
    const taskTeamRelativeMemberPath = Array.isArray(target.taskTeamRelativeMemberPath)
      ? target.taskTeamRelativeMemberPath.map((part) => String(part).trim()).filter(Boolean)
      : null;
    const teamRouteKey = target.teamRouteKey?.trim() || teamPath?.join('/') || null;
    const taskTeamRelativeMemberRouteKey =
      target.taskTeamRelativeMemberRouteKey?.trim() ||
      taskTeamRelativeMemberPath?.join('/') ||
      null;

    if (
      !memberRouteKey &&
      !sourceRouteKey &&
      !memberPath?.length &&
      !sourcePath?.length &&
      !taskAgentRunId &&
      !taskTeamRunId &&
      !teamRouteKey &&
      !teamPath?.length &&
      !taskTeamRelativeMemberRouteKey &&
      !taskTeamRelativeMemberPath?.length
    ) {
      return null;
    }

    return {
      memberRouteKey,
      memberPath: memberPath?.length ? memberPath : null,
      sourceRouteKey,
      sourcePath: sourcePath?.length ? sourcePath : null,
      taskAgentRunId,
      taskTeamRunId,
      teamRouteKey,
      teamPath: teamPath?.length ? teamPath : null,
      taskTeamRelativeMemberRouteKey,
      taskTeamRelativeMemberPath: taskTeamRelativeMemberPath?.length ? taskTeamRelativeMemberPath : null,
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
      task_agent_run_id: target.taskAgentRunId || undefined,
      task_team_run_id: target.taskTeamRunId || undefined,
      team_route_key: target.teamRouteKey || undefined,
      team_path: target.teamPath || undefined,
      task_team_relative_member_route_key: target.taskTeamRelativeMemberRouteKey || undefined,
      task_team_relative_member_path: target.taskTeamRelativeMemberPath || undefined,
    };
  }

  private scheduleTaskTeamCleanup(teamContext: AgentTeamContext, taskTeamRunId?: string | null): void {
    if (!taskTeamRunId) return;
    const cleanup = () => removeTaskTeamExecutionProjection(teamContext, taskTeamRunId);
    if (typeof setTimeout === 'function') {
      setTimeout(cleanup, 0);
      return;
    }
    Promise.resolve().then(cleanup);
  }

  private refreshTaskDelegationRecords(message: ServerMessage, teamContext: AgentTeamContext): void {
    if (message.type !== 'TASK_DELEGATION_EVENT') return;
    const payload = message.payload as Record<string, unknown>;
    const rootTeamRunId = (
      typeof payload.root_team_run_id === 'string' ? payload.root_team_run_id.trim() : ''
    ) || (
      typeof payload.rootTeamRunId === 'string' ? payload.rootTeamRunId.trim() : ''
    ) || (
      typeof payload.team_run_id === 'string' ? payload.team_run_id.trim() : ''
    ) || (
      typeof payload.teamRunId === 'string' ? payload.teamRunId.trim() : ''
    ) || teamContext.teamRunId;
    scheduleTaskDelegationRecordsRefresh({
      client: getApolloClient(),
      teamRunId: rootTeamRunId,
    });
  }

  private dispatchMessage(
    message: ServerMessage,
    teamContext: AgentTeamContext,
    receivedAt: string | null = null,
  ): void {
    this.refreshTaskDelegationRecords(message, teamContext);
    if (message.type === 'TEAM_STATUS') {
      const projectionResult = handleTaskExecutionProjectionMessage(teamContext, message);
      if (projectionResult.outcome === 'drop') {
        console.warn(projectionResult.reason);
        return;
      }
      if (projectionResult.outcome === 'handled') {
        this.scheduleTaskTeamCleanup(teamContext, projectionResult.cleanupTaskTeamRunId);
        return;
      }
      handleTeamStatus(message.payload, teamContext);
      return;
    }

    if (message.type === 'TEAM_COMMUNICATION_MESSAGE') {
      const projectionResult = handleTaskExecutionProjectionMessage(teamContext, message);
      if (projectionResult.outcome === 'drop') {
        console.warn(projectionResult.reason);
        return;
      }
      handleTeamCommunicationMessage(message.payload);
      return;
    }

    const projectionResult = handleTaskExecutionProjectionMessage(teamContext, message);
    if (projectionResult.outcome === 'drop') {
      console.warn(projectionResult.reason);
      return;
    }
    if (projectionResult.outcome === 'handled') {
      this.scheduleTaskTeamCleanup(teamContext, projectionResult.cleanupTaskTeamRunId);
      return;
    }

    const taskAgentIdentity = projectionResult.taskAgentIdentity ?? extractTaskAgentIdentity(message);
    const removeTaskAgentAfterMessage = shouldRemoveTaskAgentAfterMessage(message, taskAgentIdentity);
    const memberResolution = projectionResult.outcome === 'memberContext'
      ? { context: projectionResult.context }
      : resolveTeamStreamMemberContext(teamContext, message);

    if (!memberResolution) {
      if (message.type === 'AGENT_STATUS') {
        const payload = message.payload;
        const routeKey = payload.member_route_key || payload.source_route_key || payload.member_path?.join('/') || payload.source_path?.join('/') || '';
        const memberNode = routeKey ? teamContext.memberNodesByRouteKey.get(routeKey) : null;
        if (memberNode?.memberKind === 'agent_team') {
          memberNode.currentStatus = normalizeAgentRuntimeStatus(payload.status);
          return;
        }
      }
      console.warn('No member context found for message, skipping');
      return;
    }

    if (message.type === 'SEGMENT_CONTENT') {
      if (!receivedAt) {
        throw new Error('SEGMENT_CONTENT receipt time is required before enqueue.');
      }
      this.contentPresentationScheduler.enqueue(memberResolution.context, {
        payload: message.payload,
        receivedAt,
      });
    } else {
      dispatchGenericTeamMemberMessage(message, memberResolution.context);
    }

    if (removeTaskAgentAfterMessage && taskAgentIdentity) {
      removeTaskAgentContext(teamContext, taskAgentIdentity);
    }
  }
}
