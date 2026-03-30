export enum RuntimeKind {
  AUTOBYTEUS = "autobyteus",
  CLAUDE_AGENT_SDK = "claude_agent_sdk",
  CODEX_APP_SERVER = "codex_app_server",
}

export const runtimeKindFromString = (
  value: unknown,
  fallback?: RuntimeKind | null,
): RuntimeKind | null => {
  const normalized =
    typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  if (!normalized) {
    return fallback !== undefined ? fallback : null;
  }
  const match = Object.values(RuntimeKind).find((kind) => kind === normalized);
  if (match) {
    return match;
  }
  return fallback !== undefined ? fallback : null;
};
