import path from "node:path";
import type {
  DefinitionFolderReadResult,
  KindDefinitionReadResult,
  KindFolderName,
  RegisteredPackageRoot,
} from "../domain/agent-package-definition-types.js";
import { listChildDirNames, pathExists } from "../domain/definition-files.js";

export type PresentDefinitionFolder = Readonly<{ root: RegisteredPackageRoot; folderDir: string }>;

/** True when a folder name can be a definition folder (templates start with `_`). */
export const isDefinitionFolderName = (name: string): boolean => name.length > 0 && !name.startsWith("_");

/** Definition folder names of one kind folder across the given packages, de-duplicated, package by package in name order. */
export const listDefinitionFolderNames = async (
  roots: readonly RegisteredPackageRoot[],
  kindFolder: KindFolderName,
): Promise<string[]> => {
  const ids = new Set<string>();
  for (const root of roots) {
    for (const name of (await listChildDirNames(root.kindDirs[kindFolder])).filter(isDefinitionFolderName).sort()) ids.add(name);
  }
  return [...ids];
};

/**
 * Every package where this definition folder is present (one of its two definition files exists).
 * Identical resolved paths count once, so one physical folder never reads as duplicated.
 */
export const findPresentDefinitionFolders = async (input: {
  roots: readonly RegisteredPackageRoot[];
  kindFolder: KindFolderName;
  folderId: string;
  definitionFiles: readonly [string, string];
}): Promise<PresentDefinitionFolder[]> => {
  const output: PresentDefinitionFolder[] = [];
  const seenPaths = new Set<string>();
  for (const root of input.roots) {
    const folderDir = path.join(root.kindDirs[input.kindFolder], input.folderId);
    const resolved = path.resolve(folderDir);
    if (seenPaths.has(resolved)) continue;
    const present = await pathExists(path.join(folderDir, input.definitionFiles[0]))
      || await pathExists(path.join(folderDir, input.definitionFiles[1]));
    if (!present) continue;
    seenPaths.add(resolved);
    output.push({ root, folderDir });
  }
  return output;
};

/**
 * A Team or Org identity present in more than one registered package is unavailable everywhere
 * (the established admission rule); it is read as an issue-only definition listing every path.
 */
export const duplicatedFolderResult = (input: {
  kind: "agent_team" | "agent_org";
  folderId: string;
  present: readonly PresentDefinitionFolder[];
}): DefinitionFolderReadResult => {
  const first = input.present[0]!;
  const root: KindDefinitionReadResult = {
    kind: input.kind,
    result: {
      status: "invalid",
      code: "DEFINITION_IDENTITY_DUPLICATED",
      reason: `Definition identity '${input.kind}:${input.folderId}' is registered by multiple packages: ${input.present.map((item) => item.folderDir).join(", ")}.`,
      definitionPath: first.folderDir,
    },
  } as KindDefinitionReadResult;
  return {
    status: "read",
    location: { packageRoot: first.root.rootPath, folderDir: first.folderDir, sourceClass: first.root.sourceClass },
    root,
    nested: new Map(),
  };
};
