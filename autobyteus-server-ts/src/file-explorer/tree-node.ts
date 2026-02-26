import path from "node:path";
import { v5 as uuidv5 } from "uuid";

export type TreeNodeDict = {
  id: string;
  name: string;
  path: string;
  is_file: boolean;
  children: TreeNodeDict[];
  children_loaded?: boolean;
};

export class TreeNode {
  name: string;
  isFile: boolean;
  children: TreeNode[] = [];
  parent: TreeNode | null;
  id: string;
  pathValue: string | null = null;
  childrenLoaded: boolean;

  constructor(
    name: string,
    isFile = false,
    parent: TreeNode | null = null,
    childrenLoaded = false,
  ) {
    this.name = name;
    this.isFile = isFile;
    this.parent = parent;
    this.childrenLoaded = childrenLoaded;

    if (parent) {
      this.id = uuidv5(name, parent.id);
    } else {
      this.id = uuidv5(name, uuidv5.URL);
    }
  }

  addChild(node: TreeNode): void {
    node.parent = this;
    this.children.push(node);
  }

  getPath(): string {
    const parts: string[] = [];
    let current: TreeNode | null = this;

    while (current) {
      parts.push(current.name);
      current = current.parent;
    }

    parts.reverse();
    if (parts.length > 1) {
      return path.join(...parts.slice(1));
    }
    return parts[0] ?? "";
  }

  findNodeByPath(relativePath: string): TreeNode | null {
    const normalizedPath = path.normalize(relativePath);
    if (normalizedPath === "." || normalizedPath === "") {
      return this;
    }

    const parts = normalizedPath.split(path.sep).filter((part) => part.length > 0);
    let currentNode: TreeNode = this;

    for (const part of parts) {
      const foundChild = currentNode.children.find((child) => child.name === part);
      if (!foundChild) {
        return null;
      }
      currentNode = foundChild;
    }

    return currentNode;
  }

  toDict(): TreeNodeDict {
    const rootDict: TreeNodeDict = {
      id: this.id,
      name: this.name,
      path: this.getPath(),
      is_file: this.isFile,
      children: [],
      children_loaded: this.childrenLoaded,
    };

    const stack: Array<{ node: TreeNode; dict: TreeNodeDict }> = [{ node: this, dict: rootDict }];

    while (stack.length > 0) {
      const { node, dict } = stack.pop()!;
      for (const child of node.children) {
        const childDict: TreeNodeDict = {
          id: child.id,
          name: child.name,
          path: child.getPath(),
          is_file: child.isFile,
          children: [],
          children_loaded: child.childrenLoaded,
        };
        dict.children.push(childDict);
        if (!child.isFile) {
          stack.push({ node: child, dict: childDict });
        }
      }
    }

    return rootDict;
  }

  toShallowDict(depth = 1): TreeNodeDict {
    const rootDict: TreeNodeDict = {
      id: this.id,
      name: this.name,
      path: this.getPath(),
      is_file: this.isFile,
      children: [],
      children_loaded: this.childrenLoaded,
    };

    if (this.isFile) {
      return rootDict;
    }

    const queue: Array<{ node: TreeNode; dict: TreeNodeDict; depth: number }> = [
      { node: this, dict: rootDict, depth: 0 },
    ];

    while (queue.length > 0) {
      const { node, dict, depth: currentDepth } = queue.shift()!;
      if (currentDepth < depth) {
        for (const child of node.children) {
          const childDict: TreeNodeDict = {
            id: child.id,
            name: child.name,
            path: child.getPath(),
            is_file: child.isFile,
            children: [],
            children_loaded: child.childrenLoaded,
          };
          dict.children.push(childDict);
          if (!child.isFile) {
            queue.push({ node: child, dict: childDict, depth: currentDepth + 1 });
          }
        }
      }
    }

    return rootDict;
  }

  static fromDict(data: TreeNodeDict, parent: TreeNode | null = null): TreeNode {
    const node = new TreeNode(data.name, data.is_file, parent, data.children_loaded ?? false);
    node.id = data.id;
    node.pathValue = data.path ?? null;
    for (const childData of data.children ?? []) {
      const childNode = TreeNode.fromDict(childData, node);
      node.children.push(childNode);
    }
    return node;
  }

  toJson(): string {
    return JSON.stringify(this.toDict(), null, 4);
  }
}
