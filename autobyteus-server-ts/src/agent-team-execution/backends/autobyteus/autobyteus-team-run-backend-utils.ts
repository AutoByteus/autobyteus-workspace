export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const extractMemberRunId = (
  agentEvent: { agent_id?: unknown; data?: unknown } | null,
  memberName: string | null,
  memberRunIdsByName: ReadonlyMap<string, string> | undefined,
): string | null => {
  const normalizedMemberName = normalizeOptionalString(memberName);
  if (!normalizedMemberName) {
    return null;
  }
  const configuredMemberRunId = memberRunIdsByName?.get(normalizedMemberName) ?? null;
  if (typeof configuredMemberRunId === "string" && configuredMemberRunId.trim().length > 0) {
    return configuredMemberRunId.trim();
  }
  if (agentEvent && typeof agentEvent.agent_id === "string" && agentEvent.agent_id.trim().length > 0) {
    return agentEvent.agent_id.trim();
  }
  const agentEventPayload = asRecord(agentEvent?.data);
  if (typeof agentEventPayload.agent_id === "string" && agentEventPayload.agent_id.trim().length > 0) {
    return agentEventPayload.agent_id.trim();
  }
  return normalizedMemberName;
};

export const toReferenceFilesPayload = (
  payload: Record<string, unknown>,
): unknown =>
  Object.prototype.hasOwnProperty.call(payload, "reference_files")
    ? payload.reference_files
    : payload.referenceFiles;
