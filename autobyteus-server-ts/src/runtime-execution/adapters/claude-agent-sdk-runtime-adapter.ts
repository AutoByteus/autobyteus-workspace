import { randomUUID } from "node:crypto";
import type {
  RuntimeAdapter,
  RuntimeApproveToolInput,
  RuntimeCommandResult,
  RuntimeCreateAgentRunInput,
  RuntimeCreateResult,
  RuntimeInterruptRunInput,
  RuntimeRelayInterAgentMessageInput,
  RuntimeRestoreAgentRunInput,
  RuntimeSendTurnInput,
  RuntimeTerminateRunInput,
} from "../runtime-adapter-port.js";
import {
  ClaudeAgentSdkRuntimeService,
  getClaudeAgentSdkRuntimeService,
} from "../claude-agent-sdk/claude-agent-sdk-runtime-service.js";

const buildCommandFailure = (error: unknown): RuntimeCommandResult => ({
  accepted: false,
  code: "CLAUDE_RUNTIME_COMMAND_FAILED",
  message: String(error),
});

export class ClaudeAgentSdkRuntimeAdapter implements RuntimeAdapter {
  readonly runtimeKind = "claude_agent_sdk" as const;
  private readonly runtimeService: ClaudeAgentSdkRuntimeService;

  constructor(runtimeService: ClaudeAgentSdkRuntimeService = getClaudeAgentSdkRuntimeService()) {
    this.runtimeService = runtimeService;
  }

  async createAgentRun(input: RuntimeCreateAgentRunInput): Promise<RuntimeCreateResult> {
    const runId = randomUUID();
    const workingDirectory = await this.runtimeService.resolveWorkingDirectory(input.workspaceId);
    const session = await this.runtimeService.createRunSession(runId, {
      modelIdentifier: input.llmModelIdentifier,
      workingDirectory,
      autoExecuteTools: input.autoExecuteTools,
      llmConfig: input.llmConfig ?? null,
      runtimeMetadata: null,
    });

    return {
      runId,
      runtimeReference: {
        runtimeKind: this.runtimeKind,
        sessionId: session.sessionId,
        threadId: session.sessionId,
        metadata: session.metadata,
      },
    };
  }

  async restoreAgentRun(input: RuntimeRestoreAgentRunInput): Promise<RuntimeCreateResult> {
    const workingDirectory = await this.runtimeService.resolveWorkingDirectory(input.workspaceId);
    const session = await this.runtimeService.restoreRunSession(
      input.runId,
      {
        modelIdentifier: input.llmModelIdentifier,
        workingDirectory,
        autoExecuteTools: input.autoExecuteTools,
        llmConfig: input.llmConfig ?? null,
        runtimeMetadata: input.runtimeReference?.metadata ?? null,
      },
      {
        sessionId: input.runtimeReference?.sessionId ?? input.runtimeReference?.threadId ?? input.runId,
        metadata: input.runtimeReference?.metadata ?? null,
      },
    );

    return {
      runId: input.runId,
      runtimeReference: {
        runtimeKind: this.runtimeKind,
        sessionId: session.sessionId,
        threadId: session.sessionId,
        metadata: session.metadata,
      },
    };
  }

  async sendTurn(input: RuntimeSendTurnInput): Promise<RuntimeCommandResult> {
    try {
      await this.runtimeService.sendTurn(input.runId, input.message);
      const runtimeReference = this.runtimeService.getRunRuntimeReference(input.runId);
      return {
        accepted: true,
        runtimeReference: runtimeReference
          ? {
              runtimeKind: this.runtimeKind,
              sessionId: runtimeReference.sessionId,
              threadId: runtimeReference.sessionId,
              metadata: runtimeReference.metadata,
            }
          : null,
      };
    } catch (error) {
      return buildCommandFailure(error);
    }
  }

  async relayInterAgentMessage(
    input: RuntimeRelayInterAgentMessageInput,
  ): Promise<RuntimeCommandResult> {
    try {
      await this.runtimeService.injectInterAgentEnvelope(input.runId, input.envelope);
      const runtimeReference = this.runtimeService.getRunRuntimeReference(input.runId);
      return {
        accepted: true,
        runtimeReference: runtimeReference
          ? {
              runtimeKind: this.runtimeKind,
              sessionId: runtimeReference.sessionId,
              threadId: runtimeReference.sessionId,
              metadata: runtimeReference.metadata,
            }
          : null,
      };
    } catch (error) {
      return buildCommandFailure(error);
    }
  }

  async approveTool(input: RuntimeApproveToolInput): Promise<RuntimeCommandResult> {
    try {
      await this.runtimeService.approveTool(
        input.runId,
        input.invocationId,
        input.approved,
        input.reason ?? null,
      );
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure(error);
    }
  }

  async interruptRun(input: RuntimeInterruptRunInput): Promise<RuntimeCommandResult> {
    try {
      await this.runtimeService.interruptRun(input.runId);
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure(error);
    }
  }

  async terminateRun(input: RuntimeTerminateRunInput): Promise<RuntimeCommandResult> {
    try {
      const runtimeReference = this.runtimeService.getRunRuntimeReference(input.runId);
      await this.runtimeService.terminateRun(input.runId);
      return {
        accepted: true,
        runtimeReference: runtimeReference
          ? {
              runtimeKind: this.runtimeKind,
              sessionId: runtimeReference.sessionId,
              threadId: runtimeReference.sessionId,
              metadata: runtimeReference.metadata,
            }
          : null,
      };
    } catch (error) {
      return buildCommandFailure(error);
    }
  }
}
