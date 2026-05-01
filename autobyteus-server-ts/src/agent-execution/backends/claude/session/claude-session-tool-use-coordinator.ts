import { asString, type ClaudeSessionEvent } from "../claude-runtime-shared.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { isClaudeSendMessageToolName } from "../claude-send-message-tool-name.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";

type ClaudeCanUseToolOptions = {
  signal?: AbortSignal;
  toolUseID?: string;
};

type ClaudeToolApprovalDecision = {
  approved: boolean;
  reason: string | null;
};

type PendingClaudeToolApproval = {
  resolveDecision: (decision: ClaudeToolApprovalDecision) => void;
};

type ObservedClaudeToolInvocation = {
  toolName: string | null;
  toolInput: Record<string, unknown>;
  startedEmitted: boolean;
};

const CLAUDE_TOOL_APPROVAL_TIMEOUT_MS = 120_000;

export class ClaudeSessionToolUseCoordinator {
  constructor(
    private readonly pendingToolApprovalsByRunId: Map<string, Map<string, PendingClaudeToolApproval>>,
    private readonly observedToolInvocationsByRunId: Map<
      string,
      Map<string, ObservedClaudeToolInvocation>
    >,
    private readonly emitEvent: (
      runContext: ClaudeRunContext,
      event: ClaudeSessionEvent,
    ) => void,
  ) {}

