import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  WORKSPACES_HIDDEN_FROM_TREE_FILE_NAME,
  WorkspaceTreeVisibility,
} from "../../../src/workspaces/workspace-tree-visibility.js";

describe("WorkspaceTreeVisibility", () => {
  let appDataDir: string;
  let filePath: string;
  const registered = new Set(["agent_ws_a", "agent_ws_b", "agent_ws_c"]);

  const readFile = () => JSON.parse(fs.readFileSync(filePath, "utf-8")) as { workspaceIds: string[] };

  beforeEach(() => {
    appDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-tree-visibility-"));
    filePath = path.join(appDataDir, WORKSPACES_HIDDEN_FROM_TREE_FILE_NAME);
    vi.spyOn(appConfigProvider.config, "getAppDataDir").mockReturnValue(appDataDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(appDataDir, { recursive: true, force: true });
  });

  it("reads a missing file as nothing hidden and writes nothing until a change", async () => {
    const visibility = new WorkspaceTreeVisibility();

    expect([...await visibility.hiddenWorkspaceIds()]).toEqual([]);
    await visibility.show(["agent_ws_a"], registered);

    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("hides and shows, persisting { workspaceIds } that a new instance reads back", async () => {
    const visibility = new WorkspaceTreeVisibility();
    await visibility.hide("agent_ws_b", registered);
    await visibility.hide("agent_ws_a", registered);

    expect(readFile()).toEqual({ workspaceIds: ["agent_ws_a", "agent_ws_b"] });
    expect([...await new WorkspaceTreeVisibility().hiddenWorkspaceIds()].sort()).toEqual(["agent_ws_a", "agent_ws_b"]);

    await visibility.show(["agent_ws_a"], registered);
    expect(readFile()).toEqual({ workspaceIds: ["agent_ws_b"] });
    expect(fs.readdirSync(appDataDir)).toEqual([WORKSPACES_HIDDEN_FROM_TREE_FILE_NAME]);
  });

  it("drops IDs that are no longer registered on the next write", async () => {
    fs.writeFileSync(filePath, JSON.stringify({ workspaceIds: ["agent_ws_gone", "agent_ws_a"] }));
    const visibility = new WorkspaceTreeVisibility();

    await visibility.hide("agent_ws_c", registered);

    expect(readFile()).toEqual({ workspaceIds: ["agent_ws_a", "agent_ws_c"] });
  });

  it.each([
    ["not JSON", "{oops"],
    ["the wrong shape", JSON.stringify({ workspaceIds: [1] })],
    ["an array", JSON.stringify(["agent_ws_a"])],
  ])("reads %s as nothing hidden, with a warning naming the file, and replaces it on the next write", async (_label, bytes) => {
    fs.writeFileSync(filePath, bytes);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const visibility = new WorkspaceTreeVisibility();

    expect([...await visibility.hiddenWorkspaceIds()]).toEqual([]);
    expect(String(warn.mock.calls[0]?.[0])).toContain(filePath);

    await visibility.hide("agent_ws_a", registered);
    expect(readFile()).toEqual({ workspaceIds: ["agent_ws_a"] });
  });

  it("serializes concurrent writes so none is lost", async () => {
    const visibility = new WorkspaceTreeVisibility();

    await Promise.all([
      visibility.hide("agent_ws_a", registered),
      visibility.hide("agent_ws_b", registered),
      visibility.hide("agent_ws_c", registered),
      visibility.show(["agent_ws_b"], registered),
    ]);

    expect(readFile()).toEqual({ workspaceIds: ["agent_ws_a", "agent_ws_c"] });
  });
});
