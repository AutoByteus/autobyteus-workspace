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
import { handleTeamCommunicationMessage } from './handlers';
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport';
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth';
import { getApolloClient } from '~/utils/apolloClient';
import { scheduleTaskDelegationRecordsRefresh } from '~/services/runHydration/taskDelegationHydrationService';
import { mapCompleteTeamTaskProjectionSnapshot } from '~/services/teamExecution/teamTaskProjectionMapper';
import {
  createTeamExecutionAddress,
  sameTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import { drainPendingInterruptTransportFailures, tryAdmitInterruptCommand } from './interruptCommandAdmission';
import { TeamToolApprovalTargetTracker } from './TeamToolApprovalTargetTracker';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useTokenUsageMeterStore } from '~/stores/tokenUsageMeterStore';
import {
  createTeamInterruptMessage,
  createTeamSendMessage,
  createTeamToolDecisionMessage,
} from './teamClientMessageFactory';
import {
  fromTeamExecutionAddressDto,
  toAgentProjectionMessage,
  toTeamCommunicationProjectionPayload,
} from './teamStreamDtoAdapters';

export interface TeamStreamingServiceOptions {
  wsClient?: IWebSocketClient;
  onInterruptCommandResult?: (ack: InterruptGenerationCommandAckPayload) => void;
  onInterruptCommandTransportFailure?: (failure: InterruptCommandTransportFailure) => void;
}

export interface TeamInterruptGenerationTarget { executionAddress: TeamExecutionAddress }

