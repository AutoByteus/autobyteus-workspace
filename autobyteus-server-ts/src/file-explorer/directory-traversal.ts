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

export class DirectoryTraversal {
  private fileIgnoreStrategies: TraversalIgnoreStrategy[];
  private sortStrategy: SortStrategy;

  constructor(
    fileIgnoreStrategies: TraversalIgnoreStrategy[] = [],
    sortStrategy: SortStrategy = new DefaultSortStrategy(),
  ) {
    this.fileIgnoreStrategies = fileIgnoreStrategies;
    this.sortStrategy = sortStrategy;
  }

  async buildTree(folderPath: string, maxDepth: number | null = null): Promise<TreeNode> {
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
      const { node, currentPath, strategies, depth } = queue[index++];

      if (maxDepth !== null && depth >= maxDepth) {
        node.childrenLoaded = false;
        continue;
      }

      let entries: DirectoryEntry[] = [];
      try {
        const dir = await fs.opendir(currentPath);
        for await (const dirent of dir) {
          const entryPath = path.join(currentPath, dirent.name);
          const { isFile, isDirectory } = await this.resolveEntryType(dirent, entryPath);
          entries.push({
            name: dirent.name,
            path: entryPath,
            isFile: () => isFile,
            isDirectory: () => isDirectory,
          });
        }
        node.childrenLoaded = true;
      } catch (error) {
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
        const isDir = !entry.isFile();
        if (updatedStrategies.some((strategy) => strategy.shouldIgnore(entry.path, isDir))) {
          continue;
        }

        const isFileChild = !isDir;
        const childNode = new TreeNode(entry.name, isFileChild, node, isFileChild);
        node.addChild(childNode);

        if (!isFileChild) {
          queue.push({
            node: childNode,
            currentPath: entry.path,
            strategies: [...updatedStrategies],
            depth: depth + 1,
          });
        }

        if (queue.length % 500 === 0) {
          await this.yieldToEventLoop();
        }
      }
    }

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
}
