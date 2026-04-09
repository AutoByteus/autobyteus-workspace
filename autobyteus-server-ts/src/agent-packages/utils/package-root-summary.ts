import fs from "node:fs";
import path from "node:path";
import type { AgentPackageSummary } from "../types.js";

const countDefinitionsInDir = (
  directoryPath: string,
  fileName: string,
): number => {
  if (!fs.existsSync(directoryPath)) {
    return 0;
  }

  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  } catch {
    return 0;
  }

  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) {
      continue;
    }
    if (fs.existsSync(path.join(directoryPath, entry.name, fileName))) {
      count += 1;
    }
  }
  return count;
};

const countTeamLocalAgentsInTeamsDir = (teamsDir: string): number => {
  if (!fs.existsSync(teamsDir)) {
    return 0;
  }

  let teamEntries: fs.Dirent[] = [];
  try {
    teamEntries = fs.readdirSync(teamsDir, { withFileTypes: true });
  } catch {
    return 0;
  }

  let count = 0;
  for (const teamEntry of teamEntries) {
    if (!teamEntry.isDirectory() || teamEntry.name.startsWith("_")) {
      continue;
    }
    const localAgentsDir = path.join(teamsDir, teamEntry.name, "agents");
    count += countDefinitionsInDir(localAgentsDir, "agent.md");
  }
  return count;
};

export const validatePackageRoot = (packageRoot: string): string => {
  if (!path.isAbsolute(packageRoot)) {
    throw new Error("Agent package path must be absolute.");
  }

  const resolved = path.resolve(packageRoot);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Agent package directory not found: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`Agent package path is not a directory: ${resolved}`);
  }

  const agentsDir = path.join(resolved, "agents");
  const teamsDir = path.join(resolved, "agent-teams");
  const hasAgents =
    fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory();
  const hasTeams =
    fs.existsSync(teamsDir) && fs.statSync(teamsDir).isDirectory();

  if (!hasAgents && !hasTeams) {
    throw new Error(
      "Agent package must contain at least one directory: 'agents' or 'agent-teams'.",
    );
  }

  return resolved;
};

export const buildPackageSummary = (packageRoot: string): AgentPackageSummary => {
  const resolved = path.resolve(packageRoot);
  return {
    sharedAgentCount: countDefinitionsInDir(
      path.join(resolved, "agents"),
      "agent.md",
    ),
    teamLocalAgentCount: countTeamLocalAgentsInTeamsDir(
      path.join(resolved, "agent-teams"),
    ),
    agentTeamCount: countDefinitionsInDir(
      path.join(resolved, "agent-teams"),
      "team.md",
    ),
  };
};

export const buildLocalPackageId = (rootPath: string): string =>
  `local:${encodeURIComponent(path.resolve(rootPath))}`;

export const buildGitHubPackageId = (normalizedRepository: string): string =>
  `github:${normalizedRepository.toLowerCase()}`;

export const BUILT_IN_AGENT_PACKAGE_ID = "built-in:default";
