import fs from "node:fs";
import path from "node:path";
import type {
  InstalledSkillRecord,
  SkillCatalogTier,
  SkillNameConflict,
  SkillNameIssue,
  SkillNameNotice,
  SkillNameValidation,
} from "../domain/installed-skill-record.js";
import {
  scanBundledSkillsFromDefinitionRoot,
  scanSkillDirectory,
  type SkillDiscoveryDependencies,
} from "./skill-discovery.js";

/**
 * How a catalog source is laid out:
 * - `skill_directory`: skill folders (and nested `skills` folders);
 * - `definition_root`: agent/team package bundles (`agents/*`, `agent-teams/*`);
 * - `skill_path`: an added skill folder, which may hold both.
 */
export type SkillCatalogSource = {
  path: string;
  tier: SkillCatalogTier;
  layout: "skill_directory" | "definition_root" | "skill_path";
};

export type SkillCatalogConfig = {
  getSkillsDir(): string;
  getAdditionalSkillsDirs(): string[];
  getAdditionalAgentPackageRoots(): string[];
  getAppDataDir(): string;
};

export type SkillCatalog = {
  /** Candidates in precedence order, one per real skill folder. */
  candidates: InstalledSkillRecord[];
  /** The used copy of every name, in precedence order. */
  records: InstalledSkillRecord[];
  issues: SkillNameIssue[];
};

/** The catalog sources in precedence order (D-19): tier 1, tier 2, then tier 3 and tier 4. */
export const listSkillCatalogSources = (
  config: SkillCatalogConfig,
  isRuntimeDefaultFolder: (directory: string) => boolean,
): SkillCatalogSource[] => {
  const seenDefinitionRoots = new Set<string>();
  const definitionRoots = [config.getAppDataDir(), ...config.getAdditionalAgentPackageRoots()]
    .filter((root) => {
      const resolved = path.resolve(root);
      if (seenDefinitionRoots.has(resolved)) return false;
      seenDefinitionRoots.add(resolved);
      return true;
    });
  const seenSkillPaths = new Set<string>();
  const skillPaths = config.getAdditionalSkillsDirs().filter((directory) => {
    const resolved = path.resolve(directory);
    if (seenSkillPaths.has(resolved)) return false;
    seenSkillPaths.add(resolved);
    return true;
  });
  const addedFolders = skillPaths.map((directory): SkillCatalogSource => ({
    path: directory,
    tier: isRuntimeDefaultFolder(directory) ? 4 : 3,
    layout: "skill_path",
  }));

  return [
    { path: config.getSkillsDir(), tier: 1, layout: "skill_directory" },
    ...definitionRoots.map((root): SkillCatalogSource => ({ path: root, tier: 2, layout: "definition_root" })),
    ...addedFolders.filter((source) => source.tier === 3),
    ...addedFolders.filter((source) => source.tier === 4),
  ];
};

/** Every skill folder in one source, in the source's own order. */
export const scanSkillCatalogSource = (
  source: SkillCatalogSource,
  dependencies: SkillDiscoveryDependencies,
): InstalledSkillRecord[] => {
  const discovered = source.layout === "skill_directory"
    ? scanSkillDirectory(source.path, dependencies)
    : source.layout === "definition_root"
      ? scanBundledSkillsFromDefinitionRoot(source.path, dependencies)
      : [
          ...scanSkillDirectory(source.path, dependencies),
          ...scanBundledSkillsFromDefinitionRoot(source.path, dependencies),
        ];
  return discovered.map((record) => ({ ...record, tier: source.tier, sourcePath: path.resolve(source.path) }));
};

const realSkillRoot = (record: InstalledSkillRecord): string => {
  try {
    return fs.realpathSync(record.skill.rootPath);
  } catch {
    return path.resolve(record.skill.rootPath);
  }
};

/** Drops repeated scans of the same real skill folder (a folder reached from two sources). */
export const uniqueSkillFolders = (candidates: readonly InstalledSkillRecord[]): InstalledSkillRecord[] => {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = realSkillRoot(candidate);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** The first candidate per name wins; later copies become issues (REQ-022, REQ-024). */
export const buildSkillCatalog = (scanned: readonly InstalledSkillRecord[]): SkillCatalog => {
  const candidates = uniqueSkillFolders(scanned);
  const used = new Map<string, InstalledSkillRecord>();
  const ignored = new Map<string, InstalledSkillRecord[]>();
  for (const candidate of candidates) {
    const name = candidate.skill.name;
    if (!used.has(name)) {
      used.set(name, candidate);
      continue;
    }
    ignored.set(name, [...(ignored.get(name) ?? []), candidate]);
  }

  const issues: SkillNameIssue[] = [];
  for (const [name, copies] of ignored) {
    const usedPath = used.get(name)!.skill.rootPath;
    const conflictPaths = copies.filter((copy) => copy.tier !== 4).map((copy) => copy.skill.rootPath);
    const shadowedPaths = copies.filter((copy) => copy.tier === 4).map((copy) => copy.skill.rootPath);
    if (conflictPaths.length) issues.push({ name, usedPath, ignoredPaths: conflictPaths, kind: "conflict" });
    if (shadowedPaths.length) issues.push({ name, usedPath, ignoredPaths: shadowedPaths, kind: "shadowed_runtime_default" });
  }
  issues.sort((a, b) => a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind));

  return { candidates, records: [...used.values()], issues };
};

/**
 * Checks incoming skills against the installed ones (REQ-023). Among tiers 1–3 a second copy of a
 * name is a conflict, including two copies inside the incoming set. A copy in a runtime default
 * folder (tier 4) is never a conflict: the tier 1–3 copy wins and a notice is returned.
 */
export const validateIncomingSkills = (
  existing: readonly InstalledSkillRecord[],
  incoming: readonly InstalledSkillRecord[],
): SkillNameValidation => {
  const incomingFolders = new Set(uniqueSkillFolders(incoming).map(realSkillRoot));
  const existingCopies = uniqueSkillFolders(existing).filter((record) => !incomingFolders.has(realSkillRoot(record)));
  const conflicts: SkillNameConflict[] = [];
  const notices: SkillNameNotice[] = [];
  const firstCustomCopy = new Map<string, InstalledSkillRecord>();
  const runtimeDefaultCopy = new Map<string, InstalledSkillRecord>();
  for (const record of existingCopies) {
    const target = record.tier === 4 ? runtimeDefaultCopy : firstCustomCopy;
    if (!target.has(record.skill.name)) target.set(record.skill.name, record);
  }

  for (const record of uniqueSkillFolders(incoming)) {
    const name = record.skill.name;
    const custom = firstCustomCopy.get(name);
    const runtimeDefault = runtimeDefaultCopy.get(name);
    if (record.tier === 4) {
      const winner = custom ?? runtimeDefault;
      if (winner) notices.push({ name, usedPath: winner.skill.rootPath, ignoredPath: record.skill.rootPath });
      else runtimeDefaultCopy.set(name, record);
      continue;
    }
    if (custom) {
      conflicts.push({ name, existingPath: custom.skill.rootPath, incomingPath: record.skill.rootPath });
      continue;
    }
    if (runtimeDefault) notices.push({ name, usedPath: record.skill.rootPath, ignoredPath: runtimeDefault.skill.rootPath });
    firstCustomCopy.set(name, record);
  }

  return { conflicts, notices };
};
