import { randomUUID } from "node:crypto";
import type {
  RuntimeAdapter,
  RuntimeApproveToolInput,
  RuntimeCommandResult,
  RuntimeCreateAgentRunInput,
  RuntimeCreateResult,
  RuntimeEventInterpretation,
  RuntimeInterAgentRelayHandler,
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
import { resolveSingleAgentRuntimeContext } from "../single-agent-runtime-context.js";

const buildCommandFailure = (error: unknown): RuntimeCommandResult => ({
  accepted: false,
  code: "CLAUDE_RUNTIME_COMMAND_FAILED",
  message: String(error),
});

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class ClaudeAgentSdkRuntimeAdapter implements RuntimeAdapter {
  readonly runtimeKind = "claude_agent_sdk" as const;
  readonly teamExecutionMode = "member_runtime" as const;
  private readonly runtimeService: ClaudeAgentSdkRuntimeService;

  constructor(runtimeService: ClaudeAgentSdkRuntimeService = getClaudeAgentSdkRuntimeService()) {
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
        sessionId: session.sessionId,
        threadId: session.sessionId,
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
        sessionId: input.runtimeReference?.sessionId ?? input.runtimeReference?.threadId ?? input.runId,
        metadata: runtimeMetadata,
      },
    );

    return {
      runId: input.runId,
      runtimeReference: {
        runtimeKind: this.runtimeKind,
        sessionId: session.sessionId,
        threadId: session.sessionId,
        metadata: {
          ...runtimeMetadata,
          ...session.metadata,
        },
      },
    };
  }

  getRunRuntimeReference(runId: string) {
    const runtimeReference = this.runtimeService.getRunRuntimeReference(runId);
    if (!runtimeReference) {
      return null;
    }
    return {
      runtimeKind: this.runtimeKind,
      sessionId: runtimeReference.sessionId,
      threadId: runtimeReference.sessionId,
      metadata: runtimeReference.metadata,
    };
  }

  isRunActive(runId: string): boolean {
    return this.runtimeService.hasRunSession(runId);
  }

  subscribeToRunEvents(runId: string, onEvent: (event: unknown) => void): () => void {
    return this.runtimeService.subscribeToRunEvents(runId, (event) => {
      onEvent(event);
    });
  }

  interpretRuntimeEvent(event: unknown): RuntimeEventInterpretation | null {
    const payload = asObject(event);
    if (!payload) {
      return null;
    }

    const rawMethod = asNonEmptyString(payload.method);
    let statusHint: RuntimeEventInterpretation["statusHint"] = null;
    if (rawMethod === "turn/started") {
      statusHint = "ACTIVE";
    } else if (rawMethod === "turn/completed") {
      statusHint = "IDLE";
    } else if (rawMethod === "error") {
      statusHint = "ERROR";
    }

    const params = asObject(payload.params);
    const resolvedSessionId =
      asNonEmptyString(params?.sessionId) ??
      asNonEmptyString(params?.session_id) ??
      asNonEmptyString(params?.threadId) ??
      asNonEmptyString(params?.thread_id);
    const runtimeReferenceHint = resolvedSessionId
      ? {
          sessionId: resolvedSessionId,
          threadId: resolvedSessionId,
        }
      : null;

    if (!rawMethod && !statusHint && !runtimeReferenceHint) {
      return null;
    }
    return {
      normalizedMethod: rawMethod,
      statusHint,
      runtimeReferenceHint,
    };
  }

  async sendTurn(input: RuntimeSendTurnInput): Promise<RuntimeCommandResult> {
    try {
      const turnResult = await this.runtimeService.sendTurn(input.runId, input.message);
      const runtimeReference = this.runtimeService.getRunRuntimeReference(input.runId);
      return {
        accepted: true,
        turnId: turnResult.turnId ?? null,
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

  bindInterAgentRelayHandler(handler: RuntimeInterAgentRelayHandler): () => void {
    this.runtimeService.setInterAgentRelayHandler((request) =>
      handler({
        ...request,
        senderMemberName: request.senderMemberName ?? null,
        senderTeamRunId: request.senderTeamRunId ?? null,
      }),
    );
    return () => {
      this.runtimeService.setInterAgentRelayHandler(null);
    };
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
