import { asObject, asString, type ClaudeSessionEvent } from "../claude-runtime-shared.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { isClaudeSendMessageMcpToolName } from "../claude-send-message-tool-name.js";
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
  segmentStartedEmitted: boolean;
  lifecycleStartedEmitted: boolean;
  segmentEndedEmitted: boolean;
  terminalLifecycleEmitted: boolean;
};

type ClaudeToolCompletionMetadata = {
  result?: unknown;
  error?: string;
  reason?: string;
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
    this.emitToolSegmentStartIfNeeded(runContext, invocationId);
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
    const payload = asObject(chunk);
    if (!payload) {
      return;
    }

    const messagePayload = asObject(payload.message);
    const contentBlocks = Array.isArray(messagePayload?.content)
      ? (messagePayload?.content as unknown[])
      : [];

    const messageType = asString(payload.type);
    for (const blockRaw of contentBlocks) {
      this.processToolLifecycleContentBlock(runContext, {
        messageType,
        block: blockRaw,
      });
    }
  }

  processToolLifecycleContentBlock(
    runContext: ClaudeRunContext,
    input: {
      messageType: string | null;
      block: unknown;
    },
  ): void {
    const block = asObject(input.block);
    if (!block) {
      return;
    }
    const blockType = asString(block.type);
    if (blockType === "tool_use" && input.messageType === "assistant") {
      const invocationId = asString(block.id) ?? asString(block.tool_use_id);
      const toolName = asString(block.name) ?? asString(block.tool_name);
      if (!invocationId || !toolName) {
        return;
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
      this.emitToolSegmentStartIfNeeded(runContext, invocationId);
      this.emitToolExecutionStartedIfNeeded(runContext, invocationId);
      return;
    }

    if (blockType !== "tool_result" || input.messageType !== "user") {
      return;
    }

    const invocationId = asString(block.tool_use_id) ?? asString(block.id);
    if (!invocationId) {
      return;
    }

    const tracked = this.observedToolInvocationsByRunId.get(runContext.runId)?.get(invocationId) ?? null;
    const toolName = tracked?.toolName ?? asString(block.tool_name) ?? asString(block.name);
    if (!toolName) {
      return;
    }
    if (isClaudeSendMessageMcpToolName(toolName)) {
      this.consumeObservedToolInvocation(runContext.runId, invocationId);
      return;
    }
    this.upsertObservedToolInvocation(runContext.runId, invocationId, {
      toolName,
      toolInput: tracked?.toolInput ?? {},
    });
    const blockResult = block.content;
    const isError = block.is_error === true;

    if (isError) {
      const errorMessage = typeof blockResult === "string" ? blockResult : JSON.stringify(blockResult);
      this.emitToolSegmentStartIfNeeded(runContext, invocationId);
      this.emitToolSegmentEndIfNeeded(runContext, invocationId, { error: errorMessage });
      this.emitToolExecutionCompletedIfNeeded(runContext, invocationId, {
        error: errorMessage,
      });
      this.consumeObservedToolInvocation(runContext.runId, invocationId);
      return;
    }

    this.emitToolSegmentStartIfNeeded(runContext, invocationId);
    this.emitToolSegmentEndIfNeeded(runContext, invocationId, { result: blockResult });
    this.emitToolExecutionCompletedIfNeeded(runContext, invocationId, {
      result: blockResult,
    });
    this.consumeObservedToolInvocation(runContext.runId, invocationId);
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
          turn_id: input.runContext.runtimeContext.activeTurnId,
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
          turn_id: input.runContext.runtimeContext.activeTurnId,
          arguments: input.toolInput,
          ...(decision.reason ? { reason: decision.reason } : {}),
        },
      });
      return decision;
    }

    const denialReason = decision.reason ?? "Tool execution denied by user.";
    this.emitToolSegmentEndIfNeeded(input.runContext, input.invocationId, {
      error: denialReason,
      reason: denialReason,
    });
    this.emitEvent(input.runContext, {
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_DENIED,
      params: {
        invocation_id: input.invocationId,
        tool_name: input.toolName,
        turn_id: input.runContext.runtimeContext.activeTurnId,
        arguments: input.toolInput,
        reason: denialReason,
        error: denialReason,
      },
    });
    const observed = this.observedToolInvocationsByRunId
      .get(input.runContext.runId)
      ?.get(input.invocationId);
    if (observed) {
      observed.terminalLifecycleEmitted = true;
    }
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
          turn_id: input.runContext.runtimeContext.activeTurnId,
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
    observed: Pick<ObservedClaudeToolInvocation, "toolName" | "toolInput">,
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
      segmentStartedEmitted: existing?.segmentStartedEmitted ?? false,
      lifecycleStartedEmitted: existing?.lifecycleStartedEmitted ?? false,
      segmentEndedEmitted: existing?.segmentEndedEmitted ?? false,
      terminalLifecycleEmitted: existing?.terminalLifecycleEmitted ?? false,
    };
    invocations.set(invocationId, next);
    return next;
  }

  private emitToolSegmentStartIfNeeded(runContext: ClaudeRunContext, invocationId: string): void {
    const observed = this.observedToolInvocationsByRunId.get(runContext.runId)?.get(invocationId);
    if (!observed || observed.segmentStartedEmitted || !observed.toolName) {
      return;
    }
    observed.segmentStartedEmitted = true;
    if (isClaudeSendMessageMcpToolName(observed.toolName)) {
      return;
    }
    this.emitEvent(runContext, {
      method: ClaudeSessionEventName.ITEM_ADDED,
      params: {
        id: invocationId,
        turn_id: runContext.runtimeContext.activeTurnId,
        segment_type: "tool_call",
        tool_name: observed.toolName,
        arguments: observed.toolInput,
        metadata: {
          tool_name: observed.toolName,
          arguments: observed.toolInput,
        },
      },
    });
  }

  private emitToolExecutionStartedIfNeeded(
    runContext: ClaudeRunContext,
    invocationId: string,
  ): void {
    const observed = this.observedToolInvocationsByRunId.get(runContext.runId)?.get(invocationId);
    if (!observed || observed.lifecycleStartedEmitted || !observed.toolName) {
      return;
    }
    observed.lifecycleStartedEmitted = true;
    if (isClaudeSendMessageMcpToolName(observed.toolName)) {
      return;
    }
    this.emitEvent(runContext, {
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
      params: {
        invocation_id: invocationId,
        tool_name: observed.toolName,
        turn_id: runContext.runtimeContext.activeTurnId,
        arguments: observed.toolInput,
      },
    });
  }

  private emitToolSegmentEndIfNeeded(
    runContext: ClaudeRunContext,
    invocationId: string,
    completionMetadata: ClaudeToolCompletionMetadata,
  ): void {
    const observed = this.observedToolInvocationsByRunId.get(runContext.runId)?.get(invocationId);
    if (!observed || observed.segmentEndedEmitted || !observed.toolName) {
      return;
    }
    observed.segmentEndedEmitted = true;
    if (isClaudeSendMessageMcpToolName(observed.toolName)) {
      return;
    }
    const metadata = {
      tool_name: observed.toolName,
      arguments: observed.toolInput,
      ...completionMetadata,
    };
    this.emitEvent(runContext, {
      method: ClaudeSessionEventName.ITEM_COMPLETED,
      params: {
        id: invocationId,
        turn_id: runContext.runtimeContext.activeTurnId,
        segment_type: "tool_call",
        tool_name: observed.toolName,
        arguments: observed.toolInput,
        metadata,
      },
    });
  }

  private emitToolExecutionCompletedIfNeeded(
    runContext: ClaudeRunContext,
    invocationId: string,
    completionMetadata: Pick<ClaudeToolCompletionMetadata, "result" | "error">,
  ): void {
    const observed = this.observedToolInvocationsByRunId.get(runContext.runId)?.get(invocationId);
    if (!observed || observed.terminalLifecycleEmitted || !observed.toolName) {
      return;
    }
    observed.terminalLifecycleEmitted = true;
    if (isClaudeSendMessageMcpToolName(observed.toolName)) {
      return;
    }
    this.emitEvent(runContext, {
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: invocationId,
        tool_name: observed.toolName,
        turn_id: runContext.runtimeContext.activeTurnId,
        arguments: observed.toolInput,
        ...("error" in completionMetadata
          ? { error: completionMetadata.error }
          : { result: completionMetadata.result }),
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
