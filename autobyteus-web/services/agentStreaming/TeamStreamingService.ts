import {
  parseTeamStreamServerMessage,
  serializeTeamStreamClientMessage,
  type TeamStreamServerMessage,
} from '@autobyteus/team-stream-contracts';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { ToolApprovalTarget } from '~/types/segments';
import { WebSocketClient, ConnectionState, type IWebSocketClient } from './transport';
import type { InterruptOutcome, PendingInterruptCommand } from './protocol';
import { dispatchAgentStreamMessage } from './agentStreamMessageProjector';
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport';
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth';
import {
  admitInterruptCommand,
  INTERRUPT_NOT_SENT,
  holdPendingInterrupts,
  settlePendingInterruptAck,
} from './interruptCommandAdmission';
import { HeldUntilRebind } from './heldUntilRebind';
import { TeamToolApprovalTargetTracker } from './TeamToolApprovalTargetTracker';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTokenUsageMeterStore } from '~/stores/tokenUsageMeterStore';
import {
  createTeamInterruptMessage,
  createTeamSendMessage,
  createTeamToolDecisionMessage,
} from './teamClientMessageFactory';
import { toAgentProjectionMessage } from './teamStreamDtoAdapters';
import type { CollaboratorMentionDto } from '~/utils/collaborators/collaboratorMentionText';
import type { TeamExecutionEffect } from '~/services/teamExecution/teamExecutionViewModels';
import { useRunTreeStore } from '~/stores/runTreeStore';
import { useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages';
import { treeRowOfAgent } from '~/utils/runTree/runTreeAgents';
import {
  beginTeamMemberGeneration,
  invalidateTeamMemberProjection,
} from '~/services/runHydration/teamMemberProjectionHydrationService';
import { createRandomId } from '~/utils/randomId';
import { LiveStreamReconnectScheduler } from '~/services/liveStreamLifecycle/liveStreamReconnectScheduler';
import { TeamSendAdmissions } from './teamSendAdmission';

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
  /** Required: a failed stream never reconnects, so its owner must hear of it (autobyteus-541 D-A1). */
  onStreamRecoveryRequired: (notice: TeamStreamRecoveryNotice) => void;
}

export interface TeamInterruptGenerationTarget { agentRunId: string }

export class TeamStreamingService {
  private readonly wsClient: IWebSocketClient;
  private readonly wsEndpoint: string;
  private readonly pendingInterruptCommands = new Map<string, PendingInterruptCommand>();
  /** Stops lost with a connection this service recovers: settled once the snapshot that makes it ready is applied. */
  private readonly interruptsAwaitingRebind = new HeldUntilRebind();
  private readonly teamSends = new TeamSendAdmissions();
  private readonly onStreamRecoveryRequired: (notice: TeamStreamRecoveryNotice) => void;
  private readonly approvalTracker = new TeamToolApprovalTargetTracker();
  private teamContext: AgentTeamContext | null = null;
  private teamRunId: string | null = null;
  private phase: TeamStreamSyncPhase = 'disconnected';
  private expectedBaseChangeSequence: number | null = null;
  /** The live sequence of the snapshot this stream applies events after (autobyteus-358, SR-005). */
  private liveSequenceId: string | null = null;
  private candidateReadiness: {
    resolve(): void;
    reject(error: Error): void;
  } | null = null;
  private listenersBound = false;
  /** When this stream tries again (autobyteus-434); its success point is the accepted snapshot. */
  private readonly reconnect = new LiveStreamReconnectScheduler({
    attempt: () => this.attemptReconnect(),
    resynchronize: () => this.restartTransport(),
  });

  constructor(wsEndpoint: string, options: TeamStreamingServiceOptions) {
    this.wsClient = options.wsClient || new WebSocketClient();
    this.wsEndpoint = wsEndpoint;
    this.onStreamRecoveryRequired = options.onStreamRecoveryRequired;
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
    this.reconnect.startOver();
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
    if (this.teamContext) useRunTreeStore().streamEnded(this.treeRefOf(this.teamContext));
    this.rejectCandidate(new Error('Candidate Team stream was disposed before readiness.'));
    this.settleInterruptsNow();
    this.teamSends.drain('Team message admission was interrupted because the stream disconnected.');
    this.reconnect.dispose();
    this.unbindListeners();
    this.wsClient.disconnect();
    this.teamContext = null;
    this.teamRunId = null;
    this.phase = 'disconnected';
    this.expectedBaseChangeSequence = null;
    this.approvalTracker.clear();
  }

