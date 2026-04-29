import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { runtimeKindFromString, type RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import {
  AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
  getServerSettingsService,
  type ServerSettingsService,
} from "../../services/server-settings-service.js";

export type ResolvedCompactionAgentSettings = {
  agentDefinitionId: string;
  agentName: string;
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  skillAccessMode: SkillAccessMode;
};

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const asObjectRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export class CompactionAgentSettingsResolver {
  constructor(
    private readonly serverSettingsService: Pick<ServerSettingsService, "getCompactionAgentDefinitionId"> = getServerSettingsService(),
    private readonly agentDefinitionService: Pick<AgentDefinitionService, "getFreshAgentDefinitionById" | "getAgentDefinitionById"> = AgentDefinitionService.getInstance(),
  ) {}

  async resolve(): Promise<ResolvedCompactionAgentSettings> {
    const selectedAgentId = this.serverSettingsService.getCompactionAgentDefinitionId();
    if (!selectedAgentId) {
      throw new Error(
        `No compactor agent is configured. Set ${AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID} in Server Settings -> Basics -> Compaction.`,
      );
    }

    const definition = await this.loadDefinition(selectedAgentId);
    if (!definition) {
      throw new Error(`Configured compactor agent definition '${selectedAgentId}' was not found.`);
    }

    const launchConfig = definition.defaultLaunchConfig;
    const runtimeKind = runtimeKindFromString(launchConfig?.runtimeKind ?? null);
    if (!runtimeKind) {
      throw new Error(`Compactor agent '${selectedAgentId}' is missing a valid default runtime kind.`);
    }

    const llmModelIdentifier = asTrimmedString(launchConfig?.llmModelIdentifier);
    if (!llmModelIdentifier) {
      throw new Error(`Compactor agent '${selectedAgentId}' is missing a default model identifier.`);
    }

    return {
      agentDefinitionId: selectedAgentId,
      agentName: definition.name,
      runtimeKind,
      llmModelIdentifier,
      llmConfig: asObjectRecord(launchConfig?.llmConfig),
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    };
  }

  private async loadDefinition(selectedAgentId: string) {
    const freshLoader = this.agentDefinitionService.getFreshAgentDefinitionById;
    if (typeof freshLoader === "function") {
      return freshLoader.call(this.agentDefinitionService, selectedAgentId);
    }
    return this.agentDefinitionService.getAgentDefinitionById(selectedAgentId);
  }
}
