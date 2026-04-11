import type { RunFileChangeSourceTool } from "./run-file-change-types.js";

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export const nowIso = (): string => new Date().toISOString();

export const extractToolArguments = (payload: Record<string, unknown>): Record<string, unknown> =>
  asObject(payload.arguments);

export const extractObservedPath = (payload: Record<string, unknown>): string | null => {
  const metadata = asObject(payload.metadata);
  const argumentsPayload = extractToolArguments(payload);
  const candidates = [payload.path, metadata.path, argumentsPayload.path];
  for (const candidate of candidates) {
    const resolved = asString(candidate);
    if (resolved) {
      return resolved;
    }
  }
  return null;
};

export const extractInvocationId = (payload: Record<string, unknown>): string | null => {
  const candidates = [payload.invocation_id, payload.id];
  for (const candidate of candidates) {
    const resolved = asString(candidate);
    if (resolved) {
      return resolved;
    }
  }
  return null;
};

export const extractSegmentType = (payload: Record<string, unknown>): string | null => {
  return asString(payload.segment_type);
};

export const extractToolName = (payload: Record<string, unknown>): string | null => {
  return asString(payload.tool_name);
};

export const isFileChangeTool = (
  toolName: string | null,
): toolName is Exclude<RunFileChangeSourceTool, "generated_output"> =>
  toolName === "write_file" || toolName === "edit_file";
