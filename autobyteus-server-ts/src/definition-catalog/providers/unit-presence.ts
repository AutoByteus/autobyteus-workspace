import path from "node:path";
import type {
  DefinitionKindDirName,
  RegisteredPackageRoot,
  SubjectNodeOutcome,
  UnitReadOutcome,
} from "../domain/definition-catalog-types.js";
import { listChildDirNames, pathExists } from "../domain/definition-node-files.js";

export type PresentUnitDir = Readonly<{ root: RegisteredPackageRoot; unitDir: string }>;

/** True when a Team or Org folder name can be a catalog unit (templates start with `_`). */
export const isUnitDirName = (name: string): boolean => name.length > 0 && !name.startsWith("_");

/** Unit folder names of one kind across the given roots, de-duplicated, root by root in name order. */
export const listUnitDirNames = async (
  roots: readonly RegisteredPackageRoot[],
  kind: DefinitionKindDirName,
): Promise<string[]> => {
  const ids = new Set<string>();
  for (const root of roots) {
    for (const name of (await listChildDirNames(root.kindDirs[kind])).filter(isUnitDirName).sort()) ids.add(name);
  }
  return [...ids];
};

/**
 * Every root where a unit folder of this kind is present (one of its two definition files exists).
 * Identical resolved paths count once, so one physical folder never reads as duplicated.
 */
export const findPresentUnitDirs = async (input: {
  roots: readonly RegisteredPackageRoot[];
  kind: DefinitionKindDirName;
  unitId: string;
  definitionFiles: readonly [string, string];
}): Promise<PresentUnitDir[]> => {
  const output: PresentUnitDir[] = [];
  const seenPaths = new Set<string>();
  for (const root of input.roots) {
    const unitDir = path.join(root.kindDirs[input.kind], input.unitId);
    const resolved = path.resolve(unitDir);
    if (seenPaths.has(resolved)) continue;
    const present = await pathExists(path.join(unitDir, input.definitionFiles[0]))
      || await pathExists(path.join(unitDir, input.definitionFiles[1]));
    if (!present) continue;
    seenPaths.add(resolved);
    output.push({ root, unitDir });
  }
  return output;
};

/**
 * A Team or Org identity present in more than one registered package is unavailable everywhere
 * (the established admission rule); it is read as an issue-only unit listing every path.
 */
export const duplicatedUnitOutcome = (input: {
  subject: "agent_team" | "agent_org";
  unitId: string;
  present: readonly PresentUnitDir[];
}): UnitReadOutcome => {
  const first = input.present[0]!;
  const root: SubjectNodeOutcome = {
    subject: input.subject,
    outcome: {
      kind: "invalid",
      code: "DEFINITION_IDENTITY_DUPLICATED",
      reason: `Definition identity '${input.subject}:${input.unitId}' is registered by multiple packages: ${input.present.map((item) => item.unitDir).join(", ")}.`,
      definitionPath: first.unitDir,
    },
  } as SubjectNodeOutcome;
  return {
    kind: "read",
    location: { packageRoot: first.root.rootPath, unitDir: first.unitDir, sourceClass: first.root.sourceClass, fromRegisteredRoot: true },
    root,
    children: new Map(),
  };
};
