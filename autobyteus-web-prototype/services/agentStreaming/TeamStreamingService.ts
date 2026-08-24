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
import type { TeamExecutionEffect } from '~/services/teamExecution/teamExecutionViewModels';

export type TeamStreamSyncPhase =
  | 'disconnected'
  | 'awaiting_connected_root'
  | 'awaiting_snapshot'
  | 'ready'
  | 'reopen_required';

export type TeamStreamRecoveryNotice = Readonly<{
  kind: 'team_stream_recovery_required';
  rootTeamRunId: string;
}>;

export interface TeamStreamingServiceOptions {
  wsClient?: IWebSocketClient;
  onInterruptCommandResult?: (ack: InterruptGenerationCommandAckPayload) => void;
  onInterruptCommandTransportFailure?: (failure: InterruptCommandTransportFailure) => void;
  onStreamRecoveryRequired?: (notice: TeamStreamRecoveryNotice) => void;
}

export interface TeamInterruptGenerationTarget { agentRunId: string }

export class TeamStreamingService {
  private readonly wsClient: IWebSocketClient;
  private readonly wsEndpoint: string;
  private readonly pendingInterruptCommands = new Map<string, PendingInterruptCommand>();
  private readonly onInterruptCommandResult: (ack: InterruptGenerationCommandAckPayload) => void;
  private readonly onInterruptCommandTransportFailure: (failure: InterruptCommandTransportFailure) => void;
  private readonly onStreamRecoveryRequired: (notice: TeamStreamRecoveryNotice) => void;
  private readonly approvalTracker = new TeamToolApprovalTargetTracker();
  private teamContext: AgentTeamContext | null = null;
  private teamRunId: string | null = null;
  private phase: TeamStreamSyncPhase = 'disconnected';
  private expectedBaseChangeSequence: number | null = null;
  private candidateReadiness: {
    resolve(): void;
    reject(error: Error): void;
  } | null = null;
  private listenersBound = false;

  constructor(wsEndpoint: string, options: TeamStreamingServiceOptions = {}) {
    this.wsClient = options.wsClient || new WebSocketClient();
    this.wsEndpoint = wsEndpoint;
    this.onInterruptCommandResult = options.onInterruptCommandResult ?? (() => undefined);
    this.onInterruptCommandTransportFailure = options.onInterruptCommandTransportFailure ?? (() => undefined);
    this.onStreamRecoveryRequired = options.onStreamRecoveryRequired ?? (() => undefined);
  }

  get connectionState(): ConnectionState { return this.wsClient.state; }
  get isReady(): boolean { return this.phase === 'ready'; }
  get isReopenRequired(): boolean { return this.phase === 'reopen_required'; }
  get synchronizationPhase(): TeamStreamSyncPhase { return this.phase; }

  attachContext(teamContext: AgentTeamContext): void {
    if (this.isReopenRequired) throw new Error('TEAM_STREAM_REOPEN_REQUIRED: The failed Team stream cannot be reused.');
    this.teamContext = teamContext;
  }

  connect(teamRunId: string, teamContext: AgentTeamContext): void {
    if (this.isReopenRequired) throw new Error('TEAM_STREAM_REOPEN_REQUIRED: The failed Team stream cannot reconnect.');
    this.prepareConnection(teamRunId, teamContext, null);
    this.connectTransport(teamRunId);
  }

  connectCandidate(
    teamRunId: string,
    teamContext: AgentTeamContext,
    expectedBaseChangeSequence: number,
  ): Promise<void> {
    if (!Number.isInteger(expectedBaseChangeSequence) || expectedBaseChangeSequence < 0) {
      return Promise.reject(new Error('Candidate Team stream requires a non-negative expected base change sequence.'));
    }
    if (this.phase !== 'disconnected') {
      return Promise.reject(new Error('Candidate Team stream must start from a disconnected service.'));
    }
    this.prepareConnection(teamRunId, teamContext, expectedBaseChangeSequence);
    const readiness = new Promise<void>((resolve, reject) => {
      this.candidateReadiness = { resolve, reject };
    });
    this.connectTransport(teamRunId);
    return readiness;
  }

  disconnect(): void {
    this.rejectCandidate(new Error('Candidate Team stream was disposed before readiness.'));
    this.drainPendingInterruptCommands('Interrupt was cancelled because the stream disconnected.');
    this.unbindListeners();
    this.wsClient.disconnect();
    this.teamContext = null;
    this.teamRunId = null;
    this.phase = 'disconnected';
    this.expectedBaseChangeSequence = null;
    this.approvalTracker.clear();
  }

