import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { FileSystemWorkspace } from "../../../src/workspaces/filesystem-workspace.js";
// Real snapshot search -> real workspace path owner / explorer text reader.
// HTTP/MIME/PDF rendering are independently validated by the API/E2E layer.
describe("FileSystemWorkspace searchFiles integration", () => {
    let tempDir;
    let workspace;
    const nestedLocator = path.join("applications", "候補者", "resume #1.txt");
    const nestedContent = "Résumé notes: representative workspace text.\n";
    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-search-"));
        await fs.writeFile(path.join(tempDir, "alpha.txt"), "alpha", "utf-8");
        await fs.mkdir(path.dirname(path.join(tempDir, nestedLocator)), { recursive: true });
        await fs.writeFile(path.join(tempDir, nestedLocator), nestedContent, "utf-8");
        workspace = new FileSystemWorkspace({
            workspaceId: "search-test-workspace",
            rootPath: tempDir,
        });
        await workspace.initialize();
    });
    afterEach(async () => {
        await workspace.close();
        await fs.rm(tempDir, { recursive: true, force: true });
    });
    it("returns root-relative locators usable by the protected workspace path owner", async () => {
        const lease = await workspace.acquireFileExplorer("integration-search");
        try {
            const results = await lease.fileExplorer.searchFiles("alpha");
            expect(results).toEqual(["alpha.txt"]);
            expect(results.every((result) => !path.isAbsolute(result))).toBe(true);
            expect(workspace.getAbsolutePath(results[0])).toBe(path.join(tempDir, "alpha.txt"));
            expect(await fs.readFile(workspace.getAbsolutePath(results[0]), "utf-8")).toBe("alpha");
            expect(lease.fileExplorer.fileWatcher).toBeNull();
        }
        finally {
            await lease.release();
        }
    });
    it("finds an unexpanded nested file with the same tree identity and reads it unchanged", async () => {
        const lease = await workspace.acquireFileExplorer("integration-search");
        try {
            const explorer = lease.fileExplorer;
            await explorer.loadFolderChildren("");
            expect(explorer.findNodeByPath(nestedLocator)).toBeNull();
            expect(explorer.findNodeByPath("applications")?.childrenLoaded).toBe(false);
            const results = await explorer.searchFiles("resume");
            expect(results).toEqual([nestedLocator]);
            expect(explorer.findNodeByPath(results[0])?.getPath()).toBe(nestedLocator);
            expect(await explorer.readFileContent(results[0])).toBe(nestedContent);
            const expectedBytes = Buffer.from(nestedContent, "utf-8");
            expect(await fs.readFile(workspace.getAbsolutePath(results[0]))).toEqual(expectedBytes);
            expect(explorer.fileWatcher).toBeNull();
        }
        finally {
            await lease.release();
        }
    });
    it("preserves absolute, parent traversal and sibling-prefix denial after search", async () => {
        const lease = await workspace.acquireFileExplorer("integration-search");
        try {
            expect(await lease.fileExplorer.searchFiles("resume")).toEqual([nestedLocator]);
            const prohibited = [
                path.join(tempDir, nestedLocator),
                path.join(path.dirname(tempDir), "outside.txt"),
                path.join("..", "outside.txt"),
                path.join("..", `${path.basename(tempDir)}-sibling`, "resume.txt"),
            ];
            for (const locator of prohibited) {
                expect(() => workspace.getAbsolutePath(locator)).toThrow("Access denied");
                await expect(lease.fileExplorer.readFileContent(locator)).rejects.toThrow("Access denied");
            }
            expect(await lease.fileExplorer.readFileContent(nestedLocator)).toBe(nestedContent);
            expect(lease.fileExplorer.fileWatcher).toBeNull();
        }
        finally {
            await lease.release();
        }
    });
});
