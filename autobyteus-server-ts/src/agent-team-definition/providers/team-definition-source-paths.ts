import { promises as fs } from "node:fs";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { parseCanonicalApplicationOwnedTeamId } from "../../application-bundles/utils/application-bundle-identity.js";
import { parseTeamLocalDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-definition-id.js";
import type { ApplicationOwnedTeamSourcePaths } from "./application-owned-team-source.js";
import { parseTeamMd } from "../utils/team-md-parser.js";

export type SharedTeamSourcePaths = {
  kind: "shared";
  definitionId: string;
  localTeamId: string;
  teamDir: string;
  mdPath: string;
  configPath: string;
  rootPath: string;
};

export type TeamLocalTeamSourcePaths = {
  kind: "team_local";
  definitionId: string;
  ownerTeamId: string;
  ownerTeamName?: string | null;
  localTeamId: string;
  teamDir: string;
  mdPath: string;
  configPath: string;
  rootPath: string;
  ownerApplicationId?: string | null;
  ownerApplicationName?: string | null;
  ownerPackageId?: string | null;
  ownerLocalApplicationId?: string | null;
};

export type ResolvedTeamSourcePaths =
  | SharedTeamSourcePaths
  | ({ kind: "application_owned" } & ApplicationOwnedTeamSourcePaths)
  | TeamLocalTeamSourcePaths;

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

const readTeamName = async (sourcePaths: ResolvedTeamSourcePaths): Promise<string | null> => {
  try {
    const content = await fs.readFile(sourcePaths.mdPath, "utf-8");
    return parseTeamMd(content, sourcePaths.mdPath).name;
  } catch {
    return null;
  }
};

export const getCanonicalTeamDefinitionIdFromSourcePaths = (
  sourcePaths: ResolvedTeamSourcePaths,
): string => sourcePaths.definitionId;

export const getLocalTeamIdFromSourcePaths = (
  sourcePaths: ResolvedTeamSourcePaths,
): string => sourcePaths.localTeamId;

export const buildSharedTeamSourcePaths = (
  teamRoot: string,
  teamId: string,
): SharedTeamSourcePaths => {
  const teamDir = path.join(teamRoot, teamId);
  return {
    kind: "shared",
    definitionId: teamId,
    localTeamId: teamId,
    teamDir,
    mdPath: path.join(teamDir, "team.md"),
    configPath: path.join(teamDir, "team-config.json"),
    rootPath: teamRoot,
  };
};

export const buildApplicationOwnedTeamSourcePaths = (
  source: {
    definitionId: string;
    localDefinitionId: string;
    applicationRootPath: string;
    applicationId: string;
    applicationName: string;
    packageId: string;
    localApplicationId: string;
  },
): Extract<ResolvedTeamSourcePaths, { kind: "application_owned" }> => {
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

export const buildTeamLocalTeamSourcePaths = async (
  ownerSourcePaths: ResolvedTeamSourcePaths,
  definitionId: string,
  localTeamId: string,
): Promise<TeamLocalTeamSourcePaths> => {
  const teamDir = path.join(ownerSourcePaths.teamDir, "agent-teams", localTeamId);
  const ownerTeamId = getCanonicalTeamDefinitionIdFromSourcePaths(ownerSourcePaths);
  return {
    kind: "team_local",
    definitionId,
    ownerTeamId,
    ownerTeamName: await readTeamName(ownerSourcePaths),
    localTeamId,
    teamDir,
    mdPath: path.join(teamDir, "team.md"),
    configPath: path.join(teamDir, "team-config.json"),
    rootPath: ownerSourcePaths.teamDir,
    ownerApplicationId:
      ownerSourcePaths.kind === "application_owned"
        ? ownerSourcePaths.applicationId
        : ownerSourcePaths.kind === "team_local"
          ? ownerSourcePaths.ownerApplicationId ?? null
          : null,
    ownerApplicationName:
      ownerSourcePaths.kind === "application_owned"
        ? ownerSourcePaths.applicationName
        : ownerSourcePaths.kind === "team_local"
          ? ownerSourcePaths.ownerApplicationName ?? null
          : null,
    ownerPackageId:
      ownerSourcePaths.kind === "application_owned"
        ? ownerSourcePaths.packageId
        : ownerSourcePaths.kind === "team_local"
          ? ownerSourcePaths.ownerPackageId ?? null
          : null,
    ownerLocalApplicationId:
      ownerSourcePaths.kind === "application_owned"
        ? ownerSourcePaths.localApplicationId
        : ownerSourcePaths.kind === "team_local"
          ? ownerSourcePaths.ownerLocalApplicationId ?? null
          : null,
  };
};

const findSharedTeamSourcePaths = async (
  readTeamRoots: string[],
  teamId: string,
): Promise<SharedTeamSourcePaths | null> => {
  for (const rootPath of readTeamRoots) {
    const sourcePaths = buildSharedTeamSourcePaths(rootPath, teamId);
    try {
      await fs.access(sourcePaths.mdPath);
      return sourcePaths;
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
  return buildApplicationOwnedTeamSourcePaths(source);
};

const findTeamLocalTeamSourcePaths = async (
  teamId: string,
  readTeamRoots: string[],
  applicationBundleService: ApplicationOwnedTeamSourceLookup,
): Promise<ResolvedTeamSourcePaths | null> => {
  const parsed = parseTeamLocalDefinitionId(teamId);
  if (parsed?.subject !== "agent_team") {
    return null;
  }
  const ownerSourcePaths = await findTeamSourcePaths(
    parsed.ownerTeamId,
    readTeamRoots,
    applicationBundleService,
  );
  if (!ownerSourcePaths) {
    return null;
  }
  const localSourcePaths = await buildTeamLocalTeamSourcePaths(
    ownerSourcePaths,
    teamId,
    parsed.localDefinitionId,
  );
  try {
    await fs.access(localSourcePaths.mdPath);
    return localSourcePaths;
  } catch {
    return null;
  }
};

export const findTeamSourcePaths = async (
  teamId: string,
  readTeamRoots: string[],
  applicationBundleService: ApplicationOwnedTeamSourceLookup,
): Promise<ResolvedTeamSourcePaths | null> => {
  if (parseTeamLocalDefinitionId(teamId)?.subject === "agent_team") {
    return findTeamLocalTeamSourcePaths(teamId, readTeamRoots, applicationBundleService);
  }
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