  sendMessage(content: string, agentRunId: string, contextFilePaths: string[] = [], imageUrls: string[] = [], identity: { messageId?: string; dedupeKey?: string } = {}): void {
    const currentAgentRunId = this.requireCurrentAgentRun(agentRunId);
    const messageId = identity.messageId?.trim() || crypto.randomUUID();
    const dedupeKey = identity.dedupeKey?.trim() || messageId;
    this.wsClient.send(serializeTeamStreamClientMessage(createTeamSendMessage({ content, agentRunId: currentAgentRunId, contextFilePaths, imageUrls, messageId, dedupeKey })));
  }

  approveTool(invocationId: string, target?: ToolApprovalTarget | null, reason?: string): void {
    this.sendToolDecision('APPROVE_TOOL', invocationId, target, reason);
  }

  denyTool(invocationId: string, target?: ToolApprovalTarget | null, reason?: string): void {
    this.sendToolDecision('DENY_TOOL', invocationId, target, reason);
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

  private prepareConnection(
    teamRunId: string,
    teamContext: AgentTeamContext,
    expectedBaseChangeSequence: number | null,
  ): void {
    const normalized = teamRunId.trim();
    if (!normalized || normalized !== teamContext.view.getRootTeamRunId()) throw new Error('Team stream root identity mismatch.');
    this.teamContext = teamContext;
    this.teamRunId = normalized;
    this.expectedBaseChangeSequence = expectedBaseChangeSequence;
    this.phase = 'awaiting_connected_root';
    this.bindListeners();
  }

  private sendToolDecision(decision: 'APPROVE_TOOL' | 'DENY_TOOL', invocationId: string, target?: ToolApprovalTarget | null, reason?: string): void {
    const resolved = this.approvalTracker.resolveTarget(invocationId, target);
    if (!resolved) throw new Error(`No exact AgentRun target is registered for tool invocation '${invocationId}'.`);
    this.requireCurrentAgentRun(resolved.agentRunId);
    this.wsClient.send(serializeTeamStreamClientMessage(createTeamToolDecisionMessage({ decision, invocationId, agentRunId: resolved.agentRunId, reason })));
    this.approvalTracker.complete(invocationId);
  }

  private connectTransport(teamRunId: string): void {
    const baseUrl = `${this.wsEndpoint}/${teamRunId}`;
    const credential = getActiveRemoteAccessCredential();
    this.wsClient.connect(credential ? buildAuthenticatedWebSocketUrl(baseUrl, credential) : baseUrl);
  }

  private bindListeners(): void {
    if (this.listenersBound) return;
    this.wsClient.on('onMessage', this.handleMessage);
    this.wsClient.on('onConnect', this.handleConnect);
    this.wsClient.on('onDisconnect', this.handleDisconnect);
    this.wsClient.on('onError', this.handleError);
    this.listenersBound = true;
  }

  private unbindListeners(): void {
    if (!this.listenersBound) return;
    this.wsClient.off('onMessage', this.handleMessage);
    this.wsClient.off('onConnect', this.handleConnect);
    this.wsClient.off('onDisconnect', this.handleDisconnect);
    this.wsClient.off('onError', this.handleError);
    this.listenersBound = false;
  }

  private requireCurrentAgentRun(value: string): string {
    if (!this.isReady) throw new Error('TEAM_STREAM_NOT_READY: The Team stream is not ready for commands.');
    const agentRunId = value.trim();
    if (!agentRunId || !this.teamContext?.view.hasAgentRun(agentRunId)) {
      throw new Error(`AgentRun '${agentRunId}' is not part of the current Team execution.`);
    }
    return agentRunId;
  }

  private handleMessage = (raw: string): void => {
    if (!this.teamContext || !this.teamRunId || this.isReopenRequired) return;
    try { this.dispatchMessage(parseTeamStreamServerMessage(raw), this.teamContext); }
    catch (error) {
      if (this.candidateReadiness) this.failCandidate(error);
      console.error('Rejected invalid Team WebSocket message:', error);
    }
  };

  private handleConnect = (): void => {
    if (this.phase === 'disconnected' && this.teamRunId) this.phase = 'awaiting_connected_root';
    console.log('Team WebSocket transport connected');
  };

  private handleDisconnect = (reason?: string): void => {
    if (this.candidateReadiness) this.failCandidate(new Error(reason || 'Candidate Team stream disconnected before readiness.'));
    else if (!this.isReopenRequired) this.phase = 'disconnected';
    this.drainPendingInterruptCommands(reason || 'Interrupt result was lost because the stream disconnected.');
  };

  private handleError = (error: Error): void => {
    if (this.candidateReadiness) this.failCandidate(error);
    console.error('Team WebSocket error:', error);
  };

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
      if (this.phase !== 'awaiting_connected_root') throw new Error(`Team CONNECTED message is invalid during '${this.phase}'.`);
      if (message.payload.root_team_run_id !== context.view.getRootTeamRunId()) throw new Error('Connected Team stream root mismatch.');
      this.phase = 'awaiting_snapshot';
      return;
    }
    if (message.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT') {
      if (this.phase !== 'awaiting_snapshot') throw new Error(`Team snapshot is invalid during '${this.phase}'.`);
      if (this.expectedBaseChangeSequence !== null
        && message.payload.base_change_sequence !== this.expectedBaseChangeSequence) {
        throw new Error(`TEAM_STREAM_SNAPSHOT_BASE_MISMATCH: Expected ${this.expectedBaseChangeSequence}, received ${message.payload.base_change_sequence}.`);
      }
      const result = context.view.applySnapshot(message);
      if (result.disposition === 'rejected') throw new Error(`${result.code}: ${result.message}`);
      this.phase = 'ready';
      this.expectedBaseChangeSequence = null;
      this.resolveCandidate();
      return;
    }
    if (message.type === 'TEAM_RUN_LIFECYCLE') {
      if (this.phase !== 'ready') throw new Error(`Team lifecycle message is invalid during '${this.phase}'.`);
      const result = context.view.setRootTeamActive(message.payload.is_active);
      if (result.disposition === 'applied') useRunHistoryStore().applyRunNavigationEffect({
        kind: 'team_run', teamRunId: context.view.getRootTeamRunId(), isActive: message.payload.is_active,
      }, { kind: 'PRESENTATION' });
      return;
    }
    if (message.type === 'AGENT_COMMAND_ACK') {
      if (this.phase !== 'ready') throw new Error(`Team command acknowledgement is invalid during '${this.phase}'.`);
      this.handleInterruptAck(message);
      return;
    }
    if (this.phase !== 'ready') throw new Error(`Team execution message '${message.type}' is invalid during '${this.phase}'.`);
    const result = context.view.applyMessage(message);
    this.applyEffects(result.effects, context);
    if (result.disposition === 'rejected') {
      console.warn(`Rejected Team execution message (${result.code}): ${result.message}`);
    }
  }

  private applyEffects(effects: readonly TeamExecutionEffect[], context: AgentTeamContext): void {
    for (const effect of effects) {
      if (effect.kind === 'team_stream_recovery_required') {
        this.enterReopenRequired(true);
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

  private enterReopenRequired(notify: boolean): void {
    if (this.isReopenRequired) return;
    this.phase = 'reopen_required';
    this.expectedBaseChangeSequence = null;
    this.rejectCandidate(new Error('Candidate Team stream requires a new recovery attempt.'));
    this.drainPendingInterruptCommands('Interrupt was cancelled because Team stream recovery is required.');
    this.approvalTracker.clear();
    this.wsClient.disconnect();
    if (notify && this.teamRunId) {
      this.onStreamRecoveryRequired(Object.freeze({
        kind: 'team_stream_recovery_required',
        rootTeamRunId: this.teamRunId,
      }));
    }
  }

  private failCandidate(error: unknown): void {
    const failure = error instanceof Error ? error : new Error(String(error));
    this.phase = 'reopen_required';
    this.expectedBaseChangeSequence = null;
    this.rejectCandidate(failure);
    this.wsClient.disconnect();
  }

  private resolveCandidate(): void {
    const readiness = this.candidateReadiness;
    this.candidateReadiness = null;
    readiness?.resolve();
  }

  private rejectCandidate(error: Error): void {
    const readiness = this.candidateReadiness;
    this.candidateReadiness = null;
    readiness?.reject(error);
  }

  private drainPendingInterruptCommands(message: string): void {
    drainPendingInterruptTransportFailures({
      pending: this.pendingInterruptCommands,
      reason: { code: 'INTERRUPT_TRANSPORT_DISCONNECTED', connectionState: this.wsClient.state, message },
      onTransportFailure: this.onInterruptCommandTransportFailure,
    });
  }
}
