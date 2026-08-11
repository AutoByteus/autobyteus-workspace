import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { assertAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import type {
  InterAgentMessageDeliveryIntent,
  ResolvedInterAgentMessageDeliveryRequest,
} from "./inter-agent-message-delivery.js";
import type { TeamRunConfig } from "./team-run-config.js";
import type { TeamRunBackend } from "../backends/team-run-backend.js";
import type { RuntimeTeamRunContext, TeamRunContext } from "./team-run-context.js";
import type { TeamRunEvent, TeamRunEventListener, TeamRunEventUnsubscribe } from "./team-run-event.js";
import type { StartTaskAgentExecutionRequest } from "./task-agent-execution.js";
import type { StartTaskTeamExecutionRequest } from "./task-team-execution.js";
import type { MemberLogicalAddressContext } from "./member-logical-address-context.js";
import { createTeamExecutionAddress, type TeamExecutionAddress } from "./team-execution-address.js";
import type { TeamMemberExecutionCommand } from "./team-member-execution-command.js";
import type { TaskActivationEventLease } from "../services/task-activation-event-barrier.js";

export class TeamRun {
  readonly context: TeamRunContext<RuntimeTeamRunContext>;
  private readonly backend: TeamRunBackend;

  constructor(options: {
    context: TeamRunContext<RuntimeTeamRunContext>;
    backend: TeamRunBackend;
  }) {
    this.context = options.context;
    this.backend = options.backend;
  }

  get teamRunId(): string { return this.context.teamRunId; }
  get teamBackendKind() { return this.context.teamBackendKind; }
  get config(): TeamRunConfig { return this.context.config; }
  isActive(): boolean { return this.backend.isActive(); }
  getRuntimeContext() { return this.context.runtimeContext; }
  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    return this.backend.subscribeToEvents(listener);
  }
  getLeafAgentStatusSnapshots() { return this.backend.getLeafAgentStatusSnapshots(); }
  hasOpenExecutionWork(): boolean { return this.backend.hasOpenExecutionWork(); }

  postMessage(
    message: AgentInputUserMessage,
    targetMemberAddress: string | null = null,
    targetAgentRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    const target = targetMemberAddress
      ? assertAgentTeamAddress(targetMemberAddress)
      : this.context.index.getTeam(this.context.teamAddress)?.coordinatorAddress ?? null;
    return this.backend.postMessage(message, target, targetAgentRunId);
  }

  executeMemberCommand(
    executionAddress: TeamExecutionAddress,
    command: TeamMemberExecutionCommand,
  ): Promise<AgentOperationResult> {
    return this.backend.executeMemberCommand(
      createTeamExecutionAddress(executionAddress),
      command,
    );
  }

  deliverInterAgentMessage(intent: InterAgentMessageDeliveryIntent): Promise<AgentOperationResult> {
    return this.backend.deliverInterAgentMessage(intent);
  }

  deliverResolvedInterAgentMessage(
    request: ResolvedInterAgentMessageDeliveryRequest,
    beforePublishMemberInput: (() => void) | null = null,
  ): Promise<AgentOperationResult> {
    return this.backend.deliverResolvedInterAgentMessage(request, beforePublishMemberInput);
  }

  resolveRecipient(recipientAddress: string, caller: MemberLogicalAddressContext) {
    if (caller.rootTeamRunId !== this.config.rootTeam.teamRunId) {
      throw new CollaborationContractError(
        "COLLABORATION_CONTEXT_REQUIRED",
        `Caller collaboration root '${caller.rootTeamRunId}' does not match TeamRun '${this.config.rootTeam.teamRunId}'.`,
      );
    }
    return this.backend.resolveRecipient(recipientAddress, caller);
  }

  approveToolInvocation(
    targetMemberAddress: string,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
    targetAgentRunId: string | null = null,
    taskTeamRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    return this.backend.approveToolInvocation(
      assertAgentTeamAddress(targetMemberAddress),
      invocationId,
      approved,
      reason,
      targetAgentRunId,
      taskTeamRunId,
    );
  }

  interruptMember(address: string, targetAgentRunId: string | null = null) {
    return this.backend.interruptMember(assertAgentTeamAddress(address), targetAgentRunId);
  }
  settleMember(address: string, targetAgentRunId: string | null = null, reason: string | null = null) {
    return this.backend.settleMember(assertAgentTeamAddress(address), targetAgentRunId, reason);
  }
  startTaskAgentExecution(request: StartTaskAgentExecutionRequest) {
    return this.backend.startTaskAgentExecution(request);
  }
  releaseTaskAgentExecutionWork(address: string, taskAgentRunId: string): void {
    this.backend.releaseTaskAgentExecutionWork(assertAgentTeamAddress(address), taskAgentRunId);
  }
  settleTaskAgentExecution(address: string, taskAgentRunId: string, reason: string | null = null) {
    return this.backend.settleTaskAgentExecution(assertAgentTeamAddress(address), taskAgentRunId, reason);
  }
  startTaskTeamExecution(request: StartTaskTeamExecutionRequest) {
    return this.backend.startTaskTeamExecution(request);
  }
  markTaskTeamExecutionActive(taskTeamRunId: string): void {
    this.backend.markTaskTeamExecutionActive(taskTeamRunId);
  }
  releaseTaskTeamExecutionWork(address: string, taskTeamRunId: string): void {
    this.backend.releaseTaskTeamExecutionWork(assertAgentTeamAddress(address), taskTeamRunId);
  }
  postMessageToTaskTeamExecution(address: string, taskTeamRunId: string, message: AgentInputUserMessage) {
    return this.backend.postMessageToTaskTeamExecution(assertAgentTeamAddress(address), taskTeamRunId, message);
  }
  settleTaskTeamExecution(address: string, taskTeamRunId: string, reason: string | null = null) {
    return this.backend.settleTaskTeamExecution(assertAgentTeamAddress(address), taskTeamRunId, reason);
  }
  publishEvent(event: TeamRunEvent): void { this.backend.publishEvent(event); }
  openTaskActivationEventLease(executionAddress: TeamExecutionAddress): TaskActivationEventLease {
    return this.backend.openTaskActivationEventLease(createTeamExecutionAddress(executionAddress));
  }
  assertTaskActivationEventLeaseWithinBudget(lease: TaskActivationEventLease): void {
    this.backend.assertTaskActivationEventLeaseWithinBudget(lease);
  }
  commitTaskActivationEventLease(lease: TaskActivationEventLease, activationEvent: TeamRunEvent): void {
    this.backend.commitTaskActivationEventLease(lease, activationEvent);
  }
  abortTaskActivationEventLease(lease: TaskActivationEventLease): void {
    this.backend.abortTaskActivationEventLease(lease);
  }
  terminate(): Promise<AgentOperationResult> { return this.backend.terminate(); }
}

export type TeamRunMemberAddress = AgentTeamAddress;
