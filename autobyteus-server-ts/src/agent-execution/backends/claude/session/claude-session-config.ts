import type { ClaudeSdkPermissionMode } from "../claude-runtime-shared.js";

export const resolveClaudePermissionMode = (
  autoExecuteTools: boolean | null | undefined,
): ClaudeSdkPermissionMode => (autoExecuteTools ? "bypassPermissions" : "default");

export type ClaudeSessionConfig = {
  model: string;
  workingDirectory: string;
  permissionMode: ClaudeSdkPermissionMode;
};

export const buildClaudeSessionConfig = (input: {
  model: string;
  workingDirectory: string;
  permissionMode: ClaudeSdkPermissionMode;
}): ClaudeSessionConfig => ({
  model: input.model,
  workingDirectory: input.workingDirectory,
  permissionMode: input.permissionMode,
});
