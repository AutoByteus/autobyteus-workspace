import type {
  ApplicationLaunchDefinitionValueSource,
  ApplicationResolvedLaunchBaselineLeaf,
  ApplicationResolvedResourceLaunchBaseline,
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSlotDeclaration,
} from "@autobyteus/application-sdk-contracts";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import {
  buildScopedMemberResolutionContext,
  resolveScopedAgentMemberRef,
  resolveScopedTeamMemberRef,
} from "../../agent-team-definition/utils/scoped-team-member-resolution.js";
import type { DefaultLaunchConfig } from "../../launch-preferences/default-launch-config.js";
import { normalizeMemberRouteKey } from "../../agent-team-execution/domain/team-run-member-identity.js";
import type { ApplicationExecutionResourceResolver } from "../../application-orchestration/services/application-execution-resource-resolver.js";

type LaunchLayer = {
  config: DefaultLaunchConfig | null;
  source: ApplicationLaunchDefinitionValueSource;
};

const definitionValueSource = (input: {
  provenance: "PACKAGE" | "SELECTED_RESOURCE";
  definitionKind: "AGENT" | "AGENT_TEAM";
  definitionId: string;
}): ApplicationLaunchDefinitionValueSource => {
  if (input.provenance === "PACKAGE") {
    return input.definitionKind === "AGENT"
      ? { kind: "PACKAGE_AGENT_DEFAULT", agentDefinitionId: input.definitionId }
      : { kind: "PACKAGE_TEAM_DEFAULT", teamDefinitionId: input.definitionId };
  }
  return input.definitionKind === "AGENT"
    ? { kind: "SELECTED_RESOURCE_AGENT_DEFAULT", agentDefinitionId: input.definitionId }
    : { kind: "SELECTED_RESOURCE_TEAM_DEFAULT", teamDefinitionId: input.definitionId };
};

export class ApplicationLaunchResourceBaselineError extends Error {
  constructor(
    readonly code:
      | "PACKAGE_DEFAULT_MISSING"
      | "PACKAGE_RESOURCE_UNAVAILABLE"
      | "PACKAGE_RESOURCE_NOT_ALLOWED"
      | "PACKAGE_DEFAULT_INCOMPLETE"
      | "PACKAGE_TEAM_TOPOLOGY_INVALID",
    message: string,
  ) {
    super(message);
    this.name = "ApplicationLaunchResourceBaselineError";
  }
}

const cloneConfig = (
  value: Record<string, unknown> | null,
): Record<string, unknown> | null => value ? structuredClone(value) : null;

const resolveStringValue = (
  layers: LaunchLayer[],
  field: "runtimeKind" | "llmModelIdentifier",
): { value: string; source: ApplicationLaunchDefinitionValueSource } | null => {
  for (const layer of layers) {
    const value = layer.config?.[field]?.trim();
    if (value) return { value, source: structuredClone(layer.source) };
  }
  return null;
};

const resolveAtomicLlmConfig = (input: {
  layers: LaunchLayer[];
  runtimeKind: string;
  llmModelIdentifier: string;
}): { value: Record<string, unknown> | null; source: ApplicationLaunchDefinitionValueSource | null } => {
  const layer = input.layers.find((candidate) => candidate.config?.llmConfig != null) ?? null;
  if (!layer?.config?.llmConfig) return { value: null, source: null };
  const configuredRuntime = layer.config.runtimeKind?.trim() || null;
  const configuredModel = layer.config.llmModelIdentifier?.trim() || null;
  if (
    (configuredRuntime && configuredRuntime !== input.runtimeKind)
    || (configuredModel && configuredModel !== input.llmModelIdentifier)
  ) {
    return { value: null, source: null };
  }
  return {
    value: cloneConfig(layer.config.llmConfig),
    source: structuredClone(layer.source),
  };
};

const buildBaselineLeaf = (input: {
  memberRouteKey: string | null;
  memberName: string;
  agentDefinitionId: string;
  layers: LaunchLayer[];
}): ApplicationResolvedLaunchBaselineLeaf => {
  const runtime = resolveStringValue(input.layers, "runtimeKind");
  const model = resolveStringValue(input.layers, "llmModelIdentifier");
  const llmConfig = runtime && model
    ? resolveAtomicLlmConfig({
        layers: input.layers,
        runtimeKind: runtime.value,
        llmModelIdentifier: model.value,
      })
    : { value: null, source: null };
  return {
    memberRouteKey: input.memberRouteKey,
    memberName: input.memberName,
    agentDefinitionId: input.agentDefinitionId,
    runtimeKind: runtime?.value ?? null,
    llmModelIdentifier: model?.value ?? null,
    llmConfig: llmConfig.value,
    provenance: {
      runtimeKind: runtime?.source ?? null,
      llmModelIdentifier: model?.source ?? null,
      llmConfig: llmConfig.source,
    },
  };
};

export class ApplicationLaunchResourceBaselineBuilder {
  constructor(private readonly dependencies: {
    executionResourceResolver: ApplicationExecutionResourceResolver;
    agentDefinitionService: AgentDefinitionService;
    agentTeamDefinitionService: AgentTeamDefinitionService;
  }) {}

