import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileNameIndexer } from "../../../src/file-explorer/file-name-indexer.js";
import { LocalFileExplorer } from "../../../src/file-explorer/local-file-explorer.js";

const createTempWorkspace = async (): Promise<string> => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-server-ts-index-"));
  await fs.mkdir(path.join(base, "subdir"), { recursive: true });
  await fs.writeFile(path.join(base, "subdir", "seed.txt"), "seed", { encoding: "utf-8" });
  return base;
};

const waitForIndexCondition = async (
  indexer: FileNameIndexer,
  predicate: (index: Record<string, string>) => boolean,
  timeoutMs = 30000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const index = indexer.getIndex();
    if (predicate(index)) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(
    `Timed out waiting for indexer update. Current keys: ${Object.keys(indexer.getIndex())
      .slice(0, 20)
      .join(", ")}`,
  );
};

describe("FileNameIndexer integration", () => {
  let workspace: string;
  let explorer: LocalFileExplorer;
  let indexer: FileNameIndexer;

  beforeEach(async () => {
    workspace = await createTempWorkspace();
    explorer = new LocalFileExplorer(workspace);
    await explorer.buildWorkspaceDirectoryTree();
    indexer = new FileNameIndexer(explorer);
    await indexer.start();
  });

  afterEach(async () => {
    await explorer.close();
    await indexer.stop();
    await fs.rm(workspace, { recursive: true, force: true });
  }, 20000);

  it("indexes existing files and updates on add/rename/delete", { timeout: 60000 }, async () => {
    await waitForIndexCondition(indexer, (index) => {
      const entry = index["seed.txt"];
      return Boolean(entry && entry.endsWith(path.join("subdir", "seed.txt")));
    });

    // Warm up watcher delivery to avoid startup race under full-suite parallel load.
    const readyPath = path.join(workspace, ".watcher-ready.txt");
    await fs.writeFile(readyPath, "ready", "utf-8");
    await waitForIndexCondition(indexer, (index) => Boolean(index[".watcher-ready.txt"]));
    await fs.unlink(readyPath);
    await waitForIndexCondition(indexer, (index) => !index[".watcher-ready.txt"]);

    const notesPath = path.join(workspace, "notes.txt");
    await fs.writeFile(notesPath, "notes", "utf-8");
    await waitForIndexCondition(indexer, (index) => Boolean(index["notes.txt"]));

    const renamedPath = path.join(workspace, "renamed.txt");
    await fs.rename(notesPath, renamedPath);
    await waitForIndexCondition(
      indexer,
      (index) => Boolean(index["renamed.txt"]) && !index["notes.txt"],
    );

    await fs.unlink(renamedPath);
    await waitForIndexCondition(indexer, (index) => !index["renamed.txt"]);
  });
});
