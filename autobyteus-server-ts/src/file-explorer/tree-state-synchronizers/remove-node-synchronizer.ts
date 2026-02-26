import path from "node:path";
import { v5 as uuidv5 } from "uuid";
import { DeleteChange, FileSystemChangeEvent } from "../file-system-changes.js";
import {
  BaseTreeStateSynchronizer,
  type FileExplorerTreeContext,
} from "./base-tree-state-synchronizer.js";

export class RemoveNodeSynchronizer extends BaseTreeStateSynchronizer {
  private targetPath: string;

  constructor(fileExplorer: FileExplorerTreeContext, targetPath: string) {
    super(fileExplorer);
    this.targetPath = targetPath;
  }

  sync(): FileSystemChangeEvent {
    const nodeToRemove = this.fileExplorer.findNodeByPath(this.targetPath);
    let nodeId: string | null = null;
    let parentId: string | null = null;

    if (nodeToRemove && nodeToRemove.parent) {
      const parentNode = nodeToRemove.parent;
      parentNode.children = parentNode.children.filter((child) => child !== nodeToRemove);
      nodeId = nodeToRemove.id;
      parentId = parentNode.id;
    } else {
      if (!this.targetPath || this.targetPath === ".") {
        return new FileSystemChangeEvent([]);
      }

      const rootNode = this.fileExplorer.rootNode;
      if (!rootNode) {
        return new FileSystemChangeEvent([]);
      }

      let currentId = rootNode.id;
      let lastParentId: string | null = null;
      const parts = path.normalize(this.targetPath).split(path.sep);

      for (const part of parts) {
        lastParentId = currentId;
        currentId = uuidv5(part, currentId);
      }

      nodeId = currentId;
      parentId = lastParentId;
    }

    if (!nodeId || !parentId) {
      return new FileSystemChangeEvent([]);
    }

    return new FileSystemChangeEvent([new DeleteChange(nodeId, parentId)]);
  }
}
