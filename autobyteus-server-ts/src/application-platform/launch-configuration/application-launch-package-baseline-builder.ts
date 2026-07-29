import type {
  ApplicationEffectiveLaunchConfiguration,
  ApplicationEffectiveLeafLaunchProfile,
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSlotDeclaration,
  ApplicationLaunchValueSource,
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
  source: ApplicationLaunchValueSource;
};

const definitionValueSource = (input: {
  refSource: ApplicationExecutionResourceRef["source"];
  definitionKind: "AGENT" | "AGENT_TEAM";
  definitionId: string;
}): ApplicationLaunchValueSource => {
  if (input.refSource === "shared") return { kind: "HOST_SLOT_OVERRIDE" };
  return input.definitionKind === "AGENT"
    ? { kind: "PACKAGE_AGENT_DEFAULT", agentDefinitionId: input.definitionId }
    : { kind: "PACKAGE_TEAM_DEFAULT", teamDefinitionId: input.definitionId };
};

export class ApplicationLaunchPackageBaselineError extends Error {
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
    this.name = "ApplicationLaunchPackageBaselineError";
  }
}

const cloneConfig = (
  value: Record<string, unknown> | null,
): Record<string, unknown> | null => value ? structuredClone(value) : null;

const resolveStringValue = (
  layers: LaunchLayer[],
  field: "runtimeKind" | "llmModelIdentifier",
): { value: string; source: ApplicationLaunchValueSource } | null => {
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
}): { value: Record<string, unknown> | null; source: ApplicationLaunchValueSource | null } => {
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

const requireCompleteLeaf = (input: {
  slotKey: string;
  memberRouteKey: string | null;
  memberName: string;
  agentDefinitionId: string;
  layers: LaunchLayer[];
  workspaceRootPath: string;
}): ApplicationEffectiveLeafLaunchProfile => {
  const runtime = resolveStringValue(input.layers, "runtimeKind");
  const model = resolveStringValue(input.layers, "llmModelIdentifier");
  const label = input.memberRouteKey
    ? `member '${input.memberRouteKey}'`
    : `agent '${input.agentDefinitionId}'`;
  if (!runtime || !model) {
    throw new ApplicationLaunchPackageBaselineError(
      "PACKAGE_DEFAULT_INCOMPLETE",
      `Application slot '${input.slotKey}' ${label} must define package runtimeKind and llmModelIdentifier defaults.`,
    );
  }
  const llmConfig = resolveAtomicLlmConfig({
    layers: input.layers,
    runtimeKind: runtime.value,
    llmModelIdentifier: model.value,
  });
  return {
    memberRouteKey: input.memberRouteKey,
    memberName: input.memberName,
    agentDefinitionId: input.agentDefinitionId,
    runtimeKind: runtime.value,
    llmModelIdentifier: model.value,
    llmConfig: llmConfig.value,
    workspaceRootPath: input.workspaceRootPath,
    provenance: {
      runtimeKind: runtime.source,
      llmModelIdentifier: model.source,
      llmConfig: llmConfig.source,
      workspaceRootPath: "APPLICATION_RUNTIME",
    },
  };
};

export class ApplicationLaunchPackageBaselineBuilder {
  constructor(private readonly dependencies: {
    executionResourceResolver: ApplicationExecutionResourceResolver;
    agentDefinitionService: AgentDefinitionService;
    agentTeamDefinitionService: AgentTeamDefinitionService;
    resolveWorkspaceRootPath: (applicationId: string) => string;
  }) {}

  async build(input: {
    applicationId: string;
    slot: ApplicationExecutionResourceSlotDeclaration;
    executionResourceRef: ApplicationExecutionResourceRef;
  }): Promise<ApplicationEffectiveLaunchConfiguration> {
    this.assertSelectionAllowed(input.slot, input.executionResourceRef);
    let resource;
    try {
      resource = await this.dependencies.executionResourceResolver.resolveExecutionResource(
        input.applicationId,
        input.executionResourceRef,
      );
    } catch (error) {
      throw new ApplicationLaunchPackageBaselineError(
        "PACKAGE_RESOURCE_UNAVAILABLE",
        error instanceof Error ? error.message : String(error),
      );
    }
    const workspaceRootPath = this.dependencies.resolveWorkspaceRootPath(input.applicationId);
    const leaves = resource.kind === "AGENT"
      ? [await this.buildAgentLeaf({
          slotKey: input.slot.slotKey,
          agentDefinitionId: resource.definitionId,
          memberRouteKey: null,
          memberName: resource.name,
          parentLayers: [],
          refSource: input.executionResourceRef.source,
          workspaceRootPath,
        })]
      : await this.buildTeamLeaves({
          slotKey: input.slot.slotKey,
          teamDefinitionId: resource.definitionId,
          memberPath: [],
          parentLayers: [],
          refSource: input.executionResourceRef.source,
          visited: new Set(),
          workspaceRootPath,
        });
    if (leaves.length === 0) {
      throw new ApplicationLaunchPackageBaselineError(
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
      throw new ApplicationLaunchPackageBaselineError(
        "PACKAGE_RESOURCE_NOT_ALLOWED",
        `Application slot '${slot.slotKey}' does not allow resource kind '${ref.kind}'.`,
      );
    }
    const allowedSources = slot.allowedExecutionResourceSources ?? ["bundle", "shared"];
    if (!allowedSources.includes(ref.source)) {
      throw new ApplicationLaunchPackageBaselineError(
        "PACKAGE_RESOURCE_NOT_ALLOWED",
        `Application slot '${slot.slotKey}' does not allow resource source '${ref.source}'.`,
      );
    }
  }

  private async buildAgentLeaf(input: {
    slotKey: string;
    agentDefinitionId: string;
    memberRouteKey: string | null;
    memberName: string;
    parentLayers: LaunchLayer[];
    refSource: ApplicationExecutionResourceRef["source"];
    workspaceRootPath: string;
  }): Promise<ApplicationEffectiveLeafLaunchProfile> {
    const definition = await this.dependencies.agentDefinitionService
      .getAgentDefinitionById(input.agentDefinitionId);
    if (!definition) {
      throw new ApplicationLaunchPackageBaselineError(
        "PACKAGE_TEAM_TOPOLOGY_INVALID",
        `Agent definition '${input.agentDefinitionId}' was not found.`,
      );
    }
    return requireCompleteLeaf({
      ...input,
      memberName: input.memberName || definition.name,
      layers: [
        ...input.parentLayers,
        {
          config: definition.defaultLaunchConfig,
          source: definitionValueSource({
            refSource: input.refSource,
            definitionKind: "AGENT",
            definitionId: input.agentDefinitionId,
          }),
        },
      ],
    });
  }

  private async buildTeamLeaves(input: {
    slotKey: string;
    teamDefinitionId: string;
    memberPath: string[];
    parentLayers: LaunchLayer[];
    refSource: ApplicationExecutionResourceRef["source"];
    visited: Set<string>;
    workspaceRootPath: string;
  }): Promise<ApplicationEffectiveLeafLaunchProfile[]> {
    if (input.visited.has(input.teamDefinitionId)) {
      throw new ApplicationLaunchPackageBaselineError(
        "PACKAGE_TEAM_TOPOLOGY_INVALID",
        `Circular team topology includes '${input.teamDefinitionId}'.`,
      );
    }
    const visited = new Set(input.visited).add(input.teamDefinitionId);
    const team = await this.dependencies.agentTeamDefinitionService
      .getDefinitionById(input.teamDefinitionId);
    if (!team) {
      throw new ApplicationLaunchPackageBaselineError(
        "PACKAGE_TEAM_TOPOLOGY_INVALID",
        `Team definition '${input.teamDefinitionId}' was not found.`,
      );
    }
    const teamLayers: LaunchLayer[] = [
      {
        config: team.defaultLaunchConfig,
        source: definitionValueSource({
          refSource: input.refSource,
          definitionKind: "AGENT_TEAM",
          definitionId: input.teamDefinitionId,
        }),
      },
      ...input.parentLayers,
    ];
    const resolutionContext = buildScopedMemberResolutionContext(team, input.teamDefinitionId);
    const leaves: ApplicationEffectiveLeafLaunchProfile[] = [];
    for (const member of team.nodes) {
      const memberPath = [...input.memberPath, member.memberName.trim()];
      if (member.refType === "agent") {
        leaves.push(await this.buildAgentLeaf({
          slotKey: input.slotKey,
          agentDefinitionId: resolveScopedAgentMemberRef(resolutionContext, member),
          memberRouteKey: normalizeMemberRouteKey(memberPath.join("/")),
          memberName: member.memberName.trim(),
          parentLayers: teamLayers,
          refSource: input.refSource,
          workspaceRootPath: input.workspaceRootPath,
        }));
      } else {
        leaves.push(...await this.buildTeamLeaves({
          slotKey: input.slotKey,
          teamDefinitionId: resolveScopedTeamMemberRef(resolutionContext, member),
          memberPath,
          parentLayers: teamLayers,
          refSource: input.refSource,
          visited,
          workspaceRootPath: input.workspaceRootPath,
        }));
      }
    }
    return leaves;
  }
}
