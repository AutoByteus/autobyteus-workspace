import fs from "node:fs/promises";
import path from "node:path";
import { AddNodeSynchronizer } from "../tree-state-synchronizers/add-node-synchronizer.js";
import { BaseFileOperation, type FileExplorerOperationContext } from "./base-file-operation.js";
import type { FileSystemChangeEvent } from "../file-system-changes.js";

export class AddFileOrFolderOperation extends BaseFileOperation {
  private targetPath: string;
  private isFile: boolean;

  constructor(fileExplorer: FileExplorerOperationContext, targetPath: string, isFile: boolean) {
    super(fileExplorer);
    this.targetPath = targetPath;
    this.isFile = isFile;
  }

  async execute(): Promise<FileSystemChangeEvent> {
    const normalizedPath = path.normalize(this.targetPath);
    if (path.isAbsolute(normalizedPath)) {
      throw new Error("The path must be relative to the workspace root.");
    }

    const absolutePath = path.join(this.fileExplorer.workspaceRootPath, normalizedPath);
    if (!absolutePath.startsWith(this.fileExplorer.workspaceRootPath)) {
      throw new Error("Access denied: Target is outside the workspace.");
    }

    if (await this.pathExists(absolutePath)) {
      throw new Error(`File or folder already exists at path: ${this.targetPath}`);
    }

    try {
      if (this.isFile) {
        const parentDirectory = path.dirname(absolutePath);
        await fs.mkdir(parentDirectory, { recursive: true });
        await fs.writeFile(absolutePath, "", { encoding: "utf-8" });
      } else {
        await fs.mkdir(absolutePath, { recursive: true });
      }
    } catch (error) {
      throw new Error(
        `Failed to create ${this.isFile ? "file" : "folder"} at ${this.targetPath}: ${String(error)}`,
      );
    }

    const synchronizer = new AddNodeSynchronizer(this.fileExplorer, this.targetPath, this.isFile);
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
