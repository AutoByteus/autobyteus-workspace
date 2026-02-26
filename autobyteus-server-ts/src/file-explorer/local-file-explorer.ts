import type { FileSystemChangeEvent } from "./file-system-changes.js";
import { BaseFileExplorer } from "./base-file-explorer.js";
import { FileExplorer } from "./file-explorer.js";
import type { TreeNode } from "./tree-node.js";

export class LocalFileExplorer extends BaseFileExplorer {
  private adaptee: FileExplorer;
  private watcherStartPromise: Promise<void> | null = null;

  constructor(rootPath: string) {
    super();
    this.adaptee = new FileExplorer(rootPath);
  }

  get rootPath(): string {
    return this.adaptee.workspaceRootPath;
  }

  async buildWorkspaceDirectoryTree(maxDepth: number | null = null): Promise<TreeNode> {
    return this.adaptee.buildWorkspaceDirectoryTree(maxDepth);
  }

  getTree(): TreeNode | null {
    return this.adaptee.getTree();
  }

  async toJson(): Promise<string | null> {
    return this.adaptee.toJson();
  }

  async toShallowJson(depth = 1): Promise<string | null> {
    return this.adaptee.toShallowJson(depth);
  }

  async getAllFilePaths(): Promise<string[]> {
    return this.adaptee.getAllFilePaths();
  }

  async readFileContent(filePath: string): Promise<string> {
    return this.adaptee.readFileContent(filePath);
  }

  async writeFileContent(filePath: string, content: string): Promise<FileSystemChangeEvent> {
    return this.adaptee.writeFileContent(filePath, content);
  }

  async addFileOrFolder(path: string, isFile: boolean): Promise<FileSystemChangeEvent> {
    return this.adaptee.addFileOrFolder(path, isFile);
  }

  async removeFileOrFolder(path: string): Promise<FileSystemChangeEvent> {
    return this.adaptee.removeFileOrFolder(path);
  }

  async moveFileOrFolder(sourcePath: string, destinationPath: string): Promise<FileSystemChangeEvent> {
    return this.adaptee.moveFileOrFolder(sourcePath, destinationPath);
  }

  async renameFileOrFolder(targetPath: string, newName: string): Promise<FileSystemChangeEvent> {
    return this.adaptee.renameFileOrFolder(targetPath, newName);
  }

  async ensureWatcherStarted(_loop?: unknown): Promise<void> {
    if (this.adaptee.fileWatcher) {
      return;
    }

    if (!this.watcherStartPromise) {
      this.watcherStartPromise = this.adaptee.startWatcher().finally(() => {
        this.watcherStartPromise = null;
      });
    }

    await this.watcherStartPromise;
  }

  subscribe(): AsyncGenerator<string, void, void> {
    if (!this.adaptee.fileWatcher) {
      throw new Error("Watcher is not running. Call ensureWatcherStarted() first.");
    }
    return this.adaptee.fileWatcher.events();
  }

  async close(): Promise<void> {
    await this.adaptee.close();
  }
}
