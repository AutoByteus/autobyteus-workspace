import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import { buildTeamLocalTeamDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-definition-id.js";
import type { ApplicationOwnedDefinitionSource } from "../../application-bundles/domain/models.js";
import {
  buildApplicationOwnedTeamSourcePaths,
  buildSharedTeamSourcePaths,
  buildTeamLocalTeamSourcePaths,
  getCanonicalTeamDefinitionIdFromSourcePaths,
  type ResolvedTeamSourcePaths,
} from "./team-definition-source-paths.js";

const listRootSharedTeamSourcePaths = async (
  sharedTeamRoots: string[],
): Promise<ResolvedTeamSourcePaths[]> => {
  const teamSourcePaths: ResolvedTeamSourcePaths[] = [];
  const seenIds = new Set<string>();

  for (const teamRoot of sharedTeamRoots) {
    let teamEntries: Dirent[] = [];
    try {
      teamEntries = await fs.readdir(teamRoot, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const teamEntry of teamEntries) {
      if (!teamEntry.isDirectory() || teamEntry.name.startsWith("_") || seenIds.has(teamEntry.name)) {
        continue;
      }

      const sourcePaths = buildSharedTeamSourcePaths(teamRoot, teamEntry.name);
      try {
        await fs.access(sourcePaths.mdPath);
        teamSourcePaths.push(sourcePaths);
        seenIds.add(teamEntry.name);
      } catch {
        continue;
      }
    }
  }

  return teamSourcePaths;
};

const listLocalChildren = async (
  ownerSourcePaths: ResolvedTeamSourcePaths,
): Promise<ResolvedTeamSourcePaths[]> => {
  const localTeamsDir = path.join(ownerSourcePaths.teamDir, "agent-teams");
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(localTeamsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const children: ResolvedTeamSourcePaths[] = [];
  const ownerTeamId = getCanonicalTeamDefinitionIdFromSourcePaths(ownerSourcePaths);
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) {
      continue;
    }
    const definitionId = buildTeamLocalTeamDefinitionId(ownerTeamId, entry.name);
    const childSourcePaths = await buildTeamLocalTeamSourcePaths(
      ownerSourcePaths,
      definitionId,
      entry.name,
    );
    try {
      await fs.access(childSourcePaths.mdPath);
      children.push(childSourcePaths);
    } catch {
      continue;
    }
  }
  return children;
};

export async function listAllTeamSourcePaths(options: {
  sharedTeamRoots: string[];
  applicationOwnedTeamSources: ApplicationOwnedDefinitionSource[];
}): Promise<ResolvedTeamSourcePaths[]> {
  const roots: ResolvedTeamSourcePaths[] = [
    ...(await listRootSharedTeamSourcePaths(options.sharedTeamRoots)),
    ...options.applicationOwnedTeamSources.map(buildApplicationOwnedTeamSourcePaths),
  ];

  const results: ResolvedTeamSourcePaths[] = [];
  const seenIds = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const sourcePaths = queue.shift()!;
    const definitionId = getCanonicalTeamDefinitionIdFromSourcePaths(sourcePaths);
    if (seenIds.has(definitionId)) {
      continue;
    }
    seenIds.add(definitionId);
    results.push(sourcePaths);
    queue.push(...(await listLocalChildren(sourcePaths)));
  }

  return results;
}
