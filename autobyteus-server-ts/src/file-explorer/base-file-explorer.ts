import type { FileSystemChangeEvent } from "./file-system-changes.js";
import type { TreeNode } from "./tree-node.js";

export abstract class BaseFileExplorer {
  abstract get rootPath(): string;

  abstract buildWorkspaceDirectoryTree(maxDepth?: number | null): Promise<TreeNode>;

  abstract getTree(): TreeNode | null;

  abstract toJson(): Promise<string | null>;

  abstract toShallowJson(depth?: number): Promise<string | null>;

  abstract getAllFilePaths(): Promise<string[]>;

  abstract readFileContent(filePath: string): Promise<string>;

  abstract writeFileContent(filePath: string, content: string): Promise<FileSystemChangeEvent>;

  abstract addFileOrFolder(path: string, isFile: boolean): Promise<FileSystemChangeEvent>;

  abstract removeFileOrFolder(path: string): Promise<FileSystemChangeEvent>;

  abstract moveFileOrFolder(
    sourcePath: string,
    destinationPath: string,
  ): Promise<FileSystemChangeEvent>;

  abstract renameFileOrFolder(targetPath: string, newName: string): Promise<FileSystemChangeEvent>;

  abstract ensureWatcherStarted(loop?: unknown): Promise<void>;

  abstract subscribe(): AsyncGenerator<string, void, void>;

  abstract close(): Promise<void>;
}
