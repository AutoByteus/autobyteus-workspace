import fs from "node:fs/promises";
import path from "node:path";
import { DirectoryTraversal } from "./directory-traversal.js";
import type { FileSystemChangeEvent } from "./file-system-changes.js";
import type { FileSystemWatcher } from "./watcher/file-system-watcher.js";
import { TreeNode } from "./tree-node.js";
import { GitIgnoreStrategy } from "./traversal-ignore-strategy/git-ignore-strategy.js";
import { SpecificFolderIgnoreStrategy } from "./traversal-ignore-strategy/specific-folder-ignore-strategy.js";
import type { TraversalIgnoreStrategy } from "./traversal-ignore-strategy/traversal-ignore-strategy.js";
import { AddFileOrFolderOperation } from "./operations/add-file-or-folder-operation.js";
import { MoveFileOperation } from "./operations/move-file-operation.js";
import { RemoveFileOperation } from "./operations/remove-file-operation.js";
import { RenameFileOperation } from "./operations/rename-file-operation.js";
import { WriteFileOperation } from "./operations/write-file-operation.js";

export class FileExplorer {
  workspaceRootPath: string;
  rootNode: TreeNode | null = null;
  ignoreStrategies: TraversalIgnoreStrategy[];
  fileWatcher: FileSystemWatcher | null = null;

  constructor(workspaceRootPath: string) {
    this.workspaceRootPath = path.normalize(workspaceRootPath);
    this.ignoreStrategies = [
      new SpecificFolderIgnoreStrategy([".git"]),
      new GitIgnoreStrategy(this.workspaceRootPath),
    ];
  }

  async startWatcher(): Promise<void> {
    if (this.fileWatcher) {
      return;
    }

    try {
      const module = await import("./watcher/file-system-watcher.js");
      const FileSystemWatcher = module.FileSystemWatcher as new (
        explorer: FileExplorer,
        ignoreStrategies: TraversalIgnoreStrategy[],
      ) => FileSystemWatcher;
      this.fileWatcher = new FileSystemWatcher(this, this.ignoreStrategies);
      this.fileWatcher.start();
      await this.fileWatcher.waitUntilReady();
    } catch (error) {
      throw new Error(`FileSystemWatcher not available: ${String(error)}`);
    }
  }

  async buildWorkspaceDirectoryTree(maxDepth: number | null = null): Promise<TreeNode> {
    if (!this.workspaceRootPath) {
      throw new Error("Workspace root path is not set");
    }

    const directoryTraversal = new DirectoryTraversal(this.ignoreStrategies);
    this.rootNode = await directoryTraversal.buildTree(this.workspaceRootPath, maxDepth);
    return this.rootNode;
  }

  getPath(relativePath: string): string {
    if (!this.workspaceRootPath) {
      throw new Error("Workspace root path is not set");
    }

    const absolutePath = path.normalize(path.join(this.workspaceRootPath, relativePath));
    if (!absolutePath.startsWith(this.workspaceRootPath)) {
      throw new Error("Access denied: Path resolves outside the workspace.");
    }

    return absolutePath;
  }

  findNodeByPath(relativePath: string): TreeNode | null {
    if (!this.rootNode) {
      return null;
    }

    return this.rootNode.findNodeByPath(relativePath);
  }

  async writeFileContent(filePath: string, content: string): Promise<FileSystemChangeEvent> {
    const operation = new WriteFileOperation(this, filePath, content);
    return operation.execute();
  }

  async removeFileOrFolder(fileOrFolderPath: string): Promise<FileSystemChangeEvent> {
    const operation = new RemoveFileOperation(this, fileOrFolderPath);
    return operation.execute();
  }

  async moveFileOrFolder(sourcePath: string, destinationPath: string): Promise<FileSystemChangeEvent> {
    const operation = new MoveFileOperation(this, sourcePath, destinationPath);
    return operation.execute();
  }

  async renameFileOrFolder(targetPath: string, newName: string): Promise<FileSystemChangeEvent> {
    const operation = new RenameFileOperation(this, targetPath, newName);
    return operation.execute();
  }

  async addFileOrFolder(targetPath: string, isFile: boolean): Promise<FileSystemChangeEvent> {
    const operation = new AddFileOrFolderOperation(this, targetPath, isFile);
    return operation.execute();
  }

  async readFileContent(filePath: string, maxSize = 1024 * 1024): Promise<string> {
    if (!this.workspaceRootPath) {
      throw new Error("Workspace root path is not set");
    }

    const absoluteFilePath = path.normalize(path.join(this.workspaceRootPath, filePath));
    if (!absoluteFilePath.startsWith(this.workspaceRootPath)) {
      throw new Error("Access denied: File is outside the workspace.");
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

  async close(): Promise<void> {
    if (this.fileWatcher) {
      this.fileWatcher.stop();
    }
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
}
