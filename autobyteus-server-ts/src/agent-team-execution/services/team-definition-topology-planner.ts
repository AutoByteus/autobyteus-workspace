import { buildTeamLocalAgentDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-agent-definition-id.js";
import type { AgentTeamDefinition, TeamMember } from "../../agent-team-definition/domain/models.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { TeamBackendKind, resolveSingleRuntimeTeamBackendKind } from "../domain/team-backend-kind.js";
import {
  TeamRunConfig,
  type TeamMemberRunConfigInput,
  type TeamRunMemberConfig,
  type TeamRunMemberConfigInput,
  hasSubTeamMemberConfigs,
} from "../domain/team-run-config.js";
import {
  buildMemberPath,
  buildMemberRouteKeyFromPath,
} from "../domain/team-run-member-identity.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export type TeamDefinitionTopologyPlan = {
  teamDefinitionId: string;
  coordinatorMemberName: string | null;
  coordinatorMemberRouteKey: string | null;
  teamBackendKind: TeamBackendKind;
  hasSubTeams: boolean;
  memberTree: TeamRunMemberConfig[];
  leafMemberConfigs: import("../domain/team-run-config.js").TeamMemberRunConfig[];
  config: TeamRunConfig;
};

type TeamDefinitionLookup = Pick<AgentTeamDefinitionService, "getDefinitionById">;

type AgentSkeleton = {
  kind: "agent";
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  agentDefinitionId: string;
};

type SubTeamSkeleton = {
  kind: "agent_team";
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  teamDefinitionId: string;
  coordinatorMemberRouteKey: string | null;
  memberTree: MemberSkeleton[];
};

type MemberSkeleton = AgentSkeleton | SubTeamSkeleton;

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const isAgentConfigInput = (
  input: TeamRunMemberConfigInput,
): input is TeamMemberRunConfigInput => input.memberKind !== "agent_team";

export class TeamDefinitionTopologyPlanner {
  constructor(private readonly teamDefinitionService: TeamDefinitionLookup) {}

  async buildPlan(input: {
    teamDefinitionId: string;
    memberConfigs: TeamRunMemberConfigInput[];
  }): Promise<TeamDefinitionTopologyPlan> {
    const teamDefinitionId = normalizeRequiredString(input.teamDefinitionId, "teamDefinitionId");
    const skeleton = await this.buildSkeleton(teamDefinitionId, [], new Set());
    const leaves = this.collectLeaves(skeleton.memberTree);
    const configByRouteKey = new Map<string, TeamMemberRunConfigInput>();
    const configsByName = new Map<string, TeamMemberRunConfigInput[]>();

    for (const rawConfig of input.memberConfigs) {
      if (!isAgentConfigInput(rawConfig)) {
        continue;
      }
      if (rawConfig.memberRouteKey?.trim()) {
        configByRouteKey.set(rawConfig.memberRouteKey.trim(), rawConfig);
      }
      const byName = configsByName.get(rawConfig.memberName) ?? [];
      byName.push(rawConfig);
      configsByName.set(rawConfig.memberName, byName);
    }

    const duplicateLeafNames = new Set<string>();
    const leafNameCounts = new Map<string, number>();
    for (const leaf of leaves) {
      leafNameCounts.set(leaf.memberName, (leafNameCounts.get(leaf.memberName) ?? 0) + 1);
    }
    for (const [memberName, count] of leafNameCounts.entries()) {
      if (count > 1) {
        duplicateLeafNames.add(memberName);
      }
    }

    const memberTree = this.hydrateSkeleton(skeleton.memberTree, {
      configByRouteKey,
      configsByName,
      duplicateLeafNames,
    });
    const hasSubTeams = hasSubTeamMemberConfigs(memberTree);
    const runtimeKinds = new Set(leaves.map((leaf) => this.resolveLeafRuntimeKind(leaf, memberTree)));
    const teamBackendKind = hasSubTeams
      ? TeamBackendKind.MIXED
      : runtimeKinds.size <= 1
        ? resolveSingleRuntimeTeamBackendKind(runtimeKinds.values().next().value ?? RuntimeKind.AUTOBYTEUS)
        : TeamBackendKind.MIXED;

    const config = new TeamRunConfig({
      teamDefinitionId,
      teamBackendKind,
      coordinatorMemberName: skeleton.coordinatorMemberName,
      coordinatorMemberRouteKey: skeleton.coordinatorMemberRouteKey,
      memberTree,
    });

    return {
      teamDefinitionId,
      coordinatorMemberName: skeleton.coordinatorMemberName,
      coordinatorMemberRouteKey: skeleton.coordinatorMemberRouteKey,
      teamBackendKind,
      hasSubTeams,
      memberTree: config.memberTree,
      leafMemberConfigs: config.memberConfigs,
      config,
    };
  }

