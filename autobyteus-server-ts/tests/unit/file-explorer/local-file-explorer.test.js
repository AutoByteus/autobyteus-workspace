import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalFileExplorer } from "../../../src/file-explorer/local-file-explorer.js";
import { FileSystemChangeEvent } from "../../../src/file-explorer/file-system-changes.js";
import { TreeNode } from "../../../src/file-explorer/tree-node.js";
const mockState = vi.hoisted(() => ({ adaptee: null }));
vi.mock("../../../src/file-explorer/file-explorer.js", () => ({
    FileExplorer: class {
        constructor() {
            if (!mockState.adaptee) {
                throw new Error("Mock adaptee not initialized");
            }
            return mockState.adaptee;
        }
    },
}));
describe("LocalFileExplorer", () => {
    let mockAdaptee;
    beforeEach(() => {
        mockAdaptee = {
            buildWorkspaceDirectoryTree: vi.fn(),
            getTree: vi.fn(),
            toJson: vi.fn(),
            toShallowJson: vi.fn(),
            getAllFilePaths: vi.fn(),
            readFileContent: vi.fn(),
            writeFileContent: vi.fn(),
            addFileOrFolder: vi.fn(),
            removeFileOrFolder: vi.fn(),
            moveFileOrFolder: vi.fn(),
            renameFileOrFolder: vi.fn(),
            startWatcher: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
            fileWatcher: null,
            workspaceRootPath: "/fake/path",
        };
        mockState.adaptee = mockAdaptee;
    });
    it("delegates buildWorkspaceDirectoryTree", async () => {
        const tree = new TreeNode("root");
        mockAdaptee.buildWorkspaceDirectoryTree.mockResolvedValue(tree);
        const explorer = new LocalFileExplorer("/fake/path");
        const result = await explorer.buildWorkspaceDirectoryTree();
        expect(mockAdaptee.buildWorkspaceDirectoryTree).toHaveBeenCalledWith(null);
        expect(result).toBe(tree);
    });
    it("delegates getTree", () => {
        const tree = new TreeNode("root");
        mockAdaptee.getTree.mockReturnValue(tree);
        const explorer = new LocalFileExplorer("/fake/path");
        const result = explorer.getTree();
        expect(mockAdaptee.getTree).toHaveBeenCalled();
        expect(result).toBe(tree);
    });
    it("delegates getAllFilePaths", async () => {
        mockAdaptee.getAllFilePaths.mockResolvedValue(["/fake/path/file.txt"]);
        const explorer = new LocalFileExplorer("/fake/path");
        const result = await explorer.getAllFilePaths();
        expect(mockAdaptee.getAllFilePaths).toHaveBeenCalled();
        expect(result).toEqual(["/fake/path/file.txt"]);
    });
    it("delegates readFileContent", async () => {
        mockAdaptee.readFileContent.mockResolvedValue("content");
        const explorer = new LocalFileExplorer("/fake/path");
        const result = await explorer.readFileContent("file.txt");
        expect(mockAdaptee.readFileContent).toHaveBeenCalledWith("file.txt");
        expect(result).toBe("content");
    });
    it("delegates writeFileContent", async () => {
        const event = new FileSystemChangeEvent([]);
        mockAdaptee.writeFileContent.mockResolvedValue(event);
        const explorer = new LocalFileExplorer("/fake/path");
        const result = await explorer.writeFileContent("file.txt", "data");
        expect(mockAdaptee.writeFileContent).toHaveBeenCalledWith("file.txt", "data");
        expect(result).toBe(event);
    });
    it("delegates add/remove/move/rename", async () => {
        const event = new FileSystemChangeEvent([]);
        mockAdaptee.addFileOrFolder.mockResolvedValue(event);
        mockAdaptee.removeFileOrFolder.mockResolvedValue(event);
        mockAdaptee.moveFileOrFolder.mockResolvedValue(event);
        mockAdaptee.renameFileOrFolder.mockResolvedValue(event);
        const explorer = new LocalFileExplorer("/fake/path");
        await explorer.addFileOrFolder("new.txt", true);
        expect(mockAdaptee.addFileOrFolder).toHaveBeenCalledWith("new.txt", true);
        await explorer.removeFileOrFolder("old.txt");
        expect(mockAdaptee.removeFileOrFolder).toHaveBeenCalledWith("old.txt");
        await explorer.moveFileOrFolder("src.txt", "dest.txt");
        expect(mockAdaptee.moveFileOrFolder).toHaveBeenCalledWith("src.txt", "dest.txt");
        await explorer.renameFileOrFolder("src.txt", "renamed.txt");
        expect(mockAdaptee.renameFileOrFolder).toHaveBeenCalledWith("src.txt", "renamed.txt");
    });
    it("delegates close", async () => {
        const explorer = new LocalFileExplorer("/fake/path");
        await explorer.close();
        expect(mockAdaptee.close).toHaveBeenCalled();
    });
    it("starts watcher when ensureWatcherStarted is called", async () => {
        const explorer = new LocalFileExplorer("/fake/path");
        await explorer.ensureWatcherStarted();
        expect(mockAdaptee.startWatcher).toHaveBeenCalled();
    });
    it("returns events from watcher", () => {
        const mockEvents = { marker: true };
        mockAdaptee.fileWatcher = {
            events: vi.fn().mockReturnValue(mockEvents),
        };
        const explorer = new LocalFileExplorer("/fake/path");
        const result = explorer.subscribe();
        expect(mockAdaptee.fileWatcher.events).toHaveBeenCalled();
        expect(result).toBe(mockEvents);
    });
    it("throws if subscribe is called before watcher is ready", () => {
        mockAdaptee.fileWatcher = null;
        const explorer = new LocalFileExplorer("/fake/path");
        expect(() => explorer.subscribe()).toThrowError("Watcher is not running. Call ensureWatcherStarted() first.");
    });
});
