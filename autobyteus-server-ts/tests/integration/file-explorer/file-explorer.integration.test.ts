import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { ChangeType } from "../../../src/file-explorer/file-system-changes.js";
import { FileExplorer } from "../../../src/file-explorer/file-explorer.js";

const createTempWorkspace = async (): Promise<string> => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-server-ts-"));
  await fs.mkdir(path.join(base, "subdir"), { recursive: true });
  await fs.writeFile(path.join(base, "subdir", "seed.txt"), "seed", { encoding: "utf-8" });
  return base;
};

describe("FileExplorer integration", () => {
  let workspace: string;
  let explorer: FileExplorer;

  beforeEach(async () => {
    workspace = await createTempWorkspace();
    explorer = new FileExplorer(workspace);
    await explorer.buildWorkspaceDirectoryTree();
  });

  afterEach(async () => {
    await explorer.close();
    await fs.rm(workspace, { recursive: true, force: true });
  });

  it("builds tree and lists file paths", async () => {
    const paths = await explorer.getAllFilePaths();
    expect(paths).toContain(path.join("subdir", "seed.txt"));
  });

  it("writes new file and emits ADD change", async () => {
    const event = await explorer.writeFileContent("notes.txt", "hello");
    expect(event.changes).toHaveLength(1);
    expect(event.changes[0]?.type).toBe(ChangeType.ADD);

    const tree = explorer.getTree();
    expect(tree?.findNodeByPath("notes.txt")).not.toBeNull();
  });

  it("modifies existing file and emits MODIFY change", async () => {
    await explorer.writeFileContent("notes.txt", "hello");
    const event = await explorer.writeFileContent("notes.txt", "updated");
    expect(event.changes).toHaveLength(1);
    expect(event.changes[0]?.type).toBe(ChangeType.MODIFY);
  });

  it("renames file and emits RENAME change", async () => {
    await explorer.writeFileContent("rename-me.txt", "hello");
    const event = await explorer.renameFileOrFolder("rename-me.txt", "renamed.txt");
    expect(event.changes).toHaveLength(1);
    expect(event.changes[0]?.type).toBe(ChangeType.RENAME);

    const tree = explorer.getTree();
    expect(tree?.findNodeByPath("renamed.txt")).not.toBeNull();
  });

  it("moves file and emits MOVE change", async () => {
    await explorer.writeFileContent("move-me.txt", "hello");
    await explorer.addFileOrFolder("dest", false);

    const event = await explorer.moveFileOrFolder("move-me.txt", path.join("dest", "move-me.txt"));
    expect(event.changes).toHaveLength(1);
    expect(event.changes[0]?.type).toBe(ChangeType.MOVE);

    const tree = explorer.getTree();
    expect(tree?.findNodeByPath(path.join("dest", "move-me.txt"))).not.toBeNull();
  });

  it("removes file and emits DELETE change", async () => {
    await explorer.writeFileContent("delete-me.txt", "hello");
    const event = await explorer.removeFileOrFolder("delete-me.txt");
    expect(event.changes).toHaveLength(1);
    expect(event.changes[0]?.type).toBe(ChangeType.DELETE);
  });
});
