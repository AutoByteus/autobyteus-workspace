import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { runtimeKindFromString, type RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID } from "../domain/settings.js";
import type { SelfEvolutionEffectiveConfig } from "../domain/models.js";
import { SelfEvolutionSettingsService } from "./self-evolution-settings-service.js";

export type SelfEvolutionTargetLaunchFallback = {
  runtimeKind?: RuntimeKind | string | null;
  llmModelIdentifier?: string | null;
  llmConfig?: Record<string, unknown> | null;
  sourceAgentDefinitionId?: string | null;
};

export type ResolvedSelfEvolverAgentSettings = {
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
    ? { ...(value as Record<string, unknown>) }
    : null;

export class SelfEvolverAgentSettingsResolver {
  constructor(private readonly deps: {
    settingsService?: SelfEvolutionSettingsService;
    agentDefinitionService?: Pick<AgentDefinitionService, "getFreshAgentDefinitionById" | "getAgentDefinitionById">;
  } = {}) {}

  async resolve(input: {
    effectiveConfig: SelfEvolutionEffectiveConfig;
    targetFallback: SelfEvolutionTargetLaunchFallback;
  }): Promise<ResolvedSelfEvolverAgentSettings> {
    const selectedAgentId = input.effectiveConfig.evolverAgentDefinitionId
      ?? this.settingsService.getDefaultEvolverAgentDefinitionId();
    if (!selectedAgentId) {
      throw new Error(
        `No self-evolver agent is configured. Set ${AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID} in Server Settings.`,
      );
    }

    const definition = await this.loadDefinition(selectedAgentId);
    if (!definition) {
      throw new Error(`Configured self-evolver agent definition '${selectedAgentId}' was not found.`);
    }
    if (!definition.toolNames.includes("run_bash")) {
      throw new Error(`Configured self-evolver agent '${selectedAgentId}' must include run_bash in toolNames.`);
    }

    const launchConfig = definition.defaultLaunchConfig;
    const runtimeKind = runtimeKindFromString(launchConfig?.runtimeKind ?? null)
      ?? runtimeKindFromString(input.targetFallback.runtimeKind ?? null);
    if (!runtimeKind) {
      throw new Error(`Self-evolver agent '${selectedAgentId}' has no runtime and target fallback is unavailable.`);
    }

    const llmModelIdentifier = asTrimmedString(launchConfig?.llmModelIdentifier)
      ?? asTrimmedString(input.targetFallback.llmModelIdentifier);
    if (!llmModelIdentifier) {
      throw new Error(`Self-evolver agent '${selectedAgentId}' has no model and target fallback is unavailable.`);
    }

    return {
      agentDefinitionId: selectedAgentId,
      agentName: definition.name,
      runtimeKind,
      llmModelIdentifier,
      llmConfig: asObjectRecord(launchConfig?.llmConfig) ?? asObjectRecord(input.targetFallback.llmConfig),
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    };
  }

  private async loadDefinition(selectedAgentId: string) {
    const service = this.agentDefinitionService;
    const fresh = service.getFreshAgentDefinitionById;
    if (typeof fresh === "function") {
      return fresh.call(service, selectedAgentId);
    }
    return service.getAgentDefinitionById(selectedAgentId);
  }

  private get settingsService(): SelfEvolutionSettingsService {
    return this.deps.settingsService ?? new SelfEvolutionSettingsService();
  }

  private get agentDefinitionService(): Pick<AgentDefinitionService, "getFreshAgentDefinitionById" | "getAgentDefinitionById"> {
    return this.deps.agentDefinitionService ?? AgentDefinitionService.getInstance();
  }
}