  sendMessage(content: string, agentRunId: string, contextFilePaths: string[] = [], imageUrls: string[] = [], identity: { messageId?: string; dedupeKey?: string; mentions?: readonly CollaboratorMentionDto[] } = {}): Promise<void> {
    const currentAgentRunId = this.requireCurrentAgentRun(agentRunId);
    const messageId = identity.messageId?.trim() || createRandomId();
    const dedupeKey = identity.dedupeKey?.trim() || messageId;
    const sendIdentity = { agentRunId: currentAgentRunId, messageId, dedupeKey };
    const admission = this.teamSends.begin(sendIdentity, content);
    if (!admission.isNew) return admission.promise;
    try {
      this.wsClient.send(serializeTeamStreamClientMessage(createTeamSendMessage({ content, agentRunId: currentAgentRunId, contextFilePaths, imageUrls, messageId, dedupeKey, mentions: identity.mentions })));
    } catch (error) {
      this.teamSends.fail(sendIdentity, error);
    }
    return admission.promise;
  }

  approveTool(invocationId: string, target?: ToolApprovalTarget | null, reason?: string): void {
    this.sendToolDecision('APPROVE_TOOL', invocationId, target, reason);
  }

  denyTool(invocationId: string, target?: ToolApprovalTarget | null, reason?: string): void {
    this.sendToolDecision('DENY_TOOL', invocationId, target, reason);
  }

