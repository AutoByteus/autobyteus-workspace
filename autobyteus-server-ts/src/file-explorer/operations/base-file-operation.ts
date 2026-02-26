import type { FileSystemChangeEvent } from "../file-system-changes.js";
import type { TreeNode } from "../tree-node.js";

export type FileExplorerOperationContext = {
  workspaceRootPath: string;
  rootNode: TreeNode | null;
  findNodeByPath: (relativePath: string) => TreeNode | null;
};

export abstract class BaseFileOperation {
  protected fileExplorer: FileExplorerOperationContext;

  constructor(fileExplorer: FileExplorerOperationContext) {
    if (!fileExplorer || !fileExplorer.workspaceRootPath) {
      throw new Error("FileExplorer with a valid workspaceRootPath is required.");
    }
    this.fileExplorer = fileExplorer;
  }

  abstract execute(): Promise<FileSystemChangeEvent>;
}
