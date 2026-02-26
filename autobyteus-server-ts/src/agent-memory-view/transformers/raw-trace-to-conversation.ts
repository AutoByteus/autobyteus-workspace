import type { MemoryConversationEntry } from "../domain/models.js";

type RawTrace = Record<string, unknown>;

const buildEntry = (
  kind: string,
  role: string | null,
  trace: RawTrace,
  toolResult?: unknown,
  toolError?: string | null,
): MemoryConversationEntry => {
  return {
    kind,
    role,
    content: (trace.content as string | undefined) ?? null,
    toolName: (trace.tool_name as string | undefined) ?? null,
    toolArgs: (trace.tool_args as Record<string, unknown> | undefined) ?? null,
    toolResult: toolResult ?? (trace.tool_result as unknown) ?? null,
    toolError:
      toolError ??
      (trace.tool_error as string | undefined) ??
      null,
    media: (trace.media as Record<string, string[]> | undefined) ?? null,
    ts: (trace.ts as number | undefined) ?? null,
  };
};

export const buildConversationView = (
  rawTraces: RawTrace[],
  collapseTools = true,
): MemoryConversationEntry[] => {
  const entries: MemoryConversationEntry[] = [];
  const pendingToolCalls: Record<string, MemoryConversationEntry> = {};

  for (const trace of rawTraces) {
    const traceType = (trace.trace_type as string | undefined) ?? "";

    if (traceType === "user" || traceType === "assistant") {
      entries.push(buildEntry("message", traceType, trace));
      continue;
    }

    if (traceType === "tool_call") {
      if (!collapseTools) {
        entries.push(buildEntry("tool_call", null, trace));
        continue;
      }

      const entry = buildEntry("tool_call_pending", null, trace);
      entries.push(entry);
      const toolCallId = trace.tool_call_id as string | undefined;
      if (toolCallId && !pendingToolCalls[toolCallId]) {
        pendingToolCalls[toolCallId] = entry;
      }
      continue;
    }

    if (traceType === "tool_result") {
      if (!collapseTools) {
        entries.push(buildEntry("tool_result", null, trace));
        continue;
      }

      const toolCallId = trace.tool_call_id as string | undefined;
      const entry = toolCallId ? pendingToolCalls[toolCallId] : undefined;
      if (entry && entry.toolResult == null && entry.toolError == null) {
        entry.kind = "tool_call";
        entry.toolResult = (trace.tool_result as unknown) ?? null;
        entry.toolError = (trace.tool_error as string | undefined) ?? null;
        entry.toolArgs =
          entry.toolArgs ??
          (trace.tool_args as Record<string, unknown> | undefined) ??
          null;
        entry.toolName =
          entry.toolName ??
          (trace.tool_name as string | undefined) ??
          null;
        continue;
      }

      entries.push(buildEntry("tool_result_orphan", null, trace));
    }
  }

  return entries;
};
