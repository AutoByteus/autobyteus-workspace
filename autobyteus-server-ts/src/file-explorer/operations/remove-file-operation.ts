import fs from "node:fs/promises";
import path from "node:path";
import { RemoveNodeSynchronizer } from "../tree-state-synchronizers/remove-node-synchronizer.js";
import { BaseFileOperation, type FileExplorerOperationContext } from "./base-file-operation.js";
import type { FileSystemChangeEvent } from "../file-system-changes.js";

export class RemoveFileOperation extends BaseFileOperation {
  private targetPath: string;

  constructor(fileExplorer: FileExplorerOperationContext, targetPath: string) {
    super(fileExplorer);
    this.targetPath = targetPath;
  }

  async execute(): Promise<FileSystemChangeEvent> {
    const normalizedPath = path.normalize(this.targetPath);
    if (path.isAbsolute(normalizedPath)) {
      throw new Error("The path must be relative to the workspace root.");
    }

    const absolutePath = path.join(this.fileExplorer.workspaceRootPath, normalizedPath);
    if (!absolutePath.startsWith(this.fileExplorer.workspaceRootPath)) {
      throw new Error("Access denied: Path is outside the workspace.");
    }

    let stats: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stats = await fs.stat(absolutePath);
    } catch {
      throw new Error(`Path not found: ${this.targetPath}`);
    }

    try {
      if (stats.isFile()) {
        await fs.unlink(absolutePath);
      } else if (stats.isDirectory()) {
        await fs.rm(absolutePath, { recursive: true, force: false });
      } else {
        throw new Error(`Unsupported file type: ${this.targetPath}`);
      }
    } catch (error) {
      throw new Error(`Error deleting ${absolutePath}: ${String(error)}`);
    }

    const synchronizer = new RemoveNodeSynchronizer(this.fileExplorer, this.targetPath);
    return synchronizer.sync();
  }
}
