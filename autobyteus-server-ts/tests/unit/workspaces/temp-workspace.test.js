import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { FileSystemWorkspace } from "../../../src/workspaces/filesystem-workspace.js";
import { TempWorkspace } from "../../../src/workspaces/temp-workspace.js";
vi.mock("../../../src/file-explorer/file-name-indexer.js", () => ({
    FileNameIndexer: class {
        async start() { }
        async stop() { }
    },
}));
describe("TempWorkspace", () => {
    const createTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-temp-ws-"));
    it("uses the fixed TEMP_WORKSPACE_ID", () => {
        const rootPath = createTempDir();
        const tempWorkspace = new TempWorkspace(rootPath);
        expect(tempWorkspace.workspaceId).toBe(TempWorkspace.TEMP_WORKSPACE_ID);
        expect(tempWorkspace.workspaceId).toBe("temp_ws_default");
    });
    it("returns a friendly name", () => {
        const rootPath = createTempDir();
        const tempWorkspace = new TempWorkspace(rootPath);
        expect(tempWorkspace.getName()).toBe("Temp Workspace");
    });
    it("inherits from FileSystemWorkspace", () => {
        const rootPath = createTempDir();
        const tempWorkspace = new TempWorkspace(rootPath);
        expect(tempWorkspace).toBeInstanceOf(FileSystemWorkspace);
        expect(tempWorkspace.rootPath).toBe(rootPath);
        expect(tempWorkspace.getBasePath()).toBe(rootPath);
    });
    it("stores rootPath in config", () => {
        const rootPath = createTempDir();
        const tempWorkspace = new TempWorkspace(rootPath);
        expect(tempWorkspace.config.get("rootPath")).toBe(rootPath);
    });
    it("initializes metadata only and acquires file explorer explicitly", async () => {
        const rootPath = createTempDir();
        const tempWorkspace = new TempWorkspace(rootPath);
        await tempWorkspace.initialize();
        expect(tempWorkspace.hasFileExplorerForDiagnostics()).toBe(false);
        const lease = await tempWorkspace.acquireFileExplorer("unit-test");
        expect(lease.fileExplorer).toBeTruthy();
        expect(tempWorkspace.hasFileExplorerForDiagnostics()).toBe(true);
        await lease.release();
        await tempWorkspace.close();
    });
});
