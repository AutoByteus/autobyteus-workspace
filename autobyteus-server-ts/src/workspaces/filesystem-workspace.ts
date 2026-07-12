import path from 'node:path';
import {
  WorkspaceFileExplorer,
} from '../file-explorer/file-explorer.js';
import { buildFilesystemWorkspaceId } from './workspace-registry-store.js';
import type { WorkspaceInput } from './workspace-input.js';
import type { WorkspaceKind, WorkspaceMetadata } from './workspace-metadata.js';
import {
  canonicalizeWorkspaceRootPath,
  resolveWorkspaceRelativePath,
} from './workspace-path-utils.js';

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export type WorkspaceFileExplorerConsumerReason = string;

export type WorkspaceFileExplorerLease = {
  readonly fileExplorer: WorkspaceFileExplorer;
  release(): Promise<void>;
};

export class FileSystemWorkspace {
  readonly workspaceId: string;
  readonly config: WorkspaceInput;
  readonly rootPath: string;
  protected readonly workspaceKind: WorkspaceKind = 'filesystem';
  private fileExplorer: WorkspaceFileExplorer | null = null;
  private fileExplorerLeaseCount = 0;

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

    logger.info(`Created metadata-only FileSystemWorkspace at ${this.rootPath}.`);
  }

  get metadata(): WorkspaceMetadata {
    return {
      workspaceId: this.workspaceId,
      name: this.getName(),
      rootPath: this.rootPath,
      kind: this.workspaceKind,
      config: this.config as unknown as Record<string, unknown>,
      isTemp: false,
    };
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

    return resolveWorkspaceRelativePath(this.rootPath, relativePath);
  }

  async initialize(): Promise<void> {
    logger.warn(
      `FileSystemWorkspace.initialize() is metadata-only for ${this.workspaceId}; file explorer acquisition is explicit.`,
    );
  }

  async acquireFileExplorer(
    reason: WorkspaceFileExplorerConsumerReason,
  ): Promise<WorkspaceFileExplorerLease> {
    if (!this.fileExplorer) {
      this.fileExplorer = new WorkspaceFileExplorer(this.rootPath);
      logger.info(`Created WorkspaceFileExplorer for ${this.workspaceId} (${reason}).`);
    }

    this.fileExplorerLeaseCount += 1;
    let released = false;
    return {
      fileExplorer: this.fileExplorer,
      release: async () => {
        if (released) {
          return;
        }
        released = true;
        this.fileExplorerLeaseCount = Math.max(0, this.fileExplorerLeaseCount - 1);
      },
    };
  }

  hasFileExplorerForDiagnostics(): boolean {
    return this.fileExplorer !== null;
  }

  async close(): Promise<void> {
    logger.info(`Closing FileSystemWorkspace ${this.workspaceId}`);
    this.fileExplorerLeaseCount = 0;
    const fileExplorer = this.fileExplorer;
    this.fileExplorer = null;
    await fileExplorer?.close();
  }
}
