import path from "node:path";
import type { DefinitionKindDirName, DefinitionSubject, RegisteredPackageRoot } from "../domain/definition-catalog-types.js";

/**
 * The definition structure the monitor watches (allow-list). Everything else — skills, docs,
 * scripts, `.git`, dependency folders, other files and `_`-prefixed templates — is not watched.
 *
 *   agents/<a>/[agent.md | agent-config.json]
 *   agent-teams/<t>/[team.md | team-config.json | agents/<a>/[agent files]]
 *   agent-orgs/<o>/[org.md | org-config.json | agents/<a>/[agent files]
 *                  | agent-teams/<t>/[team files | agents/<a>/[agent files]]]
 */
const AGENT_FILES = new Set(["agent.md", "agent-config.json"]);
const TEAM_FILES = new Set(["team.md", "team-config.json"]);
const ORG_FILES = new Set(["org.md", "org-config.json"]);

const SUBJECT_BY_KIND: Readonly<Record<DefinitionKindDirName, DefinitionSubject>> = {
  agents: "agent",
  "agent-teams": "agent_team",
  "agent-orgs": "agent_org",
};

export type DefinitionStructurePath = Readonly<{
  kind: DefinitionKindDirName;
  /** Path segments below the kind folder; empty for the kind folder itself. */
  segments: readonly string[];
}>;

type Position = "dir" | "file" | null;

const isWatchableName = (name: string): boolean => name.length > 0 && !name.startsWith(".");
const isUnitName = (name: string): boolean => isWatchableName(name) && !name.startsWith("_");

/** Agent folder contents: the folder itself, then its two definition files. */
const agentPosition = (rest: readonly string[]): Position => {
  if (rest.length === 1) return isUnitName(rest[0]!) ? "dir" : null;
  if (rest.length === 2) return isUnitName(rest[0]!) && AGENT_FILES.has(rest[1]!) ? "file" : null;
  return null;
};

/** Team folder contents (the Team name already checked): its files and its local agents. */
const teamContentPosition = (rest: readonly string[]): Position => {
  if (rest.length === 0) return "dir";
  if (rest.length === 1) {
    if (TEAM_FILES.has(rest[0]!)) return "file";
    return rest[0] === "agents" ? "dir" : null;
  }
  return rest[0] === "agents" ? agentPosition(rest.slice(1)) : null;
};

const positionOf = (structure: DefinitionStructurePath): Position => {
  const { kind, segments } = structure;
  if (segments.length === 0) return "dir";
  if (!segments.every(isWatchableName) || !isUnitName(segments[0]!)) return null;
  const rest = segments.slice(1);
  if (kind === "agents") return agentPosition(segments);
  if (kind === "agent-teams") return teamContentPosition(rest);
  if (rest.length === 0) return "dir";
  if (rest.length === 1) {
    if (ORG_FILES.has(rest[0]!)) return "file";
    return rest[0] === "agents" || rest[0] === "agent-teams" ? "dir" : null;
  }
  if (rest[0] === "agents") return agentPosition(rest.slice(1));
  if (rest[0] === "agent-teams") {
    if (!isUnitName(rest[1]!)) return null;
    return teamContentPosition(rest.slice(2));
  }
  return null;
};

/** Locates a path inside one of a root's three kind folders, or null when it lies outside them. */
export const locateDefinitionStructurePath = (
  root: RegisteredPackageRoot,
  targetPath: string,
): DefinitionStructurePath | null => {
  const resolved = path.resolve(targetPath);
  for (const kind of Object.keys(root.kindDirs) as DefinitionKindDirName[]) {
    const kindDir = path.resolve(root.kindDirs[kind]);
    if (resolved === kindDir) return { kind, segments: [] };
    if (resolved.startsWith(`${kindDir}${path.sep}`)) {
      return { kind, segments: resolved.slice(kindDir.length + 1).split(path.sep) };
    }
  }
  return null;
};

/**
 * Whether the monitor watches a path. `isDirectory` is used when the watcher knows it; a path
 * whose type is unknown is judged by its name alone.
 */
export const isWatchedDefinitionPath = (
  root: RegisteredPackageRoot,
  targetPath: string,
  isDirectory?: boolean,
): boolean => {
  const structure = locateDefinitionStructurePath(root, targetPath);
  if (!structure) return false;
  const position = positionOf(structure);
  if (position === null) return false;
  if (isDirectory === undefined) return true;
  return position === "dir" ? isDirectory : !isDirectory;
};

/** The unit a watched path belongs to, or null for a kind folder itself. */
export const classifyDefinitionUnit = (
  root: RegisteredPackageRoot,
  targetPath: string,
): Readonly<{ subject: DefinitionSubject; unitId: string }> | null => {
  const structure = locateDefinitionStructurePath(root, targetPath);
  if (!structure || structure.segments.length === 0 || positionOf(structure) === null) return null;
  return { subject: SUBJECT_BY_KIND[structure.kind], unitId: structure.segments[0]! };
};