  async buildPresetLeafMemberConfigs(input: {
    teamDefinitionId: string;
    launchPreset: Omit<TeamMemberRunConfigInput, "memberName" | "agentDefinitionId">;
  }): Promise<TeamMemberRunConfigInput[]> {
    const skeleton = await this.buildSkeleton(
      normalizeRequiredString(input.teamDefinitionId, "teamDefinitionId"),
      [],
      new Set(),
    );
    return this.collectLeaves(skeleton.memberTree).map((leaf) => ({
      ...input.launchPreset,
      memberName: leaf.memberName,
      memberPath: leaf.memberPath,
      memberRouteKey: leaf.memberRouteKey,
      agentDefinitionId: leaf.agentDefinitionId,
      memberKind: "agent" as const,
    }));
  }

  private async buildSkeleton(
    teamDefinitionId: string,
    parentPath: string[],
    visited: Set<string>,
  ): Promise<{
    definition: AgentTeamDefinition;
    coordinatorMemberName: string | null;
    coordinatorMemberRouteKey: string | null;
    memberTree: MemberSkeleton[];
  }> {
    const normalizedTeamDefinitionId = normalizeRequiredString(teamDefinitionId, "teamDefinitionId");
    if (visited.has(normalizedTeamDefinitionId)) {
      throw new Error(
        `Circular dependency detected in team definitions involving ID: ${normalizedTeamDefinitionId}`,
      );
    }
    visited.add(normalizedTeamDefinitionId);

    const definition = await this.teamDefinitionService.getDefinitionById(normalizedTeamDefinitionId);
    if (!definition) {
      throw new Error(`AgentTeamDefinition with ID ${normalizedTeamDefinitionId} not found.`);
    }

    const teamNodes = Array.isArray(definition.nodes) ? definition.nodes : [];
    this.assertUniqueBoundaryMemberNames(definition, teamNodes);
    const memberTree: MemberSkeleton[] = [];
    for (const node of teamNodes) {
      const memberName = normalizeRequiredString(node.memberName, "memberName");
      const memberPath = buildMemberPath(parentPath, memberName);
      const memberRouteKey = buildMemberRouteKeyFromPath(memberPath);
      if (node.refType === "agent") {
        memberTree.push({
          kind: "agent",
          memberName,
          memberPath,
          memberRouteKey,
          agentDefinitionId: node.refScope === "team_local"
            ? buildTeamLocalAgentDefinitionId(normalizedTeamDefinitionId, node.ref)
            : normalizeRequiredString(node.ref, "agentDefinitionId"),
        });
        continue;
      }

      const child = await this.buildSkeleton(node.ref, memberPath, new Set(visited));
      memberTree.push({
        kind: "agent_team",
        memberName,
        memberPath,
        memberRouteKey,
        teamDefinitionId: normalizeRequiredString(node.ref, "teamDefinitionId"),
        coordinatorMemberRouteKey: child.coordinatorMemberRouteKey,
        memberTree: child.memberTree,
      });
    }

    const coordinatorMemberName = definition.coordinatorMemberName?.trim() || null;
    const coordinatorNode = coordinatorMemberName
      ? teamNodes.find((node) => node.memberName.trim() === coordinatorMemberName) ?? null
      : null;
    if (coordinatorMemberName && !coordinatorNode) {
      throw new Error(
        `Coordinator member name '${coordinatorMemberName}' not found in team '${definition.name}'.`,
      );
    }
    if (coordinatorNode?.refType === "agent_team") {
      throw new Error(
        `The designated coordinator '${coordinatorMemberName}' must be an agent member, not an agent_team member.`,
      );
    }
    const coordinatorMemberRouteKey = coordinatorMemberName
      ? buildMemberRouteKeyFromPath(buildMemberPath(parentPath, coordinatorMemberName))
      : memberTree[0]?.memberRouteKey ?? null;

    return { definition, coordinatorMemberName, coordinatorMemberRouteKey, memberTree };
  }

