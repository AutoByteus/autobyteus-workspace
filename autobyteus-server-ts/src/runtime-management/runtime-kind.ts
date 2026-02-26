export const RUNTIME_KIND_VALUES = ["autobyteus", "codex_app_server"] as const;

export type RuntimeKind = (typeof RUNTIME_KIND_VALUES)[number];

export const DEFAULT_RUNTIME_KIND: RuntimeKind = "autobyteus";

export const isRuntimeKind = (value: unknown): value is RuntimeKind =>
  typeof value === "string" &&
  (RUNTIME_KIND_VALUES as readonly string[]).includes(value);

export const normalizeRuntimeKind = (
  value: unknown,
  fallback: RuntimeKind = DEFAULT_RUNTIME_KIND,
): RuntimeKind => {
  if (isRuntimeKind(value)) {
    return value;
  }
  return fallback;
};
