import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { FileExplorer } from "../../../src/file-explorer/file-explorer.js";
import type { TreeNode } from "../../../src/file-explorer/tree-node.js";

const createTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-file-explorer-"));

describe("FileExplorer", () => {
  let tempDir: string;
  let explorer: FileExplorer;

  beforeEach(async () => {
    tempDir = createTempDir();
    explorer = new FileExplorer(tempDir);
    await explorer.buildWorkspaceDirectoryTree();
  });

  afterEach(() => {
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

  it("serializes the tree to JSON", () => {
    const jsonValue = explorer.toJson();
    expect(jsonValue).toBeTruthy();

    const parsed = JSON.parse(jsonValue as string) as { name?: string; children?: unknown[] };
    expect(parsed.name).toBeTruthy();
    expect(Array.isArray(parsed.children)).toBe(true);
  });

  it("rejects reading files outside the workspace", async () => {
    await expect(explorer.readFileContent("../outside.txt")).rejects.toThrow(
      "Access denied: File is outside the workspace.",
    );
  });

  it("produces shallow JSON with limited depth", async () => {
    const folder2 = path.join(tempDir, "folder1", "folder2");
    fs.mkdirSync(folder2, { recursive: true });
    fs.writeFileSync(path.join(folder2, "deep_file.txt"), "deep", "utf-8");
    fs.writeFileSync(path.join(tempDir, "folder1", "shallow_file.txt"), "shallow", "utf-8");
    fs.writeFileSync(path.join(tempDir, "root_file.txt"), "root", "utf-8");

    await explorer.buildWorkspaceDirectoryTree();

    const shallowJson = explorer.toShallowJson(1) as string;
    const shallowDict = JSON.parse(shallowJson) as {
      children: Array<{ name: string; children: Array<{ name: string }> }>;
    };

    const childNames = new Set(shallowDict.children.map((child) => child.name));
    expect(childNames.has("folder1")).toBe(true);
    expect(childNames.has("root_file.txt")).toBe(true);

    const folder1 = shallowDict.children.find((child) => child.name === "folder1");
    expect(folder1?.children ?? []).toEqual([]);

    const shallowJson2 = explorer.toShallowJson(2) as string;
    const shallowDict2 = JSON.parse(shallowJson2) as {
      children: Array<{ name: string; children: Array<{ name: string; children: Array<unknown> }> }>;
    };

    const folder1Depth2 = shallowDict2.children.find((child) => child.name === "folder1");
    const folder1Children = new Set(folder1Depth2?.children.map((child) => child.name) ?? []);
    expect(folder1Children.has("folder2")).toBe(true);
    expect(folder1Children.has("shallow_file.txt")).toBe(true);

    const folder2Depth2 = folder1Depth2?.children.find((child) => child.name === "folder2");
    expect(folder2Depth2?.children ?? []).toEqual([]);
  });
});
