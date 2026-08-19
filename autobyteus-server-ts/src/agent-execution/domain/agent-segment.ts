export const AGENT_SEGMENT_TYPES = [
  "text",
  "tool_call",
  "write_file",
  "edit_file",
  "run_bash",
  "reasoning",
  "media",
] as const;

export type AgentSegmentType = (typeof AGENT_SEGMENT_TYPES)[number];

export type AgentSegmentJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly AgentSegmentJsonValue[]
  | { readonly [key: string]: AgentSegmentJsonValue };

export const isAgentSegmentType = (value: unknown): value is AgentSegmentType =>
  typeof value === "string" &&
  (AGENT_SEGMENT_TYPES as readonly string[]).includes(value);

export type AgentSegmentIdentity = Readonly<{
  turnId: string;
  segmentId: string;
}>;

export const agentSegmentIdentityKey = (
  identity: AgentSegmentIdentity,
): string => JSON.stringify([identity.turnId, identity.segmentId]);

export type AgentSegmentStartPayload = Readonly<{
  id: string;
  turn_id: string;
  segment_type: AgentSegmentType;
  metadata?: AgentSegmentJsonValue;
}>;

export type AgentSegmentSourceContentPayload = Readonly<{
  id: string;
  turn_id: string;
  delta: string;
}>;

export type CanonicalAgentSegmentContentPayload = AgentSegmentSourceContentPayload & Readonly<{
  segment_type: AgentSegmentType;
}>;

export type AgentSegmentEndPayload = Readonly<{
  id: string;
  turn_id: string;
  metadata?: AgentSegmentJsonValue;
  interrupted?: boolean;
  reason?: string;
  failed?: boolean;
  error?: string;
}>;

const isJsonValue = (value: unknown, seen: Set<object>): value is AgentSegmentJsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return false;
    seen.add(value);
    const valid = value.every((entry) => isJsonValue(entry, seen));
    seen.delete(value);
    return valid;
  }
  if (typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  if (seen.has(value)) return false;
  seen.add(value);
  const valid = Object.values(value as Record<string, unknown>)
    .every((entry) => isJsonValue(entry, seen));
  seen.delete(value);
  return valid;
};

export const isAgentSegmentJsonValue = (value: unknown): value is AgentSegmentJsonValue =>
  isJsonValue(value, new Set());
