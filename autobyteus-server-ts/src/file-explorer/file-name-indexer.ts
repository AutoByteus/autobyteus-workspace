import path from "node:path";
import type { TreeNode } from "./tree-node.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export type FileNameIndexTreeSource = {
  readonly rootPath: string;
  getTree(): TreeNode | null;
};

export class FileNameIndexer {
  private fileExplorer: FileNameIndexTreeSource;
  private fileNameIndex: Map<string, string> = new Map();
  private idMap: Map<string, string> = new Map();

  constructor(fileExplorer: FileNameIndexTreeSource) {
    this.fileExplorer = fileExplorer;
  }

  async refreshSnapshotIndex(signal?: AbortSignal): Promise<void> {
    logger.info("FileNameIndexer refreshing snapshot index...");
    const nextFileNameIndex = new Map<string, string>();
    const nextIdMap = new Map<string, string>();
    await this.buildIndexFromCurrentTree(signal, nextFileNameIndex, nextIdMap);
    this.throwIfAborted(signal);
    this.fileNameIndex = nextFileNameIndex;
    this.idMap = nextIdMap;
    logger.debug(`FileNameIndexer refreshed snapshot index with ${this.fileNameIndex.size} entries`);
  }

  getIndex(): Record<string, string> {
    return Object.fromEntries(this.fileNameIndex.entries());
  }

  private async buildIndexFromCurrentTree(
    signal: AbortSignal | undefined,
    fileNameIndex: Map<string, string>,
    idMap: Map<string, string>,
  ): Promise<void> {
    this.throwIfAborted(signal);
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
      idMap.set(node.id, resolvedPath);

      if (node.isFile) {
        this.addEntry(resolvedPath, fileNameIndex);
      }

      for (const child of node.children) {
        stack.push(child);
      }

      processed += 1;
      if (processed % 1000 === 0) {
        await new Promise<void>((resolve) => setImmediate(resolve));
        this.throwIfAborted(signal);
      }
    }
    this.throwIfAborted(signal);
  }

  private resolvePath(filePath: string): string {
    if (!path.isAbsolute(filePath)) {
      return path.join(this.fileExplorer.rootPath, filePath);
    }
    return filePath;
  }

  private addEntry(filePath: string, fileNameIndex: Map<string, string>): void {
    const name = path.basename(filePath);
    fileNameIndex.set(name, filePath);
  }

  private throwIfAborted(signal?: AbortSignal): void {
    if (!signal?.aborted) {
      return;
    }
    const error = new Error("File name indexing aborted");
    error.name = "AbortError";
    throw error;
  }
}
