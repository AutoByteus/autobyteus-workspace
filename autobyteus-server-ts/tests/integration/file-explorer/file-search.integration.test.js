import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalFileExplorer } from "../../../src/file-explorer/local-file-explorer.js";
import { FileNameIndexer } from "../../../src/file-explorer/file-name-indexer.js";
import { CompositeSearchStrategy, FuzzysortSearchStrategy, RipgrepSearchStrategy } from "../../../src/file-explorer/search-strategy/index.js";
const createTempWorkspace = async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-server-ts-search-"));
    await fs.mkdir(path.join(base, "subdir"), { recursive: true });
    await fs.writeFile(path.join(base, "subdir", "seed.txt"), "seed", { encoding: "utf-8" });
    await fs.writeFile(path.join(base, "readme.md"), "readme", { encoding: "utf-8" });
    return base;
};
const buildSearchStrategy = async (explorer) => {
    const indexer = new FileNameIndexer(explorer);
    await indexer.buildInitialIndex();
    const strategy = new CompositeSearchStrategy([
        new FuzzysortSearchStrategy(indexer, 10),
        new RipgrepSearchStrategy(50),
    ]);
    return { indexer, strategy };
};
describe("File search integration", () => {
    let workspaceRoot;
    let explorer;
    let indexer;
    let searchStrategy;
    beforeEach(async () => {
        workspaceRoot = await createTempWorkspace();
        explorer = new LocalFileExplorer(workspaceRoot);
        await explorer.buildWorkspaceDirectoryTree();
        ({ indexer, strategy: searchStrategy } = await buildSearchStrategy(explorer));
    });
    afterEach(async () => {
        await explorer.close();
        await fs.rm(workspaceRoot, { recursive: true, force: true });
    }, 20000);
    it("returns indexed files for existing content", async () => {
        const results = await searchStrategy.search(workspaceRoot, "seed");
        expect(results.some((entry) => entry.endsWith(path.join("subdir", "seed.txt")))).toBe(true);
    });
    it("returns newly added files after index update", async () => {
        const newFilePath = path.join(workspaceRoot, "notes.txt");
        await fs.writeFile(newFilePath, "notes", "utf-8");
        await explorer.buildWorkspaceDirectoryTree();
        ({ indexer, strategy: searchStrategy } = await buildSearchStrategy(explorer));
        const results = await searchStrategy.search(workspaceRoot, "notes");
        expect(results.some((entry) => entry.endsWith("notes.txt"))).toBe(true);
    });
});
