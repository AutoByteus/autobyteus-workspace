import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileNameIndexer } from "../../../src/file-explorer/file-name-indexer.js";
import { TreeNode } from "../../../src/file-explorer/tree-node.js";

const createNode = (name, id, isFile = true, basePath = "/root") => {
    const node = new TreeNode(name, isFile);
    node.id = id;
    node.pathValue = `${basePath}/${name}`;
    return node;
};

const createRoot = () => {
    const root = new TreeNode("root", false);
    root.id = "root_id";
    root.pathValue = "/root";
    root.addChild(createNode("existing.txt", "id_exist", true, "/root"));
    return root;
};

describe("FileNameIndexer", () => {
    let root;
    let mockExplorer;

    beforeEach(() => {
        root = createRoot();
        mockExplorer = {
            rootPath: "/root",
            acquireWatcherLease: vi.fn(),
            subscribe: vi.fn(),
            getTree: vi.fn(() => root),
        };
    });

    it("builds the snapshot index on refresh", async () => {
        const indexer = new FileNameIndexer(mockExplorer);

        await indexer.refreshSnapshotIndex();

        const index = indexer.getIndex();
        expect(index["existing.txt"]).toBe("/root/existing.txt");
        expect(indexer.idMap.get("id_exist")).toBe("/root/existing.txt");
    });

    it("does not acquire a watcher lease when refreshing the snapshot index", async () => {
        const indexer = new FileNameIndexer(mockExplorer);

        await indexer.refreshSnapshotIndex();

        expect(mockExplorer.acquireWatcherLease).not.toHaveBeenCalled();
        expect(mockExplorer.subscribe).not.toHaveBeenCalled();
    });

    it("replaces stale index entries on each refresh", async () => {
        const indexer = new FileNameIndexer(mockExplorer);
        await indexer.refreshSnapshotIndex();

        root.children = [createNode("renamed.txt", "id_exist", true, "/root")];
        await indexer.refreshSnapshotIndex();

        const index = indexer.getIndex();
        expect(index["existing.txt"]).toBeUndefined();
        expect(index["renamed.txt"]).toBe("/root/renamed.txt");
        expect(indexer.idMap.get("id_exist")).toBe("/root/renamed.txt");
    });

    it("uses an empty index when the current tree is unavailable", async () => {
        mockExplorer.getTree.mockReturnValue(null);
        const indexer = new FileNameIndexer(mockExplorer);

        await indexer.refreshSnapshotIndex();

        expect(indexer.getIndex()).toEqual({});
    });
});
