import path from 'node:path';
import { BaseAgentWorkspace, WorkspaceConfig } from 'autobyteus-ts';
import type { BaseFileExplorer } from '../file-explorer/base-file-explorer.js';
import { FileNameIndexer } from '../file-explorer/file-name-indexer.js';
import { LocalFileExplorer } from '../file-explorer/local-file-explorer.js';
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

export class FileSystemWorkspace extends BaseAgentWorkspace {
  readonly rootPath: string;
  private fileExplorer: BaseFileExplorer;
  private searchStrategy: BaseFileSearchStrategy | null = null;
  private fileNameIndexer: FileNameIndexer | null = null;
  private backgroundInitTask: Promise<void> | null = null;

  constructor(config: WorkspaceConfig) {
    super(config);
    const rootPathValue = config.get('rootPath');
    const legacyRootPathValue = typeof rootPathValue === 'string' ? rootPathValue : config.get('root_path');
    if (typeof legacyRootPathValue !== 'string' || !legacyRootPathValue.trim()) {
      throw new Error("FileSystemWorkspace requires a 'rootPath' in its config.");
    }

    this.rootPath = legacyRootPathValue;
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
