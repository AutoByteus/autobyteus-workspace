import type { SandboxManager } from "./sandbox-manager.js";

let processManager: SandboxManager | null = null;

/**
 * The studio's sandbox manager, for the sandbox tools (registered statically in the tool registry and the Agent Tools
 * MCP, before remote collaboration is composed). Bound by the studio composition before the server serves; released
 * at close. A tool call with none refuses loudly (`getProcessSandboxManager`).
 */
export const bindProcessSandboxManager = (manager: SandboxManager | null): void => {
  processManager = manager;
};

export const getProcessSandboxManager = (): SandboxManager => {
  if (!processManager) throw new Error("Sandboxes are not available on this server.");
  return processManager;
};
