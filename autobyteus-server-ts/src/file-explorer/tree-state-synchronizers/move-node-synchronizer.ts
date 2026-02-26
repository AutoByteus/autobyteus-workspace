import path from "node:path";
import { FileSystemChangeEvent, MoveChange, RenameChange } from "../file-system-changes.js";
import {
  BaseTreeStateSynchronizer,
  type FileExplorerTreeContext,
} from "./base-tree-state-synchronizer.js";

export class MoveNodeSynchronizer extends BaseTreeStateSynchronizer {
  private sourcePath: string;
  private destinationPath: string;

  constructor(fileExplorer: FileExplorerTreeContext, sourcePath: string, destinationPath: string) {
    super(fileExplorer);
    this.sourcePath = sourcePath;
    this.destinationPath = destinationPath;
  }

  sync(): FileSystemChangeEvent {
    const nodeToMove = this.fileExplorer.findNodeByPath(this.sourcePath);
    if (!nodeToMove || !nodeToMove.parent) {
      return new FileSystemChangeEvent([]);
    }

    const oldParentNode = nodeToMove.parent;
    oldParentNode.children = oldParentNode.children.filter((child) => child !== nodeToMove);

    const destParentPath = path.dirname(this.destinationPath);
    const newParentNode = this.fileExplorer.findNodeByPath(destParentPath);

    if (!newParentNode) {
      throw new Error(`Destination parent directory not found in tree: ${destParentPath}`);
    }

    const newName = path.basename(this.destinationPath);
    const oldName = nodeToMove.name;

    nodeToMove.parent = newParentNode;
    nodeToMove.name = newName;
    newParentNode.addChild(nodeToMove);

    const isRename = oldParentNode.id === newParentNode.id && oldName !== newName;
    const change = isRename
      ? new RenameChange(nodeToMove, newParentNode.id)
      : new MoveChange(nodeToMove, oldParentNode.id, newParentNode.id);

    return new FileSystemChangeEvent([change]);
  }
}