  async build(input: {
    applicationId: string;
    slot: ApplicationExecutionResourceSlotDeclaration;
    executionResourceRef: ApplicationExecutionResourceRef;
    provenance: "PACKAGE" | "SELECTED_RESOURCE";
  }): Promise<ApplicationResolvedResourceLaunchBaseline> {
    this.assertSelectionAllowed(input.slot, input.executionResourceRef);
    let resource;
    try {
      resource = await this.dependencies.executionResourceResolver.resolveExecutionResource(
        input.applicationId,
        input.executionResourceRef,
      );
    } catch (error) {
      throw new ApplicationLaunchResourceBaselineError(
        "PACKAGE_RESOURCE_UNAVAILABLE",
        error instanceof Error ? error.message : String(error),
      );
    }
    const leaves = resource.kind === "AGENT"
      ? [await this.buildAgentLeaf({
          agentDefinitionId: resource.definitionId,
          memberRouteKey: null,
          memberName: resource.name,
          parentLayers: [],
          provenance: input.provenance,
        })]
      : await this.buildTeamLeaves({
          teamDefinitionId: resource.definitionId,
          memberPath: [],
          parentLayers: [],
          provenance: input.provenance,
          visited: new Set(),
        });
    if (leaves.length === 0) {
      throw new ApplicationLaunchResourceBaselineError(
        "PACKAGE_TEAM_TOPOLOGY_INVALID",
        `Application slot '${input.slot.slotKey}' selected team has no leaf agents.`,
      );
    }
    return {
      slotKey: input.slot.slotKey,
      executionResourceRef: structuredClone(input.executionResourceRef),
      resourceDefinitionId: resource.definitionId,
      resourceKind: resource.kind,
      leaves: leaves.sort((left, right) =>
        (left.memberRouteKey ?? "").localeCompare(right.memberRouteKey ?? "")),
    };
  }

  private assertSelectionAllowed(
    slot: ApplicationExecutionResourceSlotDeclaration,
    ref: ApplicationExecutionResourceRef,
  ): void {
    if (!slot.allowedExecutionResourceKinds.includes(ref.kind)) {
      throw new ApplicationLaunchResourceBaselineError(
        "PACKAGE_RESOURCE_NOT_ALLOWED",
        `Application slot '${slot.slotKey}' does not allow resource kind '${ref.kind}'.`,
      );
    }
    const allowedSources = slot.allowedExecutionResourceSources ?? ["bundle", "shared"];
    if (!allowedSources.includes(ref.source)) {
      throw new ApplicationLaunchResourceBaselineError(
        "PACKAGE_RESOURCE_NOT_ALLOWED",
        `Application slot '${slot.slotKey}' does not allow resource source '${ref.source}'.`,
      );
    }
  }

  private async buildAgentLeaf(input: {
    agentDefinitionId: string;
    memberRouteKey: string | null;
    memberName: string;
    parentLayers: LaunchLayer[];
    provenance: "PACKAGE" | "SELECTED_RESOURCE";
  }): Promise<ApplicationResolvedLaunchBaselineLeaf> {
    const definition = await this.dependencies.agentDefinitionService
      .getAgentDefinitionById(input.agentDefinitionId);
    if (!definition) {
      throw new ApplicationLaunchResourceBaselineError(
        "PACKAGE_TEAM_TOPOLOGY_INVALID",
        `Agent definition '${input.agentDefinitionId}' was not found.`,
      );
    }
    return buildBaselineLeaf({
      ...input,
      memberName: input.memberName || definition.name,
      layers: [
        ...input.parentLayers,
        {
          config: definition.defaultLaunchConfig,
          source: definitionValueSource({
            provenance: input.provenance,
            definitionKind: "AGENT",
            definitionId: input.agentDefinitionId,
          }),
        },
      ],
    });
  }

  private async buildTeamLeaves(input: {
    teamDefinitionId: string;
    memberPath: string[];
    parentLayers: LaunchLayer[];
    provenance: "PACKAGE" | "SELECTED_RESOURCE";
    visited: Set<string>;
  }): Promise<ApplicationResolvedLaunchBaselineLeaf[]> {
    if (input.visited.has(input.teamDefinitionId)) {
      throw new ApplicationLaunchResourceBaselineError(
        "PACKAGE_TEAM_TOPOLOGY_INVALID",
        `Circular team topology includes '${input.teamDefinitionId}'.`,
      );
    }
    const visited = new Set(input.visited).add(input.teamDefinitionId);
    const team = await this.dependencies.agentTeamDefinitionService
      .getDefinitionById(input.teamDefinitionId);
    if (!team) {
      throw new ApplicationLaunchResourceBaselineError(
        "PACKAGE_TEAM_TOPOLOGY_INVALID",
        `Team definition '${input.teamDefinitionId}' was not found.`,
      );
    }
    const teamLayers: LaunchLayer[] = [
      {
        config: team.defaultLaunchConfig,
        source: definitionValueSource({
          provenance: input.provenance,
          definitionKind: "AGENT_TEAM",
          definitionId: input.teamDefinitionId,
        }),
      },
      ...input.parentLayers,
    ];
    const resolutionContext = buildScopedMemberResolutionContext(team, input.teamDefinitionId);
    const leaves: ApplicationResolvedLaunchBaselineLeaf[] = [];
    for (const member of team.nodes) {
      const memberPath = [...input.memberPath, member.memberName.trim()];
      if (member.refType === "agent") {
        leaves.push(await this.buildAgentLeaf({
          agentDefinitionId: resolveScopedAgentMemberRef(resolutionContext, member),
          memberRouteKey: normalizeMemberRouteKey(memberPath.join("/")),
          memberName: member.memberName.trim(),
          parentLayers: teamLayers,
          provenance: input.provenance,
        }));
      } else {
        leaves.push(...await this.buildTeamLeaves({
          teamDefinitionId: resolveScopedTeamMemberRef(resolutionContext, member),
          memberPath,
          parentLayers: teamLayers,
          provenance: input.provenance,
          visited,
        }));
      }
    }
    return leaves;
  }
}
