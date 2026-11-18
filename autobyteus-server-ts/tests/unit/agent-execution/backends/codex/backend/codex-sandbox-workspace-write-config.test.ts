import { describe, expect, it } from "vitest";
import { buildCodexSandboxWorkspaceWriteConfig } from "../../../../../../src/agent-execution/backends/codex/backend/codex-sandbox-workspace-write-config.js";
import { buildCodexIntegrationThreadConfig } from "../../../../../../src/agent-execution/backends/codex/backend/codex-integration-thread-config.js";

/** One builder of the `sandbox_workspace_write` thread config key: network access (DEC-011) and writable roots (REQ-006). */
const FOLDER = "/home/u/.autobyteus/server-data/memory/semantic/computer-use-operator";

describe("buildCodexSandboxWorkspaceWriteConfig", () => {
  it("builds one object with both flags for a workspace-write run", () => {
    expect(buildCodexSandboxWorkspaceWriteConfig({ sandbox: "workspace-write", networkAccess: true, writableRoots: [FOLDER] }))
      .toEqual({ sandbox_workspace_write: { network_access: true, writable_roots: [FOLDER] } });
    expect(buildCodexSandboxWorkspaceWriteConfig({ sandbox: "workspace-write", networkAccess: false, writableRoots: [FOLDER] }))
      .toEqual({ sandbox_workspace_write: { writable_roots: [FOLDER] } });
    expect(buildCodexSandboxWorkspaceWriteConfig({ sandbox: "workspace-write", networkAccess: true, writableRoots: [] }))
      .toEqual({ sandbox_workspace_write: { network_access: true } });
  });

  it("leaves the key out without either flag, for read-only (stays read-only) and for full access", () => {
    expect(buildCodexSandboxWorkspaceWriteConfig({ sandbox: "workspace-write", networkAccess: false, writableRoots: [] })).toEqual({});
    for (const sandbox of ["read-only", "danger-full-access"] as const) {
      expect(buildCodexSandboxWorkspaceWriteConfig({ sandbox, networkAccess: true, writableRoots: [FOLDER] })).toEqual({});
    }
  });
});

describe("buildCodexIntegrationThreadConfig", () => {
  it("gives the shell its variables and no sandbox key", () => {
    expect(buildCodexIntegrationThreadConfig({ GIT_TERMINAL_PROMPT: "0" })).toEqual({ shell_environment_policy: { set: { GIT_TERMINAL_PROMPT: "0" } } });
    expect(buildCodexIntegrationThreadConfig({})).toEqual({});
  });
});
