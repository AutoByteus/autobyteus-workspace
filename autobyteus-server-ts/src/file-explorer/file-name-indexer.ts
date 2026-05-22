import path from "node:path";
import type { BaseFileExplorer } from "./base-file-explorer.js";
import type { TreeNode } from "./tree-node.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class FileNameIndexer {
  private fileExplorer: BaseFileExplorer;
  private fileNameIndex: Map<string, string> = new Map();
  private idMap: Map<string, string> = new Map();

  constructor(fileExplorer: BaseFileExplorer) {
    this.fileExplorer = fileExplorer;
  }

  async refreshSnapshotIndex(): Promise<void> {
    logger.info("FileNameIndexer refreshing snapshot index...");
    this.fileNameIndex.clear();
    this.idMap.clear();
    await this.buildIndexFromCurrentTree();
    logger.debug(`FileNameIndexer refreshed snapshot index with ${this.fileNameIndex.size} entries`);
  }

  getIndex(): Record<string, string> {
    return Object.fromEntries(this.fileNameIndex.entries());
  }

  private async buildIndexFromCurrentTree(): Promise<void> {
    const root = this.fileExplorer.getTree();
    if (!root) {
      logger.warn("Tree not available for FileNameIndexer, using empty index.");
      return;
    }

    const stack: TreeNode[] = [root];
    let processed = 0;
    while (stack.length > 0) {
      const node = stack.pop() as TreeNode;
      const nodePath = node.pathValue ?? node.getPath();
      const resolvedPath = this.resolvePath(nodePath);
      this.idMap.set(node.id, resolvedPath);

      if (node.isFile) {
        this.addEntry(resolvedPath);
      }

      for (const child of node.children) {
        stack.push(child);
      }

      processed += 1;
      if (processed % 1000 === 0) {
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }
  }

  private resolvePath(filePath: string): string {
    if (!path.isAbsolute(filePath)) {
      return path.join(this.fileExplorer.rootPath, filePath);
    }
    return filePath;
  }

  private addEntry(filePath: string): void {
    const name = path.basename(filePath);
    this.fileNameIndex.set(name, filePath);
  }
}
