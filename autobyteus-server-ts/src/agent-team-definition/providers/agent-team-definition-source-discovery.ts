import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import type { ApplicationOwnedDefinitionSource } from "../../application-bundles/domain/models.js";
import {
  buildApplicationOwnedTeamSourcePaths,
  buildSharedTeamSourcePaths,
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

export async function listAllTeamSourcePaths(options: {
  sharedTeamRoots: string[];
  applicationOwnedTeamSources: ApplicationOwnedDefinitionSource[];
}): Promise<ResolvedTeamSourcePaths[]> {
  const roots: ResolvedTeamSourcePaths[] = [
    ...(await listRootSharedTeamSourcePaths(options.sharedTeamRoots)),
    ...options.applicationOwnedTeamSources.map(buildApplicationOwnedTeamSourcePaths),
  ];

  return roots;
}
