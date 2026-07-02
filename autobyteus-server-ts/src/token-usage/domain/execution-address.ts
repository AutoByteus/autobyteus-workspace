import { createHash } from "node:crypto";

export type TokenUsageExecutionAddressMemberSegment = {
  kind: "member";
  memberRouteKey: string;
};

export type TokenUsageExecutionAddressTaskTeamSegment = {
  kind: "task_team";
  taskTeamRunId: string;
};

export type TokenUsageExecutionAddressTaskAgentSegment = {
  kind: "task_agent";
  taskAgentRunId: string;
};

export type TokenUsageExecutionAddressSegment =
  | TokenUsageExecutionAddressMemberSegment
  | TokenUsageExecutionAddressTaskTeamSegment
  | TokenUsageExecutionAddressTaskAgentSegment;

export type TokenUsageExecutionAddress = {
  segments: TokenUsageExecutionAddressSegment[];
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const normalizeString = (value: unknown): string | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
};

const normalizeMemberPathRouteKey = (value: unknown): string | null => {
  if (!Array.isArray(value)) return null;
  const parts = value.map((part) => normalizeString(part)).filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join("/") : null;
};

const normalizeSegment = (value: unknown): TokenUsageExecutionAddressSegment | null => {
  const record = asRecord(value);
  const kind = normalizeString(record?.kind);
  if (!record || !kind) return null;
  if (kind === "member") {
    const memberRouteKey = normalizeString(record.memberRouteKey) ??
      normalizeString(record.member_route_key) ??
      normalizeMemberPathRouteKey(record.memberPath) ??
      normalizeMemberPathRouteKey(record.member_path);
    return memberRouteKey ? { kind, memberRouteKey } : null;
  }
  if (kind === "task_team") {
    const taskTeamRunId = normalizeString(record.taskTeamRunId) ?? normalizeString(record.task_team_run_id);
    return taskTeamRunId ? { kind, taskTeamRunId } : null;
  }
  if (kind === "task_agent") {
    const taskAgentRunId = normalizeString(record.taskAgentRunId) ?? normalizeString(record.task_agent_run_id);
    return taskAgentRunId ? { kind, taskAgentRunId } : null;
  }
  return null;
};

export const normalizeTokenUsageExecutionAddress = (
  value: unknown,
): TokenUsageExecutionAddress | null => {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.segments)) return null;
  const segments = record.segments.map(normalizeSegment);
  if (segments.some((segment) => !segment)) return null;
  return { segments: segments as TokenUsageExecutionAddressSegment[] };
};

export const cloneTokenUsageExecutionAddress = (
  address: TokenUsageExecutionAddress,
): TokenUsageExecutionAddress => ({
  segments: address.segments.map((segment) => ({ ...segment })),
});

export const buildTokenUsageExecutionAddress = (
  segments: readonly TokenUsageExecutionAddressSegment[],
): TokenUsageExecutionAddress => ({
  segments: segments.map((segment) => ({ ...segment })),
});

export const appendTokenUsageExecutionAddressSegments = (
  address: TokenUsageExecutionAddress,
  segments: readonly TokenUsageExecutionAddressSegment[],
): TokenUsageExecutionAddress => buildTokenUsageExecutionAddress([
  ...address.segments,
  ...segments,
]);

export const stableTokenUsageExecutionAddressKey = (
  address: TokenUsageExecutionAddress,
): string => JSON.stringify(cloneTokenUsageExecutionAddress(address));

export const hashedTokenUsageExecutionAddressKey = (
  address: TokenUsageExecutionAddress,
): string => createHash("sha1").update(stableTokenUsageExecutionAddressKey(address)).digest("hex");

export const lastTokenUsageExecutionAddressSegment = (
  address: TokenUsageExecutionAddress,
): TokenUsageExecutionAddressSegment | null => address.segments.at(-1) ?? null;
