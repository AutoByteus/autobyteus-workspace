export const CODEX_APP_SERVER_SANDBOX_SETTING_KEY = "CODEX_APP_SERVER_SANDBOX" as const;

export const CODEX_SANDBOX_MODES = [
  "read-only",
  "workspace-write",
  "danger-full-access",
] as const;

export type CodexSandboxMode = (typeof CODEX_SANDBOX_MODES)[number];

export const DEFAULT_CODEX_SANDBOX_MODE: CodexSandboxMode = "workspace-write";

const CODEX_SANDBOX_MODE_SET = new Set<string>(CODEX_SANDBOX_MODES);

export const isCodexSandboxMode = (value: unknown): value is CodexSandboxMode =>
  typeof value === "string" && CODEX_SANDBOX_MODE_SET.has(value);

export const normalizeCodexSandboxMode = (value: unknown): CodexSandboxMode => {
  const normalizedValue = typeof value === "string" ? value.trim() : "";
  return isCodexSandboxMode(normalizedValue)
    ? normalizedValue
    : DEFAULT_CODEX_SANDBOX_MODE;
};
