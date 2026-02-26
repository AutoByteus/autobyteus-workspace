import path from "node:path";
import { describe, expect, it } from "vitest";
import { TreeNode } from "../../../src/file-explorer/tree-node.js";

describe("TreeNode", () => {
  it("initializes root node", () => {
    const rootDir = new TreeNode("root_dir");
    expect(rootDir.name).toBe("root_dir");
    expect(rootDir.getPath()).toBe("root_dir");
    expect(rootDir.isFile).toBe(false);
    expect(rootDir.children).toEqual([]);
  });

  it("adds children", () => {
    const rootDir = new TreeNode("root_dir");
    const subDir = new TreeNode("sub_dir1");
    const file = new TreeNode("file1.txt", true);

    subDir.addChild(file);
    rootDir.addChild(subDir);

    expect(rootDir.children).toHaveLength(1);
    expect(rootDir.children[0]).toBe(subDir);
    expect(subDir.children).toHaveLength(1);
    expect(subDir.children[0]).toBe(file);
    expect(file.parent).toBe(subDir);
    expect(subDir.parent).toBe(rootDir);
  });

  it("builds paths", () => {
    const root = new TreeNode("root");
    const folder = new TreeNode("folder1", false, root);
    root.addChild(folder);
    const file = new TreeNode("file1.txt", true, folder);
    folder.addChild(file);

    expect(root.getPath()).toBe("root");
    expect(folder.getPath()).toBe("folder1");
    expect(file.getPath()).toBe(path.join("folder1", "file1.txt"));
  });

  it("serializes to dict", () => {
    const root = new TreeNode("root_dir");
    const subDir = new TreeNode("sub_dir1");
    const file = new TreeNode("file1.txt", true);

    subDir.addChild(file);
    root.addChild(subDir);

    root.id = "root_id";
    subDir.id = "subdir_id";
    file.id = "file_id";

    const result = root.toDict();
    expect(result.name).toBe("root_dir");
    expect(result.path).toBe("root_dir");
    expect(result.children[0]?.path).toBe("sub_dir1");
    expect(result.children[0]?.children[0]?.path).toBe(path.join("sub_dir1", "file1.txt"));
  });

  it("serializes to JSON", () => {
    const root = new TreeNode("root_dir");
    const subDir = new TreeNode("sub_dir1");
    const file = new TreeNode("file1.txt", true);

    subDir.addChild(file);
    root.addChild(subDir);

    const jsonOutput = root.toJson();
    expect(typeof jsonOutput).toBe("string");
    const data = JSON.parse(jsonOutput) as { name: string };
    expect(data.name).toBe("root_dir");
  });

  it("toShallowDict depth 0", () => {
    const root = new TreeNode("root");
    root.addChild(new TreeNode("folder1"));
    root.addChild(new TreeNode("file1.txt", true));

    const result = root.toShallowDict(0);
    expect(result.name).toBe("root");
    expect(result.children).toEqual([]);
  });

  it("toShallowDict depth 1", () => {
    const root = new TreeNode("root");
    const folder = new TreeNode("folder1");
    const file = new TreeNode("file1.txt", true);
    const nested = new TreeNode("nested.txt", true);

    folder.addChild(nested);
    root.addChild(folder);
    root.addChild(file);

    const result = root.toShallowDict(1);
    expect(result.children).toHaveLength(2);
    const folderChild = result.children.find((child) => child.name === "folder1");
    const fileChild = result.children.find((child) => child.name === "file1.txt");

    expect(folderChild?.is_file).toBe(false);
    expect(folderChild?.children).toEqual([]);
    expect(fileChild?.is_file).toBe(true);
  });

  it("toShallowDict depth 2", () => {
    const root = new TreeNode("root");
    const folder = new TreeNode("folder1");
    const nestedFolder = new TreeNode("nested_folder");
    const deepFile = new TreeNode("deep.txt", true);

    nestedFolder.addChild(deepFile);
    folder.addChild(nestedFolder);
    root.addChild(folder);

    const result = root.toShallowDict(2);
    const folderResult = result.children[0];
    expect(folderResult?.name).toBe("folder1");
    expect(folderResult?.children).toHaveLength(1);
    const nestedResult = folderResult?.children[0];
    expect(nestedResult?.name).toBe("nested_folder");
    expect(nestedResult?.children).toEqual([]);
  });

  it("toShallowDict includes path and id", () => {
    const root = new TreeNode("project");
    const src = new TreeNode("src");
    const main = new TreeNode("main.py", true);

    src.addChild(main);
    root.addChild(src);

    root.id = "root-id";
    src.id = "src-id";
    main.id = "main-id";

    const result = root.toShallowDict(2);
    expect(result.id).toBe("root-id");
    expect(result.path).toBe("project");

    const srcResult = result.children[0];
    expect(srcResult?.id).toBe("src-id");
    expect(srcResult?.path).toBe("src");

    const mainResult = srcResult?.children[0];
    expect(mainResult?.id).toBe("main-id");
    expect(mainResult?.path).toBe(path.join("src", "main.py"));
  });

  it("file node ignores depth", () => {
    const file = new TreeNode("readme.md", true);
    const result = file.toShallowDict(10);
    expect(result.name).toBe("readme.md");
    expect(result.is_file).toBe(true);
    expect(result.children).toEqual([]);
  });
});
