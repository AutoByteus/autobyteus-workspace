export enum RuntimeKind {
  AUTOBYTEUS = "autobyteus",
  CLAUDE_AGENT_SDK = "claude_agent_sdk",
  CODEX_APP_SERVER = "codex_app_server",
  ANTIGRAVITY_CLI = "antigravity_cli",
  GROK_BUILD = "grok_build",
}

export const isExternalProviderRuntimeKind = (
  runtimeKind: RuntimeKind,
): boolean =>
  runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK ||
  runtimeKind === RuntimeKind.CODEX_APP_SERVER ||
  runtimeKind === RuntimeKind.ANTIGRAVITY_CLI ||
  runtimeKind === RuntimeKind.GROK_BUILD;

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
