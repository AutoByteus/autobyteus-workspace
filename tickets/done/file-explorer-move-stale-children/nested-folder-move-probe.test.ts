import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ChangeType } from "../../../autobyteus-server-ts/src/file-explorer/file-system-changes.js";
import { FileExplorer } from "../../../autobyteus-server-ts/src/file-explorer/file-explorer.js";

describe("nested folder move probe", () => {
  let workspace: string;
  let explorer: FileExplorer;

  beforeEach(async () => {
    workspace = await fs.mkdtemp(path.join(os.tmpdir(), "codex-file-explorer-probe-"));

    await fs.mkdir(path.join(workspace, "tickets", "in-progress", "ticket-123", "subdir"), {
      recursive: true,
    });
    await fs.mkdir(path.join(workspace, "tickets", "done"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "tickets", "in-progress", "ticket-123", "a.txt"),
      "a",
      "utf8",
    );
    await fs.writeFile(
      path.join(workspace, "tickets", "in-progress", "ticket-123", "subdir", "b.txt"),
      "b",
      "utf8",
    );

    explorer = new FileExplorer(workspace);
    await explorer.buildWorkspaceDirectoryTree();
  });

  afterEach(async () => {
    await explorer.close();
    await fs.rm(workspace, { recursive: true, force: true });
  });

  it("emits a correct move event and re-parents nested descendants", async () => {
    const event = await explorer.moveFileOrFolder(
      "tickets/in-progress/ticket-123",
      "tickets/done/ticket-123",
    );

    expect(event.changes).toHaveLength(1);

    const change = event.changes[0];
    expect(change?.type).toBe(ChangeType.MOVE);

    const movedNode = change && "node" in change ? change.node : null;
    expect(movedNode?.getPath()).toBe("tickets/done/ticket-123");

    const movedNodeDict = movedNode?.toDict();
    expect(movedNodeDict?.children.map((child) => child.path)).toEqual([
      "tickets/done/ticket-123/subdir",
      "tickets/done/ticket-123/a.txt",
    ]);
    expect(movedNodeDict?.children[0]?.children.map((child) => child.path)).toEqual([
      "tickets/done/ticket-123/subdir/b.txt",
    ]);

    const oldLocation = explorer.getTree()?.findNodeByPath("tickets/in-progress/ticket-123");
    const newLocation = explorer.getTree()?.findNodeByPath("tickets/done/ticket-123");

    expect(oldLocation).toBeNull();
    expect(newLocation?.children.map((child) => child.getPath())).toEqual([
      "tickets/done/ticket-123/subdir",
      "tickets/done/ticket-123/a.txt",
    ]);
    expect(newLocation?.children[0]?.children.map((child) => child.getPath())).toEqual([
      "tickets/done/ticket-123/subdir/b.txt",
    ]);
  });
});
