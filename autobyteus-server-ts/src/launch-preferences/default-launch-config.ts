export type DefaultLaunchConfig = {
  llmModelIdentifier: string | null;
  runtimeKind: string | null;
  llmConfig: Record<string, unknown> | null;
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeObjectRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

export const normalizeDefaultLaunchConfig = (
  value: unknown,
): DefaultLaunchConfig | null => {
  const candidate = normalizeObjectRecord(value);
  if (!candidate) {
    return null;
  }

  const llmModelIdentifier = normalizeOptionalString(candidate.llmModelIdentifier);
  const runtimeKind = normalizeOptionalString(candidate.runtimeKind);
  const llmConfig = normalizeObjectRecord(candidate.llmConfig);

  if (!llmModelIdentifier && !runtimeKind && !llmConfig) {
    return null;
  }

  return {
    llmModelIdentifier,
    runtimeKind,
    llmConfig,
  };
};

export const normalizeDefaultLaunchConfigInput = (
  value: unknown,
): DefaultLaunchConfig | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return normalizeDefaultLaunchConfig(value);
};
