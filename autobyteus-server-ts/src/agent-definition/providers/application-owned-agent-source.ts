import path from "node:path";
import type { ApplicationOwnedDefinitionSource } from "../../application-bundles/domain/models.js";

export type ApplicationOwnedAgentSourcePaths = {
  agentDir: string;
  mdPath: string;
  configPath: string;
  rootPath: string;
  applicationId: string;
  applicationName: string;
  packageId: string;
  localApplicationId: string;
  localAgentId: string;
};

export const buildApplicationOwnedAgentSourcePaths = (
  source: ApplicationOwnedDefinitionSource,
): ApplicationOwnedAgentSourcePaths => {
  const agentDir = path.join(source.applicationRootPath, "agents", source.localDefinitionId);
  return {
    agentDir,
    mdPath: path.join(agentDir, "agent.md"),
    configPath: path.join(agentDir, "agent-config.json"),
    rootPath: source.applicationRootPath,
    applicationId: source.applicationId,
    applicationName: source.applicationName,
    packageId: source.packageId,
    localApplicationId: source.localApplicationId,
    localAgentId: source.localDefinitionId,
  };
};
