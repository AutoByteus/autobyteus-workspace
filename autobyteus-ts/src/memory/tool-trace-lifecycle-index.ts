import { createToolCallIdentity, toolCallIdentityKey, type ToolCallIdentity } from './models/tool-call-identity.js';

export type PhysicalToolTraceRecord = {
  id?: string | null;
  ts?: number | null;
  seq?: number | null;
  turnId: string;
  traceType: string;
  toolCallId?: string | null;
  toolName?: string | null;
  toolArgs?: Record<string, unknown> | null;
  toolResult?: unknown;
  toolError?: string | null;
};

export type ToolTraceLifecycleGroup = Readonly<{
  identity: ToolCallIdentity;
  call: PhysicalToolTraceRecord | null;
  result: PhysicalToolTraceRecord | null;
}>;

export type ToolCallContext = Readonly<{
  identity: ToolCallIdentity;
  toolName: string | null;
  toolArgs: Record<string, unknown> | null;
}>;

type MutableToolTraceLifecycleGroup = {
  identity: ToolCallIdentity;
  call: PhysicalToolTraceRecord | null;
  result: PhysicalToolTraceRecord | null;
};

export const buildToolTraceLifecycleIndex = (
  records: readonly PhysicalToolTraceRecord[],
): ReadonlyMap<string, ToolTraceLifecycleGroup> => {
  const groups = new Map<string, MutableToolTraceLifecycleGroup>();

  for (const record of records) {
    if (record.traceType !== 'tool_call' && record.traceType !== 'tool_result') continue;
    const identity = createToolCallIdentity(record.turnId, record.toolCallId);
    if (!identity) continue;
    const key = toolCallIdentityKey(identity);
    const group = groups.get(key) ?? { identity, call: null, result: null };
    if (record.traceType === 'tool_call' && !group.call) group.call = record;
    if (record.traceType === 'tool_result' && !group.result) group.result = record;
    groups.set(key, group);
  }

  return groups;
};

export const buildToolCallContextIndex = (
  groups: ReadonlyMap<string, ToolTraceLifecycleGroup>,
): ReadonlyMap<string, ToolCallContext> => {
  const context = new Map<string, ToolCallContext>();
  for (const [key, group] of groups) {
    if (!group.call) continue;
    context.set(key, {
      identity: group.identity,
      toolName: normalizeToolName(group.call.toolName),
      toolArgs: group.call.toolArgs ?? null,
    });
  }
  return context;
};

const normalizeToolName = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
