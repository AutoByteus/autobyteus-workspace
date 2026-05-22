import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileNameIndexer } from "../../../src/file-explorer/file-name-indexer.js";
import { LocalFileExplorer } from "../../../src/file-explorer/local-file-explorer.js";

const createTempWorkspace = async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-server-ts-index-"));
    await fs.mkdir(path.join(base, "subdir"), { recursive: true });
    await fs.writeFile(path.join(base, "subdir", "seed.txt"), "seed", { encoding: "utf-8" });
    return base;
};

describe("FileNameIndexer integration", () => {
    let workspace;
    let explorer;
    let indexer;

    beforeEach(async () => {
        workspace = await createTempWorkspace();
        explorer = new LocalFileExplorer(workspace);
        await explorer.buildWorkspaceDirectoryTree();
        indexer = new FileNameIndexer(explorer);
        await indexer.refreshSnapshotIndex();
    });

    afterEach(async () => {
        await explorer.close();
        await fs.rm(workspace, { recursive: true, force: true });
    }, 45000);

    it("indexes existing files from the current snapshot", async () => {
        const index = indexer.getIndex();
        const entry = index["seed.txt"];
        expect(entry).toBeTruthy();
        expect(entry).toBe(path.join(workspace, "subdir", "seed.txt"));
    });

    it("updates only after the snapshot is rebuilt and refreshed", async () => {
        const notesPath = path.join(workspace, "notes.txt");
        await fs.writeFile(notesPath, "notes", "utf-8");

        expect(indexer.getIndex()["notes.txt"]).toBeUndefined();

        await explorer.buildWorkspaceDirectoryTree();
        await indexer.refreshSnapshotIndex();

        expect(indexer.getIndex()["notes.txt"]).toBe(notesPath);
    });
});
