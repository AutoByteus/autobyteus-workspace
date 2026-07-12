import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { DirectoryTraversal } from "./directory-traversal.js";
import type { FileSystemChangeEvent } from "./file-system-changes.js";
import type { FileSystemWatcher } from "./watcher/file-system-watcher.js";
import { TreeNode } from "./tree-node.js";
import { DefaultSortStrategy } from "./sort-strategy/default-sort-strategy.js";
import type { DirectoryEntry } from "./sort-strategy/sort-strategy.js";
import type { TraversalIgnoreStrategy } from "./traversal-ignore-strategy/traversal-ignore-strategy.js";
import { WorkspaceIgnoreMatcher } from "./traversal-ignore-strategy/workspace-ignore-matcher.js";
import { AddFileOrFolderOperation } from "./operations/add-file-or-folder-operation.js";
import { MoveFileOperation } from "./operations/move-file-operation.js";
import { RemoveFileOperation } from "./operations/remove-file-operation.js";
import { RenameFileOperation } from "./operations/rename-file-operation.js";
import { WriteFileOperation } from "./operations/write-file-operation.js";
import { createWorkspaceIgnoreStrategies } from "./traversal-ignore-strategy/workspace-ignore-strategies.js";
import { WorkspaceSearchSnapshotController } from "./search-snapshot/workspace-search-snapshot-controller.js";
import { resolveWorkspaceRelativePath } from "../workspaces/workspace-path-utils.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

type FolderProjectionOptions = {
  signal?: AbortSignal;
};

type DirectoryTreeBuildOptions = {
  signal?: AbortSignal;
};

export type WatcherLease = {
  readonly reason: string;
  release(): Promise<void>;
};

export class WorkspaceFileExplorer {
  workspaceRootPath: string;
  rootNode: TreeNode | null = null;
  ignoreStrategies: TraversalIgnoreStrategy[];
  fileWatcher: FileSystemWatcher | null = null;
  private watcherStartPromise: Promise<void> | null = null;
  private watcherStopPromise: Promise<void> | null = null;
  private watcherLeaseCount = 0;
  private searchSnapshotController: WorkspaceSearchSnapshotController;

  constructor(workspaceRootPath: string) {
    this.workspaceRootPath = path.resolve(workspaceRootPath);
    this.ignoreStrategies = createWorkspaceIgnoreStrategies(this.workspaceRootPath);
    this.searchSnapshotController = new WorkspaceSearchSnapshotController(this);
  }

  get rootPath(): string {
    return this.workspaceRootPath;
  }

  async buildWorkspaceDirectoryTree(
    maxDepth: number | null = null,
    options: DirectoryTreeBuildOptions = {},
  ): Promise<TreeNode> {
    if (!this.workspaceRootPath) {
      throw new Error("Workspace root path is not set");
    }

    this.throwIfAborted(options.signal, "Directory tree build aborted");
    const directoryTraversal = new DirectoryTraversal(this.ignoreStrategies);
    const nextRootNode = await directoryTraversal.buildTree(this.workspaceRootPath, maxDepth, options);
    this.throwIfAborted(options.signal, "Directory tree build aborted");
    this.rootNode = nextRootNode;
    return this.rootNode;
  }

