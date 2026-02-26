import { FileSystemChangeEvent, ModifyChange } from "../file-system-changes.js";
import {
  BaseTreeStateSynchronizer,
  type FileExplorerTreeContext,
} from "./base-tree-state-synchronizer.js";

export class ModifyNodeSynchronizer extends BaseTreeStateSynchronizer {
  private targetPath: string;

  constructor(fileExplorer: FileExplorerTreeContext, targetPath: string) {
    super(fileExplorer);
    this.targetPath = targetPath;
  }

  sync(): FileSystemChangeEvent {
    const nodeToModify = this.fileExplorer.findNodeByPath(this.targetPath);

    if (!nodeToModify || !nodeToModify.parent || !nodeToModify.isFile) {
      return new FileSystemChangeEvent([]);
    }

    const change = new ModifyChange(nodeToModify.id, nodeToModify.parent.id);
    return new FileSystemChangeEvent([change]);
  }
}
