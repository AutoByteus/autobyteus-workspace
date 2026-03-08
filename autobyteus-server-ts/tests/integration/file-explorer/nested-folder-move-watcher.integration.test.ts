import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ChangeType,
  MoveChange,
} from "../../../src/file-explorer/file-system-changes.js";
import { FileExplorer } from "../../../src/file-explorer/file-explorer.js";

const createTempWorkspace = async (): Promise<string> => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-server-ts-move-watch-"));
  await fs.mkdir(path.join(base, "tickets", "in-progress", "ticket-123", "attachments"), {
    recursive: true,
  });
  await fs.mkdir(path.join(base, "tickets", "done"), { recursive: true });
  await fs.writeFile(
    path.join(base, "tickets", "in-progress", "ticket-123", "spec.md"),
    "ticket spec",
    "utf-8",
  );
  await fs.writeFile(
    path.join(base, "tickets", "in-progress", "ticket-123", "attachments", "note.txt"),
    "note",
    "utf-8",
  );
  return base;
};

const expectNoEvent = async (
  events: AsyncGenerator<string, void, void>,
  timeoutMs = 1200,
): Promise<void> => {
  let timeoutHandle: NodeJS.Timeout | null = null;
  const nextPromise = events.next().then((result) => {
    if (result.done || !result.value) {
      return "stream-ended";
    }
    return result.value;
  });

  const timeoutPromise = new Promise<"timeout">((resolve) => {
    timeoutHandle = setTimeout(() => resolve("timeout"), timeoutMs);
  });

  const outcome = await Promise.race([nextPromise, timeoutPromise]);

  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
  }

  if (outcome !== "timeout") {
    throw new Error(`Unexpected watcher event received: ${String(outcome)}`);
  }

  nextPromise.catch(() => undefined);
  void events.return?.();
};

describe("Nested folder move watcher integration", () => {
  let workspace: string;
  let explorer: FileExplorer;

  beforeEach(async () => {
    workspace = await createTempWorkspace();
    explorer = new FileExplorer(workspace);
    await explorer.buildWorkspaceDirectoryTree();
    await explorer.startWatcher();
  });

  afterEach(async () => {
    await explorer.close();
    await fs.rm(workspace, { recursive: true, force: true });
  });

  it(
    "returns one direct move event and suppresses watcher self-echoes for a nested ticket folder move",
    { timeout: 20000 },
    async () => {
      const stream = explorer.fileWatcher?.events();
      if (!stream) {
        throw new Error("Watcher not started");
      }

      const sourcePath = path.join("tickets", "in-progress", "ticket-123");
      const destinationPath = path.join("tickets", "done", "ticket-123");

      const mutationEvent = await explorer.moveFileOrFolder(sourcePath, destinationPath);
      const mutationChange = mutationEvent.changes[0];

      expect(mutationEvent.changes).toHaveLength(1);
      expect(mutationChange?.type).toBe(ChangeType.MOVE);
      expect(mutationChange).toBeInstanceOf(MoveChange);

      const moveChange = mutationChange as MoveChange;
      expect(moveChange.node.getPath()).toBe(destinationPath);
      await expectNoEvent(stream);

      const tree = explorer.getTree();
      expect(tree?.findNodeByPath(sourcePath)).toBeNull();
      expect(tree?.findNodeByPath(destinationPath)).not.toBeNull();
      expect(tree?.findNodeByPath(path.join(destinationPath, "spec.md"))).not.toBeNull();
      expect(tree?.findNodeByPath(path.join(destinationPath, "attachments", "note.txt"))).not.toBeNull();
    },
  );
});
