import path from "node:path";
import { describe, expect, it } from "vitest";
import type { WorkspaceFileExplorer } from "../../../../src/file-explorer/file-explorer.js";
import type { FileSystemChangeDict, FileSystemChangeEvent } from "../../../../src/file-explorer/file-system-changes.js";
import type { WorkspaceIgnoreMatcher } from "../../../../src/file-explorer/traversal-ignore-strategy/workspace-ignore-matcher.js";
import { TreeNode } from "../../../../src/file-explorer/tree-node.js";
import { WatchdogHandler } from "../../../../src/file-explorer/watcher/watchdog-handler.js";

const ROOT = path.resolve("/workspace-root");

// The node's tree as a client sees it before expanding anything: only the root's own children are loaded.
const createHandler = () => {
  const rootNode = new TreeNode("workspace-root", false, null, true);
  rootNode.addChild(new TreeNode("loaded.md", true, rootNode));
  rootNode.addChild(new TreeNode("deep", false, rootNode));
  const explorer = {
    workspaceRootPath: ROOT,
    rootNode,
    findNodeByPath: (relativePath: string) => rootNode.findNodeByPath(relativePath),
  } as unknown as WorkspaceFileExplorer;
  const ignoreMatcher = {
    shouldIgnore: (target: string) => target.split(path.sep).includes("node_modules"),
  } as unknown as WorkspaceIgnoreMatcher;
  const events: FileSystemChangeDict[][] = [];
  const handler = new WatchdogHandler(
    explorer,
    (event: FileSystemChangeEvent) => events.push(event.toDict().changes),
    ignoreMatcher,
  );
  return { handler, events };
};

const abs = (...parts: string[]) => path.join(ROOT, ...parts);

describe("WatchdogHandler content changes", () => {
  it("reports a change in a folder the tree never loaded, by its POSIX path", () => {
    const { handler, events } = createHandler();

    handler.handleModify(abs("deep", "inner", "a.md"));

    expect(events).toEqual([[{ type: "modify", path: "deep/inner/a.md" }]]);
  });

  it("reports a change to a loaded file by path", () => {
    const { handler, events } = createHandler();

    handler.handleModify(abs("loaded.md"));

    expect(events).toEqual([[{ type: "modify", path: "loaded.md" }]]);
  });

  it("adds a content change after the structural add of a file", () => {
    const { handler, events } = createHandler();

    handler.handleAdd(abs("new.md"), false);

    expect(events).toHaveLength(1);
    expect(events[0]?.map((change) => change.type)).toEqual(["add", "modify"]);
    expect(events[0]?.[1]).toEqual({ type: "modify", path: "new.md" });
  });

  it("reports a content change when a file reappears at a path already in the tree", () => {
    const { handler, events } = createHandler();

    handler.handleAdd(abs("loaded.md"), false);

    expect(events).toEqual([[{ type: "modify", path: "loaded.md" }]]);
  });

  it("sends no content change for a folder add", () => {
    const { handler, events } = createHandler();

    handler.handleAdd(abs("newdir"), true);

    expect(events.flat().some((change) => change.type === "modify")).toBe(false);
  });

  it("reports the destination of a file moved over a path in an unloaded folder (atomic rewrite)", () => {
    const { handler, events } = createHandler();

    handler.handleMove(abs("deep", "inner", "a.md.tmp"), abs("deep", "inner", "a.md"), false);

    expect(events).toEqual([[{ type: "modify", path: "deep/inner/a.md" }]]);
  });

  it("follows a loaded file's rename with a content change for its new path", () => {
    const { handler, events } = createHandler();

    handler.handleMove(abs("loaded.md"), abs("renamed.md"), false);

    expect(events).toHaveLength(1);
    expect(events[0]?.map((change) => change.type)).toEqual(["rename", "modify"]);
    expect(events[0]?.[1]).toEqual({ type: "modify", path: "renamed.md" });
  });

  it("sends nothing for ignored paths", () => {
    const { handler, events } = createHandler();

    handler.handleModify(abs("node_modules", "pkg", "index.js"));
    handler.handleAdd(abs("node_modules", "pkg", "new.js"), false);
    handler.handleMove(abs("node_modules", "a.js"), abs("node_modules", "b.js"), false);

    expect(events).toEqual([]);
  });
});
