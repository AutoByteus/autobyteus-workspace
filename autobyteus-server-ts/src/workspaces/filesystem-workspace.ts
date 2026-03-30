import path from 'node:path';
import type { BaseFileExplorer } from '../file-explorer/base-file-explorer.js';
import { FileNameIndexer } from '../file-explorer/file-name-indexer.js';
import { LocalFileExplorer } from '../file-explorer/local-file-explorer.js';
import { buildFilesystemWorkspaceId } from './workspace-id-mapping-store.js';
import type { WorkspaceInput } from './workspace-input.js';
import {
  canonicalizeWorkspaceRootPath,
} from './workspace-path-utils.js';
import {
  BaseFileSearchStrategy,
  CompositeSearchStrategy,
  FuzzysortSearchStrategy,
  RipgrepSearchStrategy,
} from '../file-explorer/search-strategy/index.js';

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class FileSystemWorkspace {
  readonly workspaceId: string;
  readonly config: WorkspaceInput;
  readonly rootPath: string;
  private fileExplorer: BaseFileExplorer;
  private searchStrategy: BaseFileSearchStrategy | null = null;
  private fileNameIndexer: FileNameIndexer | null = null;
  private backgroundInitTask: Promise<void> | null = null;

  constructor(config: WorkspaceInput) {
    this.config = {
      rootPath: config.rootPath,
      workspaceId: config.workspaceId ?? null,
    };
    const rootPathValue = config.rootPath;
    if (typeof rootPathValue !== 'string' || !rootPathValue.trim()) {
      throw new Error("FileSystemWorkspace requires a 'rootPath' in its config.");
    }

    this.rootPath = canonicalizeWorkspaceRootPath(rootPathValue);

    const configuredId = this.config.workspaceId;
    if (typeof configuredId === 'string' && configuredId.trim()) {
      this.workspaceId = configuredId.trim();
    } else {
      this.workspaceId = buildFilesystemWorkspaceId(this.rootPath);
    }
    this.fileExplorer = new LocalFileExplorer(this.rootPath);

    logger.info(`Initialized FileSystemWorkspace at ${this.rootPath}. Call initialize() to build file tree.`);
  }

  getBasePath(): string {
    return this.rootPath;
  }

  getName(): string {
    return path.basename(path.normalize(this.rootPath));
  }

  getAbsolutePath(relativePath: string): string {
    if (!this.rootPath) {
      throw new Error('Workspace root path is not set.');
    }

    const normalizedRoot = path.normalize(this.rootPath);
    const absolutePath = path.normalize(path.join(normalizedRoot, relativePath));

    if (!absolutePath.startsWith(normalizedRoot)) {
      throw new Error('Access denied: Path resolves outside the workspace boundary.');
    }

    return absolutePath;
  }

  async initialize(): Promise<void> {
    await this.fileExplorer.buildWorkspaceDirectoryTree(1);

    this.fileNameIndexer = new FileNameIndexer(this.fileExplorer);
    this.searchStrategy = this.createSearchStrategy();

    logger.info(`Initialized FileSystemWorkspace at ${this.rootPath} (Shallow). Starting background full scan...`);

    this.backgroundInitTask = this.completeFullInitialization();
  }

  private async completeFullInitialization(): Promise<void> {
    try {
      await this.fileExplorer.buildWorkspaceDirectoryTree();
      if (this.fileNameIndexer) {
        await this.fileNameIndexer.start();
      }
      logger.info(`Background full initialization for ${this.rootPath} completed.`);
    } catch (error) {
      logger.error(`Background initialization failed for ${this.rootPath}: ${String(error)}`);
    }
  }

  private createSearchStrategy(): BaseFileSearchStrategy {
    if (!this.fileNameIndexer) {
      this.fileNameIndexer = new FileNameIndexer(this.fileExplorer);
    }
    const fuzzysortStrategy = new FuzzysortSearchStrategy(this.fileNameIndexer, 10);
    const ripgrepStrategy = new RipgrepSearchStrategy(50);
    return new CompositeSearchStrategy([fuzzysortStrategy, ripgrepStrategy]);
  }

  async searchFiles(query: string): Promise<string[]> {
    if (!this.searchStrategy) {
      this.searchStrategy = this.createSearchStrategy();
    }

    return this.searchStrategy.search(this.rootPath, query);
  }

  async getFileExplorer(): Promise<BaseFileExplorer> {
    return this.fileExplorer;
  }

  async close(): Promise<void> {
    logger.info(`Closing FileSystemWorkspace ${this.workspaceId}`);

    if (this.backgroundInitTask) {
      try {
        await this.backgroundInitTask;
      } catch {
        // ignore
      }
    }

    await this.fileExplorer.close();

    if (this.fileNameIndexer) {
      await this.fileNameIndexer.stop();
    }
  }
}
