import type { JsonObject } from "../codex-app-server-json.js";

/**
 * The Codex thread `config` part that gives a run's shell its integration variables (M-1), sent on both
 * `thread/start` and `thread/resume` next to `mcp_servers`. Runs without variables are unchanged. The network
 * access such a run needs in the `workspace-write` sandbox is part of `buildCodexSandboxWorkspaceWriteConfig`.
 */
export const buildCodexIntegrationThreadConfig = (
  variables: Readonly<Record<string, string>>,
): JsonObject => {
  if (Object.keys(variables).length === 0) return {};
  return { shell_environment_policy: { set: { ...variables } } };
};
