import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WorkspaceFileExplorer } from "../../../src/file-explorer/file-explorer.js";
import type { TreeNodeDict } from "../../../src/file-explorer/tree-node.js";

/**
 * The file explorer of a workspace that does not follow links (autobyteus-554 REQ-007, AC-006, N-4): entries are
 * classified by `lstat`; a link is a leaf row, never entered or opened; other non-regular entries are skipped. The
 * default explorer keeps following links as before.
 */
let base: string;
let root: string;
let outside: string;

beforeEach(() => {
  base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "link-aware-explorer-")));
  root = path.join(base, "semantic", "agent");
  outside = path.join(base, "outside");
  fs.mkdirSync(path.join(root, "notes"), { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(root, "notes", "linkedin.md"), "# LinkedIn\n");
  fs.writeFileSync(path.join(root, "readme.md"), "# Readme\n");
  fs.writeFileSync(path.join(outside, "secret.md"), "secret\n");
  fs.symlinkSync(outside, path.join(root, "notes", "shared"));
  fs.symlinkSync(path.join(outside, "secret.md"), path.join(root, "secret-link.md"));
  execFileSync("mkfifo", [path.join(root, "pipe")]);
});
afterEach(() => fs.rmSync(base, { recursive: true, force: true }));

const childrenOf = (dict: TreeNodeDict) => dict.children.map((child) => ({
  name: child.name, is_file: child.is_file, is_symbolic_link: child.is_symbolic_link, children_loaded: child.children_loaded,
}));

describe("WorkspaceFileExplorer without following links", () => {
  const explorer = () => new WorkspaceFileExplorer(root, { followSymbolicLinks: false });

  it("lists a folder's links as leaf link rows and skips non-regular entries (N-4)", async () => {
    const top = (await explorer().loadFolderChildren("")).toShallowDict(1);
    expect(childrenOf(top)).toEqual([
      { name: "notes", is_file: false, is_symbolic_link: false, children_loaded: false },
      { name: "readme.md", is_file: true, is_symbolic_link: false, children_loaded: true },
      { name: "secret-link.md", is_file: false, is_symbolic_link: true, children_loaded: true },
    ]);
    const notes = (await explorer().loadFolderChildren("notes")).toShallowDict(1);
    expect(childrenOf(notes)).toEqual([
      { name: "linkedin.md", is_file: true, is_symbolic_link: false, children_loaded: true },
      { name: "shared", is_file: false, is_symbolic_link: true, children_loaded: true },
    ]);
  });

  it("refuses to enter a linked folder or open a path through a link (WORKSPACE_LINK_NOT_OPENED)", async () => {
    await expect(explorer().loadFolderChildren("notes/shared")).rejects.toMatchObject({ code: "WORKSPACE_LINK_NOT_OPENED" });
    await expect(explorer().readFileContent("notes/shared/secret.md")).rejects.toMatchObject({ code: "WORKSPACE_LINK_NOT_OPENED" });
    await expect(explorer().readFileContent("secret-link.md")).rejects.toThrow("WORKSPACE_LINK_NOT_OPENED");
    expect(await explorer().readFileContent("notes/linkedin.md")).toBe("# LinkedIn\n");
  });

  it("builds the whole tree without entering a linked folder", async () => {
    const tree = (await explorer().buildWorkspaceDirectoryTree()).toDict();
    const notes = tree.children.find((child) => child.name === "notes")!;
    const shared = notes.children.find((child) => child.name === "shared")!;
    expect(shared).toMatchObject({ is_file: false, is_symbolic_link: true, children: [] });
    expect(tree.children.map((child) => child.name)).not.toContain("pipe");
  });

  it("finds files by name in the folder only, not through a link", async () => {
    expect(await explorer().searchFiles("linkedin")).toEqual([path.join("notes", "linkedin.md")]);
    expect(await explorer().searchFiles("secret")).toEqual([]);
  });
});

describe("WorkspaceFileExplorer by default (every other workspace) keeps following links", () => {
  it("enters a linked folder and reads through it, with no link rows", async () => {
    const explorer = new WorkspaceFileExplorer(root);
    const notes = (await explorer.loadFolderChildren("notes")).toShallowDict(1);
    expect(notes.children.find((child) => child.name === "shared")).toMatchObject({ is_file: false, is_symbolic_link: false });
    expect(await explorer.readFileContent("notes/shared/secret.md")).toBe("secret\n");
    expect(explorer.followSymbolicLinks).toBe(true);
  });
});
