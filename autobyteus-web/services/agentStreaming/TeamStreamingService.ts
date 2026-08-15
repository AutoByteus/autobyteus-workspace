import {
  parseTeamStreamServerMessage,
  serializeTeamStreamClientMessage,
  type TeamStreamServerMessage,
} from '@autobyteus/team-stream-contracts';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { ToolApprovalTarget } from '~/types/segments';
import { WebSocketClient, ConnectionState, type IWebSocketClient } from './transport';
import type {
  InterruptGenerationCommandAckPayload,
  InterruptCommandTransportFailure,
  PendingInterruptCommand,
} from './protocol';
import { dispatchAgentStreamMessage } from './agentStreamMessageProjector';
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport';
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth';
import { drainPendingInterruptTransportFailures, tryAdmitInterruptCommand } from './interruptCommandAdmission';
import { TeamToolApprovalTargetTracker } from './TeamToolApprovalTargetTracker';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useTokenUsageMeterStore } from '~/stores/tokenUsageMeterStore';
import {
  createTeamInterruptMessage,
  createTeamSendMessage,
  createTeamToolDecisionMessage,
} from './teamClientMessageFactory';
import { toAgentProjectionMessage } from './teamStreamDtoAdapters';

export interface TeamStreamingServiceOptions {
  wsClient?: IWebSocketClient;
  onInterruptCommandResult?: (ack: InterruptGenerationCommandAckPayload) => void;
  onInterruptCommandTransportFailure?: (failure: InterruptCommandTransportFailure) => void;
}

export interface TeamInterruptGenerationTarget { agentRunId: string }

export class TeamStreamingService {
  private readonly wsClient: IWebSocketClient;
  private readonly wsEndpoint: string;
  private readonly pendingInterruptCommands = new Map<string, PendingInterruptCommand>();
  private readonly onInterruptCommandResult: (ack: InterruptGenerationCommandAckPayload) => void;
  private readonly onInterruptCommandTransportFailure: (failure: InterruptCommandTransportFailure) => void;
  private readonly approvalTracker = new TeamToolApprovalTargetTracker();
  private teamContext: AgentTeamContext | null = null;
  private teamRunId: string | null = null;
  private connectedRootAccepted = false;
  private applicationReady = false;

  constructor(wsEndpoint: string, options: TeamStreamingServiceOptions = {}) {
    this.wsClient = options.wsClient || new WebSocketClient();
    this.wsEndpoint = wsEndpoint;
    this.onInterruptCommandResult = options.onInterruptCommandResult ?? (() => undefined);
    this.onInterruptCommandTransportFailure = options.onInterruptCommandTransportFailure ?? (() => undefined);
  }

  get connectionState(): ConnectionState { return this.wsClient.state; }
  get isReady(): boolean { return this.applicationReady; }
  attachContext(teamContext: AgentTeamContext): void { this.teamContext = teamContext; }

  connect(teamRunId: string, teamContext: AgentTeamContext): void {
    const normalized = teamRunId.trim();
    if (!normalized || normalized !== teamContext.view.getRootTeamRunId()) throw new Error('Team stream root identity mismatch.');
    this.attachContext(teamContext);
    this.teamRunId = normalized;
    this.connectedRootAccepted = false;
    this.applicationReady = false;
    this.wsClient.on('onMessage', this.handleMessage);
    this.wsClient.on('onConnect', this.handleConnect);
    this.wsClient.on('onDisconnect', this.handleDisconnect);
    this.wsClient.on('onError', this.handleError);
    this.connectTransport(normalized);
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
    this.connectedRootAccepted = false;
    this.applicationReady = false;
    this.approvalTracker.clear();
  }

  sendMessage(content: string, agentRunId: string, contextFilePaths: string[] = [], imageUrls: string[] = [], identity: { messageId?: string; dedupeKey?: string } = {}): void {
    this.requireCurrentAgentRun(agentRunId);
    const messageId = identity.messageId?.trim() || crypto.randomUUID();
    const dedupeKey = identity.dedupeKey?.trim() || messageId;
    this.wsClient.send(serializeTeamStreamClientMessage(createTeamSendMessage({ content, agentRunId, contextFilePaths, imageUrls, messageId, dedupeKey })));
  }

  approveTool(invocationId: string, target?: ToolApprovalTarget | null, reason?: string): void {
    this.sendToolDecision('APPROVE_TOOL', invocationId, target, reason);
  }

  denyTool(invocationId: string, target?: ToolApprovalTarget | null, reason?: string): void {
    this.sendToolDecision('DENY_TOOL', invocationId, target, reason);
  }

  private sendToolDecision(decision: 'APPROVE_TOOL' | 'DENY_TOOL', invocationId: string, target?: ToolApprovalTarget | null, reason?: string): void {
    const resolved = this.approvalTracker.resolveTarget(invocationId, target);
    if (!resolved) throw new Error(`No exact AgentRun target is registered for tool invocation '${invocationId}'.`);
    this.requireCurrentAgentRun(resolved.agentRunId);
    this.wsClient.send(serializeTeamStreamClientMessage(createTeamToolDecisionMessage({ decision, invocationId, agentRunId: resolved.agentRunId, reason })));
    this.approvalTracker.complete(invocationId);
  }

