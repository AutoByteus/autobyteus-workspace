const COMPOSITE_MODEL_PATTERN = /^openai-compatible:([^:]+):(.+)$/;

export interface TokenUsageCompositeModelValue {
  providerId: string;
  modelName: string;
}

const compact = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized || null;
};

/**
 * Parses only the canonical custom-provider identity shape. The suffix is not
 * split again, so model names containing `:` remain intact.
 */
export const parseTokenUsageCompositeModelValue = (
  value: string | null | undefined,
): TokenUsageCompositeModelValue | null => {
  const normalized = compact(value);
  if (!normalized) return null;
  const match = COMPOSITE_MODEL_PATTERN.exec(normalized);
  if (!match) return null;
  const providerId = match[1]?.trim() ?? "";
  const modelName = match[2]?.trim() ?? "";
  return providerId && modelName ? { providerId, modelName } : null;
};
