export type RuntimeKind = string;

export const DEFAULT_RUNTIME_KIND: RuntimeKind = "autobyteus";

const normalizeRuntimeKindValue = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const isRuntimeKind = (value: unknown): value is RuntimeKind =>
  normalizeRuntimeKindValue(value) !== null;

export const normalizeRuntimeKind = (
  value: unknown,
  fallback: RuntimeKind = DEFAULT_RUNTIME_KIND,
): RuntimeKind => {
  return normalizeRuntimeKindValue(value) ?? normalizeRuntimeKindValue(fallback) ?? DEFAULT_RUNTIME_KIND;
};