  getPath(relativePath: string): string {
    if (!this.workspaceRootPath) {
      throw new Error("Workspace root path is not set");
    }

    try {
      return resolveWorkspaceRelativePath(this.workspaceRootPath, relativePath);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Access denied: Path resolves outside the workspace boundary."
      ) {
        throw new Error("Access denied: Path resolves outside the workspace.");
      }
      throw error;
    }
  }

  findNodeByPath(relativePath: string): TreeNode | null {
    if (!this.rootNode) {
      return null;
    }

    return this.rootNode.findNodeByPath(relativePath);
  }

  async writeFileContent(filePath: string, content: string): Promise<FileSystemChangeEvent> {
    await this.ensureTreeSnapshotLoaded();
    const operation = new WriteFileOperation(this, filePath, content);
    return operation.execute();
  }

  async removeFileOrFolder(fileOrFolderPath: string): Promise<FileSystemChangeEvent> {
    await this.ensureTreeSnapshotLoaded();
    const operation = new RemoveFileOperation(this, fileOrFolderPath);
    return operation.execute();
  }

  async moveFileOrFolder(sourcePath: string, destinationPath: string): Promise<FileSystemChangeEvent> {
    await this.ensureTreeSnapshotLoaded();
    const operation = new MoveFileOperation(this, sourcePath, destinationPath);
    return operation.execute();
  }

  async renameFileOrFolder(targetPath: string, newName: string): Promise<FileSystemChangeEvent> {
    await this.ensureTreeSnapshotLoaded();
    const operation = new RenameFileOperation(this, targetPath, newName);
    return operation.execute();
  }

  async addFileOrFolder(targetPath: string, isFile: boolean): Promise<FileSystemChangeEvent> {
    await this.ensureTreeSnapshotLoaded();
    const operation = new AddFileOrFolderOperation(this, targetPath, isFile);
    return operation.execute();
  }

  async readFileContent(filePath: string, maxSize = 1024 * 1024): Promise<string> {
    if (!this.workspaceRootPath) {
      throw new Error("Workspace root path is not set");
    }

    let absoluteFilePath: string;
    try {
      absoluteFilePath = this.getPath(filePath);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Access denied: Path resolves outside the workspace."
      ) {
        throw new Error("Access denied: File is outside the workspace.");
      }
      throw error;
    }

    let stats: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stats = await fs.stat(absoluteFilePath);
    } catch {
      throw new Error(`File not found: ${absoluteFilePath}`);
    }

    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${absoluteFilePath}`);
    }

    if (stats.size > maxSize) {
      throw new Error(
        `File size (${stats.size} bytes) exceeds the maximum allowed size (${maxSize} bytes).`,
      );
    }

    return fs.readFile(absoluteFilePath, { encoding: "utf-8" });
  }

  getTree(): TreeNode | null {
    return this.rootNode;
  }

  toJson(): string | null {
    return this.rootNode ? this.rootNode.toJson() : null;
  }

  toShallowJson(depth = 1): string | null {
    if (!this.rootNode) {
      return null;
    }
    return JSON.stringify(this.rootNode.toShallowDict(depth));
  }

  async loadFolderChildren(
    folderPath: string,
    options: FolderProjectionOptions = {},
  ): Promise<TreeNode> {
    this.throwIfAborted(options.signal);
    const relativeFolderPath = this.normalizeRelativeFolderPath(folderPath);
    const absoluteFolderPath = this.getPath(relativeFolderPath);
    const ignoreMatcher = new WorkspaceIgnoreMatcher(this.workspaceRootPath, this.ignoreStrategies);
    const stats = await fs.stat(absoluteFolderPath).catch(() => null);
    if (!stats) {
      throw new Error(`Folder not found: ${folderPath}`);
    }
    if (stats.isFile()) {
      throw new Error(`Path is a file, not a folder: ${folderPath}`);
    }
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a folder: ${folderPath}`);
    }
    if (relativeFolderPath && ignoreMatcher.shouldIgnore(absoluteFolderPath, true)) {
      throw new Error(`Access denied: Folder is ignored: ${folderPath}`);
    }

    const folderNode = this.ensureFolderNode(relativeFolderPath);
    const entries = await this.readImmediateDirectoryEntries(
      absoluteFolderPath,
      ignoreMatcher,
      options.signal,
    );
    folderNode.children = entries.map((entry) => {
      const isFileChild = entry.isFile();
      return new TreeNode(entry.name, isFileChild, folderNode, isFileChild);
    });
    folderNode.childrenLoaded = true;
    return folderNode;
  }

  async getAllFilePaths(): Promise<string[]> {
    if (!this.rootNode) {
      await this.buildWorkspaceDirectoryTree();
    }

    const paths: string[] = [];
    const stack: TreeNode[] = this.rootNode ? [this.rootNode] : [];

    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) {
        continue;
      }

      if (node.isFile) {
        paths.push(node.getPath());
      } else {
        for (const child of node.children) {
          stack.push(child);
        }
      }
    }

    return paths;
  }

  async searchFiles(query: string, signal?: AbortSignal): Promise<string[]> {
    return this.searchSnapshotController.search(query, signal);
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
      `Acquired file watcher lease for ${this.workspaceRootPath} (${reason}); active leases: ${this.watcherLeaseCount}`,
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

  subscribe(): AsyncGenerator<string, void, void> {
    if (!this.fileWatcher) {
      throw new Error("Watcher is not running. Acquire a watcher lease before subscribing.");
    }
    return this.fileWatcher.events();
  }

  async close(): Promise<void> {
    this.watcherLeaseCount = 0;
    this.searchSnapshotController.close();
    if (this.watcherStartPromise) {
      try {
        await this.watcherStartPromise;
      } catch {
        // start failure already performs watcher cleanup
      }
    }
    if (this.watcherStopPromise) {
      await this.watcherStopPromise;
    }
    await this.stopWatcher();
  }

  suppressWatcherPaths(paths: string[]): void {
    this.fileWatcher?.suppressPaths(paths);
  }

  private async ensureTreeSnapshotLoaded(): Promise<void> {
    if (!this.rootNode) {
      await this.buildWorkspaceDirectoryTree();
    }
  }

  private normalizeRelativeFolderPath(folderPath: string): string {
    const normalizedPath = path.normalize(folderPath || "");
    if (normalizedPath === "." || normalizedPath === path.sep) {
      return "";
    }
    return normalizedPath.replace(/^[\\/]+/, "");
  }

  private ensureFolderNode(relativeFolderPath: string): TreeNode {
    if (!this.rootNode) {
      const rootName = path.basename(this.workspaceRootPath) || this.workspaceRootPath;
      this.rootNode = new TreeNode(rootName, false, null, false);
    }
    if (!relativeFolderPath) {
      return this.rootNode;
    }

    const parts = relativeFolderPath.split(path.sep).filter(Boolean);
    let currentNode = this.rootNode;
    for (const part of parts) {
      let nextNode = currentNode.children.find((child) => child.name === part) ?? null;
      if (nextNode?.isFile) {
        throw new Error(`Path is a file, not a folder: ${relativeFolderPath}`);
      }
      if (!nextNode) {
        nextNode = new TreeNode(part, false, currentNode, false);
        currentNode.addChild(nextNode);
      }
      currentNode = nextNode;
    }
    return currentNode;
  }

  private async readImmediateDirectoryEntries(
    folderPath: string,
    ignoreMatcher: WorkspaceIgnoreMatcher,
    signal?: AbortSignal,
  ): Promise<DirectoryEntry[]> {
    this.throwIfAborted(signal);
    const sortStrategy = new DefaultSortStrategy();
    const entries: DirectoryEntry[] = [];
    const dir = await fs.opendir(folderPath);
    try {
      for await (const dirent of dir) {
        this.throwIfAborted(signal);
        const entryPath = path.join(folderPath, dirent.name);
        const { isFile, isDirectory } = await this.resolveFolderProjectionEntryType(dirent, entryPath);
        if (!isFile && !isDirectory) {
          continue;
        }
        if (ignoreMatcher.shouldIgnore(entryPath, isDirectory)) {
          continue;
        }
        entries.push({
          name: dirent.name,
          path: entryPath,
          isFile: () => isFile,
          isDirectory: () => isDirectory,
        });
      }
    } finally {
      await dir.close().catch(() => undefined);
    }
    this.throwIfAborted(signal);
    return sortStrategy.sort(entries);
  }

  private async resolveFolderProjectionEntryType(
    dirent: Dirent,
    entryPath: string,
  ): Promise<{ isFile: boolean; isDirectory: boolean }> {
    if (dirent.isSymbolicLink()) {
      try {
        const stats = await fs.stat(entryPath);
        return { isFile: stats.isFile(), isDirectory: stats.isDirectory() };
      } catch {
        return { isFile: false, isDirectory: false };
      }
    }
    return { isFile: dirent.isFile(), isDirectory: dirent.isDirectory() };
  }

  private throwIfAborted(signal?: AbortSignal, message = "Folder children projection aborted"): void {
    if (!signal?.aborted) {
      return;
    }
    const error = new Error(message);
    error.name = "AbortError";
    throw error;
  }

  private async startWatcher(): Promise<void> {
    if (this.fileWatcher) {
      return;
    }

    try {
      const module = await import("./watcher/file-system-watcher.js");
      const FileSystemWatcher = module.FileSystemWatcher as new (
        explorer: WorkspaceFileExplorer,
        ignoreStrategies: TraversalIgnoreStrategy[],
      ) => FileSystemWatcher;
      const watcher = new FileSystemWatcher(this, this.ignoreStrategies);
      this.fileWatcher = watcher;
      watcher.start();
      await watcher.waitUntilReady();
    } catch (error) {
      await this.stopWatcher();
      throw new Error(`FileSystemWatcher not available: ${String(error)}`);
    }
  }

  private async stopWatcher(): Promise<void> {
    const watcher = this.fileWatcher;
    if (!watcher) {
      return;
    }

    this.fileWatcher = null;
    await watcher.stop();
  }

  private async ensureWatcherRunningForLease(): Promise<void> {
    if (this.watcherStopPromise) {
      await this.watcherStopPromise;
    }

    if (this.fileWatcher) {
      return;
    }

    if (!this.watcherStartPromise) {
      this.watcherStartPromise = this.startWatcher().finally(() => {
        this.watcherStartPromise = null;
      });
    }

    await this.watcherStartPromise;
  }

  private async releaseWatcherLease(reason: string): Promise<void> {
    if (this.watcherLeaseCount <= 0) {
      logger.warn(`Ignoring extra file watcher lease release for ${this.workspaceRootPath} (${reason})`);
      this.watcherLeaseCount = 0;
      return;
    }

    this.watcherLeaseCount -= 1;
    logger.info(
      `Released file watcher lease for ${this.workspaceRootPath} (${reason}); active leases: ${this.watcherLeaseCount}`,
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
      this.watcherStopPromise = this.stopWatcher().finally(() => {
        this.watcherStopPromise = null;
      });
    }

    await this.watcherStopPromise;
  }
}
