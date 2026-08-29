import type { ClaudeSdkPermissionMode } from "../claude-runtime-shared.js";

export const DEFAULT_CLAUDE_PERMISSION_MODE: ClaudeSdkPermissionMode = "default";

// Standard AutoByteus Claude launches keep provider permission mode independent
// from AutoByteus approval policy. `autoExecuteTools` is stored below instead.
export const resolveClaudePermissionMode = (
  _autoExecuteTools: boolean | null | undefined,
): ClaudeSdkPermissionMode => DEFAULT_CLAUDE_PERMISSION_MODE;

export type ClaudeSessionConfig = {
  model: string;
  workingDirectory: string;
  permissionMode: ClaudeSdkPermissionMode;
  autoExecuteTools: boolean;
  thinking?: Readonly<{ type: "adaptive" | "disabled" }>;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
};

export const claudeSessionReasoningOptions = (
  config: ClaudeSessionConfig,
): Pick<ClaudeSessionConfig, "thinking" | "effort"> => ({
  ...(config.thinking ? { thinking: config.thinking } : {}),
  ...(config.effort ? { effort: config.effort } : {}),
});

export const buildClaudeSessionConfig = (input: {
  model: string;
  workingDirectory: string;
  permissionMode?: ClaudeSdkPermissionMode;
  autoExecuteTools?: boolean | null;
  llmConfig?: Readonly<Record<string, unknown>> | null;
}): ClaudeSessionConfig => {
  const thinkingEnabled = input.llmConfig?.thinking_enabled;
  const effort = input.llmConfig?.reasoning_effort;
  const validEfforts = new Set(["low", "medium", "high", "xhigh", "max"]);
  return {
    model: input.model,
    workingDirectory: input.workingDirectory,
    permissionMode: input.permissionMode ?? DEFAULT_CLAUDE_PERMISSION_MODE,
    autoExecuteTools: input.autoExecuteTools === true,
    ...(typeof thinkingEnabled === "boolean"
      ? { thinking: { type: thinkingEnabled ? "adaptive" as const : "disabled" as const } }
      : {}),
    ...(typeof effort === "string" && validEfforts.has(effort)
      ? { effort: effort as ClaudeSessionConfig["effort"] }
      : {}),
  };
};