export class TeamStreamingService {
  private readonly wsClient: IWebSocketClient;
  private readonly wsEndpoint: string;
  private readonly pendingInterruptCommands = new Map<string, PendingInterruptCommand>();
  private readonly onInterruptCommandResult: (ack: InterruptGenerationCommandAckPayload) => void;
  private readonly onInterruptCommandTransportFailure: (failure: InterruptCommandTransportFailure) => void;
  private readonly approvalTracker = new TeamToolApprovalTargetTracker();
  private teamContext: AgentTeamContext | null = null;
  private teamRunId: string | null = null;
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
    if (!normalized || normalized !== teamContext.executions.getRootTeamRunId()) throw new Error('Team stream root identity mismatch.');
    this.attachContext(teamContext);
    this.teamRunId = normalized;
    this.applicationReady = false;
    this.wsClient.on('onMessage', this.handleMessage);
    this.wsClient.on('onConnect', this.handleConnect);
    this.wsClient.on('onDisconnect', this.handleDisconnect);
    this.wsClient.on('onError', this.handleError);
    const baseUrl = `${this.wsEndpoint}/${normalized}`;
    const credential = getActiveRemoteAccessCredential();
    this.wsClient.connect(credential ? buildAuthenticatedWebSocketUrl(baseUrl, credential) : baseUrl);
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
    this.applicationReady = false;
    this.approvalTracker.clear();
  }

  sendMessage(content: string, executionAddress: TeamExecutionAddress, contextFilePaths: string[] = [], imageUrls: string[] = [], identity: { messageId?: string; dedupeKey?: string } = {}): void {
    const messageId = identity.messageId?.trim() || crypto.randomUUID();
    const dedupeKey = identity.dedupeKey?.trim() || messageId;
    this.wsClient.send(serializeTeamStreamClientMessage(createTeamSendMessage({ content, executionAddress, contextFilePaths, imageUrls, messageId, dedupeKey })));
  }

  approveTool(invocationId: string, target?: ToolApprovalTarget | null, reason?: string): void {
    this.sendToolDecision('APPROVE_TOOL', invocationId, target, reason);
  }

  denyTool(invocationId: string, target?: ToolApprovalTarget | null, reason?: string): void {
    this.sendToolDecision('DENY_TOOL', invocationId, target, reason);
  }

  private sendToolDecision(decision: 'APPROVE_TOOL' | 'DENY_TOOL', invocationId: string, target?: ToolApprovalTarget | null, reason?: string): void {
    const resolved = this.approvalTracker.resolveTarget(invocationId, target);
    if (!resolved) throw new Error(`No exact Team execution target is registered for tool invocation '${invocationId}'.`);
    this.wsClient.send(serializeTeamStreamClientMessage(createTeamToolDecisionMessage({ decision, invocationId, executionAddress: resolved.executionAddress, reason })));
    this.approvalTracker.complete(invocationId);
  }

  interruptGeneration(commandId: string, target: TeamInterruptGenerationTarget): boolean {
    const normalizedCommandId = commandId.trim();
    const executionAddress = createTeamExecutionAddress(target.executionAddress);
    const entry: PendingInterruptCommand = {
      commandId: normalizedCommandId,
      target: { target_kind: 'team_member', team_run_id: executionAddress.rootTeamRunId, execution_address: executionAddress },
    };
    return tryAdmitInterruptCommand({
      pending: this.pendingInterruptCommands,
      entry,
      getConnectionState: () => this.wsClient.state,
      send: () => this.wsClient.send(serializeTeamStreamClientMessage(createTeamInterruptMessage({ commandId: normalizedCommandId, executionAddress }))),
      onTransportFailure: this.onInterruptCommandTransportFailure,
    });
  }

  private handleMessage = (raw: string): void => {
    if (!this.teamContext || !this.teamRunId) return;
    try {
      const message = parseTeamStreamServerMessage(raw);
      this.dispatchMessage(message, this.teamContext);
    } catch (error) {
      console.error('Rejected invalid Team WebSocket message:', error);
    }
  };

  private handleConnect = (): void => { console.log('Team WebSocket transport connected'); };
  private handleDisconnect = (reason?: string): void => {
    this.applicationReady = false;
    this.drainPendingInterruptCommands(reason || 'Interrupt result was lost because the stream disconnected.');
  };
  private handleError = (error: Error): void => { console.error('Team WebSocket error:', error); };

  private handleInterruptAck(message: Extract<TeamStreamServerMessage, { type: 'AGENT_COMMAND_ACK' }>): void {
    const pending = this.pendingInterruptCommands.get(message.payload.command_id);
    if (!pending || pending.target.target_kind !== 'team_member') return;
    const executionAddress = fromTeamExecutionAddressDto(message.payload.execution_address);
    if (!pending.target.execution_address || !sameTeamExecutionAddress(pending.target.execution_address, executionAddress)) return;
    this.pendingInterruptCommands.delete(message.payload.command_id);
    const target = pending.target;
    this.onInterruptCommandResult(message.payload.state === 'accepted'
      ? { command_type: 'INTERRUPT_GENERATION', command_id: message.payload.command_id, state: 'accepted', target }
      : { command_type: 'INTERRUPT_GENERATION', command_id: message.payload.command_id, state: message.payload.state, code: message.payload.code, message: message.payload.message, target });
  }

  private refreshTasks(context: AgentTeamContext): void {
    const rootTeamRunId = context.executions.getRootTeamRunId();
    scheduleTaskDelegationRecordsRefresh({
      client: getApolloClient(), teamRunId: rootTeamRunId,
      onHydrated: (records) => context.executions.reconcileTaskSnapshot(mapCompleteTeamTaskProjectionSnapshot({
        expectedRootTeamRunId: rootTeamRunId, topology: context.topology, records,
      })),
    });
  }

  private dispatchMessage(message: TeamStreamServerMessage, context: AgentTeamContext): void {
    switch (message.type) {
      case 'CONNECTED': this.applicationReady = true; return;
      case 'TEAM_RUN_LIFECYCLE': {
        const result = context.executions.setRootTeamActive(message.payload.is_active);
        if (result.disposition === 'applied') useRunHistoryStore().applyRunNavigationEffect({
          kind: 'team_run', teamRunId: context.executions.getRootTeamRunId(), isActive: message.payload.is_active,
        }, { kind: 'PRESENTATION' });
        return;
      }
      case 'AGENT_COMMAND_ACK': this.handleInterruptAck(message); return;
      case 'TEAM_COMMUNICATION_MESSAGE': handleTeamCommunicationMessage(toTeamCommunicationProjectionPayload(message.payload)); return;
      case 'ERROR':
        if (message.payload.agent_execution === null) {
          console.error(`Team stream protocol error (${message.payload.code}): ${message.payload.message}`);
          return;
        }
        break;
      default: break;
    }

    const result = context.executions.applyExecutionMessage(message);
    if (result.disposition === 'rejected') {
      console.warn(`Rejected Team execution message (${result.code}): ${result.message}`);
      return;
    }
    for (const effect of result.effects) {
      if (effect.kind === 'refresh_task_records') {
        this.refreshTasks(context);
        continue;
      }
      if (effect.kind === 'record_team_token_usage') {
        useTokenUsageMeterStore().applyTeamTokenUsage(effect.executionAddress, effect.details);
        continue;
      }
      const agentContext = context.executions.getAgentContext(effect.executionAddress);
      if (!agentContext) continue;
      this.approvalTracker.track(effect.message);
      dispatchAgentStreamMessage(toAgentProjectionMessage(effect.message, agentContext.state.runId), {
        kind: 'team_member', context: agentContext,
        teamRunId: context.executions.getRootTeamRunId(), executionAddress: effect.executionAddress,
      });
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
