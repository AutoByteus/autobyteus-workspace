import fs from "node:fs/promises";
import path from "node:path";
import { AddNodeSynchronizer } from "../tree-state-synchronizers/add-node-synchronizer.js";
import { ModifyNodeSynchronizer } from "../tree-state-synchronizers/modify-node-synchronizer.js";
import { BaseFileOperation, type FileExplorerOperationContext } from "./base-file-operation.js";
import type { FileSystemChangeEvent } from "../file-system-changes.js";

export class WriteFileOperation extends BaseFileOperation {
  private filePath: string;
  private content: string;

  constructor(fileExplorer: FileExplorerOperationContext, filePath: string, content: string) {
    super(fileExplorer);
    this.filePath = filePath;
    this.content = content;
  }

  async execute(): Promise<FileSystemChangeEvent> {
    const normalizedPath = path.normalize(this.filePath);
    if (path.isAbsolute(normalizedPath)) {
      throw new Error("The path must be relative to the workspace root.");
    }

    const absoluteFilePath = path.join(this.fileExplorer.workspaceRootPath, normalizedPath);
    if (!absoluteFilePath.startsWith(this.fileExplorer.workspaceRootPath)) {
      throw new Error("Access denied: File is outside the workspace.");
    }

    const fileExisted = await this.pathExists(absoluteFilePath);

    try {
      if (!fileExisted) {
        const directory = path.dirname(absoluteFilePath);
        await fs.mkdir(directory, { recursive: true });
      }
      await fs.writeFile(absoluteFilePath, this.content, { encoding: "utf-8" });
    } catch (error) {
      throw new Error(`Error writing to file ${this.filePath}: ${String(error)}`);
    }

    const synchronizer = fileExisted
      ? new ModifyNodeSynchronizer(this.fileExplorer, this.filePath)
      : new AddNodeSynchronizer(this.fileExplorer, this.filePath, true);

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
