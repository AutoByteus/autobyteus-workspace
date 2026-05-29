import { GitIgnoreStrategy } from "./git-ignore-strategy.js";
import { SpecificFolderIgnoreStrategy } from "./specific-folder-ignore-strategy.js";
import type { TraversalIgnoreStrategy } from "./traversal-ignore-strategy.js";

export const createWorkspaceIgnoreStrategies = (
  workspaceRootPath: string,
): TraversalIgnoreStrategy[] => [
  new SpecificFolderIgnoreStrategy([".git"]),
  new GitIgnoreStrategy(workspaceRootPath),
];
