import { describe, expect, it } from "vitest";
import { describeCodexAppServerSpawnFailure } from "../../../../../src/runtime-management/codex/client/codex-app-server-client.js";

describe("CodexAppServerClient spawn diagnostics", () => {
  it("includes descriptor pressure and runtime context for EBADF failures", () => {
    const error = Object.assign(new Error("bad file descriptor"), { code: "EBADF" });

    const diagnostic = describeCodexAppServerSpawnFailure({
      command: "codex",
      args: ["app-server", "--json"],
      cwd: "/tmp/tutorial-workspace",
    }, error);

    expect(diagnostic).toContain("code=EBADF");
    expect(diagnostic).toContain("open_fds=");
    expect(diagnostic).toContain("fs_read=");
    expect(diagnostic).toContain("fs_write=");
    expect(diagnostic).toContain("runtime=codex_app_server");
    expect(diagnostic).toContain('cwd="/tmp/tutorial-workspace"');
    expect(diagnostic).toContain('command="codex"');
    expect(diagnostic).toContain('args=["app-server","--json"]');
    expect(diagnostic).toContain("Descriptor pressure is likely");
  });

  it("keeps non-descriptor spawn errors distinguishable", () => {
    const error = Object.assign(new Error("missing command"), { code: "ENOENT" });

    const diagnostic = describeCodexAppServerSpawnFailure({
      command: "missing-codex",
      args: [],
      cwd: "/tmp/superrepo",
    }, error);

    expect(diagnostic).toContain("code=ENOENT");
    expect(diagnostic).toContain('cwd="/tmp/superrepo"');
    expect(diagnostic).toContain('command="missing-codex"');
    expect(diagnostic).toContain("args=[]");
    expect(diagnostic).not.toContain("Descriptor pressure is likely");
  });
});
