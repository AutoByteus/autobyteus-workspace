/**
 * TeamStreamingService - Facade for agent team WebSocket streaming.
 * 
 * Connects to team endpoint and routes events to appropriate team members
 * based on agent_id in the message payload.
 */

import { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { Conversation } from '~/types/conversation';
import { WebSocketClient, ConnectionState, type IWebSocketClient } from './transport';
import {
  parseServerMessage,
  serializeClientMessage,
  type ServerMessage,
  type ClientMessage,
  type EventScope,
  type TeamStreamRoutingMetadata,
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
  handleToolLog,
  handleAgentStatus,
  handleAssistantComplete,
  handleTodoListUpdate,
  handleError,
  handleInterAgentMessage,
  handleSystemTaskNotification,
  handleTeamStatus,
  handleTaskPlanEvent,
  handleArtifactPersisted,
  handleArtifactUpdated,
} from './handlers';

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

type MessagePayloadMeta = TeamStreamRoutingMetadata & {
  agent_id?: string;
  agent_name?: string;
};

const resolveTokenTargetMemberName = (approvalToken: unknown): string | null => {
  if (!approvalToken || typeof approvalToken !== 'object') {
    return null;
  }
  const token = approvalToken as Record<string, unknown>;
  const target =
    (typeof token.targetMemberName === 'string' && token.targetMemberName.trim()) ||
    (typeof token.target_member_name === 'string' && token.target_member_name.trim()) ||
    '';
  return target || null;
};

const MEMBER_SCOPED_MESSAGE_TYPES = new Set<ServerMessage['type']>([
  'SEGMENT_START',
  'SEGMENT_CONTENT',
  'SEGMENT_END',
  'TOOL_APPROVAL_REQUESTED',
  'TOOL_APPROVED',
  'TOOL_DENIED',
  'TOOL_EXECUTION_STARTED',
  'TOOL_EXECUTION_SUCCEEDED',
  'TOOL_EXECUTION_FAILED',
  'TOOL_LOG',
  'AGENT_STATUS',
  'ASSISTANT_COMPLETE',
  'TODO_LIST_UPDATE',
  'ERROR',
  'INTER_AGENT_MESSAGE',
  'SYSTEM_TASK_NOTIFICATION',
  'ARTIFACT_PERSISTED',
  'ARTIFACT_UPDATED',
]);

const TEAM_SCOPED_MESSAGE_TYPES = new Set<ServerMessage['type']>([
  'TEAM_STATUS',
  'TASK_PLAN_EVENT',
  'CONNECTED',
]);

export interface TeamStreamingServiceOptions {
  wsClient?: IWebSocketClient;
}

export class TeamStreamingService {
  private wsClient: IWebSocketClient;
  private teamContext: AgentTeamContext | null = null;
  private wsEndpoint: string;
  private readonly approvalTokenByInvocationId = new Map<string, unknown>();
  private readonly lastSequenceByRunId = new Map<string, number>();

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

  /**
   * Connect to a team's WebSocket stream.
   */
  connect(teamId: string, teamContext: AgentTeamContext): void {
    this.teamContext = teamContext;
    
    this.wsClient.on('onMessage', this.handleMessage);
    this.wsClient.on('onConnect', this.handleConnect);
    this.wsClient.on('onDisconnect', this.handleDisconnect);
    this.wsClient.on('onError', this.handleError);

    const url = `${this.wsEndpoint}/${teamId}`;
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
    this.lastSequenceByRunId.clear();
  }

  sendMessage(content: string, targetMemberName?: string, contextFilePaths?: string[]): void {
    const message: ClientMessage = {
      type: 'SEND_MESSAGE',
      payload: {
        content,
        context_file_paths: contextFilePaths,
        target_member_name: targetMemberName,
      },
    };
    this.wsClient.send(serializeClientMessage(message));
  }

  approveTool(invocationId: string, agentName?: string, reason?: string): void {
    const approvalToken = this.approvalTokenByInvocationId.get(invocationId);
    const tokenTarget = resolveTokenTargetMemberName(approvalToken);
    const resolvedAgentName = tokenTarget ?? agentName;
    const message: ClientMessage = {
      type: 'APPROVE_TOOL',
      payload: {
        invocation_id: invocationId,
        ...(resolvedAgentName ? { agent_name: resolvedAgentName } : {}),
        reason,
        approval_token: approvalToken as any,
      },
    };
    this.wsClient.send(serializeClientMessage(message));
    this.approvalTokenByInvocationId.delete(invocationId);
  }

  denyTool(invocationId: string, agentName?: string, reason?: string): void {
    const approvalToken = this.approvalTokenByInvocationId.get(invocationId);
    const tokenTarget = resolveTokenTargetMemberName(approvalToken);
    const resolvedAgentName = tokenTarget ?? agentName;
    const message: ClientMessage = {
      type: 'DENY_TOOL',
      payload: {
        invocation_id: invocationId,
        ...(resolvedAgentName ? { agent_name: resolvedAgentName } : {}),
        reason,
        approval_token: approvalToken as any,
      },
    };
    this.wsClient.send(serializeClientMessage(message));
    this.approvalTokenByInvocationId.delete(invocationId);
  }

  stopGeneration(): void {
    const message: ClientMessage = { type: 'STOP_GENERATION' };
    this.wsClient.send(serializeClientMessage(message));
  }

  private handleMessage = (raw: string): void => {
    if (!this.teamContext) return;

    try {
      const message = parseServerMessage(raw);
      this.trackApprovalToken(message);
      this.logMessage(message);
      this.dispatchMessage(message, this.teamContext);
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e, { raw });
    }
  };

  private handleConnect = (): void => {
    console.log('Team WebSocket connected');
  };

  private handleDisconnect = (reason?: string): void => {
    console.log('Team WebSocket disconnected:', reason);
  };

  private handleError = (error: Error): void => {
    console.error('Team WebSocket error:', error);
  };

  private logMessage(message: ServerMessage): void {
    if (!shouldLogStreaming()) return;

    switch (message.type) {
      case 'SEGMENT_START': {
        const { id, segment_type, metadata } = message.payload;
        console.log('[stream][team][segment:start]', { id, segment_type, metadata, payload: message.payload });
        break;
      }
      case 'SEGMENT_CONTENT': {
        const { id, delta } = message.payload;
        console.log('[stream][team][segment:content]', {
          id,
          deltaLen: delta?.length ?? 0,
          deltaSample: summarizeDelta(delta || ''),
          payload: message.payload,
        });
        break;
      }
      case 'SEGMENT_END': {
        const { id, metadata } = message.payload;
        console.log('[stream][team][segment:end]', { id, metadata, payload: message.payload });
        break;
      }
      default:
        console.log('[stream][team][message]', { type: message.type, payload: message.payload });
        break;
    }
  }

  private trackApprovalToken(message: ServerMessage): void {
    if (message.type !== 'TOOL_APPROVAL_REQUESTED') return;
    const payload = message.payload as { invocation_id?: string; approval_token?: unknown };
    if (!payload?.invocation_id || !payload.approval_token) return;
    this.approvalTokenByInvocationId.set(payload.invocation_id, payload.approval_token);
  }

  private getPayloadMeta(message: ServerMessage): MessagePayloadMeta | null {
    if (!('payload' in message) || !message.payload || typeof message.payload !== 'object') {
      return null;
    }
    return message.payload as MessagePayloadMeta;
  }

  private resolveEventScope(message: ServerMessage, payload: MessagePayloadMeta | null): EventScope {
    if (payload?.event_scope === 'member_scoped' || payload?.event_scope === 'team_scoped') {
      return payload.event_scope;
    }
    if (TEAM_SCOPED_MESSAGE_TYPES.has(message.type)) {
      return 'team_scoped';
    }
    return 'member_scoped';
  }

  private shouldApplyBySequence(payload: MessagePayloadMeta | null): boolean {
    const envelope = payload?.team_stream_event_envelope;
    if (!envelope || typeof envelope.team_run_id !== 'string' || !Number.isFinite(envelope.sequence)) {
      return true;
    }

    const teamRunId = envelope.team_run_id;
    const sequence = Math.floor(envelope.sequence);
    if (sequence <= 0) {
      return true;
    }

    const lastSequence = this.lastSequenceByRunId.get(teamRunId);
    if (lastSequence !== undefined && sequence <= lastSequence) {
      if (shouldLogStreaming()) {
        console.warn('[stream][team][sequence:drop]', { teamRunId, sequence, lastSequence });
      }
      return false;
    }

    this.lastSequenceByRunId.set(teamRunId, sequence);
    return true;
  }

  private getMemberContext(payload: MessagePayloadMeta | null): AgentContext | null {
    if (!this.teamContext) return null;

    const memberRouteKey = typeof payload?.member_route_key === 'string' ? payload.member_route_key : null;
    if (memberRouteKey) {
      const routeMatch = this.teamContext.members.get(memberRouteKey);
      if (routeMatch) {
        if (payload?.agent_id && routeMatch.state.agentId !== payload.agent_id) {
          routeMatch.state.agentId = payload.agent_id;
        }
        return routeMatch;
      }
      if (memberRouteKey.includes('/')) {
        const synthetic = this.createSyntheticNestedMemberContext(memberRouteKey, payload);
        if (synthetic) {
          return synthetic;
        }
        return null;
      }
    }

    const agentName = payload?.agent_name;
    const agentId = payload?.agent_id;

    if (agentName) {
      const directMatch = this.teamContext.members.get(agentName);
      if (directMatch) {
        if (agentId && directMatch.state.agentId !== agentId) {
          directMatch.state.agentId = agentId;
        }
        return directMatch;
      }
    }

    if (agentId) {
      for (const [memberName, memberContext] of this.teamContext.members) {
        if (memberContext.state.agentId === agentId || memberName === agentId) {
          return memberContext;
        }
      }
    }

    return null;
  }

  private createSyntheticNestedMemberContext(
    memberRouteKey: string,
    payload: MessagePayloadMeta | null,
  ): AgentContext | null {
    if (!this.teamContext) {
      return null;
    }
    if (!memberRouteKey.includes('/')) {
      return null;
    }
    const existing = this.teamContext.members.get(memberRouteKey);
    if (existing) {
      return existing;
    }

    const routeSegments = memberRouteKey
      .split('/')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);
    if (routeSegments.length < 2) {
      return null;
    }
    const leafName = routeSegments[routeSegments.length - 1] as string;
    const parentRouteKey = routeSegments.slice(0, -1).join('/');

    const seedCandidates = [
      parentRouteKey,
      leafName,
      typeof payload?.agent_name === 'string' ? payload.agent_name : null,
    ].filter((candidate): candidate is string => !!candidate);
    let seedContext: AgentContext | null = null;
    for (const candidate of seedCandidates) {
      const candidateContext = this.teamContext.members.get(candidate);
      if (candidateContext) {
        seedContext = candidateContext;
        break;
      }
    }
    if (!seedContext) {
      return null;
    }

    const now = new Date().toISOString();
    const seedConversation = seedContext.state.conversation;
    const copiedConfig: AgentRunConfig = {
      ...seedContext.config,
      agentDefinitionName: leafName,
      isLocked: seedContext.config.isLocked ?? false,
    };
    const conversation: Conversation = {
      id: `${this.teamContext.teamId}::${memberRouteKey}`,
      messages: [],
      createdAt: seedConversation.createdAt ?? now,
      updatedAt: now,
      agentDefinitionId: seedConversation.agentDefinitionId ?? seedContext.config.agentDefinitionId,
      agentName: leafName,
    };
    const runState = new AgentRunState(payload?.agent_id ?? memberRouteKey, conversation);
    runState.currentStatus = seedContext.state.currentStatus;
    const syntheticContext = new AgentContext(copiedConfig, runState);

    this.teamContext.members.set(memberRouteKey, syntheticContext);
    return syntheticContext;
  }

  private dispatchMessage(message: ServerMessage, teamContext: AgentTeamContext): void {
    const payload = this.getPayloadMeta(message);
    if (!this.shouldApplyBySequence(payload)) {
      return;
    }

    const eventScope = this.resolveEventScope(message, payload);
    if (eventScope === 'team_scoped') {
      this.dispatchTeamScopedMessage(message, teamContext);
      return;
    }

    const memberContext = this.getMemberContext(payload);
    if (!memberContext) {
      console.warn('Member-scoped message has no resolvable member identity; dropping', {
        type: message.type,
        payload,
      });
      return;
    }

    memberContext.conversation.updatedAt = new Date().toISOString();
    this.dispatchMemberScopedMessage(message, memberContext);
  }

  private dispatchTeamScopedMessage(message: ServerMessage, teamContext: AgentTeamContext): void {
    switch (message.type) {
      case 'TEAM_STATUS':
        handleTeamStatus(message.payload, teamContext);
        break;
      case 'TASK_PLAN_EVENT':
        handleTaskPlanEvent(message.payload, teamContext);
        break;
      case 'CONNECTED':
        break;
      default:
        console.warn('Unexpected team-scoped message type:', message.type);
        break;
    }
  }

  private dispatchMemberScopedMessage(message: ServerMessage, memberContext: AgentContext): void {
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
        break;
      case 'TOOL_EXECUTION_FAILED':
        handleToolExecutionFailed(message.payload, memberContext);
        break;
      case 'TOOL_LOG':
        handleToolLog(message.payload, memberContext);
        break;
      case 'AGENT_STATUS':
        handleAgentStatus(message.payload, memberContext);
        break;
      case 'ASSISTANT_COMPLETE':
        handleAssistantComplete(message.payload, memberContext);
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
      case 'ARTIFACT_PERSISTED':
        handleArtifactPersisted(message.payload, memberContext);
        break;
      case 'ARTIFACT_UPDATED':
        handleArtifactUpdated(message.payload, memberContext);
        break;
      case 'CONNECTED':
      case 'TEAM_STATUS':
      case 'TASK_PLAN_EVENT':
        console.warn('Unexpected member-scoped message type:', message.type);
        break;
      default:
        if (!MEMBER_SCOPED_MESSAGE_TYPES.has(message.type)) {
          console.warn('Unhandled team message type:', (message as any).type);
        }
        break;
    }
  }
}
