export type PublishArtifactToolInput = {
  path: string;
  description?: string | null;
};

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const normalizeOptionalString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error("description must be a string when provided.");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizePublishArtifactToolInput = (
  value: unknown,
): PublishArtifactToolInput => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("publish_artifact requires an object input payload.");
  }

  const record = value as Record<string, unknown>;
  const allowedKeys = new Set(["path", "description"]);
  const disallowedKeys = Object.keys(record).filter((key) => !allowedKeys.has(key));
  if (disallowedKeys.length > 0) {
    throw new Error(`publish_artifact disallows fields: ${disallowedKeys.join(", ")}.`);
  }

  if (!hasOwn(record, "path") || typeof record.path !== "string" || record.path.trim().length === 0) {
    throw new Error("path is required.");
  }

  const normalized: PublishArtifactToolInput = {
    path: record.path.trim(),
  };
  if (hasOwn(record, "description")) {
    normalized.description = normalizeOptionalString(record.description);
  }
  return normalized;
};

export const PUBLISH_ARTIFACT_TOOL_NAME = "publish_artifact" as const;
export const PUBLISH_ARTIFACT_TOOL_DESCRIPTION =
  "Publish one file from the current run workspace as a durable artifact. Provide a workspace-relative path and an optional short description.";
