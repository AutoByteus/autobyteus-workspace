import type { AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import type { RunMemoryWriter } from "../store/run-memory-writer.js";
import {
  createToolCallIdentity,
  toolCallIdentityKey,
  type ToolCallIdentity,
} from "autobyteus-ts/memory/models/tool-call-identity.js";
import type { ToolTraceLifecycleGroup } from "autobyteus-ts/memory/tool-trace-lifecycle-index.js";
import {
  extractError,
  extractInvocationId,
  extractReason,
  extractTimestamp,
  extractToolArgs,
  extractToolName,
  extractToolResult,
  extractTurnId,
} from "./runtime-memory-event-payload.js";

type RuntimeToolState = {
  identity: ToolCallIdentity;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  callObserved?: boolean;
  callRawTraceId?: string;
  resultRawTraceId?: string;
};

export type ToolTraceSequencingOutcome = {
  resolvedTurnId: string | null;
};

export class RuntimeToolTraceSequencer {
  private readonly tools = new Map<string, RuntimeToolState>();

  constructor(
    private readonly input: {
      writer: RunMemoryWriter;
      toolTraceLifecycleGroups: ReadonlyMap<string, ToolTraceLifecycleGroup>;
      flushReasoningBoundary: (turnId: string, sourceEvent: string) => void;
    },
  ) {
    this.hydrateToolStates(input.toolTraceLifecycleGroups);
  }

  recordCallObservation(event: AgentRunEvent, activeTurnId: string | null): ToolTraceSequencingOutcome {
    const identity = this.resolveToolIdentity(event.payload, activeTurnId, "observation");
    if (!identity) return { resolvedTurnId: null };
    const key = toolCallIdentityKey(identity);
    const existing = this.tools.get(key);
    if (existing?.resultRawTraceId) return { resolvedTurnId: identity.turnId };
    const observedName = extractToolName(event.payload);
    const knownName = existing?.toolName?.trim() || observedName?.trim();
    if (!knownName) {
      console.warn(
        `[RuntimeToolTraceSequencer] skipped tool observation '${identity.toolCallId}' in turn '${identity.turnId}' because it cannot create or match a tool card without a usable tool name.`,
      );
      return { resolvedTurnId: identity.turnId };
    }

    const tool = existing ?? this.getOrCreateToolState(identity);
    const firstObservation = !tool.callObserved && !tool.callRawTraceId;
    this.mergeToolObservation(tool, event.payload);
    if (firstObservation) {
      tool.callObserved = true;
      this.input.flushReasoningBoundary(identity.turnId, event.eventType);
    }
    if (!tool.callRawTraceId && this.isCallReady(tool)) {
      this.persistToolCall(tool, event);
    }
    return { resolvedTurnId: identity.turnId };
  }

  recordTerminal(event: AgentRunEvent, activeTurnId: string | null): ToolTraceSequencingOutcome {
    const identity = this.resolveToolIdentity(event.payload, activeTurnId, "terminal");
    if (!identity) return { resolvedTurnId: null };
    const key = toolCallIdentityKey(identity);
    const existing = this.tools.get(key);
    if (existing?.resultRawTraceId) return { resolvedTurnId: identity.turnId };
    const observedName = extractToolName(event.payload);
    const knownName = existing?.toolName?.trim() || observedName?.trim();
    if (!knownName) {
      console.warn(
        `[RuntimeToolTraceSequencer] skipped terminal tool event '${identity.toolCallId}' in turn '${identity.turnId}' because it cannot create or match a tool card without a usable tool name.`,
      );
      return { resolvedTurnId: identity.turnId };
    }

    const tool = existing ?? this.getOrCreateToolState(identity);
    const firstObservation = !tool.callObserved && !tool.callRawTraceId;
    this.mergeToolObservation(tool, event.payload);
    if (firstObservation) {
      tool.callObserved = true;
      this.input.flushReasoningBoundary(identity.turnId, event.eventType);
    }

    if (!tool.callRawTraceId) {
      if (!this.isCallReady(tool)) {
        console.warn(
          `[RuntimeToolTraceSequencer] deferred terminal tool event '${identity.toolCallId}' in turn '${identity.turnId}' because authoritative call arguments were unavailable.`,
        );
        return { resolvedTurnId: identity.turnId };
      }
      this.persistToolCall(tool, event);
    }
    this.persistTerminalResult(tool, event);
    return { resolvedTurnId: identity.turnId };
  }

  interruptTurn(event: AgentRunEvent, turnId: string): void {
    const error = extractError(event.payload) ?? extractReason(event.payload) ?? "Tool execution interrupted.";
    for (const tool of this.tools.values()) {
      if (tool.identity.turnId !== turnId || !tool.callRawTraceId || tool.resultRawTraceId) continue;
      this.persistToolResult(tool, event, null, error, "Tool execution interrupted.");
    }
  }

  completeTurn(turnId: string): void {
    for (const [key, tool] of this.tools) {
      if (tool.identity.turnId !== turnId || tool.callRawTraceId || tool.resultRawTraceId) continue;
      this.tools.delete(key);
    }
  }

  private persistTerminalResult(tool: RuntimeToolState, event: AgentRunEvent): void {
    const denied = event.eventType === AgentRunEventType.TOOL_DENIED;
    const failed = event.eventType === AgentRunEventType.TOOL_EXECUTION_FAILED;
    const interrupted = event.eventType === AgentRunEventType.TOOL_EXECUTION_INTERRUPTED;
    const error = denied
      ? extractError(event.payload) ?? extractReason(event.payload) ?? "Tool execution denied."
      : failed
        ? extractError(event.payload) ?? "Tool execution failed."
        : interrupted
          ? extractError(event.payload) ?? extractReason(event.payload) ?? "Tool execution interrupted."
          : null;
    const result = denied
      ? { status: "denied", reason: extractReason(event.payload) ?? error }
      : interrupted ? null : extractToolResult(event.payload);
    this.persistToolResult(
      tool,
      event,
      result,
      error,
      denied ? "Tool execution denied." : interrupted ? "Tool execution interrupted." : "",
    );
  }

  private persistToolCall(tool: RuntimeToolState, event: AgentRunEvent): void {
    if (tool.callRawTraceId || !this.isCallReady(tool)) return;
    const trace = this.input.writer.write({
      trace: {
        traceType: "tool_call",
        turnId: tool.identity.turnId,
        content: "",
        sourceEvent: event.eventType,
        ts: extractTimestamp(event.payload),
        toolName: tool.toolName,
        toolCallId: tool.identity.toolCallId,
        toolArgs: tool.toolArgs,
      },
      snapshotUpdate: {
        kind: "tool_call",
        toolCallId: tool.identity.toolCallId,
        toolName: tool.toolName,
        toolArgs: tool.toolArgs,
      },
    });
    tool.callObserved = true;
    tool.callRawTraceId = trace.id;
  }

  private persistToolResult(
    tool: RuntimeToolState,
    event: AgentRunEvent,
    result: unknown,
    error: string | null,
    content: string,
  ): void {
    if (tool.resultRawTraceId || !tool.callRawTraceId || !tool.toolName) return;
    const trace = this.input.writer.write({
      trace: {
        traceType: "tool_result",
        turnId: tool.identity.turnId,
        content,
        sourceEvent: event.eventType,
        ts: extractTimestamp(event.payload),
        toolCallId: tool.identity.toolCallId,
        toolResult: result === undefined ? null : result,
        toolError: error,
      },
      snapshotUpdate: {
        kind: "tool_result",
        toolCallId: tool.identity.toolCallId,
        toolName: tool.toolName,
        toolResult: result === undefined ? null : result,
        toolError: error,
      },
    });
    tool.resultRawTraceId = trace.id;
  }

  private getOrCreateToolState(identity: ToolCallIdentity): RuntimeToolState {
    const key = toolCallIdentityKey(identity);
    const existing = this.tools.get(key);
    if (existing) return existing;
    const tool: RuntimeToolState = { identity };
    this.tools.set(key, tool);
    return tool;
  }

  private mergeToolObservation(tool: RuntimeToolState, payload: Record<string, unknown>): void {
    const observedName = extractToolName(payload);
    const observedArgs = extractToolArgs(payload);
    if (!tool.callRawTraceId) {
      if (observedName) tool.toolName = observedName;
      if (observedArgs !== undefined) tool.toolArgs = observedArgs;
    } else if (!tool.toolName && observedName) {
      tool.toolName = observedName;
    }
  }

  private isCallReady(tool: RuntimeToolState): tool is RuntimeToolState & {
    toolName: string;
    toolArgs: Record<string, unknown>;
  } {
    return Boolean(tool.toolName?.trim()) && tool.toolArgs !== undefined;
  }

  private hydrateToolStates(groups: ReadonlyMap<string, ToolTraceLifecycleGroup>): void {
    for (const [key, group] of groups) {
      const tool: RuntimeToolState = { identity: group.identity };
      if (group.call?.toolName?.trim()) tool.toolName = group.call.toolName.trim();
      if (group.call?.toolArgs !== null && group.call?.toolArgs !== undefined) {
        tool.toolArgs = group.call.toolArgs;
      }
      if (group.call) {
        tool.callObserved = true;
        tool.callRawTraceId = group.call.id ?? `physical:${key}:call`;
      }
      if (group.result) tool.resultRawTraceId = group.result.id ?? `physical:${key}:result`;
      this.tools.set(key, tool);
    }
  }

  private resolveToolIdentity(
    payload: Record<string, unknown>,
    activeTurnId: string | null,
    mode: "observation" | "terminal",
  ): ToolCallIdentity | null {
    const toolCallId = extractInvocationId(payload);
    if (!toolCallId) {
      console.warn("[RuntimeToolTraceSequencer] skipped tool event without an invocation id.");
      return null;
    }
    const explicitTurnId = extractTurnId(payload);
    if (explicitTurnId) return { turnId: explicitTurnId, toolCallId };
    const matches = [...this.tools.values()].filter((tool) => tool.identity.toolCallId === toolCallId);
    if (mode === "terminal") {
      if (matches.length === 1) return matches[0]!.identity;
      if (matches.length > 1) {
        console.warn(
          `[RuntimeToolTraceSequencer] skipped terminal tool event '${toolCallId}' because it matches multiple turn lifecycles.`,
        );
        return null;
      }
    } else {
      const activeMatch = matches.find((tool) => tool.identity.turnId === activeTurnId);
      if (activeMatch) return activeMatch.identity;
      const pendingMatches = matches.filter((tool) => !tool.resultRawTraceId);
      if (pendingMatches.length === 1) return pendingMatches[0]!.identity;
      if (pendingMatches.length > 1 || (!activeTurnId && matches.length > 1)) {
        console.warn(
          `[RuntimeToolTraceSequencer] skipped tool observation '${toolCallId}' because it matches multiple turn lifecycles.`,
        );
        return null;
      }
      if (!activeTurnId && matches.length === 1) return matches[0]!.identity;
    }
    const identity = createToolCallIdentity(activeTurnId, toolCallId);
    if (!identity) {
      console.warn(`[RuntimeToolTraceSequencer] skipped tool event '${toolCallId}' without a turn identity.`);
      return null;
    }
    return identity;
  }
}
