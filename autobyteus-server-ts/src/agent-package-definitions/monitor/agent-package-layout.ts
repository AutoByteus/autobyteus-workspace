import path from "node:path";
import type {
  AgentPackageDefinitionKind,
  DefinitionFolderRef,
  KindFolderName,
  RegisteredPackageRoot,
} from "../domain/agent-package-definition-types.js";

/**
 * The agent package folder layout the watcher watches (allow-list). Everything else — skills, docs,
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

const KIND_OF_FOLDER: Readonly<Record<KindFolderName, AgentPackageDefinitionKind>> = {
  agents: "agent",
  "agent-teams": "agent_team",
  "agent-orgs": "agent_org",
};

export type PackageLayoutPath = Readonly<{
  kindFolder: KindFolderName;
  /** Path segments below the kind folder; empty for the kind folder itself. */
  segments: readonly string[];
}>;

type Position = "dir" | "file" | null;

const isWatchableName = (name: string): boolean => name.length > 0 && !name.startsWith(".");
const isDefinitionFolderName = (name: string): boolean => isWatchableName(name) && !name.startsWith("_");

/** Agent folder contents: the folder itself, then its two definition files. */
const agentPosition = (rest: readonly string[]): Position => {
  if (rest.length === 1) return isDefinitionFolderName(rest[0]!) ? "dir" : null;
  if (rest.length === 2) return isDefinitionFolderName(rest[0]!) && AGENT_FILES.has(rest[1]!) ? "file" : null;
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

const positionOf = (layoutPath: PackageLayoutPath): Position => {
  const { kindFolder, segments } = layoutPath;
  if (segments.length === 0) return "dir";
  if (!segments.every(isWatchableName) || !isDefinitionFolderName(segments[0]!)) return null;
  const rest = segments.slice(1);
  if (kindFolder === "agents") return agentPosition(segments);
  if (kindFolder === "agent-teams") return teamContentPosition(rest);
  if (rest.length === 0) return "dir";
  if (rest.length === 1) {
    if (ORG_FILES.has(rest[0]!)) return "file";
    return rest[0] === "agents" || rest[0] === "agent-teams" ? "dir" : null;
  }
  if (rest[0] === "agents") return agentPosition(rest.slice(1));
  if (rest[0] === "agent-teams") {
    if (!isDefinitionFolderName(rest[1]!)) return null;
    return teamContentPosition(rest.slice(2));
  }
  return null;
};

/** Locates a path inside one of a package folder's three kind folders, or null when it lies outside them. */
export const locateInPackageLayout = (
  root: RegisteredPackageRoot,
  targetPath: string,
): PackageLayoutPath | null => {
  const resolved = path.resolve(targetPath);
  for (const kindFolder of Object.keys(root.kindDirs) as KindFolderName[]) {
    const kindDir = path.resolve(root.kindDirs[kindFolder]);
    if (resolved === kindDir) return { kindFolder, segments: [] };
    if (resolved.startsWith(`${kindDir}${path.sep}`)) {
      return { kindFolder, segments: resolved.slice(kindDir.length + 1).split(path.sep) };
    }
  }
  return null;
};

/**
 * Whether the watcher watches a path. `isDirectory` is used when the watcher knows it; a path
 * whose type is unknown is judged by its name alone.
 */
export const isWatchedPackagePath = (
  root: RegisteredPackageRoot,
  targetPath: string,
  isDirectory?: boolean,
): boolean => {
  const layoutPath = locateInPackageLayout(root, targetPath);
  if (!layoutPath) return false;
  const position = positionOf(layoutPath);
  if (position === null) return false;
  if (isDirectory === undefined) return true;
  return position === "dir" ? isDirectory : !isDirectory;
};

/** The top-level definition folder a watched path belongs to, or null for a kind folder itself. */
export const findDefinitionFolderForPath = (
  root: RegisteredPackageRoot,
  targetPath: string,
): DefinitionFolderRef | null => {
  const layoutPath = locateInPackageLayout(root, targetPath);
  if (!layoutPath || layoutPath.segments.length === 0 || positionOf(layoutPath) === null) return null;
  return { kind: KIND_OF_FOLDER[layoutPath.kindFolder], folderId: layoutPath.segments[0]! };
};
