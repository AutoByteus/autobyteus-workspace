import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { WorkspaceFileExplorer } from "../../../src/file-explorer/file-explorer.js";
import type { TreeNode, TreeNodeDict } from "../../../src/file-explorer/tree-node.js";

const createTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-file-explorer-"));

describe("WorkspaceFileExplorer", () => {
  let tempDir: string;
  let explorer: WorkspaceFileExplorer;

  beforeEach(async () => {
    tempDir = createTempDir();
    explorer = new WorkspaceFileExplorer(tempDir);
    await explorer.buildWorkspaceDirectoryTree();
  });

  afterEach(async () => {
    await explorer.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("builds the workspace directory tree", async () => {
    const tree = explorer.getTree() as TreeNode;

    expect(tree).toBeTruthy();
    expect(tree.name).toBe(path.basename(tempDir));
    expect(tree.isFile).toBe(false);
  });

  it("reads file content within size limits", async () => {
    const filePath = "read_test.txt";
    const content = "Read this content.";
    fs.writeFileSync(path.join(tempDir, filePath), content, "utf-8");

    await explorer.buildWorkspaceDirectoryTree();

    const readContent = await explorer.readFileContent(filePath);
    expect(readContent).toBe(content);
  });

  it("throws when reading a file that exceeds max size", async () => {
    const filePath = "large_file.txt";
    const content = "A".repeat(1024 * 1024 + 1);
    fs.writeFileSync(path.join(tempDir, filePath), content, "utf-8");

    await explorer.buildWorkspaceDirectoryTree();

    await expect(explorer.readFileContent(filePath, 1024 * 1024)).rejects.toThrow(
      "exceeds the maximum allowed size",
    );
  });

  it("returns the root tree node", () => {
    const tree = explorer.getTree() as TreeNode;
    expect(tree.name).toBe(path.basename(tempDir));
  });

  it("serializes the live tree to JSON with workspace-relative identity", async () => {
    fs.mkdirSync(path.join(tempDir, "docs"));
    fs.writeFileSync(path.join(tempDir, "docs", "notes.txt"), "notes", "utf-8");
    await explorer.buildWorkspaceDirectoryTree();

    const jsonValue = explorer.getTree()?.toJson() ?? null;
    expect(jsonValue).toBeTruthy();

    const parsed = JSON.parse(jsonValue as string) as TreeNodeDict;
    expect(parsed.name).toBeTruthy();
    expect(Array.isArray(parsed.children)).toBe(true);
    expect(explorer.getTree()?.findNodeByPath(path.join("docs", "notes.txt"))?.getPath()).toBe(
      path.join("docs", "notes.txt"),
    );
    expect(parsed.children[0]?.children[0]?.path).toBe(
      path.join("docs", "notes.txt"),
    );
  });

  it("keeps an unloaded snapshot's tree JSON null", async () => {
    const unloadedExplorer = new WorkspaceFileExplorer(tempDir);
    expect(unloadedExplorer.getTree()?.toJson() ?? null).toBeNull();
    await unloadedExplorer.close();
  });

  it("rejects reading files outside the workspace", async () => {
    const treeBeforeDenial = explorer.getTree()?.toJson() ?? null;
    await expect(explorer.readFileContent("../outside.txt")).rejects.toThrow(
      "Access denied: File is outside the workspace.",
    );
    expect(explorer.getTree()?.toJson() ?? null).toBe(treeBeforeDenial);
  });

  it("projects the live tree with limited depth and relative paths", async () => {
    const folder2 = path.join(tempDir, "folder1", "folder2");
    fs.mkdirSync(folder2, { recursive: true });
    fs.writeFileSync(path.join(folder2, "deep_file.txt"), "deep", "utf-8");
    fs.writeFileSync(path.join(tempDir, "folder1", "shallow_file.txt"), "shallow", "utf-8");
    fs.writeFileSync(path.join(tempDir, "root_file.txt"), "root", "utf-8");

    await explorer.buildWorkspaceDirectoryTree();

    const tree = explorer.getTree() as TreeNode;
    const shallowDict = tree.toShallowDict(1);

    const childNames = new Set(shallowDict.children.map((child) => child.name));
    expect(childNames.has("folder1")).toBe(true);
    expect(childNames.has("root_file.txt")).toBe(true);

    const folder1 = shallowDict.children.find((child) => child.name === "folder1");
    expect(folder1?.children ?? []).toEqual([]);
    expect(folder1?.path).toBe("folder1");

    const shallowDict2 = tree.toShallowDict(2);

    const folder1Depth2 = shallowDict2.children.find((child) => child.name === "folder1");
    const folder1Children = new Set(folder1Depth2?.children.map((child) => child.name) ?? []);
    expect(folder1Children.has("folder2")).toBe(true);
    expect(folder1Children.has("shallow_file.txt")).toBe(true);

    const folder2Depth2 = folder1Depth2?.children.find((child) => child.name === "folder2");
    expect(folder2Depth2?.children ?? []).toEqual([]);
    expect(folder2Depth2?.path).toBe(path.join("folder1", "folder2"));
  });
});
