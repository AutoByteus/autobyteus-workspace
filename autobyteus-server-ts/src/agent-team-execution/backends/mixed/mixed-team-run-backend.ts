import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryRequest } from "../../domain/inter-agent-message-delivery.js";
import type { TeamRunEventListener, TeamRunEventUnsubscribe } from "../../domain/team-run-event.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import type { TeamRunBackend } from "../team-run-backend.js";
import type { TeamManager } from "../team-manager.js";
import type { MixedTeamRunContextEnvelope } from "./mixed-team-run-context.js";

const buildRunNotFoundResult = (runId: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${runId}' is not active.`,
});

const buildTargetMemberRequiredResult = (): AgentOperationResult => ({
  accepted: false,
  code: "TARGET_MEMBER_REQUIRED",
  message: "targetMemberName is required.",
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

  getStatus(): string | null {
    return this.isActive() ? "IDLE" : null;
  }

  async postMessage(
    message: AgentInputUserMessage,
    targetMemberName: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    if (typeof targetMemberName !== "string" || targetMemberName.trim().length === 0) {
      return buildTargetMemberRequiredResult();
    }

    try {
      return await this.teamManager.postMessage(message, targetMemberName.trim());
    } catch (error) {
      return buildCommandFailure("post team message", error);
    }
  }

  async deliverInterAgentMessage(
    request: InterAgentMessageDeliveryRequest,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      return await this.teamManager.deliverInterAgentMessage(request);
    } catch (error) {
      return buildCommandFailure("deliver inter-agent message", error);
    }
  }

  async approveToolInvocation(
    targetMemberName: string,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      return await this.teamManager.approveToolInvocation(
        targetMemberName,
        invocationId,
        approved,
        reason,
      );
    } catch (error) {
      return buildCommandFailure("approve team tool", error);
    }
  }

  async interrupt(): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    return this.teamManager.interrupt();
  }

  async terminate(): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      return await this.teamManager.terminate();
    } catch (error) {
      return buildCommandFailure("terminate team run", error);
    }
  }
}
