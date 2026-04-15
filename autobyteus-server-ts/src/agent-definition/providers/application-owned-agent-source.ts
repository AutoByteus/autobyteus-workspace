import { promises as fs } from "node:fs";
import path from "node:path";
import type { ApplicationOwnedDefinitionSource } from "../../application-bundles/domain/models.js";
import { AgentDefinition } from "../domain/models.js";
import { readJsonFile } from "../../persistence/file/store-utils.js";
import { AgentMdParseError, parseAgentMd } from "../utils/agent-md-parser.js";
import {
  type AgentConfigRecord,
  defaultAgentConfig,
  normalizeAgentConfigRecord,
} from "./agent-definition-config.js";

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

export class ApplicationOwnedAgentConfigParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationOwnedAgentConfigParseError";
  }
}

export const readApplicationOwnedAgentDefinitionFromSource = async (
  sourcePaths: ApplicationOwnedAgentSourcePaths,
  definitionId: string,
): Promise<AgentDefinition | null> => {
  try {
    const mdContent = await fs.readFile(sourcePaths.mdPath, "utf-8");
    const parsed = parseAgentMd(mdContent, sourcePaths.mdPath);

    let configRecord: AgentConfigRecord;
    try {
      configRecord = await readJsonFile<AgentConfigRecord>(
        sourcePaths.configPath,
        defaultAgentConfig(),
      );
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ApplicationOwnedAgentConfigParseError(
          `Invalid JSON in application-owned agent config '${sourcePaths.configPath}': ${error.message}`,
        );
      }
      throw error;
    }

    const normalizedConfig = normalizeAgentConfigRecord(configRecord);

    return new AgentDefinition({
      id: definitionId,
      name: parsed.name,
      description: parsed.description,
      instructions: parsed.instructions,
      category: parsed.category,
      role: parsed.role,
      avatarUrl: normalizedConfig.avatarUrl ?? null,
      toolNames: normalizedConfig.toolNames ?? [],
      skillNames: normalizedConfig.skillNames ?? [],
      inputProcessorNames: normalizedConfig.inputProcessorNames ?? [],
      llmResponseProcessorNames: normalizedConfig.llmResponseProcessorNames ?? [],
      systemPromptProcessorNames: normalizedConfig.systemPromptProcessorNames ?? [],
      toolExecutionResultProcessorNames: normalizedConfig.toolExecutionResultProcessorNames ?? [],
      toolInvocationPreprocessorNames: normalizedConfig.toolInvocationPreprocessorNames ?? [],
      lifecycleProcessorNames: normalizedConfig.lifecycleProcessorNames ?? [],
      ownershipScope: "application_owned",
      ownerApplicationId: sourcePaths.applicationId,
      ownerApplicationName: sourcePaths.applicationName,
      ownerPackageId: sourcePaths.packageId,
      ownerLocalApplicationId: sourcePaths.localApplicationId,
      defaultLaunchConfig: normalizedConfig.defaultLaunchConfig,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    if (
      error instanceof AgentMdParseError
      || error instanceof ApplicationOwnedAgentConfigParseError
    ) {
      throw error;
    }
    throw error;
  }
};
