import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { DefaultSortStrategy } from "./sort-strategy/default-sort-strategy.js";
import type { DirectoryEntry, SortStrategy } from "./sort-strategy/sort-strategy.js";
import { GitIgnoreStrategy } from "./traversal-ignore-strategy/git-ignore-strategy.js";
import type { TraversalIgnoreStrategy } from "./traversal-ignore-strategy/traversal-ignore-strategy.js";
import { TreeNode } from "./tree-node.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type DirectoryTraversalOptions = {
  signal?: AbortSignal;
};

const createAbortError = (): Error => {
  const error = new Error("Directory traversal aborted");
  error.name = "AbortError";
  return error;
};

export type UnfollowedEntryKind = "directory" | "file" | "link";

/**
 * An entry classified without following links (`lstat`): a folder, a regular file, or a link (listed, never entered).
 * Anything else (socket, FIFO, device) or an entry gone meanwhile is `null` and skipped (autobyteus-554 N-4).
 */
export const classifyEntryWithoutFollowingLinks = async (entryPath: string): Promise<UnfollowedEntryKind | null> => {
  const stats = await fs.lstat(entryPath).catch(() => null);
  if (!stats) return null;
  if (stats.isSymbolicLink()) return "link";
  if (stats.isDirectory()) return "directory";
  return stats.isFile() ? "file" : null;
};

export class DirectoryTraversal {
  private fileIgnoreStrategies: TraversalIgnoreStrategy[];
  private sortStrategy: SortStrategy;
  private followSymbolicLinks: boolean;

  /** `followSymbolicLinks: false` lists links as link nodes and never enters them. */
  constructor(
    fileIgnoreStrategies: TraversalIgnoreStrategy[] = [],
    sortStrategy: SortStrategy = new DefaultSortStrategy(),
    followSymbolicLinks = true,
  ) {
    this.fileIgnoreStrategies = fileIgnoreStrategies;
    this.sortStrategy = sortStrategy;
    this.followSymbolicLinks = followSymbolicLinks;
  }

  async buildTree(
    folderPath: string,
    maxDepth: number | null = null,
    options: DirectoryTraversalOptions = {},
  ): Promise<TreeNode> {
    this.throwIfAborted(options.signal);
    const startTime = Date.now();
    logger.info(`Starting directory traversal for: '${folderPath}' with max_depth=${maxDepth}`);

    const normalizedPath = path.normalize(folderPath);
    const rootName = path.basename(normalizedPath) || normalizedPath;
    const isFile = await this.isFilePath(normalizedPath);
    const rootNode = new TreeNode(rootName, isFile, null, isFile);

    if (rootNode.isFile) {
      return rootNode;
    }

    const queue: Array<{
      node: TreeNode;
      currentPath: string;
      strategies: TraversalIgnoreStrategy[];
      depth: number;
    }> = [
      {
        node: rootNode,
        currentPath: normalizedPath,
        strategies: [...this.fileIgnoreStrategies],
        depth: 0,
      },
    ];

    let index = 0;
    while (index < queue.length) {
      this.throwIfAborted(options.signal);
      const { node, currentPath, strategies, depth } = queue[index++];

      if (maxDepth !== null && depth >= maxDepth) {
        node.childrenLoaded = false;
        continue;
      }

      let entries: DirectoryEntry[] = [];
      try {
        const dir = await fs.opendir(currentPath);
        for await (const dirent of dir) {
          this.throwIfAborted(options.signal);
          const entryPath = path.join(currentPath, dirent.name);
          const entry = await this.toDirectoryEntry(dirent, entryPath);
          this.throwIfAborted(options.signal);
          if (entry) entries.push(entry);
        }
        node.childrenLoaded = true;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error;
        }
        node.childrenLoaded = false;
        logger.warn(`Failed to scan directory '${currentPath}': ${String(error)}`);
        continue;
      }

      const sortedEntries = this.sortStrategy.sort(entries);

      const gitignorePath = path.join(currentPath, ".gitignore");
      const updatedStrategies = fsSync.existsSync(gitignorePath)
        ? [new GitIgnoreStrategy(currentPath), ...strategies]
        : strategies;

      for (const entry of sortedEntries) {
        this.throwIfAborted(options.signal);
        const isLink = entry.isSymbolicLink?.() === true;
        const isDir = !entry.isFile() && !isLink;
        if (updatedStrategies.some((strategy) => strategy.shouldIgnore(entry.path, isDir))) {
          continue;
        }

        const isFileChild = !isDir;
        // A link is a leaf that is never entered: not a file (nothing to open), and its children count as loaded.
        const childNode = new TreeNode(entry.name, isFileChild && !isLink, node, isFileChild);
        childNode.isSymbolicLink = isLink;
        node.addChild(childNode);

        if (isDir) {
          queue.push({
            node: childNode,
            currentPath: entry.path,
            strategies: [...updatedStrategies],
            depth: depth + 1,
          });
        }

        if (queue.length % 500 === 0) {
          await this.yieldToEventLoop();
          this.throwIfAborted(options.signal);
        }
      }
    }

    this.throwIfAborted(options.signal);
    const duration = (Date.now() - startTime) / 1000;
    logger.info(`Directory traversal for '${normalizedPath}' completed in ${duration.toFixed(4)} seconds.`);

    return rootNode;
  }

  private async isFilePath(targetPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(targetPath);
      return stats.isFile();
    } catch (error) {
      logger.warn(`Unable to stat path '${targetPath}': ${String(error)}`);
      return false;
    }
  }

  private async toDirectoryEntry(dirent: fsSync.Dirent, entryPath: string): Promise<DirectoryEntry | null> {
    if (!this.followSymbolicLinks) {
      const kind = await classifyEntryWithoutFollowingLinks(entryPath);
      if (!kind) return null;
      return {
        name: dirent.name,
        path: entryPath,
        isFile: () => kind === "file",
        isDirectory: () => kind === "directory",
        isSymbolicLink: () => kind === "link",
      };
    }
    const { isFile, isDirectory } = await this.resolveEntryType(dirent, entryPath);
    return { name: dirent.name, path: entryPath, isFile: () => isFile, isDirectory: () => isDirectory };
  }

  private async resolveEntryType(
    dirent: fsSync.Dirent,
    entryPath: string,
  ): Promise<{ isFile: boolean; isDirectory: boolean }> {
    if (dirent.isSymbolicLink()) {
      try {
        const stats = await fs.stat(entryPath);
        return { isFile: stats.isFile(), isDirectory: stats.isDirectory() };
      } catch (error) {
        logger.warn(`Unable to stat symlink '${entryPath}': ${String(error)}`);
      }
    }

    return { isFile: dirent.isFile(), isDirectory: dirent.isDirectory() };
  }

  private async yieldToEventLoop(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  private throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw createAbortError();
    }
  }
}
