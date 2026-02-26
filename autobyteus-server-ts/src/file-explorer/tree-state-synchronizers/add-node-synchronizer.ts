import path from "node:path";
import { AddChange, FileSystemChangeEvent } from "../file-system-changes.js";
import { TreeNode } from "../tree-node.js";
import {
  BaseTreeStateSynchronizer,
  type FileExplorerTreeContext,
} from "./base-tree-state-synchronizer.js";

export class AddNodeSynchronizer extends BaseTreeStateSynchronizer {
  private targetPath: string;
  private isFile: boolean;

  constructor(fileExplorer: FileExplorerTreeContext, targetPath: string, isFile: boolean) {
    super(fileExplorer);
    this.targetPath = targetPath;
    this.isFile = isFile;
  }

  sync(): FileSystemChangeEvent {
    const normalizedPath = path.normalize(this.targetPath);
    const parts = normalizedPath.split(path.sep);

    if (parts.length === 0 || (parts.length === 1 && parts[0] === ".")) {
      return new FileSystemChangeEvent([]);
    }

    const parentPath = path.dirname(normalizedPath);
    let parentNode = this.fileExplorer.findNodeByPath(parentPath);
    const changes: AddChange[] = [];

    if (!parentNode) {
      this.createMissingDirectoriesInTree(parentPath, changes);
      parentNode = this.fileExplorer.findNodeByPath(parentPath);
      if (!parentNode) {
        throw new Error(`Failed to find or create parent node for path: ${this.targetPath}`);
      }
    }

    const newNodeName = path.basename(normalizedPath);
    for (const child of parentNode.children) {
      if (child.name === newNodeName) {
        return new FileSystemChangeEvent([]);
      }
    }

    const newNode = new TreeNode(newNodeName, this.isFile, parentNode);
    parentNode.addChild(newNode);

    changes.push(new AddChange(newNode, parentNode.id));
    return new FileSystemChangeEvent(changes);
  }

  private createMissingDirectoriesInTree(relativeDirPath: string, changes: AddChange[]): void {
    if (!relativeDirPath || relativeDirPath === ".") {
      return;
    }

    const parts = path.normalize(relativeDirPath).split(path.sep);
    const rootNode = this.fileExplorer.rootNode;
    if (!rootNode) {
      return;
    }

    let currentNode: TreeNode = rootNode;
    for (const part of parts) {
      let foundChild: TreeNode | null = null;
      for (const child of currentNode.children) {
        if (child.name === part && !child.isFile) {
          foundChild = child;
          break;
        }
      }

      if (foundChild) {
        currentNode = foundChild;
      } else {
        const newDirNode = new TreeNode(part, false, currentNode);
        currentNode.addChild(newDirNode);
        changes.push(new AddChange(newDirNode, currentNode.id));
        currentNode = newDirNode;
      }
    }
  }
}
