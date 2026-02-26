import { beforeEach, describe, expect, it, vi } from "vitest";
import { AsyncQueue } from "../../../src/file-explorer/watcher/event-batcher.js";
import { FileNameIndexer } from "../../../src/file-explorer/file-name-indexer.js";
import { AddChange, DeleteChange, FileSystemChangeEvent, RenameChange, } from "../../../src/file-explorer/file-system-changes.js";
import { TreeNode } from "../../../src/file-explorer/tree-node.js";
const createNode = (name, id, isFile = true, basePath = "/root") => {
    const node = new TreeNode(name, isFile);
    node.id = id;
    node.pathValue = `${basePath}/${name}`;
    return node;
};
describe("FileNameIndexer", () => {
    let eventQueue;
    let eventGenerator;
    let mockExplorer;
    beforeEach(() => {
        eventQueue = new AsyncQueue();
        const baseGenerator = (async function* () {
            while (true) {
                const item = await eventQueue.pop();
                if (item === null) {
                    return;
                }
                yield item;
            }
        })();
        const originalReturn = baseGenerator.return?.bind(baseGenerator);
        baseGenerator.return = async () => {
            eventQueue.push(null);
            if (originalReturn) {
                return originalReturn();
            }
            return { done: true, value: undefined };
        };
        eventGenerator = baseGenerator;
        const root = new TreeNode("root", false);
        root.id = "root_id";
        root.pathValue = "/root";
        const child = createNode("existing.txt", "id_exist", true, "/root");
        root.addChild(child);
        mockExplorer = {
            rootPath: "/root",
            ensureWatcherStarted: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(eventGenerator),
            getTree: vi.fn().mockReturnValue(root),
        };
    });
    it("builds the initial index on start", async () => {
        const indexer = new FileNameIndexer(mockExplorer);
        await indexer.start();
        const index = indexer.getIndex();
        expect(index["existing.txt"]).toBe("/root/existing.txt");
        expect(indexer.idMap.get("id_exist")).toBe("/root/existing.txt");
    });
    it("processes add events", async () => {
        const indexer = new FileNameIndexer(mockExplorer);
        await indexer.start();
        const newNode = createNode("new.txt", "id_new", true, "/root");
        const event = new FileSystemChangeEvent([new AddChange(newNode, "root_id")]);
        eventQueue.push(event.toJson());
        await new Promise((resolve) => setTimeout(resolve, 20));
        const index = indexer.getIndex();
        expect(index["new.txt"]).toBe("/root/new.txt");
        expect(indexer.idMap.get("id_new")).toBe("/root/new.txt");
    });
    it("processes delete events", async () => {
        const indexer = new FileNameIndexer(mockExplorer);
        await indexer.start();
        const event = new FileSystemChangeEvent([new DeleteChange("id_exist", "root_id")]);
        eventQueue.push(event.toJson());
        await new Promise((resolve) => setTimeout(resolve, 20));
        const index = indexer.getIndex();
        expect(index["existing.txt"]).toBeUndefined();
        expect(indexer.idMap.has("id_exist")).toBe(false);
    });
    it("processes rename events", async () => {
        const indexer = new FileNameIndexer(mockExplorer);
        await indexer.start();
        const renamedNode = createNode("renamed.txt", "id_exist", true, "/root");
        const event = new FileSystemChangeEvent([new RenameChange(renamedNode, "root_id")]);
        eventQueue.push(event.toJson());
        await new Promise((resolve) => setTimeout(resolve, 20));
        const index = indexer.getIndex();
        expect(index["existing.txt"]).toBeUndefined();
        expect(index["renamed.txt"]).toBe("/root/renamed.txt");
        expect(indexer.idMap.get("id_exist")).toBe("/root/renamed.txt");
    });
    it("stops monitoring when stopped", async () => {
        const indexer = new FileNameIndexer(mockExplorer);
        await indexer.start();
        expect(indexer.monitorTask).toBeTruthy();
        await indexer.stop();
        expect(indexer.monitorTask).toBeNull();
    });
});
