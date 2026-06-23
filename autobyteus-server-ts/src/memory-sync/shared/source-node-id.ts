const SOURCE_NODE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/;

export class SourceNodeIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceNodeIdError";
  }
}

export const normalizeSourceNodeId = (value: string | null | undefined): string => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new SourceNodeIdError("sourceNodeId is required.");
  }
  if (normalized === "." || normalized === "..") {
    throw new SourceNodeIdError("sourceNodeId cannot be a relative-path segment.");
  }
  if (!SOURCE_NODE_ID_PATTERN.test(normalized)) {
    throw new SourceNodeIdError(
      "sourceNodeId must start with a letter or number and may contain only letters, numbers, '.', '_', and '-' (max 120 characters).",
    );
  }
  return normalized;
};

export const isValidSourceNodeId = (value: string | null | undefined): boolean => {
  try {
    normalizeSourceNodeId(value);
    return true;
  } catch {
    return false;
  }
};
