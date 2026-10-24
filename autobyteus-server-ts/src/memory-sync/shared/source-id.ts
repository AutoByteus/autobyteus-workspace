const SOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/;

export class SourceIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceIdError";
  }
}

export const normalizeSourceId = (value: string | null | undefined): string => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new SourceIdError("sourceId is required.");
  }
  if (normalized === "." || normalized === "..") {
    throw new SourceIdError("sourceId cannot be a relative-path segment.");
  }
  if (!SOURCE_ID_PATTERN.test(normalized)) {
    throw new SourceIdError(
      "sourceId must start with a letter or number and may contain only letters, numbers, '.', '_', and '-' (max 120 characters).",
    );
  }
  return normalized;
};

export const isValidSourceId = (value: string | null | undefined): boolean => {
  try {
    normalizeSourceId(value);
    return true;
  } catch {
    return false;
  }
};
