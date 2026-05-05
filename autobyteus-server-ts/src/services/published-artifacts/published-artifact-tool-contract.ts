export type PublishArtifactsToolArtifactInput = {
  path: string;
  description?: string | null;
};

export type PublishArtifactsToolInput = {
  artifacts: PublishArtifactsToolArtifactInput[];
};

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const normalizeOptionalString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error("description must be a string or null when provided.");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const rejectUnknownFields = (
  record: Record<string, unknown>,
  allowedKeys: Set<string>,
  subject: string,
): void => {
  const disallowedKeys = Object.keys(record).filter((key) => !allowedKeys.has(key));
  if (disallowedKeys.length > 0) {
    throw new Error(`publish_artifacts disallows ${subject} fields: ${disallowedKeys.join(", ")}.`);
  }
};

const normalizeArtifactItem = (
  value: unknown,
  index: number,
): PublishArtifactsToolArtifactInput => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`artifacts[${index}] must be an object.`);
  }

  const record = value as Record<string, unknown>;
  rejectUnknownFields(record, new Set(["path", "description"]), `artifacts[${index}]`);

  if (!hasOwn(record, "path") || typeof record.path !== "string" || record.path.trim().length === 0) {
    throw new Error(`artifacts[${index}].path is required.`);
  }

  return {
    path: record.path.trim(),
    description: hasOwn(record, "description") ? normalizeOptionalString(record.description) : null,
  };
};

export const normalizePublishArtifactsToolInput = (
  value: unknown,
): PublishArtifactsToolInput => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("publish_artifacts requires an object input payload.");
  }

  const record = value as Record<string, unknown>;
  rejectUnknownFields(record, new Set(["artifacts"]), "top-level");

  if (!Array.isArray(record.artifacts)) {
    throw new Error("publish_artifacts requires a non-empty artifacts array.");
  }
  if (record.artifacts.length === 0) {
    throw new Error("publish_artifacts requires a non-empty artifacts array.");
  }

  return {
    artifacts: record.artifacts.map((artifact, index) => normalizeArtifactItem(artifact, index)),
  };
};

export const PUBLISH_ARTIFACTS_TOOL_NAME = "publish_artifacts" as const;
export const PUBLISH_ARTIFACTS_TOOL_DESCRIPTION =
  "Publish one or more files from the current run workspace as durable artifacts. Pass a non-empty artifacts array; single-file publication uses a one-item array. For each item, use the exact absolute file path returned by write_file when available; the path must still resolve inside the current workspace. An optional short description may also be provided.";