  async approveTool(
    runId: string,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<void> {
    const pendingApprovals = this.pendingToolApprovalsByRunId.get(runId);
    const pendingApproval = pendingApprovals?.get(invocationId);
    if (!pendingApproval) {
      throw new Error(
        `No pending Claude tool approval found for invocation '${invocationId}'.`,
      );
    }
    pendingApproval.resolveDecision({
      approved,
      reason: asString(reason),
    });
  }

  clearPendingToolApprovals(runId: string, reason: string): void {
    const pendingApprovals = this.pendingToolApprovalsByRunId.get(runId);
    if (!pendingApprovals) {
      return;
    }
    const approvals = Array.from(pendingApprovals.values());
    this.pendingToolApprovalsByRunId.delete(runId);
    for (const approval of approvals) {
      approval.resolveDecision({
        approved: false,
        reason,
      });
    }
  }

  async handleToolPermissionCheck(
    runContext: ClaudeRunContext,
    toolNameRaw: string,
    toolInputRaw: Record<string, unknown>,
    options: ClaudeCanUseToolOptions,
  ): Promise<Record<string, unknown>> {
    const invocationId =
      asString(options.toolUseID) ??
      `${runContext.runId}:tool:${Date.now()}:${Math.random().toString(16).slice(2, 10)}`;
    const toolName = asString(toolNameRaw) ?? "unknown_tool";
    const toolInput =
      toolInputRaw && typeof toolInputRaw === "object" && !Array.isArray(toolInputRaw)
        ? { ...toolInputRaw }
        : {};

    this.upsertObservedToolInvocation(runContext.runId, invocationId, {
      toolName,
      toolInput,
    });
    this.emitToolExecutionStartedIfNeeded(runContext, invocationId);

    const decision = await this.resolveToolApprovalDecision({
      runContext,
      invocationId,
      toolName,
      toolInput,
      signal: options.signal,
    });

    if (decision.approved) {
      return {
        behavior: "allow",
        updatedInput: toolInput,
        toolUseID: invocationId,
      };
    }

    const denialReason = decision.reason ?? "Tool execution denied by user.";
    return {
      behavior: "deny",
      message: denialReason,
      toolUseID: invocationId,
    };
  }

  async requestToolApprovalDecision(input: {
    runContext: ClaudeRunContext;
    invocationId: string;
    toolName: string;
    toolInput: Record<string, unknown>;
    signal?: AbortSignal;
  }): Promise<ClaudeToolApprovalDecision> {
    return this.resolveToolApprovalDecision(input);
  }

  processToolLifecycleChunk(runContext: ClaudeRunContext, chunk: unknown): void {
    const payload =
      chunk && typeof chunk === "object" && !Array.isArray(chunk)
        ? (chunk as Record<string, unknown>)
        : null;
    if (!payload) {
      return;
    }

    const messagePayload =
      payload.message && typeof payload.message === "object" && !Array.isArray(payload.message)
        ? (payload.message as Record<string, unknown>)
        : null;
    const contentBlocks = Array.isArray(messagePayload?.content)
      ? (messagePayload?.content as unknown[])
      : [];

    const type = asString(payload.type);
    for (const blockRaw of contentBlocks) {
      const block =
        blockRaw && typeof blockRaw === "object" && !Array.isArray(blockRaw)
          ? (blockRaw as Record<string, unknown>)
          : null;
      if (!block) {
        continue;
      }

      const blockType = asString(block.type);
      if (blockType === "tool_use" && type === "assistant") {
        const invocationId = asString(block.id) ?? asString(block.tool_use_id);
        const toolName = asString(block.name) ?? asString(block.tool_name);
        if (!invocationId || !toolName) {
          continue;
        }
        const toolInput =
          (block.input && typeof block.input === "object" && !Array.isArray(block.input)
            ? (block.input as Record<string, unknown>)
            : null) ??
          (block.arguments && typeof block.arguments === "object" && !Array.isArray(block.arguments)
            ? (block.arguments as Record<string, unknown>)
            : null) ??
          {};
        this.upsertObservedToolInvocation(runContext.runId, invocationId, {
          toolName,
          toolInput,
        });
        this.emitToolExecutionStartedIfNeeded(runContext, invocationId);
        continue;
      }

      if (blockType !== "tool_result" || type !== "user") {
        continue;
      }

      const invocationId = asString(block.tool_use_id) ?? asString(block.id);
      if (!invocationId) {
        continue;
      }

      const tracked = this.consumeObservedToolInvocation(runContext.runId, invocationId);
      const toolName = tracked?.toolName ?? asString(block.tool_name) ?? asString(block.name);
      if (!toolName) {
        continue;
      }
      if (isClaudeSendMessageToolName(toolName)) {
        continue;
      }
      const blockResult = block.content;
      const isError = block.is_error === true;

      if (isError) {
        const errorMessage = typeof blockResult === "string" ? blockResult : JSON.stringify(blockResult);
        this.emitEvent(runContext, {
          method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
          params: {
            invocation_id: invocationId,
            tool_name: toolName,
            ...(tracked ? { arguments: tracked.toolInput } : {}),
            error: errorMessage,
          },
        });
        continue;
      }

      this.emitEvent(runContext, {
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
        params: {
          invocation_id: invocationId,
          tool_name: toolName,
          ...(tracked ? { arguments: tracked.toolInput } : {}),
          result: blockResult,
        },
      });
    }
  }

  private async resolveToolApprovalDecision(input: {
    runContext: ClaudeRunContext;
    invocationId: string;
    toolName: string;
    toolInput: Record<string, unknown>;
    signal?: AbortSignal;
  }): Promise<ClaudeToolApprovalDecision> {
    if (input.runContext.runtimeContext.autoExecuteTools) {
      this.emitEvent(input.runContext, {
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_APPROVED,
        params: {
          invocation_id: input.invocationId,
          tool_name: input.toolName,
          arguments: input.toolInput,
          reason: "auto_execute_tools_enabled",
        },
      });
      return {
        approved: true,
        reason: "auto_execute_tools_enabled",
      };
    }

    const decision = await this.awaitToolApprovalDecision(input);

    if (decision.approved) {
      this.emitEvent(input.runContext, {
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_APPROVED,
        params: {
          invocation_id: input.invocationId,
          tool_name: input.toolName,
          arguments: input.toolInput,
          ...(decision.reason ? { reason: decision.reason } : {}),
        },
      });
      return decision;
    }

    const denialReason = decision.reason ?? "Tool execution denied by user.";
    this.emitEvent(input.runContext, {
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_DENIED,
      params: {
        invocation_id: input.invocationId,
        tool_name: input.toolName,
        arguments: input.toolInput,
        reason: denialReason,
        error: denialReason,
      },
    });
    return {
      approved: false,
      reason: denialReason,
    };
  }

  private awaitToolApprovalDecision(input: {
    runContext: ClaudeRunContext;
    invocationId: string;
    toolName: string;
    toolInput: Record<string, unknown>;
    signal?: AbortSignal;
  }): Promise<ClaudeToolApprovalDecision> {
    const pendingApprovals = this.getOrCreatePendingApprovals(input.runContext.runId);

    return new Promise((resolve) => {
      let settled = false;
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

      const finalize = (decision: ClaudeToolApprovalDecision): void => {
        if (settled) {
          return;
        }
        settled = true;
        pendingApprovals.delete(input.invocationId);
        if (pendingApprovals.size === 0) {
          this.pendingToolApprovalsByRunId.delete(input.runContext.runId);
        }
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        if (input.signal) {
          input.signal.removeEventListener("abort", onAbortSignal);
        }
        resolve(decision);
      };

      const onAbortSignal = (): void => {
        finalize({
          approved: false,
          reason: "Tool approval interrupted.",
        });
      };

      pendingApprovals.set(input.invocationId, {
        resolveDecision: finalize,
      });

      timeoutHandle = setTimeout(() => {
        finalize({
          approved: false,
          reason: "Tool approval timed out.",
        });
      }, CLAUDE_TOOL_APPROVAL_TIMEOUT_MS);

      if (input.signal) {
        input.signal.addEventListener("abort", onAbortSignal, { once: true });
      }

      this.emitEvent(input.runContext, {
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
        params: {
          invocation_id: input.invocationId,
          tool_name: input.toolName,
          arguments: input.toolInput,
        },
      });
    });
  }

  private getOrCreatePendingApprovals(runId: string): Map<string, PendingClaudeToolApproval> {
    const existing = this.pendingToolApprovalsByRunId.get(runId);
    if (existing) {
      return existing;
    }
    const created = new Map<string, PendingClaudeToolApproval>();
    this.pendingToolApprovalsByRunId.set(runId, created);
    return created;
  }

  private upsertObservedToolInvocation(
    runId: string,
    invocationId: string,
    observed: Omit<ObservedClaudeToolInvocation, "startedEmitted">,
  ): ObservedClaudeToolInvocation {
    const invocations = this.getOrCreateObservedToolInvocations(runId);
    const existing = invocations.get(invocationId);
    const toolInput = Object.keys(observed.toolInput).length > 0
      ? { ...observed.toolInput }
      : { ...(existing?.toolInput ?? observed.toolInput) };
    const toolName = observed.toolName && observed.toolName !== "unknown_tool"
      ? observed.toolName
      : existing?.toolName ?? observed.toolName ?? null;
    const next: ObservedClaudeToolInvocation = {
      toolName,
      toolInput,
      startedEmitted: existing?.startedEmitted ?? false,
    };
    invocations.set(invocationId, next);
    return next;
  }

  private emitToolExecutionStartedIfNeeded(
    runContext: ClaudeRunContext,
    invocationId: string,
  ): void {
    const observed = this.observedToolInvocationsByRunId.get(runContext.runId)?.get(invocationId);
    if (!observed || observed.startedEmitted || !observed.toolName) {
      return;
    }
    observed.startedEmitted = true;
    if (isClaudeSendMessageToolName(observed.toolName)) {
      return;
    }
    this.emitEvent(runContext, {
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
      params: {
        invocation_id: invocationId,
        tool_name: observed.toolName,
        arguments: observed.toolInput,
      },
    });
  }

  private getOrCreateObservedToolInvocations(
    runId: string,
  ): Map<string, ObservedClaudeToolInvocation> {
    const existing = this.observedToolInvocationsByRunId.get(runId);
    if (existing) {
      return existing;
    }
    const created = new Map<string, ObservedClaudeToolInvocation>();
    this.observedToolInvocationsByRunId.set(runId, created);
    return created;
  }

  private consumeObservedToolInvocation(
    runId: string,
    invocationId: string,
  ): ObservedClaudeToolInvocation | null {
    const existing = this.observedToolInvocationsByRunId.get(runId);
    if (!existing) {
      return null;
    }
    const observed = existing.get(invocationId) ?? null;
    existing.delete(invocationId);
    if (existing.size === 0) {
      this.observedToolInvocationsByRunId.delete(runId);
    }
    return observed;
  }
}
