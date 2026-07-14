import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { MEMORY_COMPACTOR_AGENT_DEFINITION_ID } from "../../built-in-agents/built-in-agent-registry.js";
import { runtimeKindFromString, type RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export type ResolvedMemoryCompactorAgentLaunch = {
  agentDefinitionId: string;
  agentName: string;
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  skillAccessMode: SkillAccessMode;
};

export type CompactionParentLaunchFallback = {
  runtimeKind?: RuntimeKind | string | null;
  llmModelIdentifier?: string | null;
  sourceAgentDefinitionId?: string | null;
};

type MemoryCompactorDefinitionLookup = Pick<
  AgentDefinitionService,
  "getFreshAgentDefinitionById" | "getAgentDefinitionById"
>;

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

export class MemoryCompactorAgentLaunchResolver {
  constructor(
    private readonly agentDefinitionService: MemoryCompactorDefinitionLookup = AgentDefinitionService.getInstance(),
  ) {}

  async resolve(
    parentLaunchFallback: CompactionParentLaunchFallback | null = null,
  ): Promise<ResolvedMemoryCompactorAgentLaunch> {
    const definition = await this.loadDefinition();
    if (!definition) {
      throw new Error(
        `Built-in Memory Compactor agent definition '${MEMORY_COMPACTOR_AGENT_DEFINITION_ID}' was not found.`,
      );
    }

    const launchConfig = definition.defaultLaunchConfig;
    const explicitRuntimeKind = runtimeKindFromString(launchConfig?.runtimeKind ?? null);
    const fallbackRuntimeKind = runtimeKindFromString(parentLaunchFallback?.runtimeKind ?? null);
    const runtimeKind = explicitRuntimeKind ?? fallbackRuntimeKind;
    if (!runtimeKind) {
      throw new Error(
        `Built-in Memory Compactor '${MEMORY_COMPACTOR_AGENT_DEFINITION_ID}' is missing a valid default runtime kind and ${this.formatFallbackSource(parentLaunchFallback)} did not provide a parent runtime kind fallback.`,
      );
    }

    const explicitModelIdentifier = asTrimmedString(launchConfig?.llmModelIdentifier);
    const fallbackModelIdentifier = asTrimmedString(parentLaunchFallback?.llmModelIdentifier);
    const llmModelIdentifier = explicitModelIdentifier ?? fallbackModelIdentifier;
    if (!llmModelIdentifier) {
      throw new Error(
        `Built-in Memory Compactor '${MEMORY_COMPACTOR_AGENT_DEFINITION_ID}' is missing a default model identifier and ${this.formatFallbackSource(parentLaunchFallback)} did not provide a parent model identifier fallback.`,
      );
    }

    return {
      agentDefinitionId: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
      agentName: definition.name,
      runtimeKind,
      llmModelIdentifier,
      llmConfig: asObjectRecord(launchConfig?.llmConfig),
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    };
  }

  private async loadDefinition() {
    const freshLoader = this.agentDefinitionService.getFreshAgentDefinitionById;
    if (typeof freshLoader === "function") {
      return freshLoader.call(
        this.agentDefinitionService,
        MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
      );
    }
    return this.agentDefinitionService.getAgentDefinitionById(
      MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
    );
  }

  private formatFallbackSource(
    parentLaunchFallback: CompactionParentLaunchFallback | null,
  ): string {
    const sourceAgentDefinitionId = asTrimmedString(
      parentLaunchFallback?.sourceAgentDefinitionId,
    );
    if (sourceAgentDefinitionId) {
      return `parent fallback context for agent '${sourceAgentDefinitionId}'`;
    }
    return "parent fallback context";
  }
}
