import type { CodexSandboxMode } from "../../../../runtime-management/codex/codex-sandbox-mode-setting.js";
import type { JsonObject } from "../codex-app-server-json.js";

/**
 * The Codex thread `config` key `sandbox_workspace_write`, sent on both `thread/start` and `thread/resume`; the
 * only builder of that key. It applies to a `workspace-write` run only (`read-only` stays read-only, and
 * `danger-full-access` needs nothing):
 *
 * - `network_access`: Codex's `workspace-write` sandbox blocks the shell from connecting to the loopback proxy
 *   (M-5). So a run with integration variables gets network access (DEC-011, the user's choice): its shell can
 *   then reach any address, as the other runtimes' shells can.
 * - `writable_roots`: folders outside the working directory the run may write, the agent's semantic memory
 *   folder (REQ-006); the sandbox otherwise refuses writes outside the working directory.
 *
 * Without either, the key is left out and the thread config is as before.
 */
export const buildCodexSandboxWorkspaceWriteConfig = (input: {
  sandbox: CodexSandboxMode;
  networkAccess: boolean;
  writableRoots: readonly string[];
}): JsonObject => {
  if (input.sandbox !== "workspace-write" || (!input.networkAccess && input.writableRoots.length === 0)) return {};
  return {
    sandbox_workspace_write: {
      ...(input.networkAccess ? { network_access: true } : {}),
      ...(input.writableRoots.length > 0 ? { writable_roots: [...input.writableRoots] } : {}),
    },
  };
};
