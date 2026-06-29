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
};

export const buildClaudeSessionConfig = (input: {
  model: string;
  workingDirectory: string;
  permissionMode?: ClaudeSdkPermissionMode;
  autoExecuteTools?: boolean | null;
}): ClaudeSessionConfig => ({
  model: input.model,
  workingDirectory: input.workingDirectory,
  permissionMode: input.permissionMode ?? DEFAULT_CLAUDE_PERMISSION_MODE,
  autoExecuteTools: input.autoExecuteTools === true,
});
