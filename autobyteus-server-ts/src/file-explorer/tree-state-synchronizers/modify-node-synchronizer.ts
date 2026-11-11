import path from "node:path";
import { FileSystemChangeEvent, ModifyChange } from "../file-system-changes.js";
import {
  BaseTreeStateSynchronizer,
  type FileExplorerTreeContext,
} from "./base-tree-state-synchronizer.js";

/**
 * Reports a file's content change by its workspace-relative path. It does not consult the
 * lazily loaded tree, so a change in a folder the client never expanded still reaches an open viewer.
 */
export class ModifyNodeSynchronizer extends BaseTreeStateSynchronizer {
  private targetPath: string;

  constructor(fileExplorer: FileExplorerTreeContext, targetPath: string) {
    super(fileExplorer);
    this.targetPath = targetPath;
  }

  sync(): FileSystemChangeEvent {
    const posixPath = this.targetPath.split(path.sep).join("/");
    return new FileSystemChangeEvent([new ModifyChange(posixPath)]);
  }
}
