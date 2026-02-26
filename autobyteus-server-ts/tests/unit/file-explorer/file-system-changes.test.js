import { describe, expect, it } from "vitest";
import { AddChange, ChangeType, DeleteChange, deserializeChangeEvent, FileSystemChange, FileSystemChangeEvent, ModifyChange, MoveChange, RenameChange, serializeChangeEvent, } from "../../../src/file-explorer/file-system-changes.js";
import { TreeNode } from "../../../src/file-explorer/tree-node.js";
describe("FileSystemChange", () => {
    it("ChangeType enum values", () => {
        expect(ChangeType.ADD).toBe("add");
        expect(ChangeType.DELETE).toBe("delete");
        expect(ChangeType.RENAME).toBe("rename");
        expect(ChangeType.MOVE).toBe("move");
        expect(ChangeType.MODIFY).toBe("modify");
    });
    it("throws on unknown change type", () => {
        expect(() => FileSystemChange.fromDict({ type: "invalid" })).toThrow("Unknown ChangeType");
    });
    it("serializes and deserializes AddChange", () => {
        const node = new TreeNode("file.txt", true);
        node.id = "123";
        const addChange = new AddChange(node, "parent_456");
        const addDict = addChange.toDict();
        expect(addDict.type).toBe("add");
        expect(addDict.node.name).toBe("file.txt");
        expect(addDict.node.path).toBe("file.txt");
        expect(addDict.parent_id).toBe("parent_456");
        const deserialized = AddChange.fromDict(addDict);
        expect(deserialized.parentId).toBe("parent_456");
        expect(deserialized.node.name).toBe("file.txt");
    });
    it("serializes and deserializes DeleteChange", () => {
        const deleteChange = new DeleteChange("123", "parent_456");
        const deleteDict = deleteChange.toDict();
        expect(deleteDict.type).toBe("delete");
        expect(deleteDict.node_id).toBe("123");
        expect(deleteDict.parent_id).toBe("parent_456");
        const deserialized = DeleteChange.fromDict(deleteDict);
        expect(deserialized.nodeId).toBe("123");
        expect(deserialized.parentId).toBe("parent_456");
    });
    it("serializes and deserializes RenameChange", () => {
        const node = new TreeNode("new_name.txt", true);
        node.id = "789";
        const renameChange = new RenameChange(node, "parent_456");
        const renameDict = renameChange.toDict();
        expect(renameDict.type).toBe("rename");
        expect(renameDict.node.name).toBe("new_name.txt");
        expect(renameDict.parent_id).toBe("parent_456");
        const deserialized = RenameChange.fromDict(renameDict);
        expect(deserialized.node.name).toBe("new_name.txt");
        expect(deserialized.parentId).toBe("parent_456");
    });
    it("serializes and deserializes MoveChange", () => {
        const node = new TreeNode("file.txt", true);
        node.id = "123";
        const moveChange = new MoveChange(node, "old_parent", "new_parent");
        const moveDict = moveChange.toDict();
        expect(moveDict.type).toBe("move");
        expect(moveDict.node.name).toBe("file.txt");
        expect(moveDict.old_parent_id).toBe("old_parent");
        expect(moveDict.new_parent_id).toBe("new_parent");
        const deserialized = MoveChange.fromDict(moveDict);
        expect(deserialized.oldParentId).toBe("old_parent");
        expect(deserialized.newParentId).toBe("new_parent");
    });
    it("serializes and deserializes ModifyChange", () => {
        const modifyChange = new ModifyChange("123", "parent_456");
        const modifyDict = modifyChange.toDict();
        expect(modifyDict.type).toBe("modify");
        expect(modifyDict.node_id).toBe("123");
        expect(modifyDict.parent_id).toBe("parent_456");
        const deserialized = ModifyChange.fromDict(modifyDict);
        expect(deserialized.nodeId).toBe("123");
        expect(deserialized.parentId).toBe("parent_456");
    });
    it("serializes and deserializes FileSystemChangeEvent", () => {
        const addChange = new AddChange(new TreeNode("file1.txt", true), "parent_1");
        const event = new FileSystemChangeEvent([addChange]);
        const eventDict = event.toDict();
        expect(eventDict.changes).toHaveLength(1);
        expect(eventDict.changes[0]?.type).toBe("add");
        const deserialized = FileSystemChangeEvent.fromDict(eventDict);
        expect(deserialized.changes).toHaveLength(1);
        expect(deserialized.changes[0]).toBeInstanceOf(AddChange);
    });
    it("serialize/deserialize helpers", () => {
        const addChange = new AddChange(new TreeNode("file4.txt", true), "parent_4");
        const event = new FileSystemChangeEvent([addChange]);
        const jsonData = serializeChangeEvent(event);
        expect(typeof jsonData).toBe("string");
        const deserialized = deserializeChangeEvent(jsonData);
        expect(deserialized.changes).toHaveLength(1);
        expect(deserialized.changes[0]).toBeInstanceOf(AddChange);
    });
});
