import fs from "node:fs/promises";
import path from "node:path";
import { MoveNodeSynchronizer } from "../tree-state-synchronizers/move-node-synchronizer.js";
import { BaseFileOperation, type FileExplorerOperationContext } from "./base-file-operation.js";
import type { FileSystemChangeEvent } from "../file-system-changes.js";

export class RenameFileOperation extends BaseFileOperation {
  private targetPath: string;
  private newName: string;

  constructor(fileExplorer: FileExplorerOperationContext, targetPath: string, newName: string) {
    super(fileExplorer);
    this.targetPath = targetPath;
    this.newName = newName;
  }

  async execute(): Promise<FileSystemChangeEvent> {
    const normalizedTarget = path.normalize(this.targetPath);
    if (path.isAbsolute(normalizedTarget)) {
      throw new Error("The path must be relative to the workspace root.");
    }

    const absoluteTarget = path.join(this.fileExplorer.workspaceRootPath, normalizedTarget);
    if (!absoluteTarget.startsWith(this.fileExplorer.workspaceRootPath)) {
      throw new Error("Access denied: Target is outside the workspace.");
    }

    if (!(await this.pathExists(absoluteTarget))) {
      throw new Error(`Target path not found: ${this.targetPath}`);
    }

    const parentDirectory = path.dirname(absoluteTarget);
    const absoluteDestination = path.join(parentDirectory, this.newName);

    if (await this.pathExists(absoluteDestination)) {
      throw new Error(`A file or folder named '${this.newName}' already exists.`);
    }

    try {
      await fs.rename(absoluteTarget, absoluteDestination);
    } catch (error) {
      throw new Error(`Error renaming ${this.targetPath}: ${String(error)}`);
    }

    const destinationPath = path.join(path.dirname(this.targetPath), this.newName);
    const synchronizer = new MoveNodeSynchronizer(
      this.fileExplorer,
      this.targetPath,
      destinationPath,
    );
    return synchronizer.sync();
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }
}
