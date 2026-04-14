import { promises as fs } from "node:fs";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { parseCanonicalApplicationOwnedTeamId } from "../../application-bundles/utils/application-bundle-identity.js";
import type { ApplicationOwnedTeamSourcePaths } from "./application-owned-team-source.js";

export type SharedTeamSourcePaths = {
  kind: "shared";
  teamDir: string;
  mdPath: string;
  configPath: string;
  rootPath: string;
};

export type ResolvedTeamSourcePaths =
  | SharedTeamSourcePaths
  | ({ kind: "application_owned" } & ApplicationOwnedTeamSourcePaths);

type ApplicationOwnedTeamSourceLookup = {
  getApplicationOwnedTeamSourceById: (definitionId: string) => Promise<{
    definitionId: string;
    localDefinitionId: string;
    applicationRootPath: string;
    applicationId: string;
    applicationName: string;
    packageId: string;
    localApplicationId: string;
  } | null>;
};

export const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const isWritable = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath, fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
};

const findSharedTeamSourcePaths = async (
  readTeamRoots: string[],
  teamId: string,
): Promise<SharedTeamSourcePaths | null> => {
  for (const rootPath of readTeamRoots) {
    const teamDir = path.join(rootPath, teamId);
    const mdPath = path.join(teamDir, "team.md");
    const configPath = path.join(teamDir, "team-config.json");
    try {
      await fs.access(mdPath);
      return { kind: "shared", teamDir, mdPath, configPath, rootPath };
    } catch {
      continue;
    }
  }
  return null;
};

const findApplicationOwnedTeamSourcePaths = async (
  applicationBundleService: ApplicationOwnedTeamSourceLookup,
  definitionId: string,
): Promise<ResolvedTeamSourcePaths | null> => {
  const source = await applicationBundleService.getApplicationOwnedTeamSourceById(definitionId);
  if (!source) {
    return null;
  }

  const teamDir = path.join(source.applicationRootPath, "agent-teams", source.localDefinitionId);
  return {
    kind: "application_owned",
    definitionId: source.definitionId,
    teamDir,
    mdPath: path.join(teamDir, "team.md"),
    configPath: path.join(teamDir, "team-config.json"),
    rootPath: source.applicationRootPath,
    applicationId: source.applicationId,
    applicationName: source.applicationName,
    packageId: source.packageId,
    localApplicationId: source.localApplicationId,
    localTeamId: source.localDefinitionId,
  };
};

export const findTeamSourcePaths = async (
  teamId: string,
  readTeamRoots: string[],
  applicationBundleService: ApplicationOwnedTeamSourceLookup,
): Promise<ResolvedTeamSourcePaths | null> => {
  if (parseCanonicalApplicationOwnedTeamId(teamId)) {
    return findApplicationOwnedTeamSourcePaths(applicationBundleService, teamId);
  }
  return findSharedTeamSourcePaths(readTeamRoots, teamId);
};

export const ensureWritableTeamSourcePaths = async (
  sourcePaths: ResolvedTeamSourcePaths,
  teamId: string,
): Promise<void> => {
  if (!(await isWritable(sourcePaths.teamDir))) {
    throw new Error(`Team definition '${teamId}' is read-only at source path '${sourcePaths.rootPath}'.`);
  }
  if ((await pathExists(sourcePaths.mdPath)) && !(await isWritable(sourcePaths.mdPath))) {
    throw new Error(`Team definition '${teamId}' is read-only at source path '${sourcePaths.rootPath}'.`);
  }
  if ((await pathExists(sourcePaths.configPath)) && !(await isWritable(sourcePaths.configPath))) {
    throw new Error(`Team definition '${teamId}' is read-only at source path '${sourcePaths.rootPath}'.`);
  }
};
