import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "vitest";
import { FileNameIndexer } from "../../../src/file-explorer/file-name-indexer.js";
import { LocalFileExplorer } from "../../../src/file-explorer/local-file-explorer.js";
const createTempWorkspace = async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-server-ts-index-"));
    await fs.mkdir(path.join(base, "subdir"), { recursive: true });
    await fs.writeFile(path.join(base, "subdir", "seed.txt"), "seed", { encoding: "utf-8" });
    return base;
};
const waitForIndexCondition = async (indexer, predicate, timeoutMs = 4000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const index = indexer.getIndex();
        if (predicate(index)) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("Timed out waiting for indexer update");
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
        await indexer.start();
    });
    afterEach(async () => {
        await explorer.close();
        await indexer.stop();
        await fs.rm(workspace, { recursive: true, force: true });
    }, 20000);
    it("indexes existing files and updates on add/rename/delete", async () => {
        await waitForIndexCondition(indexer, (index) => {
            const entry = index["seed.txt"];
            return Boolean(entry && entry.endsWith(path.join("subdir", "seed.txt")));
        });
        const notesPath = path.join(workspace, "notes.txt");
        await fs.writeFile(notesPath, "notes", "utf-8");
        await waitForIndexCondition(indexer, (index) => Boolean(index["notes.txt"]));
        const renamedPath = path.join(workspace, "renamed.txt");
        await fs.rename(notesPath, renamedPath);
        await waitForIndexCondition(indexer, (index) => Boolean(index["renamed.txt"]) && !index["notes.txt"]);
        await fs.unlink(renamedPath);
        await waitForIndexCondition(indexer, (index) => !index["renamed.txt"]);
    });
});
