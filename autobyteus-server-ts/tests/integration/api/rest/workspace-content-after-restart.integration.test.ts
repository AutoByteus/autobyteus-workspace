// autobyteus-609 D-J (AC-J): right after a node restart, a read of a file in a registered folder succeeds. The REST content
// routes use the manager's restoring lookup (memory, else the workspace registry), as the GraphQL Files path does; an
// unknown ID still answers 404 and the path rules are unchanged. A restart is a fresh module graph (a fresh manager with
// an empty memory) over the same app data folder, whose workspaces.json the first start wrote.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let root = "";
let folder = "";

/** One node start: config over `root`, a fresh workspace manager, the REST workspace routes. */
const start = async () => {
  vi.resetModules();
  const { appConfigProvider } = await import("../../../../src/config/app-config-provider.js");
  appConfigProvider.resetForTests();
  appConfigProvider.initialize({ appDataDir: root });
  const { getWorkspaceManager } = await import("../../../../src/workspaces/workspace-manager.js");
  const { registerWorkspaceRoutes } = await import("../../../../src/api/rest/workspaces.js");
  const app = fastify();
  await registerWorkspaceRoutes(app);
  return { manager: getWorkspaceManager(), app };
};

describe("REST workspace reads after a node restart (autobyteus-609 D-J)", () => {
  // The first import of the manager's module graph is transformed cold (about 4 s on a busy machine); later starts reuse the
  // transforms (under 0.1 s). Warm it once here so the test's own time is the restart and the reads.
  beforeAll(async () => {
    await import("../../../../src/workspaces/workspace-manager.js");
    await import("../../../../src/api/rest/workspaces.js");
  }, 60_000);

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "workspace-restart-data-"));
    const parent = await fs.mkdtemp(path.join(os.tmpdir(), "workspace-restart-run-"));
    folder = path.join(parent, "run-folder");
    await fs.mkdir(path.join(folder, "media"), { recursive: true });
    await fs.writeFile(path.join(folder, "notes.md"), "# Notes\nREAD-AFTER-RESTART-609\n");
    await fs.writeFile(path.join(folder, "media", "clip.txt"), "STATIC-609");
    await fs.writeFile(path.join(parent, "outside.md"), "OUTSIDE-609");
  });

  afterEach(async () => {
    vi.resetModules();
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(path.dirname(folder), { recursive: true, force: true });
  });

  it("the first read of a registered folder's file after a restart answers 200; an unknown ID 404; a path out of the folder is refused", async () => {
    const first = await start();
    const workspace = await first.manager.createWorkspace({ rootPath: folder });
    const id = workspace.workspaceId;
    await first.app.close();

    const restarted = await start();
    const content = await restarted.app.inject({ method: "GET", url: `/workspaces/${encodeURIComponent(id)}/content?path=notes.md` });
    expect(content.statusCode).toBe(200);
    expect(content.payload).toContain("READ-AFTER-RESTART-609");

    const asset = await restarted.app.inject({ method: "GET", url: `/workspaces/${encodeURIComponent(id)}/static/media/clip.txt` });
    expect(asset.statusCode).toBe(200);
    expect(asset.payload).toBe("STATIC-609");

    const unknown = await restarted.app.inject({ method: "GET", url: "/workspaces/no-such-workspace-609/content?path=notes.md" });
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json()).toEqual({ detail: "Workspace not found" });

    const outside = await restarted.app.inject({ method: "GET", url: `/workspaces/${encodeURIComponent(id)}/content?path=${encodeURIComponent("../outside.md")}` });
    expect(outside.statusCode).toBeGreaterThanOrEqual(400);
    expect(outside.statusCode).toBeLessThan(500);
    expect(outside.payload).not.toContain("OUTSIDE-609");
    await restarted.app.close();
  });
});
