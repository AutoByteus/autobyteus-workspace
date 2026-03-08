import path from "node:path";
import type { FileExplorer } from "../file-explorer.js";
import { FileSystemChangeEvent } from "../file-system-changes.js";
import { WorkspaceIgnoreMatcher } from "../traversal-ignore-strategy/workspace-ignore-matcher.js";
import { AddNodeSynchronizer } from "../tree-state-synchronizers/add-node-synchronizer.js";
import { ModifyNodeSynchronizer } from "../tree-state-synchronizers/modify-node-synchronizer.js";
import { MoveNodeSynchronizer } from "../tree-state-synchronizers/move-node-synchronizer.js";
import { RemoveNodeSynchronizer } from "../tree-state-synchronizers/remove-node-synchronizer.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class WatchdogHandler {
  private fileExplorer: FileExplorer;
  private callback: (event: FileSystemChangeEvent) => void;
  private ignoreMatcher: WorkspaceIgnoreMatcher;

  constructor(
    fileExplorer: FileExplorer,
    callback: (event: FileSystemChangeEvent) => void,
    ignoreMatcher: WorkspaceIgnoreMatcher,
  ) {
    this.fileExplorer = fileExplorer;
    this.callback = callback;
    this.ignoreMatcher = ignoreMatcher;
  }

  shouldIgnore(targetPath: string, isDirectory: boolean): boolean {
    const resolvedPath = path.resolve(targetPath);
    const ignored = this.ignoreMatcher.shouldIgnore(resolvedPath, isDirectory);
    if (ignored) {
      logger.debug(`Ignoring path ${resolvedPath} due to workspace ignore matcher`);
    }
    return ignored;
  }

  handleAdd(eventPath: string, isDirectory: boolean): void {
    if (this.shouldIgnore(eventPath, isDirectory)) {
      logger.debug(`Skipping creation event for ignored path: ${eventPath}`);
      return;
    }

    logger.info(`Watcher detected creation: ${eventPath}`);
    const relativePath = path.relative(this.fileExplorer.workspaceRootPath, eventPath);
    try {
      const isFile = !isDirectory;
      const synchronizer = new AddNodeSynchronizer(this.fileExplorer, relativePath, isFile);
      const changeEvent = synchronizer.sync();
      if (changeEvent.changes.length > 0) {
        this.callback(changeEvent);
      }
    } catch (error) {
      logger.error(`Error synchronizing tree for creation event at ${relativePath}: ${String(error)}`);
    }
  }

  handleDelete(eventPath: string, isDirectory: boolean): void {
    if (this.shouldIgnore(eventPath, isDirectory)) {
      logger.debug(`Skipping deletion event for ignored path: ${eventPath}`);
      return;
    }

    logger.info(`Watcher detected deletion: ${eventPath}`);
    const relativePath = path.relative(this.fileExplorer.workspaceRootPath, eventPath);
    try {
      const synchronizer = new RemoveNodeSynchronizer(this.fileExplorer, relativePath);
      const changeEvent = synchronizer.sync();
      if (changeEvent.changes.length > 0) {
        this.callback(changeEvent);
      }
    } catch (error) {
      logger.error(`Error synchronizing tree for deletion event at ${relativePath}: ${String(error)}`);
    }
  }

  handleMove(sourcePath: string, destinationPath: string, isDirectory: boolean): void {
    if (
      this.shouldIgnore(sourcePath, isDirectory) ||
      this.shouldIgnore(destinationPath, isDirectory)
    ) {
      logger.debug(`Skipping move event for ignored path: ${sourcePath} -> ${destinationPath}`);
      return;
    }

    logger.info(`Watcher detected move from ${sourcePath} to ${destinationPath}`);
    const srcRelative = path.relative(this.fileExplorer.workspaceRootPath, sourcePath);
    const destRelative = path.relative(this.fileExplorer.workspaceRootPath, destinationPath);
    try {
      const synchronizer = new MoveNodeSynchronizer(this.fileExplorer, srcRelative, destRelative);
      const changeEvent = synchronizer.sync();
      if (changeEvent.changes.length > 0) {
        this.callback(changeEvent);
      }
    } catch (error) {
      logger.error(
        `Error synchronizing tree for move event from ${srcRelative} to ${destRelative}: ${String(error)}`,
      );
    }
  }

  handleModify(eventPath: string): void {
    if (this.shouldIgnore(eventPath, false)) {
      logger.debug(`Skipping modification event for ignored path: ${eventPath}`);
      return;
    }

    logger.info(`Watcher detected modification: ${eventPath}`);
    const relativePath = path.relative(this.fileExplorer.workspaceRootPath, eventPath);
    try {
      const synchronizer = new ModifyNodeSynchronizer(this.fileExplorer, relativePath);
      const changeEvent = synchronizer.sync();
      if (changeEvent.changes.length > 0) {
        this.callback(changeEvent);
      }
    } catch (error) {
      logger.error(`Error generating modify event for ${relativePath}: ${String(error)}`);
    }
  }
}
