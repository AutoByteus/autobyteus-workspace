const MEMORY_SYNC_SOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/;

export class MemorySyncSourceIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemorySyncSourceIdError";
  }
}

export const normalizeMemorySyncSourceId = (value: string | null | undefined): string => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new MemorySyncSourceIdError("memorySyncSourceId is required.");
  }
  if (normalized === "." || normalized === "..") {
    throw new MemorySyncSourceIdError("memorySyncSourceId cannot be a relative-path segment.");
  }
  if (!MEMORY_SYNC_SOURCE_ID_PATTERN.test(normalized)) {
    throw new MemorySyncSourceIdError(
      "memorySyncSourceId must start with a letter or number and may contain only letters, numbers, '.', '_', and '-' (max 120 characters).",
    );
  }
  return normalized;
};

export const isValidMemorySyncSourceId = (value: string | null | undefined): boolean => {
  try {
    normalizeMemorySyncSourceId(value);
    return true;
  } catch {
    return false;
  }
};
