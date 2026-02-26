import path from "node:path";
import type { BaseFileExplorer } from "./base-file-explorer.js";
import {
  AddChange,
  ChangeType,
  DeleteChange,
  FileSystemChangeEvent,
  MoveChange,
  RenameChange,
} from "./file-system-changes.js";
import type { TreeNode } from "./tree-node.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class FileNameIndexer {
  private fileExplorer: BaseFileExplorer;
  private fileNameIndex: Map<string, string> = new Map();
  private idMap: Map<string, string> = new Map();
  private monitorTask: Promise<void> | null = null;
  private isActive = false;
  private eventGenerator: AsyncGenerator<string, void, void> | null = null;

  constructor(fileExplorer: BaseFileExplorer) {
    this.fileExplorer = fileExplorer;
  }

  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    logger.info("FileNameIndexer starting...");
    await this.buildInitialIndex();
    logger.debug(`FileNameIndexer built initial index with ${this.fileNameIndex.size} entries`);

    try {
      await this.fileExplorer.ensureWatcherStarted();
      this.eventGenerator = this.fileExplorer.subscribe();
      this.isActive = true;
      this.monitorTask = this.processEvents();
      logger.info("FileNameIndexer started monitoring");
    } catch (error) {
      logger.error(`Failed to start FileNameIndexer: ${String(error)}`);
      this.isActive = false;
    }
  }

  async stop(): Promise<void> {
    this.isActive = false;
    if (this.eventGenerator?.return) {
      await this.eventGenerator.return();
    }
    if (this.monitorTask) {
      try {
        await this.monitorTask;
      } catch {
        // ignore
      }
      this.monitorTask = null;
    }
    logger.info("FileNameIndexer stopped");
  }

  getIndex(): Record<string, string> {
    return Object.fromEntries(this.fileNameIndex.entries());
  }

  private async buildInitialIndex(): Promise<void> {
    const root = this.fileExplorer.getTree();
    if (!root) {
      logger.warn("Tree not available for FileNameIndexer, starting with empty index.");
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

  private async processEvents(): Promise<void> {
    if (!this.eventGenerator) {
      return;
    }

    try {
      for await (const eventJson of this.eventGenerator) {
        if (!this.isActive) {
          break;
        }

        try {
          const event = FileSystemChangeEvent.fromJson(eventJson);
          this.handleEvent(event);
        } catch (error) {
          logger.error(`Error processing file system event: ${String(error)}`);
        }
      }
    } catch (error) {
      logger.error(`FileNameIndexer event loop crashed: ${String(error)}`);
      this.isActive = false;
    }
  }

  private handleEvent(event: FileSystemChangeEvent): void {
    for (const change of event.changes) {
      try {
        if (change instanceof AddChange) {
          const node = change.node;
          const resolvedPath = this.resolvePath(node.pathValue ?? node.getPath());
          this.idMap.set(node.id, resolvedPath);
          if (node.isFile) {
            this.addEntry(resolvedPath);
          }
        } else if (change instanceof DeleteChange) {
          const storedPath = this.idMap.get(change.nodeId);
          if (storedPath) {
            this.removeEntryByPath(storedPath);
            this.idMap.delete(change.nodeId);
          } else {
            logger.debug(`Delete event for unknown node ID: ${change.nodeId}`);
          }
        } else if (change instanceof RenameChange || change instanceof MoveChange) {
          const node = change.node;
          const resolvedPath = this.resolvePath(node.pathValue ?? node.getPath());
          const oldPath = this.idMap.get(node.id);
          if (oldPath && oldPath !== resolvedPath) {
            this.removeEntryByPath(oldPath);
          }
          this.idMap.set(node.id, resolvedPath);
          if (node.isFile) {
            this.addEntry(resolvedPath);
          }
        }
      } catch (error) {
        logger.warn(`Failed to handle specific change ${change.type}: ${String(error)}`);
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

  private removeEntryByPath(filePath: string): void {
    const name = path.basename(filePath);
    const currentPath = this.fileNameIndex.get(name);
    if (currentPath === filePath) {
      this.fileNameIndex.delete(name);
    }
  }
}
