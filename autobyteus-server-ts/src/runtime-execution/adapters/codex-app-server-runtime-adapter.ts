import { randomUUID } from "node:crypto";
import type {
  RuntimeAdapter,
  RuntimeApproveToolInput,
  RuntimeCommandResult,
  RuntimeCreateAgentRunInput,
  RuntimeCreateResult,
  RuntimeInterAgentRelayHandler,
  RuntimeInterruptRunInput,
  RuntimeRelayInterAgentMessageInput,
  RuntimeTerminateRunInput,
  RuntimeRestoreAgentRunInput,
  RuntimeSendTurnInput,
  RuntimeEventInterpretation,
} from "../runtime-adapter-port.js";
import {
  CodexAppServerRuntimeService,
  type CodexRuntimeEvent,
  getCodexAppServerRuntimeService,
} from "../codex-app-server/codex-app-server-runtime-service.js";
import { normalizeCodexRuntimeMethod } from "../codex-app-server/codex-runtime-method-normalizer.js";
import { resolveSingleAgentRuntimeContext } from "../single-agent-runtime-context.js";

const buildCommandFailure = (error: unknown): RuntimeCommandResult => ({
  accepted: false,
  code: "CODEX_RUNTIME_COMMAND_FAILED",
  message: String(error),
});

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class CodexAppServerRuntimeAdapter implements RuntimeAdapter {
  readonly runtimeKind = "codex_app_server" as const;
  readonly teamExecutionMode = "member_runtime" as const;
  private readonly runtimeService: CodexAppServerRuntimeService;

  constructor(runtimeService: CodexAppServerRuntimeService = getCodexAppServerRuntimeService()) {
    this.runtimeService = runtimeService;
  }

  async createAgentRun(input: RuntimeCreateAgentRunInput): Promise<RuntimeCreateResult> {
    const runId = randomUUID();
    const workingDirectory = await this.runtimeService.resolveWorkingDirectory(input.workspaceId);
    const runtimeContext = await resolveSingleAgentRuntimeContext(input.agentDefinitionId, {
      skillAccessMode: input.skillAccessMode ?? null,
    });
    const session = await this.runtimeService.createRunSession(runId, {
      modelIdentifier: input.llmModelIdentifier,
      workingDirectory,
      autoExecuteTools: input.autoExecuteTools,
      llmConfig: input.llmConfig ?? null,
      runtimeMetadata: runtimeContext.runtimeMetadata,
      configuredSkills: runtimeContext.configuredSkills,
      skillAccessMode: runtimeContext.skillAccessMode,
    });
    return {
      runId,
      runtimeReference: {
        runtimeKind: this.runtimeKind,
        sessionId: runId,
        threadId: session.threadId,
        metadata: {
          ...runtimeContext.runtimeMetadata,
          ...session.metadata,
        },
      },
    };
  }

  async restoreAgentRun(input: RuntimeRestoreAgentRunInput): Promise<RuntimeCreateResult> {
    const workingDirectory = await this.runtimeService.resolveWorkingDirectory(input.workspaceId);
    const runtimeContext = await resolveSingleAgentRuntimeContext(input.agentDefinitionId, {
      skillAccessMode: input.skillAccessMode ?? null,
    });
    const runtimeMetadata = {
      ...(input.runtimeReference?.metadata ?? {}),
      ...runtimeContext.runtimeMetadata,
    };
    const session = await this.runtimeService.restoreRunSession(
      input.runId,
      {
        modelIdentifier: input.llmModelIdentifier,
        workingDirectory,
        autoExecuteTools: input.autoExecuteTools,
        llmConfig: input.llmConfig ?? null,
        runtimeMetadata,
        configuredSkills: runtimeContext.configuredSkills,
        skillAccessMode: runtimeContext.skillAccessMode,
      },
      {
        threadId: input.runtimeReference?.threadId ?? null,
        metadata: runtimeMetadata,
      },
    );
    return {
      runId: input.runId,
      runtimeReference: {
        runtimeKind: this.runtimeKind,
        sessionId: input.runId,
        threadId: session.threadId,
        metadata: {
          ...runtimeMetadata,
          ...session.metadata,
        },
      },
    };
  }

  isRunActive(runId: string): boolean {
    return this.runtimeService.hasRunSession(runId);
  }

  getRunRuntimeReference(runId: string) {
    const runtimeReference = this.runtimeService.getRunRuntimeReference(runId);
    if (!runtimeReference) {
      return null;
    }
    return {
      runtimeKind: this.runtimeKind,
      sessionId: runId,
      threadId: runtimeReference.threadId,
      metadata: runtimeReference.metadata,
    };
  }

  getRunStatus(runId: string): string | null {
    return this.runtimeService.getRunStatus(runId);
  }

  subscribeToRunEvents(runId: string, onEvent: (event: unknown) => void): () => void {
    return this.runtimeService.subscribeToRunEvents(
      runId,
      (event: CodexRuntimeEvent) => {
        onEvent(event);
      },
    );
  }

  interpretRuntimeEvent(event: unknown): RuntimeEventInterpretation | null {
    const payload = asObject(event);
    if (!payload) {
      return null;
    }

    const rawMethod = typeof payload.method === "string" ? payload.method : null;
    const normalizedMethod = rawMethod ? normalizeCodexRuntimeMethod(rawMethod) : null;
    let statusHint: RuntimeEventInterpretation["statusHint"] = null;
    if (normalizedMethod === "turn/started") {
      statusHint = "ACTIVE";
    } else if (normalizedMethod === "turn/completed") {
      statusHint = "IDLE";
    } else if (normalizedMethod === "error") {
      statusHint = "ERROR";
    }

    const params = asObject(payload.params);
    const thread = asObject(params?.thread);
    const threadIdHint =
      asNonEmptyString(params?.threadId) ??
      asNonEmptyString(params?.thread_id) ??
      asNonEmptyString(thread?.id);
    const runtimeReferenceHint = threadIdHint
      ? {
          threadId: threadIdHint,
        }
      : null;

    if (!normalizedMethod && !statusHint && !runtimeReferenceHint) {
      return null;
    }
    return {
      normalizedMethod,
      statusHint,
      runtimeReferenceHint,
    };
  }

  async sendTurn(input: RuntimeSendTurnInput): Promise<RuntimeCommandResult> {
    try {
      const result = await this.runtimeService.sendTurn(input.runId, input.message);
      return {
        accepted: true,
        runtimeReference: this.getRunRuntimeReference(input.runId),
        turnId: result.turnId ?? null,
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
      const result = await this.runtimeService.injectInterAgentEnvelope(
        input.runId,
        input.envelope,
      );
      return {
        accepted: true,
        turnId: result.turnId ?? null,
        runtimeReference: this.getRunRuntimeReference(input.runId),
      };
    } catch (error) {
      return buildCommandFailure(error);
    }
  }

  bindInterAgentRelayHandler(handler: RuntimeInterAgentRelayHandler): () => void {
    this.runtimeService.setInterAgentRelayHandler(handler);
    return () => {
      this.runtimeService.setInterAgentRelayHandler(null);
    };
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
      const runtimeReference = this.getRunRuntimeReference(input.runId);
      await this.runtimeService.terminateRun(input.runId);
      return {
        accepted: true,
        runtimeReference,
      };
    } catch (error) {
      return buildCommandFailure(error);
    }
  }
}
