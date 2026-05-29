import fs from "node:fs/promises";
import path from "node:path";
import { MoveNodeSynchronizer } from "../tree-state-synchronizers/move-node-synchronizer.js";
import { BaseFileOperation, type FileExplorerOperationContext } from "./base-file-operation.js";
import type { FileSystemChangeEvent } from "../file-system-changes.js";

export class RenameFileOperation extends BaseFileOperation {
  private targetPath: string;
  private newName: string;
  private static readonly invalidLeafNameMessage =
    "Invalid new name: The new name must be a file or folder name, not a path.";

  constructor(fileExplorer: FileExplorerOperationContext, targetPath: string, newName: string) {
    super(fileExplorer);
    this.targetPath = targetPath;
    this.newName = newName;
  }

  async execute(): Promise<FileSystemChangeEvent> {
    const leafName = this.validateLeafName();
    const normalizedTarget = path.normalize(this.targetPath);
    if (path.isAbsolute(normalizedTarget)) {
      throw new Error("The path must be relative to the workspace root.");
    }

    const absoluteTarget = this.resolveWorkspacePath(
      normalizedTarget,
      "Access denied: Target is outside the workspace.",
    );

    if (!(await this.pathExists(absoluteTarget))) {
      throw new Error(`Target path not found: ${this.targetPath}`);
    }

    const targetParentPath = path.dirname(normalizedTarget);
    const destinationPath = path.join(targetParentPath, leafName);
    const absoluteDestination = this.resolveWorkspacePath(
      destinationPath,
      "Access denied: Destination is outside the workspace.",
    );

    if (await this.pathExists(absoluteDestination)) {
      throw new Error(`A file or folder named '${this.newName}' already exists.`);
    }

    this.fileExplorer.suppressWatcherPaths?.([absoluteTarget, absoluteDestination]);

    try {
      await fs.rename(absoluteTarget, absoluteDestination);
    } catch (error) {
      throw new Error(`Error renaming ${this.targetPath}: ${String(error)}`);
    }

    const synchronizer = new MoveNodeSynchronizer(
      this.fileExplorer,
      this.targetPath,
      destinationPath,
    );
    return synchronizer.sync();
  }

  private validateLeafName(): string {
    if (!this.newName || this.newName === "." || this.newName === "..") {
      throw new Error(RenameFileOperation.invalidLeafNameMessage);
    }

    if (
      this.newName.includes("/") ||
      this.newName.includes("\\") ||
      path.isAbsolute(this.newName) ||
      path.win32.isAbsolute(this.newName)
    ) {
      throw new Error(RenameFileOperation.invalidLeafNameMessage);
    }

    return this.newName;
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
