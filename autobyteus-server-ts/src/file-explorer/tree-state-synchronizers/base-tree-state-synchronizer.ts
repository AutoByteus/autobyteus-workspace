import type { FileSystemChangeEvent } from "../file-system-changes.js";
import type { TreeNode } from "../tree-node.js";

export type FileExplorerTreeContext = {
  rootNode: TreeNode | null;
  findNodeByPath: (relativePath: string) => TreeNode | null;
};

export abstract class BaseTreeStateSynchronizer {
  protected fileExplorer: FileExplorerTreeContext;

  constructor(fileExplorer: FileExplorerTreeContext) {
    if (!fileExplorer || !fileExplorer.rootNode) {
      throw new Error("FileExplorer with a valid rootNode is required.");
    }
    this.fileExplorer = fileExplorer;
  }

  abstract sync(): FileSystemChangeEvent;
}
