import type { FileSystemChangeEvent } from "./file-system-changes.js";
import { BaseFileExplorer, type WatcherLease } from "./base-file-explorer.js";
import { FileExplorer } from "./file-explorer.js";
import type { TreeNode } from "./tree-node.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

export class LocalFileExplorer extends BaseFileExplorer {
  private adaptee: FileExplorer;
  private watcherStartPromise: Promise<void> | null = null;
  private watcherStopPromise: Promise<void> | null = null;
  private watcherLeaseCount = 0;

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

  async acquireWatcherLease(reason: string): Promise<WatcherLease> {
    this.watcherLeaseCount += 1;
    try {
      await this.ensureWatcherRunningForLease();
    } catch (error) {
      this.watcherLeaseCount = Math.max(0, this.watcherLeaseCount - 1);
      throw error;
    }

    let released = false;
    logger.info(
      `Acquired file watcher lease for ${this.rootPath} (${reason}); active leases: ${this.watcherLeaseCount}`,
    );

    return {
      reason,
      release: async () => {
        if (released) {
          return;
        }
        released = true;
        await this.releaseWatcherLease(reason);
      },
    };
  }

  private async ensureWatcherRunningForLease(): Promise<void> {
    if (this.watcherStopPromise) {
      await this.watcherStopPromise;
    }

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

  private async releaseWatcherLease(reason: string): Promise<void> {
    if (this.watcherLeaseCount <= 0) {
      logger.warn(`Ignoring extra file watcher lease release for ${this.rootPath} (${reason})`);
      this.watcherLeaseCount = 0;
      return;
    }

    this.watcherLeaseCount -= 1;
    logger.info(
      `Released file watcher lease for ${this.rootPath} (${reason}); active leases: ${this.watcherLeaseCount}`,
    );

    if (this.watcherLeaseCount === 0) {
      await this.stopWatcherIfUnused();
    }
  }

  private async stopWatcherIfUnused(): Promise<void> {
    if (this.watcherLeaseCount > 0) {
      return;
    }

    if (this.watcherStartPromise) {
      try {
        await this.watcherStartPromise;
      } catch {
        return;
      }
      if (this.watcherLeaseCount > 0) {
        return;
      }
    }

    if (!this.watcherStopPromise) {
      this.watcherStopPromise = this.adaptee.stopWatcher().finally(() => {
        this.watcherStopPromise = null;
      });
    }

    await this.watcherStopPromise;
  }

  subscribe(): AsyncGenerator<string, void, void> {
    if (!this.adaptee.fileWatcher) {
      throw new Error("Watcher is not running. Acquire a watcher lease before subscribing.");
    }
    return this.adaptee.fileWatcher.events();
  }

  async close(): Promise<void> {
    this.watcherLeaseCount = 0;
    if (this.watcherStartPromise) {
      try {
        await this.watcherStartPromise;
      } catch {
        // start failure already performs watcher cleanup in the adaptee
      }
    }
    if (this.watcherStopPromise) {
      await this.watcherStopPromise;
    }
    await this.adaptee.close();
  }
}
