import type { CodexSandboxMode } from "../../../../runtime-management/codex/codex-sandbox-mode-setting.js";
import type { JsonObject } from "../codex-app-server-json.js";

/**
 * The Codex thread `config` part that gives a run's shell its integration variables (M-1), sent on both
 * `thread/start` and `thread/resume` next to `mcp_servers`.
 *
 * Codex's default `workspace-write` sandbox blocks the shell from connecting to the loopback proxy (M-5). So a
 * `workspace-write` run with integration variables also gets `sandbox_workspace_write.network_access` (DEC-011, the
 * user's choice): its shell can then reach any address, as the other runtimes' shells can. A `read-only` run is left
 * as it is (it gets the variables but cannot reach the proxy); runs without variables are unchanged.
 */
export const buildCodexIntegrationThreadConfig = (
  variables: Readonly<Record<string, string>>,
  sandbox: CodexSandboxMode,
): JsonObject => {
  if (Object.keys(variables).length === 0) return {};
  return {
    shell_environment_policy: { set: { ...variables } },
    ...(sandbox === "workspace-write" ? { sandbox_workspace_write: { network_access: true } } : {}),
  };
};
