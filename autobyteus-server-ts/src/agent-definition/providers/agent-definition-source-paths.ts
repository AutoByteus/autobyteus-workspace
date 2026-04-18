import { promises as fs } from "node:fs";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import type { AgentDefinitionOwnershipScope } from "../domain/models.js";
import { parseTeamLocalAgentDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-agent-definition-id.js";
import type { ApplicationOwnedDefinitionSource } from "../../application-bundles/domain/models.js";
import { parseCanonicalApplicationOwnedAgentId } from "../../application-bundles/utils/application-bundle-identity.js";
import { findTeamSourcePaths } from "../../agent-team-definition/providers/team-definition-source-paths.js";
import {
  buildTeamLocalAgentFilePaths,
  readTeamOwnership,
} from "./team-local-agent-discovery.js";
import { buildApplicationOwnedAgentSourcePaths } from "./application-owned-agent-source.js";

export type AgentSourcePaths = {
  agentDir: string;
  mdPath: string;
  configPath: string;
  rootPath: string;
  ownershipScope: AgentDefinitionOwnershipScope;
  ownerTeamId?: string | null;
  ownerTeamName?: string | null;
  ownerApplicationId?: string | null;
  ownerApplicationName?: string | null;
  ownerPackageId?: string | null;
  ownerLocalApplicationId?: string | null;
};

type ApplicationOwnedAgentSourceLookup = {
  getApplicationOwnedAgentSourceById: (definitionId: string) => Promise<ApplicationOwnedDefinitionSource | null>;
  getApplicationOwnedTeamSourceById: (definitionId: string) => Promise<ApplicationOwnedDefinitionSource | null>;
};

type FindAgentSourcePathInput = {
  agentId: string;
  readAgentRoots: string[];
  readTeamRoots: string[];
  applicationBundleService: ApplicationOwnedAgentSourceLookup;
  warn: (...args: unknown[]) => void;
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

const findSharedAgentSourcePaths = async (
  readAgentRoots: string[],
  agentId: string,
): Promise<AgentSourcePaths | null> => {
  for (const rootPath of readAgentRoots) {
    const agentDir = path.join(rootPath, agentId);
    const mdPath = path.join(rootPath, agentId, "agent.md");
    const configPath = path.join(rootPath, agentId, "agent-config.json");
    try {
      await fs.access(mdPath);
      return {
        agentDir,
        mdPath,
        configPath,
        rootPath,
        ownershipScope: "shared",
        ownerTeamId: null,
        ownerTeamName: null,
      };
    } catch {
      continue;
    }
  }
  return null;
};

const findTeamLocalAgentSourcePaths = async (
  teamId: string,
  agentId: string,
  readTeamRoots: string[],
  applicationBundleService: ApplicationOwnedAgentSourceLookup,
  warn: (...args: unknown[]) => void,
): Promise<AgentSourcePaths | null> => {
  const teamSourcePaths = await findTeamSourcePaths(
    teamId,
    readTeamRoots,
    applicationBundleService,
  );
  if (!teamSourcePaths) {
    return null;
  }

  const filePaths = buildTeamLocalAgentFilePaths(teamSourcePaths.teamDir, agentId);
  try {
    await fs.access(filePaths.mdPath);
  } catch {
    return null;
  }

  const ownership = await readTeamOwnership(teamSourcePaths, warn);
  return {
    agentDir: filePaths.agentDir,
    mdPath: filePaths.mdPath,
    configPath: filePaths.configPath,
    rootPath: teamSourcePaths.teamDir,
    ownershipScope: "team_local",
    ownerTeamId: ownership.ownerTeamId,
    ownerTeamName: ownership.ownerTeamName,
    ownerApplicationId: ownership.ownerApplicationId ?? null,
    ownerApplicationName: ownership.ownerApplicationName ?? null,
    ownerPackageId: ownership.ownerPackageId ?? null,
    ownerLocalApplicationId: ownership.ownerLocalApplicationId ?? null,
  };
};

const findApplicationOwnedAgentSourcePaths = async (
  applicationBundleService: ApplicationOwnedAgentSourceLookup,
  definitionId: string,
): Promise<AgentSourcePaths | null> => {
  const source = await applicationBundleService.getApplicationOwnedAgentSourceById(definitionId);
  if (!source) {
    return null;
  }
  const sourcePaths = buildApplicationOwnedAgentSourcePaths(source);
  return {
    agentDir: sourcePaths.agentDir,
    mdPath: sourcePaths.mdPath,
    configPath: sourcePaths.configPath,
    rootPath: sourcePaths.rootPath,
    ownershipScope: "application_owned",
    ownerApplicationId: sourcePaths.applicationId,
    ownerApplicationName: sourcePaths.applicationName,
    ownerPackageId: sourcePaths.packageId,
    ownerLocalApplicationId: sourcePaths.localApplicationId,
  };
};

export const findAgentSourcePaths = async ({
  agentId,
  readAgentRoots,
  readTeamRoots,
  applicationBundleService,
  warn,
}: FindAgentSourcePathInput): Promise<AgentSourcePaths | null> => {
  const parsedTeamLocalId = parseTeamLocalAgentDefinitionId(agentId);
  if (parsedTeamLocalId) {
    return findTeamLocalAgentSourcePaths(
      parsedTeamLocalId.teamId,
      parsedTeamLocalId.agentId,
      readTeamRoots,
      applicationBundleService,
      warn,
    );
  }
  if (parseCanonicalApplicationOwnedAgentId(agentId)) {
    return findApplicationOwnedAgentSourcePaths(applicationBundleService, agentId);
  }
  return findSharedAgentSourcePaths(readAgentRoots, agentId);
};

export const ensureWritableAgentSourcePaths = async (
  sourcePaths: AgentSourcePaths,
  agentId: string,
): Promise<void> => {
  if (!(await isWritable(sourcePaths.agentDir))) {
    throw new Error(`Agent definition '${agentId}' is read-only at source path '${sourcePaths.rootPath}'.`);
  }
  if ((await pathExists(sourcePaths.mdPath)) && !(await isWritable(sourcePaths.mdPath))) {
    throw new Error(`Agent definition '${agentId}' is read-only at source path '${sourcePaths.rootPath}'.`);
  }
  if ((await pathExists(sourcePaths.configPath)) && !(await isWritable(sourcePaths.configPath))) {
    throw new Error(`Agent definition '${agentId}' is read-only at source path '${sourcePaths.rootPath}'.`);
  }
};
