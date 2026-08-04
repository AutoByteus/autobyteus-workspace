import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryIntent } from "../../domain/inter-agent-message-delivery.js";
import type { TeamRunEventListener, TeamRunEventUnsubscribe } from "../../domain/team-run-event.js";
import type { TeamMemberSelector } from "../../domain/team-run-member-identity.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import type { TeamRunBackend } from "../team-run-backend.js";
import type { TeamManager } from "../team-manager.js";
import type { MixedTeamRunContextEnvelope } from "./mixed-team-run-context.js";
import type { StartTaskAgentInstanceRequest } from "../../domain/task-agent-instance.js";
import type { StartTaskTeamInstanceRequest } from "../../domain/task-team-instance.js";
import type { ConversationTargetAddress } from "../../domain/conversation-target-address.js";
import type { MemberLogicalAddressContext } from "../../domain/member-logical-address-context.js";

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

  get runId(): string {
    return this.context.runId;
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
    target: TeamMemberSelector | null = null,
    targetMemberRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    if (!target) {
      return buildTargetMemberRequiredResult();
    }

    try {
      return await this.teamManager.postMessage(message, target, targetMemberRunId);
    } catch (error) {
      return buildCommandFailure("post team message", error);
    }
  }

  async postMessageToConversationTarget(
    message: AgentInputUserMessage,
    address: ConversationTargetAddress,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }

    try {
      return await this.teamManager.postMessageToConversationTarget(message, address);
    } catch (error) {
      return buildCommandFailure("post team conversation target message", error);
    }
  }

  async deliverInterAgentMessage(
    intent: InterAgentMessageDeliveryIntent,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      return await this.teamManager.deliverInterAgentMessage(intent);
    } catch (error) {
      return buildCommandFailure("deliver inter-agent message", error);
    }
  }

  resolveLogicalPlacement(
    recipientName: string,
    callerAddressing: MemberLogicalAddressContext,
  ) {
    return this.teamManager.resolveLogicalPlacement(recipientName, callerAddressing);
  }

  async approveToolInvocation(
    target: TeamMemberSelector,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
    targetMemberRunId: string | null = null,
    taskTeamRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      return await this.teamManager.approveToolInvocation(
        target,
        invocationId,
        approved,
        reason,
        targetMemberRunId,
        taskTeamRunId,
      );
    } catch (error) {
      return buildCommandFailure("approve team tool", error);
    }
  }

  async interruptMember(
    targetMemberRouteKey: string,
    targetMemberRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    if (typeof targetMemberRouteKey !== "string" || targetMemberRouteKey.trim().length === 0) {
      return buildTargetMemberRequiredResult();
    }

    try {
      return await this.teamManager.interruptMember(
        targetMemberRouteKey.trim(),
        targetMemberRunId,
      );
    } catch (error) {
      return buildCommandFailure("interrupt team member", error);
    }
  }

  async settleMember(
    targetMemberRouteKey: string,
    targetMemberRunId: string | null = null,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    if (typeof targetMemberRouteKey !== "string" || targetMemberRouteKey.trim().length === 0) {
      return buildTargetMemberRequiredResult();
    }

    try {
      return await this.teamManager.settleMember(
        targetMemberRouteKey.trim(),
        targetMemberRunId,
        reason,
      );
    } catch (error) {
      return buildCommandFailure("settle team member", error);
    }
  }

  async startTaskAgentInstance(
    request: StartTaskAgentInstanceRequest,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      return await this.teamManager.startTaskAgentInstance(request);
    } catch (error) {
      return buildCommandFailure("start task-agent instance", error);
    }
  }

  async settleTaskAgentInstance(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      return await this.teamManager.settleTaskAgentInstance(
        logicalMemberRouteKey,
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
      return buildRunNotFoundResult(this.runId);
    }
    try {
      return await this.teamManager.startTaskTeamInstance(request);
    } catch (error) {
      return buildCommandFailure("start task-team instance", error);
    }
  }

  async postMessageToTaskTeamInstance(
    logicalTeamRouteKey: string,
    taskTeamRunId: string,
    message: AgentInputUserMessage,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      return await this.teamManager.postMessageToTaskTeamInstance(
        logicalTeamRouteKey,
        taskTeamRunId,
        message,
      );
    } catch (error) {
      return buildCommandFailure("post task-team message", error);
    }
  }

  async settleTaskTeamInstance(
    logicalTeamRouteKey: string,
    taskTeamRunId: string,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      return await this.teamManager.settleTaskTeamInstance(
        logicalTeamRouteKey,
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
