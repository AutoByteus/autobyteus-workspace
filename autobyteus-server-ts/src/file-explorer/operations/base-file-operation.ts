import type { FileSystemChangeEvent } from "../file-system-changes.js";
import type { TreeNode } from "../tree-node.js";

export type FileExplorerOperationContext = {
  workspaceRootPath: string;
  rootNode: TreeNode | null;
  getPath: (relativePath: string) => string;
  findNodeByPath: (relativePath: string) => TreeNode | null;
  suppressWatcherPaths?: (paths: string[]) => void;
};

export abstract class BaseFileOperation {
  protected fileExplorer: FileExplorerOperationContext;

  constructor(fileExplorer: FileExplorerOperationContext) {
    if (!fileExplorer || !fileExplorer.workspaceRootPath) {
      throw new Error("FileExplorer with a valid workspaceRootPath is required.");
    }
    this.fileExplorer = fileExplorer;
  }

  protected resolveWorkspacePath(relativePath: string, accessDeniedMessage: string): string {
    try {
      return this.fileExplorer.getPath(relativePath);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Access denied: Path resolves outside the workspace."
      ) {
        throw new Error(accessDeniedMessage);
      }
      throw error;
    }
  }

  abstract execute(): Promise<FileSystemChangeEvent>;
}
