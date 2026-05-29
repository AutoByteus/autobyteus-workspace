import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { FileSystemWorkspace } from "../../../src/workspaces/filesystem-workspace.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const searchWorkspaceFiles = async (workspace, query) => {
    const lease = await workspace.acquireFileExplorer("integration-search");
    try {
        return await lease.fileExplorer.searchFiles(query);
    }
    finally {
        await lease.release();
    }
};

const waitForSearchMatch = async (workspace, query, expectedPath, timeoutMs = 2000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const results = await searchWorkspaceFiles(workspace, query);
        if (results.some((result) => path.normalize(result) === expectedPath)) {
            return results;
        }
        await sleep(50);
    }
    return searchWorkspaceFiles(workspace, query);
};

describe("FileSystemWorkspace searchFiles integration", () => {
    let tempDir;
    let workspace = null;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-search-"));
        await fs.writeFile(path.join(tempDir, "alpha.txt"), "alpha", "utf-8");
        await fs.mkdir(path.join(tempDir, "docs"));
        await fs.writeFile(path.join(tempDir, "docs", "readme.md"), "readme", "utf-8");

        workspace = new FileSystemWorkspace({
            workspaceId: "search-test-workspace",
            rootPath: tempDir,
        });
        await workspace.initialize();
    });

    afterEach(async () => {
        if (workspace) {
            await workspace.close();
            workspace = null;
        }
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }, 20000);

    it("finds files by name after snapshot indexing completes", async () => {
        if (!workspace) {
            throw new Error("Workspace not initialized");
        }

        const expectedPath = path.join(tempDir, "docs", "readme.md");
        const results = await waitForSearchMatch(workspace, "readme", expectedPath);

        expect(results).toContain(expectedPath);
    });

    it("returns absolute paths for matches", async () => {
        if (!workspace) {
            throw new Error("Workspace not initialized");
        }

        const expectedPath = path.join(tempDir, "alpha.txt");
        const results = await waitForSearchMatch(workspace, "alpha", expectedPath);

        expect(results.some((result) => path.isAbsolute(result))).toBe(true);
    });
});
