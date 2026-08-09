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
  type InterruptGenerationCommandAckPayload,
  type InterruptCommandTransportFailure,
  type PendingInterruptCommand,
} from './protocol';
import {
  handleTeamCommunicationMessage,
  handleTeamRunLifecycle,
} from './handlers';
import {
  extractTaskAgentIdentity,
  removeTaskAgentContext,
  shouldRemoveTaskAgentAfterMessage,
} from './teamTaskAgentContextProjection';
import { resolveTeamStreamMemberContext } from './teamStreamMemberContextResolver';
import { handleTaskExecutionProjectionMessage } from './teamTaskExecutionEventRouter';
import { removeTaskTeamExecutionProjection } from './teamTaskTeamExecutionProjection';
import { dispatchAgentStreamMessage } from './agentStreamMessageProjector';
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport';
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth';
import { getApolloClient } from '~/utils/apolloClient';
import { scheduleTaskDelegationRecordsRefresh } from '~/services/runHydration/taskDelegationHydrationService';
import type {
  ConversationTargetAddress,
  ConversationTargetSegment,
} from '~/types/agent/ConversationTargetAddress';
import {
  drainPendingInterruptTransportFailures,
  interruptCommandTargetsEqual,
  tryAdmitInterruptCommand,
} from './interruptCommandAdmission';
import { TeamToolApprovalTracker } from './TeamToolApprovalTracker';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import {
  mergeTaskExecutionProjectionMutations,
  NO_TASK_EXECUTION_PROJECTION_MUTATION,
  type TaskExecutionProjectionMutation,
} from './teamTaskExecutionProjection';

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
  onInterruptCommandResult?: (ack: InterruptGenerationCommandAckPayload) => void;
  onInterruptCommandTransportFailure?: (failure: InterruptCommandTransportFailure) => void;
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
  private teamRunId: string | null = null;
  private readonly pendingInterruptCommands = new Map<string, PendingInterruptCommand>();
  private readonly onInterruptCommandResult: (ack: InterruptGenerationCommandAckPayload) => void;
  private readonly onInterruptCommandTransportFailure: (failure: InterruptCommandTransportFailure) => void;
  private readonly approvalTracker = new TeamToolApprovalTracker();

  /**
   * Create a TeamStreamingService.
   *
   * @param wsEndpoint - WebSocket endpoint from runtime config (e.g., 'ws://localhost:8000/ws/agent-team')
   * @param options - Optional configuration for testing
   */
  constructor(wsEndpoint: string, options: TeamStreamingServiceOptions = {}) {
    this.wsClient = options.wsClient || new WebSocketClient();
    this.wsEndpoint = wsEndpoint;
    this.onInterruptCommandResult = options.onInterruptCommandResult ?? (() => undefined);
    this.onInterruptCommandTransportFailure = options.onInterruptCommandTransportFailure
      ?? (() => undefined);
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
    this.attachContext(teamContext);
    this.teamRunId = teamRunId.trim();

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
    this.drainPendingInterruptCommands('Interrupt was cancelled because the stream disconnected.');
    this.wsClient.off('onMessage', this.handleMessage);
    this.wsClient.off('onConnect', this.handleConnect);
    this.wsClient.off('onDisconnect', this.handleDisconnect);
    this.wsClient.off('onError', this.handleError);

    this.wsClient.disconnect();
    this.teamContext = null;
    this.teamRunId = null;
    this.approvalTracker.clear();
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
    const approvalToken = this.approvalTracker.getToken(invocationId);
    const approvalTarget = this.approvalTracker.resolveTarget(invocationId, target);
    const message: TeamClientMessage = {
      type: 'APPROVE_TOOL',
      payload: {
        invocation_id: invocationId,
        ...this.approvalTracker.toSelectorPayload(approvalTarget),
        reason,
        approval_token: approvalToken as any,
      },
    };
    this.wsClient.send(serializeClientMessage(message));
    this.approvalTracker.complete(invocationId);
  }

  denyTool(invocationId: string, target?: ToolApprovalTarget | null, reason?: string): void {
    const approvalToken = this.approvalTracker.getToken(invocationId);
    const approvalTarget = this.approvalTracker.resolveTarget(invocationId, target);
    const message: TeamClientMessage = {
      type: 'DENY_TOOL',
      payload: {
        invocation_id: invocationId,
        ...this.approvalTracker.toSelectorPayload(approvalTarget),
        reason,
        approval_token: approvalToken as any,
      },
    };
    this.wsClient.send(serializeClientMessage(message));
    this.approvalTracker.complete(invocationId);
  }

  interruptGeneration(commandId: string, target: TeamInterruptGenerationTarget): boolean {
    const normalizedCommandId = commandId.trim();
    const targetMemberRouteKey = target.targetMemberRouteKey.trim();
    if (!targetMemberRouteKey) {
      throw new Error('Cannot interrupt generation: target member route key is required.');
    }

    const targetMemberRunId = target.targetMemberRunId?.trim() || null;
    const entry: PendingInterruptCommand = {
      commandId: normalizedCommandId,
      target: {
        target_kind: 'team_member',
        team_run_id: this.teamRunId ?? '',
        member_route_key: targetMemberRouteKey,
        member_run_id: targetMemberRunId,
      },
    };
    const payload: InterruptGenerationPayload = {
      command_id: normalizedCommandId,
      target_member_route_key: targetMemberRouteKey,
    };
    if (targetMemberRunId) {
      payload.target_member_run_id = targetMemberRunId;
    }

    const message: TeamClientMessage = {
      type: 'INTERRUPT_GENERATION',
      payload,
    };
    return tryAdmitInterruptCommand({
      pending: this.pendingInterruptCommands,
      entry,
      getConnectionState: () => this.wsClient.state,
      send: () => this.wsClient.send(serializeClientMessage(message)),
      onTransportFailure: this.onInterruptCommandTransportFailure,
    });
  }

  private handleMessage = (raw: string): void => {
    if (!this.teamContext) return;

    try {
      const message = parseServerMessage(raw);
      if (
        message.type === 'AGENT_COMMAND_ACK'
        && message.payload.command_type === 'INTERRUPT_GENERATION'
      ) {
        this.handleInterruptCommandAck(message.payload);
        return;
      }
      this.approvalTracker.track(message);
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
    this.drainPendingInterruptCommands(
      reason || 'Interrupt result was lost because the stream disconnected.',
    );
    if (this.teamContext) {
      this.teamContext.isSubscribed = false;
    }
  };

  private handleError = (error: Error): void => {
    console.error('Team WebSocket error:', error);
  };

  private handleInterruptCommandAck(ack: InterruptGenerationCommandAckPayload): void {
    const pending = this.pendingInterruptCommands.get(ack.command_id);
    if (!pending || !interruptCommandTargetsEqual(pending.target, ack.target)) {
      console.warn('Ignoring unmatched team interrupt command acknowledgement.', ack);
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

  private scheduleTaskTeamCleanup(teamContext: AgentTeamContext, taskTeamRunId?: string | null): void {
    if (!taskTeamRunId) return;
    const cleanup = () => {
      const mutation = removeTaskTeamExecutionProjection(teamContext, taskTeamRunId);
      if (mutation.kind !== 'NONE') {
        useRunHistoryStore().commitTaskProjectionNavigationMutation(teamContext.teamRunId, mutation);
      }
    };
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
  ): void {
    this.refreshTaskDelegationRecords(message, teamContext);
    if (message.type === 'TEAM_RUN_LIFECYCLE') {
      if (handleTeamRunLifecycle(message.payload, teamContext)) {
        useRunHistoryStore().applyRunNavigationEffect({
          kind: 'team_run',
          teamRunId: teamContext.teamRunId,
          isActive: teamContext.isActive,
        }, { kind: 'PRESENTATION' });
      }
      return;
    }

    const projectionResult = handleTaskExecutionProjectionMessage(teamContext, message);
    let taskMutation: TaskExecutionProjectionMutation = projectionResult.mutation;
    const commitTaskMutation = (): void => {
      if (taskMutation.kind === 'NONE') return;
      useRunHistoryStore().commitTaskProjectionNavigationMutation(teamContext.teamRunId, taskMutation);
      taskMutation = NO_TASK_EXECUTION_PROJECTION_MUTATION;
    };
    if (projectionResult.outcome === 'drop') {
      commitTaskMutation();
      console.warn(projectionResult.reason);
      return;
    }
    if (message.type === 'TEAM_COMMUNICATION_MESSAGE') {
      commitTaskMutation();
      handleTeamCommunicationMessage(message.payload);
      return;
    }
    if (projectionResult.outcome === 'handled') {
      commitTaskMutation();
      this.scheduleTaskTeamCleanup(teamContext, projectionResult.cleanupTaskTeamRunId);
      return;
    }

    const taskAgentIdentity = projectionResult.taskAgentIdentity ?? extractTaskAgentIdentity(message);
    const removeTaskAgentAfterMessage = shouldRemoveTaskAgentAfterMessage(message, taskAgentIdentity);
    if (taskMutation.kind === 'TOPOLOGY' && !removeTaskAgentAfterMessage) {
      commitTaskMutation();
    }
    const memberResolution = projectionResult.outcome === 'memberContext'
      ? {
          context: projectionResult.context,
          memberRouteKey: projectionResult.memberRouteKey,
        }
      : resolveTeamStreamMemberContext(teamContext, message);

    if (!memberResolution) {
      commitTaskMutation();
      console.warn('No member context found for message, skipping');
      return;
    }

    dispatchAgentStreamMessage(message, {
      kind: 'team_member',
      context: memberResolution.context,
      teamRunId: teamContext.teamRunId,
      memberRouteKey: memberResolution.memberRouteKey,
      memberRunId: memberResolution.context.state.runId,
    });

    if (removeTaskAgentAfterMessage && taskAgentIdentity) {
      taskMutation = mergeTaskExecutionProjectionMutations(
        taskMutation,
        removeTaskAgentContext(teamContext, taskAgentIdentity),
      );
    }
    commitTaskMutation();
  }
}
