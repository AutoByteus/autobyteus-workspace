import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CodexAppServerClient,
  describeCodexAppServerSpawnFailure,
} from "../../../../../src/runtime-management/codex/client/codex-app-server-client.js";

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({ spawn: spawnMock }));

const mockChildProcess = () => {
  const child = new EventEmitter() as EventEmitter & Record<string, unknown>;
  child.stdin = { write: vi.fn() };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn();
  return child;
};

describe("CodexAppServerClient spawn diagnostics", () => {
  beforeEach(() => spawnMock.mockReset());

  it("preserves the pre-ticket external Codex environment and real home selection", async () => {
    const originalHome = process.env.HOME;
    const originalCodexHome = process.env.CODEX_HOME;
    process.env.HOME = "/synthetic/operator-home";
    process.env.CODEX_HOME = "/synthetic/operator-codex-home";
    spawnMock.mockReturnValue(mockChildProcess());

    try {
      await new CodexAppServerClient({
        command: "codex",
        args: ["app-server"],
        cwd: "/synthetic/workspace",
      }).start();

      expect(spawnMock).toHaveBeenCalledWith("codex", ["app-server"], {
        cwd: "/synthetic/workspace",
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
      });
      const spawnOptions = spawnMock.mock.calls[0]?.[2];
      expect(spawnOptions.env.HOME).toBe("/synthetic/operator-home");
      expect(spawnOptions.env.CODEX_HOME).toBe("/synthetic/operator-codex-home");
    } finally {
      if (originalHome === undefined) delete process.env.HOME;
      else process.env.HOME = originalHome;
      if (originalCodexHome === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = originalCodexHome;
    }
  });

  it("uses an explicitly supplied Codex environment without applying the governed-launcher policy", async () => {
    const explicitEnvironment = {
      HOME: "/synthetic/explicit-home",
      CODEX_HOME: "/synthetic/explicit-codex-home",
      CODEX_ACCOUNT_STATE: "synthetic-external-state",
    };
    spawnMock.mockReturnValue(mockChildProcess());

    await new CodexAppServerClient({
      command: "codex",
      args: ["app-server"],
      cwd: "/synthetic/workspace",
      env: explicitEnvironment,
    }).start();

    expect(spawnMock.mock.calls[0]?.[2]?.env).toBe(explicitEnvironment);
  });

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
