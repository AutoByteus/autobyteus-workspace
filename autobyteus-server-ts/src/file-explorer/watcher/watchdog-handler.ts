import fs from "node:fs";
import path from "node:path";
import type { FileExplorer } from "../file-explorer.js";
import { FileSystemChangeEvent } from "../file-system-changes.js";
import { DefaultIgnoreStrategy } from "../traversal-ignore-strategy/default-ignore-strategy.js";
import { GitIgnoreStrategy } from "../traversal-ignore-strategy/git-ignore-strategy.js";
import type { TraversalIgnoreStrategy } from "../traversal-ignore-strategy/traversal-ignore-strategy.js";
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
  private ignoreStrategies: TraversalIgnoreStrategy[];

  constructor(
    fileExplorer: FileExplorer,
    callback: (event: FileSystemChangeEvent) => void,
    ignoreStrategies: TraversalIgnoreStrategy[],
  ) {
    this.fileExplorer = fileExplorer;
    this.callback = callback;
    this.ignoreStrategies = [
      new DefaultIgnoreStrategy(this.fileExplorer.workspaceRootPath),
      ...ignoreStrategies,
    ];
  }

  shouldIgnore(targetPath: string, isDirectory: boolean): boolean {
    if (this.ignoreStrategies.some((strategy) => strategy.shouldIgnore(targetPath, isDirectory))) {
      logger.debug(`Ignoring path ${targetPath} due to base ignore strategy`);
      return true;
    }

    let currentDir: string;
    let workspaceRoot: string;
    try {
      currentDir = path.dirname(path.resolve(targetPath));
      workspaceRoot = path.resolve(this.fileExplorer.workspaceRootPath);
    } catch {
      return false;
    }

    while (true) {
      const gitignorePath = path.join(currentDir, ".gitignore");
      if (fs.existsSync(gitignorePath)) {
        const localGitStrategy = new GitIgnoreStrategy(currentDir);
        if (localGitStrategy.shouldIgnore(targetPath, isDirectory)) {
          logger.debug(`Ignoring path ${targetPath} due to local .gitignore in ${currentDir}`);
          return true;
        }
      }

      if (currentDir === workspaceRoot || currentDir === path.dirname(currentDir)) {
        break;
      }
      currentDir = path.dirname(currentDir);
    }

    return false;
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
