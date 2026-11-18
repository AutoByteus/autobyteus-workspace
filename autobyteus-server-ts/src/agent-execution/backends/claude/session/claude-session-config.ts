import type { ClaudeSdkPermissionMode } from "../claude-runtime-shared.js";

export const DEFAULT_CLAUDE_PERMISSION_MODE: ClaudeSdkPermissionMode = "default";

// Standard AutoByteus Claude launches keep provider permission mode independent
// from AutoByteus approval policy. `autoExecuteTools` is stored below instead.
export const resolveClaudePermissionMode = (
  _autoExecuteTools: boolean | null | undefined,
): ClaudeSdkPermissionMode => DEFAULT_CLAUDE_PERMISSION_MODE;

/**
 * The model settings an SDK session reads from a run's stored `llmConfig`: effort only. Thinking is
 * not set (the CLI ignores `thinking: disabled` on every current model), and an unchosen effort
 * sends nothing. New runs keep only these keys (`projectNewRunLlmConfig`).
 */
export const CLAUDE_SESSION_SETTING_KEYS: readonly string[] = ["reasoning_effort"];

export type ClaudeSessionConfig = {
  model: string;
  workingDirectory: string;
  permissionMode: ClaudeSdkPermissionMode;
  autoExecuteTools: boolean;
  /** Folders outside the working directory the run works in under the same approval (the agent's semantic memory). */
  additionalDirectories: readonly string[];
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
};

export const claudeSessionReasoningOptions = (
  config: ClaudeSessionConfig,
): Pick<ClaudeSessionConfig, "effort"> => ({
  ...(config.effort ? { effort: config.effort } : {}),
});

export const buildClaudeSessionConfig = (input: {
  model: string;
  workingDirectory: string;
  permissionMode?: ClaudeSdkPermissionMode;
  autoExecuteTools?: boolean | null;
  additionalDirectories?: readonly string[];
  llmConfig?: Readonly<Record<string, unknown>> | null;
}): ClaudeSessionConfig => {
  const effort = input.llmConfig?.reasoning_effort;
  const validEfforts = new Set(["low", "medium", "high", "xhigh", "max"]);
  return {
    model: input.model,
    workingDirectory: input.workingDirectory,
    permissionMode: input.permissionMode ?? DEFAULT_CLAUDE_PERMISSION_MODE,
    autoExecuteTools: input.autoExecuteTools === true,
    additionalDirectories: [...(input.additionalDirectories ?? [])],
    ...(typeof effort === "string" && validEfforts.has(effort)
      ? { effort: effort as ClaudeSessionConfig["effort"] }
      : {}),
  };
};