  /** Stops a member's generation; resolves with the Stop's outcome (`not_sent` while the stream is not ready). */
  interruptGeneration(commandId: string, target: TeamInterruptGenerationTarget): Promise<InterruptOutcome> {
    if (!this.isReady) {
      console.warn(`Stop was not sent: the Team stream is ${this.phase}.`);
      return Promise.resolve(INTERRUPT_NOT_SENT);
    }
    const normalizedCommandId = commandId.trim();
    const agentRunId = this.requireCurrentAgentRun(target.agentRunId);
    return admitInterruptCommand({
      pending: this.pendingInterruptCommands,
      commandId: normalizedCommandId,
      target: { target_kind: 'team_member', team_run_id: this.teamContext!.view.getRootTeamRunId(), agent_run_id: agentRunId },
      getConnectionState: () => this.wsClient.state,
      send: () => this.wsClient.send(serializeTeamStreamClientMessage(createTeamInterruptMessage({ commandId: normalizedCommandId, agentRunId }))),
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
    this.liveSequenceId = null;
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

  /** The scheduler's attempt: reconnect the transport; `CONNECTED` and the snapshot catch up (phase from `disconnected`). */
  private attemptReconnect(): void {
    if (!this.teamRunId || !this.teamContext || this.isReopenRequired) this.reconnect.startOver();
    else this.connectTransport(this.teamRunId);
  }

  /** Re-synchronize a stream that looks open: a quiet close with the loss bookkeeping, then an attempt at once. */
  private restartTransport(): void {
    this.wsClient.disconnect();
    this.markTransportLost('Team stream is re-synchronizing.');
    this.reconnect.attemptNow();
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

  private handleDisconnect = (reason: string | undefined, retryable: boolean): void => {
    const candidate = this.candidateReadiness !== null;
    if (candidate) this.failCandidate(new Error(reason || 'Candidate Team stream disconnected before readiness.'));
    this.markTransportLost(reason);
    // No recovery follows: Stops lost with the connection end now (autobyteus-533 D-W7).
    if (candidate || this.isReopenRequired || !retryable) this.interruptsAwaitingRebind.settle();
    if (candidate || this.isReopenRequired) return;
    if (retryable) this.reconnect.connectionLost();
    else this.reconnect.startOver();
  };

  private treeRefOf(context: AgentTeamContext) { return { kind: 'agent_team' as const, runId: context.view.getRootTeamRunId() }; }

  private markTransportLost(reason: string | undefined): void {
    // Meanwhile the Team's tree is read, as a listed run's is (SR-084).
    if (this.teamContext) useRunTreeStore().streamEnded(this.treeRefOf(this.teamContext));
    if (!this.isReopenRequired) this.phase = 'disconnected';
    // Their answers are gone with the socket: held until the snapshot of the next connection (or a final close).
    holdPendingInterrupts(this.interruptsAwaitingRebind, this.pendingInterruptCommands);
    this.teamSends.drain(reason || 'Team message admission was lost because the stream disconnected.');
  }

  private handleError = (error: Error): void => {
    if (this.candidateReadiness) this.failCandidate(error);
    console.error('Team WebSocket error:', error);
  };

  private handleInterruptAck(message: Extract<TeamStreamServerMessage, { type: 'AGENT_COMMAND_ACK' }>): void {
    const ack = message.payload;
    settlePendingInterruptAck(this.pendingInterruptCommands, {
      commandId: ack.command_id,
      target: { target_kind: 'team_member', team_run_id: this.teamContext!.view.getRootTeamRunId(), agent_run_id: ack.agent_run_id },
      accepted: ack.state === 'accepted',
      detail: ack.state === 'accepted' ? '' : `[${ack.code}] ${ack.message}`,
    });
  }

  private dispatchMessage(message: TeamStreamServerMessage, context: AgentTeamContext): void {
    if (message.type === 'CONNECTED') {
      if (this.phase !== 'awaiting_connected_root') throw new Error(`Team CONNECTED message is invalid during '${this.phase}'.`);
      if (message.payload.root_team_run_id !== context.view.getRootTeamRunId()) throw new Error('Connected Team stream root mismatch.');
      this.phase = 'awaiting_snapshot';
      return;
    }
    if (message.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT') {
      // After the barrier a snapshot is in-band: the Team started or stopped, a new sequence base (autobyteus-461 SR-046).
      if (this.phase !== 'awaiting_snapshot' && this.phase !== 'ready') throw new Error(`Team snapshot is invalid during '${this.phase}'.`);
      if (this.expectedBaseChangeSequence !== null
        && message.payload.base_change_sequence !== this.expectedBaseChangeSequence) {
        throw new Error(`TEAM_STREAM_SNAPSHOT_BASE_MISMATCH: Expected ${this.expectedBaseChangeSequence}, received ${message.payload.base_change_sequence}.`);
      }
      const result = context.view.applySnapshot(message);
      if (result.disposition === 'rejected') throw new Error(`${result.code}: ${result.message}`);
      this.liveSequenceId = message.payload.live_sequence_id;
      this.applyEffects(result.effects, context);
      this.phase = 'ready';
      this.expectedBaseChangeSequence = null;
      this.reconnect.connected();
      this.resolveCandidate();
      // The rebind's statuses are on the view: Stops lost with the old connection end, and the status decides.
      this.interruptsAwaitingRebind.settle();
      return;
    }
    if (message.type === 'RUN_TREE_SNAPSHOT') {
      // The Team's tree at the view's base (SR-084), after each snapshot; its changes follow as numbered messages.
      if (this.phase !== 'ready' || message.payload.base_change_sequence !== context.view.getChangeSequence()) {
        throw new Error(`Team run tree snapshot is not at the view's base (during '${this.phase}').`);
      }
      useRunTreeStore().streamSnapshot(this.treeRefOf(context), message.payload.rows);
      return;
    }
    if (message.type === 'TEAM_RUN_LIFECYCLE') {
      if (this.phase !== 'ready') throw new Error(`Team lifecycle message is invalid during '${this.phase}'.`);
      const result = context.view.setRootTeamActive(message.payload.is_active);
      if (result.disposition === 'applied') {
        const history = useRunHistoryStore();
        history.applyRunNavigationEffect({
          kind: 'team_run', teamRunId: context.view.getRootTeamRunId(), isActive: message.payload.is_active,
        }, { kind: 'PRESENTATION' });
        history.refreshRunNavigationTopology('team-stream-lifecycle');
      }
      return;
    }
    if (message.type === 'AGENT_COMMAND_ACK') {
      if (this.phase !== 'ready') throw new Error(`Team command acknowledgement is invalid during '${this.phase}'.`);
      this.handleInterruptAck(message);
      return;
    }
    if (message.type === 'ERROR' && this.teamSends.reject(message)) return;
    if (this.phase !== 'ready') throw new Error(`Team execution message '${message.type}' is invalid during '${this.phase}'.`);
    const result = context.view.applyMessage(message);
    this.applyEffects(result.effects, context);
    if (result.disposition === 'applied') {
      // The Team tab's lists are consistent through every applied event (SR-004).
      useCollaborationParticipantMessagesStore().advance('agent_team', context.view.getRootTeamRunId(), this.liveSequenceId, context.view.getChangeSequence());
    }
    if (result.disposition === 'applied' && message.type === 'MEMBER_INPUT_MESSAGE') {
      this.teamSends.resolve(message);
    }
    if (result.disposition === 'rejected') {
      console.warn(`Rejected Team execution message (${result.code}): ${result.message}`);
    }
  }

  private applyEffects(effects: readonly TeamExecutionEffect[], context: AgentTeamContext): void {
    for (const effect of effects) {
      if (effect.kind === 'team_stream_recovery_required') {
        this.enterReopenRequired(true);
      } else if (effect.kind === 'invalidate_team_member_projections') {
        // A fresh snapshot rebuilt the view: a new member-loader generation (autobyteus-358).
        beginTeamMemberGeneration(context);
      } else if (effect.kind === 'append_collaboration_message') {
        useCollaborationParticipantMessagesStore().append('agent_team', context.view.getRootTeamRunId(), effect.message);
      } else if (effect.kind === 'reload_collaboration_messages') {
        useCollaborationParticipantMessagesStore().reloadRoot('agent_team', context.view.getRootTeamRunId(), effect.rebuild,
          (agentRunId) => context.view.getMemberAddress(agentRunId) !== null);
      } else if (effect.kind === 'adopt_collaboration_messages') {
        useCollaborationParticipantMessagesStore().adoptRoot('agent_team', context.view.getRootTeamRunId(), effect.rebuild);
      } else if (effect.kind === 'invalidate_team_member_projection') {
        effect.agentRunIds.forEach((agentRunId) => {
          invalidateTeamMemberProjection(context, agentRunId);
        });
      } else if (effect.kind === 'reconcile_team_navigation') {
        if (this.isMountedContext(context)) {
          useRunHistoryStore().refreshRunNavigationTopology('team-stream-structure');
        }
      } else if (effect.kind === 'reconcile_focused_team_member_projection') {
        if (this.isMountedContext(context)) {
          void useRunHistoryStore().reconcileFocusedTeamMemberProjection(
            context.view.getRootTeamRunId(),
            context.view.getFocusedAgentRunId(),
          );
        }
      } else if (effect.kind === 'apply_run_tree_change') {
        const ref = this.treeRefOf(context);
        useRunTreeStore().streamChange(ref, effect.change);
        // Its Team tab still names an agent that left the tree (its Task closed): from the server's answer.
        if (effect.change.removed.length) {
          useCollaborationParticipantMessagesStore().reloadNamingUnknown('agent_team', context.view.getRootTeamRunId(), (agentRunId) =>
            context.view.getMemberAddress(agentRunId) !== null || treeRowOfAgent(useRunTreeStore().rowsOf(ref), agentRunId) !== null);
        }
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

  private isMountedContext(context: AgentTeamContext): boolean {
    return useAgentTeamContextsStore().getTeamContextById(context.view.getRootTeamRunId()) === context;
  }

  private enterReopenRequired(notify: boolean): void {
    if (this.isReopenRequired) return;
    this.phase = 'reopen_required';
    this.expectedBaseChangeSequence = null;
    this.rejectCandidate(new Error('Candidate Team stream requires a new recovery attempt.'));
    // This service never reconnects (the store replaces it): its Stops end now.
    this.settleInterruptsNow();
    this.teamSends.drain('Team message admission was cancelled because Team stream recovery is required.');
    this.approvalTracker.clear();
    this.reconnect.startOver();
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

  /** The stream is closed for good: every waiting or held Stop settles as `connection_lost` now. */
  private settleInterruptsNow(): void {
    holdPendingInterrupts(this.interruptsAwaitingRebind, this.pendingInterruptCommands);
    this.interruptsAwaitingRebind.settle();
  }
}