  private assertUniqueBoundaryMemberNames(
    definition: AgentTeamDefinition,
    nodes: TeamMember[],
  ): void {
    const seen = new Set<string>();
    for (const node of nodes) {
      const memberName = normalizeRequiredString(node.memberName, "memberName");
      if (seen.has(memberName)) {
        throw new Error(`Duplicate member name '${memberName}' in team '${definition.name}'.`);
      }
      seen.add(memberName);
    }
  }

  private collectLeaves(memberTree: readonly MemberSkeleton[]): AgentSkeleton[] {
    const leaves: AgentSkeleton[] = [];
    for (const member of memberTree) {
      if (member.kind === "agent") {
        leaves.push(member);
      } else {
        leaves.push(...this.collectLeaves(member.memberTree));
      }
    }
    return leaves;
  }

  private hydrateSkeleton(
    memberTree: readonly MemberSkeleton[],
    lookup: {
      configByRouteKey: Map<string, TeamMemberRunConfigInput>;
      configsByName: Map<string, TeamMemberRunConfigInput[]>;
      duplicateLeafNames: Set<string>;
    },
  ): TeamRunMemberConfig[] {
    return memberTree.map((member) => {
      if (member.kind === "agent_team") {
        return {
          memberKind: "agent_team" as const,
          memberName: member.memberName,
          memberPath: member.memberPath,
          memberRouteKey: member.memberRouteKey,
          teamDefinitionId: member.teamDefinitionId,
          coordinatorMemberRouteKey: member.coordinatorMemberRouteKey,
          memberConfigs: this.hydrateSkeleton(member.memberTree, lookup),
        } satisfies TeamRunMemberConfig;
      }

      const launchConfig = this.resolveLaunchConfig(member, lookup);
      return {
        ...launchConfig,
        memberKind: "agent" as const,
        memberName: member.memberName,
        memberPath: member.memberPath,
        memberRouteKey: member.memberRouteKey,
        agentDefinitionId: member.agentDefinitionId,
      } satisfies TeamRunMemberConfig;
    });
  }

  private resolveLaunchConfig(
    leaf: AgentSkeleton,
    lookup: {
      configByRouteKey: Map<string, TeamMemberRunConfigInput>;
      configsByName: Map<string, TeamMemberRunConfigInput[]>;
      duplicateLeafNames: Set<string>;
    },
  ): TeamMemberRunConfigInput {
    const routeKeyMatch = lookup.configByRouteKey.get(leaf.memberRouteKey) ?? null;
    if (routeKeyMatch) {
      return routeKeyMatch;
    }
    const byName = lookup.configsByName.get(leaf.memberName) ?? [];
    if (byName.length === 1 && !lookup.duplicateLeafNames.has(leaf.memberName)) {
      return byName[0]!;
    }
    if (byName.length > 1 || lookup.duplicateLeafNames.has(leaf.memberName)) {
      throw new Error(
        `Launch config for nested member '${leaf.memberName}' is ambiguous; use memberRouteKey '${leaf.memberRouteKey}'.`,
      );
    }
    throw new Error(`Launch config for team member '${leaf.memberRouteKey}' was not provided.`);
  }

  private resolveLeafRuntimeKind(
    leaf: AgentSkeleton,
    memberTree: readonly TeamRunMemberConfig[],
  ): RuntimeKind {
    const stack = [...memberTree];
    while (stack.length > 0) {
      const member = stack.shift()!;
      if (member.memberKind === "agent" && member.memberRouteKey === leaf.memberRouteKey) {
        return member.runtimeKind ?? RuntimeKind.AUTOBYTEUS;
      }
      if (member.memberKind === "agent_team") {
        stack.push(...member.memberConfigs);
      }
    }
    return RuntimeKind.AUTOBYTEUS;
  }
}
