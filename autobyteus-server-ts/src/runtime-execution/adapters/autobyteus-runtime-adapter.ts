import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type {
  RuntimeAdapter,
  RuntimeApproveToolInput,
  RuntimeCommandResult,
  RuntimeCreateAgentRunInput,
  RuntimeCreateResult,
  RuntimeInterruptRunInput,
  RuntimeRelayInterAgentMessageInput,
  RuntimeTerminateRunInput,
  RuntimeRestoreAgentRunInput,
  RuntimeSendTurnInput,
} from "../runtime-adapter-port.js";

type AgentLike = {
  postUserMessage?: (message: AgentInputUserMessage) => Promise<void>;
  postToolExecutionApproval?: (
    toolInvocationId: string,
    isApproved: boolean,
    reason?: string | null,
  ) => Promise<void>;
  stop?: (timeout?: number) => Promise<void> | void;
};

type TeamLike = {
  postMessage?: (message: AgentInputUserMessage, targetMemberName?: string | null) => Promise<void>;
  postToolExecutionApproval?: (
    memberName: string,
    toolInvocationId: string,
    isApproved: boolean,
    reason?: string | null,
  ) => Promise<void>;
  stop?: (timeout?: number) => Promise<void> | void;
};

const runNotFoundResult = (runId: string): RuntimeCommandResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${runId}' is not active.`,
});

export class AutobyteusRuntimeAdapter implements RuntimeAdapter {
  readonly runtimeKind = "autobyteus" as const;
  private agentManager: AgentRunManager;
  private teamManager: AgentTeamRunManager;

  constructor(
    agentManager: AgentRunManager = AgentRunManager.getInstance(),
    teamManager: AgentTeamRunManager = AgentTeamRunManager.getInstance(),
  ) {
    this.agentManager = agentManager;
    this.teamManager = teamManager;
  }

  async createAgentRun(input: RuntimeCreateAgentRunInput): Promise<RuntimeCreateResult> {
    const runId = await this.agentManager.createAgentRun({
      agentDefinitionId: input.agentDefinitionId,
      llmModelIdentifier: input.llmModelIdentifier,
      autoExecuteTools: input.autoExecuteTools,
      workspaceId: input.workspaceId ?? null,
      llmConfig: input.llmConfig ?? null,
      skillAccessMode: input.skillAccessMode ?? null,
    });

    return {
      runId,
      runtimeReference: {
        runtimeKind: this.runtimeKind,
        sessionId: runId,
        threadId: null,
        metadata: null,
      },
    };
  }

  async restoreAgentRun(input: RuntimeRestoreAgentRunInput): Promise<RuntimeCreateResult> {
    const runId = await this.agentManager.restoreAgentRun({
      runId: input.runId,
      agentDefinitionId: input.agentDefinitionId,
      llmModelIdentifier: input.llmModelIdentifier,
      autoExecuteTools: input.autoExecuteTools,
      workspaceId: input.workspaceId ?? null,
      llmConfig: input.llmConfig ?? null,
      skillAccessMode: input.skillAccessMode ?? null,
    });

    return {
      runId,
      runtimeReference: {
        runtimeKind: this.runtimeKind,
        sessionId: runId,
        threadId: input.runtimeReference?.threadId ?? null,
        metadata: input.runtimeReference?.metadata ?? null,
      },
    };
  }

  async sendTurn(input: RuntimeSendTurnInput): Promise<RuntimeCommandResult> {
    if (input.mode === "team") {
      const team = this.teamManager.getTeamRun(input.runId) as TeamLike | null;
      if (!team?.postMessage) {
        return runNotFoundResult(input.runId);
      }
      await team.postMessage(input.message, input.targetMemberName ?? null);
      return { accepted: true };
    }

    const agent = this.agentManager.getAgentRun(input.runId) as AgentLike | null;
    if (!agent?.postUserMessage) {
      return runNotFoundResult(input.runId);
    }
    await agent.postUserMessage(input.message);
    return { accepted: true };
  }

  async approveTool(input: RuntimeApproveToolInput): Promise<RuntimeCommandResult> {
    if (input.mode === "team") {
      const team = this.teamManager.getTeamRun(input.runId) as TeamLike | null;
      if (!team?.postToolExecutionApproval) {
        return runNotFoundResult(input.runId);
      }
      if (!input.approvalTarget?.trim()) {
        return {
          accepted: false,
          code: "APPROVAL_TARGET_REQUIRED",
          message: "Team approval requires agent_name/target_member_name/agent_id.",
        };
      }
      await team.postToolExecutionApproval(
        input.approvalTarget.trim(),
        input.invocationId,
        input.approved,
        input.reason ?? null,
      );
      return { accepted: true };
    }

    const agent = this.agentManager.getAgentRun(input.runId) as AgentLike | null;
    if (!agent?.postToolExecutionApproval) {
      return runNotFoundResult(input.runId);
    }
    await agent.postToolExecutionApproval(input.invocationId, input.approved, input.reason ?? null);
    return { accepted: true };
  }

  async relayInterAgentMessage(
    input: RuntimeRelayInterAgentMessageInput,
  ): Promise<RuntimeCommandResult> {
    void input;
    return {
      accepted: false,
      code: "INTER_AGENT_RELAY_UNSUPPORTED",
      message: "Autobyteus team runtime does not use runtime-level inter-agent relay.",
    };
  }

  async interruptRun(input: RuntimeInterruptRunInput): Promise<RuntimeCommandResult> {
    if (input.mode === "team") {
      const team = this.teamManager.getTeamRun(input.runId) as TeamLike | null;
      if (!team) {
        return runNotFoundResult(input.runId);
      }
      if (!team.stop) {
        return {
          accepted: false,
          code: "INTERRUPT_UNSUPPORTED",
          message: `Runtime '${this.runtimeKind}' team run '${input.runId}' does not expose stop().`,
        };
      }
      await team.stop();
      return { accepted: true };
    }

    const agent = this.agentManager.getAgentRun(input.runId) as AgentLike | null;
    if (!agent) {
      return runNotFoundResult(input.runId);
    }
    if (!agent.stop) {
      return {
        accepted: false,
        code: "INTERRUPT_UNSUPPORTED",
        message: `Runtime '${this.runtimeKind}' agent run '${input.runId}' does not expose stop().`,
      };
    }
    await agent.stop();
    return { accepted: true };
  }

  async terminateRun(input: RuntimeTerminateRunInput): Promise<RuntimeCommandResult> {
    return this.interruptRun({
      runId: input.runId,
      mode: input.mode,
      turnId: null,
    });
  }
}
