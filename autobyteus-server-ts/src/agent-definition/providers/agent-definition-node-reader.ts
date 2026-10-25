import path from "node:path";
import { AgentDefinition } from "../domain/models.js";
import type { AgentDefinitionOwnershipScope, AgentDefinitionSourceInfo } from "../domain/models.js";
import { parseAgentMd } from "../utils/agent-md-parser.js";
import { defaultAgentConfig, normalizeAgentConfigRecord, type AgentConfigRecord } from "./agent-definition-config.js";
import type { DefinitionReadResult } from "../../agent-package-definitions/domain/agent-package-definition-types.js";
import { errorMessage, fingerprintOf, readOptionalText } from "../../agent-package-definitions/domain/definition-files.js";

export type AgentDefinitionOwnership = Readonly<{
  ownershipScope: AgentDefinitionOwnershipScope;
  ownerTeamId?: string | null;
  ownerTeamName?: string | null;
  ownerOrgId?: string | null;
  ownerOrgName?: string | null;
  ownerApplicationId?: string | null;
  ownerApplicationName?: string | null;
  ownerPackageId?: string | null;
  ownerLocalApplicationId?: string | null;
  sourceInfo?: AgentDefinitionSourceInfo | null;
}>;

/** Builds an agent definition from already-read file contents (`configContent` null → defaults). */
export const buildAgentDefinitionFromFiles = (input: {
  mdContent: string;
  mdPath: string;
  config: AgentConfigRecord;
  definitionId: string;
  ownership: AgentDefinitionOwnership;
}): AgentDefinition => {
  const parsed = parseAgentMd(input.mdContent, input.mdPath);
  const config = normalizeAgentConfigRecord(input.config);
  const ownership = input.ownership;
  return new AgentDefinition({
    id: input.definitionId,
    name: parsed.name,
    description: parsed.description,
    instructions: parsed.instructions,
    category: parsed.category,
    role: parsed.role,
    avatarUrl: config.avatarUrl ?? null,
    toolNames: config.toolNames ?? [],
    skillNames: config.skillNames ?? [],
    skillScope: config.skillScope,
    inputProcessorNames: config.inputProcessorNames ?? [],
    llmResponseProcessorNames: config.llmResponseProcessorNames ?? [],
    toolExecutionResultProcessorNames: config.toolExecutionResultProcessorNames ?? [],
    toolInvocationPreprocessorNames: config.toolInvocationPreprocessorNames ?? [],
    lifecycleProcessorNames: config.lifecycleProcessorNames ?? [],
    ownershipScope: ownership.ownershipScope,
    ownerTeamId: ownership.ownerTeamId ?? null,
    ownerTeamName: ownership.ownerTeamName ?? null,
    ownerOrgId: ownership.ownerOrgId ?? null,
    ownerOrgName: ownership.ownerOrgName ?? null,
    ownerApplicationId: ownership.ownerApplicationId ?? null,
    ownerApplicationName: ownership.ownerApplicationName ?? null,
    ownerPackageId: ownership.ownerPackageId ?? null,
    ownerLocalApplicationId: ownership.ownerLocalApplicationId ?? null,
    defaultLaunchConfig: config.defaultLaunchConfig,
    internal: config.internal,
    sourceInfo: ownership.sourceInfo ?? { agentDirPath: path.dirname(input.mdPath) },
  });
};

/**
 * Reads one agent folder into a classified read result. The folder is present when `agent.md` or
 * `agent-config.json` exists; `agent.md` is required and `agent-config.json` defaults when absent.
 */
export const readAgentDefinitionNode = async (input: {
  agentDir: string;
  definitionId: string;
  ownership: AgentDefinitionOwnership;
}): Promise<DefinitionReadResult<AgentDefinition>> => {
  const mdPath = path.join(input.agentDir, "agent.md");
  const configPath = path.join(input.agentDir, "agent-config.json");
  let mdContent: string | null;
  let configContent: string | null;
  try {
    mdContent = await readOptionalText(mdPath);
  } catch (error) {
    return { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason: errorMessage(error), definitionPath: mdPath };
  }
  try {
    configContent = await readOptionalText(configPath);
  } catch (error) {
    return { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason: errorMessage(error), definitionPath: configPath };
  }
  if (mdContent === null && configContent === null) return { status: "absent" };
  if (mdContent === null) {
    return { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason: "agent.md is missing.", definitionPath: mdPath };
  }
  let config: AgentConfigRecord;
  try {
    config = configContent === null ? defaultAgentConfig() : JSON.parse(configContent) as AgentConfigRecord;
  } catch (error) {
    return { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason: `Invalid JSON: ${errorMessage(error)}`, definitionPath: configPath };
  }
  let definition: AgentDefinition;
  try {
    definition = buildAgentDefinitionFromFiles({
      mdContent, mdPath, config, definitionId: input.definitionId, ownership: input.ownership,
    });
  } catch (error) {
    return { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason: errorMessage(error), definitionPath: mdPath };
  }
  const ownership = input.ownership;
  return {
    status: "valid",
    definition,
    fingerprint: fingerprintOf([
      mdContent,
      configContent,
      ownership.ownershipScope,
      ownership.ownerTeamId ?? null,
      ownership.ownerTeamName ?? null,
      ownership.ownerOrgId ?? null,
      ownership.ownerOrgName ?? null,
    ]),
  };
};
