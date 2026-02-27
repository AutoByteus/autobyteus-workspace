import { randomUUID } from "node:crypto";
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
import {
  CodexAppServerRuntimeService,
  getCodexAppServerRuntimeService,
} from "../codex-app-server/codex-app-server-runtime-service.js";

const buildCommandFailure = (error: unknown): RuntimeCommandResult => ({
  accepted: false,
  code: "CODEX_RUNTIME_COMMAND_FAILED",
  message: String(error),
});

export class CodexAppServerRuntimeAdapter implements RuntimeAdapter {
  readonly runtimeKind = "codex_app_server" as const;
  private readonly runtimeService: CodexAppServerRuntimeService;

  constructor(runtimeService: CodexAppServerRuntimeService = getCodexAppServerRuntimeService()) {
    this.runtimeService = runtimeService;
  }

  async createAgentRun(input: RuntimeCreateAgentRunInput): Promise<RuntimeCreateResult> {
    const runId = randomUUID();
    const workingDirectory = await this.runtimeService.resolveWorkingDirectory(input.workspaceId);
    const session = await this.runtimeService.createRunSession(runId, {
      modelIdentifier: input.llmModelIdentifier,
      workingDirectory,
      llmConfig: input.llmConfig ?? null,
    });
    return {
      runId,
      runtimeReference: {
        runtimeKind: this.runtimeKind,
        sessionId: runId,
        threadId: session.threadId,
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
        llmConfig: input.llmConfig ?? null,
      },
      {
        threadId: input.runtimeReference?.threadId ?? null,
        metadata: input.runtimeReference?.metadata ?? null,
      },
    );
    return {
      runId: input.runId,
      runtimeReference: {
        runtimeKind: this.runtimeKind,
        sessionId: input.runId,
        threadId: session.threadId,
        metadata: session.metadata,
      },
    };
  }

  async sendTurn(input: RuntimeSendTurnInput): Promise<RuntimeCommandResult> {
    try {
      await this.runtimeService.sendTurn(input.runId, input.message);
      return { accepted: true };
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
      );
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure(error);
    }
  }

  async relayInterAgentMessage(
    input: RuntimeRelayInterAgentMessageInput,
  ): Promise<RuntimeCommandResult> {
    try {
      await this.runtimeService.injectInterAgentEnvelope(input.runId, input.envelope);
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure(error);
    }
  }

  async interruptRun(input: RuntimeInterruptRunInput): Promise<RuntimeCommandResult> {
    try {
      await this.runtimeService.interruptRun(input.runId, input.turnId ?? null);
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure(error);
    }
  }

  async terminateRun(input: RuntimeTerminateRunInput): Promise<RuntimeCommandResult> {
    try {
      await this.runtimeService.terminateRun(input.runId);
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure(error);
    }
  }
}
