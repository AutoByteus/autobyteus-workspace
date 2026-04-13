import { promises as fs } from "node:fs";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import type { AgentDefinitionOwnershipScope } from "../domain/models.js";
import { parseTeamLocalAgentDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-agent-definition-id.js";
import { parseCanonicalApplicationOwnedAgentId } from "../../application-bundles/utils/application-bundle-identity.js";
import { readTeamOwnership } from "./team-local-agent-discovery.js";
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
  getApplicationOwnedAgentSourceById: (definitionId: string) => Promise<{
    definitionId: string;
    applicationId: string;
    applicationName: string;
    packageId: string;
    localApplicationId: string;
    localDefinitionId: string;
    applicationRootPath: string;
  } | null>;
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
  readTeamRoots: string[],
  teamId: string,
  agentId: string,
  warn: (...args: unknown[]) => void,
): Promise<AgentSourcePaths | null> => {
  for (const teamRoot of readTeamRoots) {
    const agentDir = path.join(teamRoot, teamId, "agents", agentId);
    const mdPath = path.join(agentDir, "agent.md");
    const configPath = path.join(agentDir, "agent-config.json");
    try {
      await fs.access(mdPath);
    } catch {
      continue;
    }

    const ownership = await readTeamOwnership(teamRoot, teamId, warn);
    return {
      agentDir,
      mdPath,
      configPath,
      rootPath: path.join(teamRoot, teamId),
      ownershipScope: "team_local",
      ownerTeamId: ownership.ownerTeamId,
      ownerTeamName: ownership.ownerTeamName,
    };
  }
  return null;
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
      readTeamRoots,
      parsedTeamLocalId.teamId,
      parsedTeamLocalId.agentId,
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
