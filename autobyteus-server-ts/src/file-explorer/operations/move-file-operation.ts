import fs from "node:fs/promises";
import path from "node:path";
import { MoveNodeSynchronizer } from "../tree-state-synchronizers/move-node-synchronizer.js";
import { BaseFileOperation, type FileExplorerOperationContext } from "./base-file-operation.js";
import type { FileSystemChangeEvent } from "../file-system-changes.js";

export class MoveFileOperation extends BaseFileOperation {
  private sourcePath: string;
  private destinationPath: string;

  constructor(fileExplorer: FileExplorerOperationContext, sourcePath: string, destinationPath: string) {
    super(fileExplorer);
    this.sourcePath = sourcePath;
    this.destinationPath = destinationPath;
  }

  async execute(): Promise<FileSystemChangeEvent> {
    const normalizedSource = path.normalize(this.sourcePath);
    if (path.isAbsolute(normalizedSource)) {
      throw new Error("The source path must be relative to the workspace root.");
    }

    const absoluteSource = path.join(this.fileExplorer.workspaceRootPath, normalizedSource);
    if (!absoluteSource.startsWith(this.fileExplorer.workspaceRootPath)) {
      throw new Error("Access denied: Source is outside the workspace.");
    }

    let sourceStats: Awaited<ReturnType<typeof fs.stat>>;
    try {
      sourceStats = await fs.stat(absoluteSource);
    } catch {
      throw new Error(`Source path not found: ${this.sourcePath}`);
    }

    const normalizedDestination = path.normalize(this.destinationPath);
    if (path.isAbsolute(normalizedDestination)) {
      throw new Error("The destination path must be relative to the workspace root.");
    }

    const absoluteDestination = path.join(this.fileExplorer.workspaceRootPath, normalizedDestination);
    if (!absoluteDestination.startsWith(this.fileExplorer.workspaceRootPath)) {
      throw new Error("Access denied: Destination is outside the workspace.");
    }

    let finalDestinationPath = absoluteDestination;
    const destinationStats = await this.tryStat(absoluteDestination);
    if (destinationStats?.isDirectory()) {
      finalDestinationPath = path.join(absoluteDestination, path.basename(absoluteSource));
    }

    const finalDestinationRelative = path.relative(
      this.fileExplorer.workspaceRootPath,
      finalDestinationPath,
    );

    if (await this.pathExists(finalDestinationPath)) {
      throw new Error(`Destination path already exists: ${finalDestinationRelative}`);
    }

    try {
      await this.movePath(absoluteSource, finalDestinationPath, sourceStats);
    } catch (error) {
      throw new Error(
        `Error moving ${this.sourcePath} to ${finalDestinationRelative}: ${String(error)}`,
      );
    }

    const synchronizer = new MoveNodeSynchronizer(
      this.fileExplorer,
      this.sourcePath,
      finalDestinationRelative,
    );
    return synchronizer.sync();
  }

  private async movePath(
    source: string,
    destination: string,
    sourceStats: Awaited<ReturnType<typeof fs.stat>>,
  ): Promise<void> {
    try {
      await fs.rename(source, destination);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EXDEV") {
        if (sourceStats.isDirectory()) {
          await fs.cp(source, destination, { recursive: true });
          await fs.rm(source, { recursive: true, force: false });
        } else {
          await fs.copyFile(source, destination);
          await fs.unlink(source);
        }
        return;
      }
      throw error;
    }
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  private async tryStat(targetPath: string): Promise<Awaited<ReturnType<typeof fs.stat>> | null> {
    try {
      return await fs.stat(targetPath);
    } catch {
      return null;
    }
  }
}
