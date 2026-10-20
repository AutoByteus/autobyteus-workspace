import { readJsonFile, writeJsonFile } from "../../persistence/file/store-utils.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import {
  isoTimestamp,
  objectRecord,
  requiredArray,
  requiredString,
  requireKeys,
} from "../../run-history/store/run-execution-tree-shared-record-schemas.js";
import type { PublishedAgent } from "../domain/published-agent.js";
import { remoteCollaborationSettingsPath, type AppDataDirSource } from "./settings-file-schema.js";

const parsePublishedAgent = (value: unknown, label: string): PublishedAgent => {
  const agent = objectRecord(value, label);
  requireKeys(agent, ["agentDefinitionId", "runtimeKind", "llmModelIdentifier", "llmConfig", "workspaceRootPath",
    "autoExecuteTools", "publishedAt"], label);
  if (!Object.values(RuntimeKind).includes(agent.runtimeKind as RuntimeKind)) throw new Error(`${label}.runtimeKind is unsupported.`);
  if (agent.llmConfig !== null && (!agent.llmConfig || typeof agent.llmConfig !== "object" || Array.isArray(agent.llmConfig))) {
    throw new Error(`${label}.llmConfig must be an object or null.`);
  }
  if (typeof agent.autoExecuteTools !== "boolean") throw new Error(`${label}.autoExecuteTools must be boolean.`);
  return {
    agentDefinitionId: requiredString(agent.agentDefinitionId, `${label}.agentDefinitionId`),
    runtimeKind: agent.runtimeKind as RuntimeKind,
    llmModelIdentifier: requiredString(agent.llmModelIdentifier, `${label}.llmModelIdentifier`),
    llmConfig: agent.llmConfig === null ? null : structuredClone(agent.llmConfig as Record<string, unknown>),
    workspaceRootPath: requiredString(agent.workspaceRootPath, `${label}.workspaceRootPath`),
    autoExecuteTools: agent.autoExecuteTools,
    publishedAt: isoTimestamp(agent.publishedAt, `${label}.publishedAt`),
  };
};

/**
 * `<data>/remote-collaboration/published-agents.json` (`{ "publishedAgents": [...] }`), read with exact keys
 * and written exactly with the store's atomic JSON write. A missing file publishes nothing; a file that cannot
 * be read is reported and never rewritten. Only `PublishedAgentService` uses it.
 */
export class PublishedAgentStore {
  constructor(private readonly config: AppDataDirSource) {}

  filePath(): string { return remoteCollaborationSettingsPath(this.config, "published-agents.json"); }

  async read(): Promise<readonly PublishedAgent[]> {
    const raw = objectRecord(await readJsonFile<unknown>(this.filePath(), { publishedAgents: [] }), "published-agents.json");
    return Object.freeze(requiredArray(raw.publishedAgents, "publishedAgents")
      .map((agent, index) => Object.freeze(parsePublishedAgent(agent, `publishedAgents[${index}]`))));
  }

  async write(agents: readonly PublishedAgent[]): Promise<void> {
    await writeJsonFile(this.filePath(), {
      publishedAgents: agents.map((agent, index) => parsePublishedAgent(agent, `publishedAgents[${index}]`)),
    });
  }
}
