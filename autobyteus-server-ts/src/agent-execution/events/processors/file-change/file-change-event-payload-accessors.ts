const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const extractInvocationId = (payload: Record<string, unknown>): string | null =>
  asString(payload.invocation_id) ?? asString(payload.id);

export const extractToolName = (payload: Record<string, unknown>): string | null =>
  asString(payload.tool_name) ?? asString(asObject(payload.metadata)?.tool_name);

export const extractSegmentType = (payload: Record<string, unknown>): string | null =>
  asString(payload.segment_type);

export const extractToolArguments = (
  payload: Record<string, unknown>,
): Record<string, unknown> => asObject(payload.arguments) ?? {};

export const extractDelta = (payload: Record<string, unknown>): string | null =>
  typeof payload.delta === "string" ? payload.delta : null;

const extractPathFromRecord = (value: unknown): string | null => {
  const candidate = asObject(value);
  if (!candidate) {
    return null;
  }

  const candidates = [
    candidate.path,
    candidate.file_path,
    candidate.filePath,
    candidate.notebook_path,
    candidate.notebookPath,
  ];
  for (const pathCandidate of candidates) {
    const resolved = asString(pathCandidate);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};

export const extractMutationTargetPath = (...sources: unknown[]): string | null => {
  for (const source of sources) {
    const sourceObject = asObject(source);
    const targetPath =
      extractPathFromRecord(sourceObject)
      ?? extractPathFromRecord(asObject(sourceObject?.metadata))
      ?? extractPathFromRecord(asObject(sourceObject?.arguments))
      ?? extractPathFromRecord(asObject(sourceObject?.result));

    if (targetPath) {
      return targetPath;
    }
  }

  return null;
};
