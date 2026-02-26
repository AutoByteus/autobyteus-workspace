import path from "node:path";
import type { TraversalIgnoreStrategy } from "./traversal-ignore-strategy.js";

export class SpecificFolderIgnoreStrategy implements TraversalIgnoreStrategy {
  private foldersToIgnore: Set<string>;

  constructor(foldersToIgnore: string[]) {
    this.foldersToIgnore = new Set(foldersToIgnore);
  }

  shouldIgnore(filePath: string, _isDirectory: boolean): boolean {
    const parts = new Set(path.normalize(filePath).split(path.sep));
    for (const folder of this.foldersToIgnore) {
      if (parts.has(folder)) {
        return true;
      }
    }
    return false;
  }
}
