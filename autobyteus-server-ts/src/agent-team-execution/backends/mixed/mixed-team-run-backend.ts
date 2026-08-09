import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type {
  InterAgentMessageDeliveryIntent,
  ResolvedInterAgentMessageDeliveryRequest,
} from "../../domain/inter-agent-message-delivery.js";
import type { TeamRunEventListener, TeamRunEventUnsubscribe } from "../../domain/team-run-event.js";
import type { AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import type { TeamRunBackend } from "../team-run-backend.js";
import type { TeamManager } from "../team-manager.js";
import type { MixedTeamRunContextEnvelope } from "./mixed-team-run-context.js";
import type { StartTaskAgentInstanceRequest } from "../../domain/task-agent-instance.js";
import type { StartTaskTeamInstanceRequest } from "../../domain/task-team-instance.js";
import type { MemberLogicalAddressContext } from "../../domain/member-logical-address-context.js";
import type { TeamExecutionAddress } from "../../domain/team-execution-address.js";
import type { TeamMemberExecutionCommand } from "../../domain/team-member-execution-command.js";

const buildRunNotFoundResult = (runId: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${runId}' is not active.`,
});

const buildTargetMemberRequiredResult = (): AgentOperationResult => ({
  accepted: false,
  code: "TARGET_MEMBER_REQUIRED",
  message: "target member selector is required.",
});

const buildCommandFailure = (operation: string, error: unknown): AgentOperationResult => ({
  accepted: false,
  code: "RUNTIME_COMMAND_FAILED",
  message: `Failed to ${operation}: ${String(error)}`,
});

export class MixedTeamRunBackend implements TeamRunBackend {
  private readonly context: MixedTeamRunContextEnvelope;
  private readonly teamManager: TeamManager;

  constructor(context: MixedTeamRunContextEnvelope, teamManager: TeamManager) {
    this.context = context;
    this.teamManager = teamManager;
  }

  getTeamRunContext(): MixedTeamRunContextEnvelope { return this.context; }

  get teamRunId(): string {
    return this.context.teamRunId;
  }

  get teamBackendKind() {
    return TeamBackendKind.MIXED;
  }

  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    return this.teamManager.subscribeToEvents(listener);
  }

  isActive(): boolean {
    return this.teamManager.hasActiveMembers();
  }

  getRuntimeContext() {
    return this.context.runtimeContext ?? null;
  }

  getLeafAgentStatusSnapshots() {
    return this.teamManager.getLeafAgentStatusSnapshots();
  }

  hasOpenExecutionWork(): boolean {
    return this.teamManager.hasOpenExecutionWork();
  }

  async postMessage(
    message: AgentInputUserMessage,
    target: AgentTeamAddress | null = null,
    targetAgentRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.teamRunId);
    }
    if (!target) {
      return buildTargetMemberRequiredResult();
    }

    try {
      return await this.teamManager.postMessage(message, target, targetAgentRunId);
    } catch (error) {
      return buildCommandFailure("post team message", error);
    }
  }

  async executeMemberCommand(
    executionAddress: TeamExecutionAddress,
    command: TeamMemberExecutionCommand,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.teamRunId);
    }
    try {
      return await this.teamManager.executeMemberCommand(executionAddress, command);
    } catch (error) {
      return buildCommandFailure("execute team member command", error);
    }
  }

  async deliverInterAgentMessage(
    intent: InterAgentMessageDeliveryIntent,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.teamRunId);
    }
    try {
      return await this.teamManager.deliverInterAgentMessage(intent);
    } catch (error) {
      return buildCommandFailure("deliver inter-agent message", error);
    }
  }

  async deliverResolvedInterAgentMessage(
    request: ResolvedInterAgentMessageDeliveryRequest,
    beforePublishMemberInput: (() => void) | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.teamRunId);
    }
    try {
      return await this.teamManager.deliverResolvedInterAgentMessage(
        request,
        beforePublishMemberInput,
      );
    } catch (error) {
      return buildCommandFailure("deliver resolved inter-agent message", error);
    }
  }

  resolveRecipient(
    recipientAddress: string,
    callerAddressing: MemberLogicalAddressContext,
  ) {
    return this.teamManager.resolveRecipient(recipientAddress, callerAddressing);
  }

  async approveToolInvocation(
    target: AgentTeamAddress,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
    targetAgentRunId: string | null = null,
    taskTeamRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.teamRunId);
    }
    try {
      return await this.teamManager.approveToolInvocation(
        target,
        invocationId,
        approved,
        reason,
        targetAgentRunId,
        taskTeamRunId,
      );
    } catch (error) {
      return buildCommandFailure("approve team tool", error);
    }
  }

  async interruptMember(
    target: AgentTeamAddress,
    targetAgentRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.teamRunId);
    }
    try {
      return await this.teamManager.interruptMember(target, targetAgentRunId);
    } catch (error) {
      return buildCommandFailure("interrupt team member", error);
    }
  }

  async settleMember(
    target: AgentTeamAddress,
    targetAgentRunId: string | null = null,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.teamRunId);
    }
    try {
      return await this.teamManager.settleMember(target, targetAgentRunId, reason);
    } catch (error) {
      return buildCommandFailure("settle team member", error);
    }
  }

  async startTaskAgentInstance(
    request: StartTaskAgentInstanceRequest,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.teamRunId);
    }
    try {
      return await this.teamManager.startTaskAgentInstance(request);
    } catch (error) {
      return buildCommandFailure("start task-agent instance", error);
    }
  }

  async settleTaskAgentInstance(
    target: AgentTeamAddress,
    taskAgentRunId: string,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.teamRunId);
    }
    try {
      return await this.teamManager.settleTaskAgentInstance(
        target,
        taskAgentRunId,
        reason,
      );
    } catch (error) {
      return buildCommandFailure("settle task-agent instance", error);
    }
  }


  async startTaskTeamInstance(
    request: StartTaskTeamInstanceRequest,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.teamRunId);
    }
    try {
      return await this.teamManager.startTaskTeamInstance(request);
    } catch (error) {
      return buildCommandFailure("start task-team instance", error);
    }
  }

  async postMessageToTaskTeamInstance(
    target: AgentTeamAddress,
    taskTeamRunId: string,
    message: AgentInputUserMessage,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.teamRunId);
    }
    try {
      return await this.teamManager.postMessageToTaskTeamInstance(
        target,
        taskTeamRunId,
        message,
      );
    } catch (error) {
      return buildCommandFailure("post task-team message", error);
    }
  }

  async settleTaskTeamInstance(
    target: AgentTeamAddress,
    taskTeamRunId: string,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.teamRunId);
    }
    try {
      return await this.teamManager.settleTaskTeamInstance(
        target,
        taskTeamRunId,
        reason,
      );
    } catch (error) {
      return buildCommandFailure("settle task-team instance", error);
    }
  }

  async terminate(): Promise<AgentOperationResult> {
    try {
      return await this.teamManager.terminate();
    } catch (error) {
      return buildCommandFailure("terminate team run", error);
    }
  }

  publishEvent(event: import("../../domain/team-run-event.js").TeamRunEvent): void {
    this.teamManager.publishEvent(event);
  }
}
