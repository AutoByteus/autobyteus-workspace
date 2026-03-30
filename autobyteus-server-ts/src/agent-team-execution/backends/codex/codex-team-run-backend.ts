import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryRequest } from "../../domain/inter-agent-message-delivery.js";
import type { TeamRunEventListener, TeamRunEventUnsubscribe } from "../../domain/team-run-event.js";
import type { TeamRunBackend } from "../team-run-backend.js";
import type { TeamManager } from "../team-manager.js";
import type { CodexTeamRunContextEnvelope } from "./codex-team-run-context.js";

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

const buildCommandFailure = (operation: string, error: unknown): AgentOperationResult => {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? ((error as { code: string }).code ?? "RUNTIME_COMMAND_FAILED")
      : "RUNTIME_COMMAND_FAILED";
  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? ((error as { message: string }).message ?? `Failed to ${operation}.`)
      : `Failed to ${operation}: ${String(error)}`;
  return {
    accepted: false,
    code,
    message,
  };
};

export class CodexTeamRunBackend implements TeamRunBackend {
  private readonly context: CodexTeamRunContextEnvelope;
  private readonly teamManager: TeamManager;

  constructor(context: CodexTeamRunContextEnvelope, teamManager: TeamManager) {
    this.context = context;
    this.teamManager = teamManager;
  }

  get runId(): string {
    return this.context.runId;
  }

  get runtimeKind() {
    return this.context.runtimeKind;
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
      return await this.teamManager.postMessage(
        message,
        targetMemberName.trim(),
      );
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