  interruptGeneration(commandId: string, target: TeamInterruptGenerationTarget): boolean {
    const normalizedCommandId = commandId.trim();
    const agentRunId = this.requireCurrentAgentRun(target.agentRunId);
    const rootTeamRunId = this.teamContext!.view.getRootTeamRunId();
    const entry: PendingInterruptCommand = {
      commandId: normalizedCommandId,
      target: { target_kind: 'team_member', team_run_id: rootTeamRunId, agent_run_id: agentRunId },
    };
    return tryAdmitInterruptCommand({
      pending: this.pendingInterruptCommands,
      entry,
      getConnectionState: () => this.wsClient.state,
      send: () => this.wsClient.send(serializeTeamStreamClientMessage(createTeamInterruptMessage({ commandId: normalizedCommandId, agentRunId }))),
      onTransportFailure: this.onInterruptCommandTransportFailure,
    });
  }

  private connectTransport(teamRunId: string): void {
    const baseUrl = `${this.wsEndpoint}/${teamRunId}`;
    const credential = getActiveRemoteAccessCredential();
    this.wsClient.connect(credential ? buildAuthenticatedWebSocketUrl(baseUrl, credential) : baseUrl);
  }

  private requireCurrentAgentRun(value: string): string {
    const agentRunId = value.trim();
    if (!agentRunId || !this.teamContext?.view.hasAgentRun(agentRunId)) {
      throw new Error(`AgentRun '${agentRunId}' is not part of the current Team execution.`);
    }
    return agentRunId;
  }

  private handleMessage = (raw: string): void => {
    if (!this.teamContext || !this.teamRunId) return;
    try { this.dispatchMessage(parseTeamStreamServerMessage(raw), this.teamContext); }
    catch (error) { console.error('Rejected invalid Team WebSocket message:', error); }
  };

  private handleConnect = (): void => { console.log('Team WebSocket transport connected'); };
  private handleDisconnect = (reason?: string): void => {
    this.connectedRootAccepted = false;
    this.applicationReady = false;
    this.drainPendingInterruptCommands(reason || 'Interrupt result was lost because the stream disconnected.');
  };
  private handleError = (error: Error): void => { console.error('Team WebSocket error:', error); };

  private handleInterruptAck(message: Extract<TeamStreamServerMessage, { type: 'AGENT_COMMAND_ACK' }>): void {
    const pending = this.pendingInterruptCommands.get(message.payload.command_id);
    if (!pending || pending.target.target_kind !== 'team_member'
      || pending.target.agent_run_id !== message.payload.agent_run_id) return;
    this.pendingInterruptCommands.delete(message.payload.command_id);
    const target = pending.target;
    this.onInterruptCommandResult(message.payload.state === 'accepted'
      ? { command_type: 'INTERRUPT_GENERATION', command_id: message.payload.command_id, state: 'accepted', target }
      : { command_type: 'INTERRUPT_GENERATION', command_id: message.payload.command_id, state: message.payload.state, code: message.payload.code, message: message.payload.message, target });
  }

  private dispatchMessage(message: TeamStreamServerMessage, context: AgentTeamContext): void {
    if (message.type === 'CONNECTED') {
      if (message.payload.root_team_run_id !== context.view.getRootTeamRunId()) throw new Error('Connected Team stream root mismatch.');
      this.connectedRootAccepted = true;
      this.applicationReady = false;
      return;
    }
    if (message.type === 'TEAM_RUN_LIFECYCLE') {
      const result = context.view.setRootTeamActive(message.payload.is_active);
      if (result.disposition === 'applied') useRunHistoryStore().applyRunNavigationEffect({
        kind: 'team_run', teamRunId: context.view.getRootTeamRunId(), isActive: message.payload.is_active,
      }, { kind: 'PRESENTATION' });
      return;
    }
    if (message.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT') {
      if (!this.connectedRootAccepted) throw new Error('Team snapshot arrived before the exact connected root was admitted.');
      const result = context.view.applySnapshot(message);
      if (result.disposition === 'rejected') throw new Error(`${result.code}: ${result.message}`);
      this.applicationReady = true;
      return;
    }
    if (message.type === 'AGENT_COMMAND_ACK') {
      this.handleInterruptAck(message);
      return;
    }
    const result = context.view.applyMessage(message);
    if (result.disposition === 'rejected') {
      console.warn(`Rejected Team execution message (${result.code}): ${result.message}`);
      return;
    }
    for (const effect of result.effects) {
      if (effect.kind === 'snapshot_refresh_required') {
        this.applicationReady = false;
        this.connectedRootAccepted = false;
        this.wsClient.disconnect();
        this.connectTransport(context.view.getRootTeamRunId());
      } else if (effect.kind === 'record_team_token_usage') {
        useTokenUsageMeterStore().applyTeamTokenUsage(context.view.getRootTeamRunId(), effect.agentRunId, effect.details);
      } else if (effect.kind === 'dispatch_agent') {
        const agentContext = context.view.getAgentContext(effect.agentRunId);
        if (!agentContext) continue;
        this.approvalTracker.track(effect.message);
        dispatchAgentStreamMessage(toAgentProjectionMessage(effect.message, effect.agentRunId), {
          kind: 'team_member',
          context: agentContext,
          teamRunId: context.view.getRootTeamRunId(),
          agentRunId: effect.agentRunId,
          memberAddress: context.view.getMemberAddress(effect.agentRunId)!,
        });
      }
    }
  }

  private drainPendingInterruptCommands(message: string): void {
    drainPendingInterruptTransportFailures({
      pending: this.pendingInterruptCommands,
      reason: { code: 'INTERRUPT_TRANSPORT_DISCONNECTED', connectionState: this.wsClient.state, message },
      onTransportFailure: this.onInterruptCommandTransportFailure,
    });
  }
}
