import type { AgentTeamDefinition, TeamMember } from "../domain/models.js";
import {
  buildScopedMemberResolutionContext,
  resolveScopedAgentMemberRef,
  resolveScopedTeamMemberRef,
} from "../utils/scoped-team-member-resolution.js";
import {
  assertValidAgentTeamMemberName,
  createAgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";

export type ResolvedTeamDefinitionAgent = Readonly<{
  kind: "agent";
  memberName: string;
  agentDefinitionId: string;
  absolutePath: readonly string[];
}>;

export type ResolvedTeamDefinitionSubTeam = Readonly<{
  kind: "agent_team";
  memberName: string;
  absolutePath: readonly string[];
  team: ResolvedTeamDefinitionGraph;
}>;

export type ResolvedTeamDefinitionMember =
  | ResolvedTeamDefinitionAgent
  | ResolvedTeamDefinitionSubTeam;

export type ResolvedTeamDefinitionGraph = Readonly<{
  definition: AgentTeamDefinition;
  definitionId: string;
  mountPath: readonly string[];
  coordinator: ResolvedTeamDefinitionAgent;
  members: readonly ResolvedTeamDefinitionMember[];
}>;

export type TeamDefinitionGraphLookup = {
  getTeamById: (id: string) => Promise<AgentTeamDefinition | null> | AgentTeamDefinition | null;
  getAgentById?: (id: string) => Promise<unknown | null> | unknown | null;
};

export class TeamDefinitionGraphResolver {
  async resolve(input: {
    rootDefinition: AgentTeamDefinition;
    lookup: TeamDefinitionGraphLookup;
    rootDefinitionId?: string | null;
  }): Promise<ResolvedTeamDefinitionGraph> {
    return this.resolveDefinition(
      input.rootDefinition,
      input.lookup,
      [],
      [],
      input.rootDefinitionId ?? null,
    );
  }

  private async resolveDefinition(
    definition: AgentTeamDefinition,
    lookup: TeamDefinitionGraphLookup,
    mountPath: readonly string[],
    ancestorDefinitionIds: readonly string[],
    expectedDefinitionId: string | null,
  ): Promise<ResolvedTeamDefinitionGraph> {
    const definitionId = definition.id?.trim() || expectedDefinitionId?.trim() || "";
    if (!definitionId) {
      throw new Error(`Team definition '${definition.name}' is missing id.`);
    }
    if (ancestorDefinitionIds.includes(definitionId)) {
      throw new Error(
        `Team definition '${definitionId}' cannot reference itself or form a circular dependency.`,
      );
    }
    const nodes = Array.isArray(definition.nodes) ? definition.nodes : [];
    this.assertBoundaryNames(definition, nodes);
    const resolutionContext = buildScopedMemberResolutionContext(definition, definitionId);
    const containingApplicationId = resolutionContext.containingTeamOwnershipScope === "application_owned"
      || resolutionContext.containingTeamOwnershipScope === "team_local"
      ? resolutionContext.ownerApplicationId ?? null
      : null;
    const members: ResolvedTeamDefinitionMember[] = [];

    for (const node of nodes) {
      const memberName = assertValidAgentTeamMemberName(node.memberName);
      const absolutePath = Object.freeze([...mountPath, memberName]);
      if (node.refType === "agent") {
        const agentDefinitionId = resolveScopedAgentMemberRef(resolutionContext, node);
        if (lookup.getAgentById && !(await lookup.getAgentById(agentDefinitionId))) {
          throw new CollaborationContractError(
            "COLLABORATION_TARGET_NOT_FOUND",
            `Team '${definition.name}' member '${memberName}' references missing agent '${node.ref}'.`,
          );
        }
        members.push(Object.freeze({
          kind: "agent",
          memberName,
          agentDefinitionId,
          absolutePath,
        }));
        continue;
      }

      const childDefinitionId = resolveScopedTeamMemberRef(resolutionContext, node);
      const child = await lookup.getTeamById(childDefinitionId);
      if (!child) {
        throw new CollaborationContractError(
          "COLLABORATION_TARGET_NOT_FOUND",
          `Team '${definition.name}' member '${memberName}' references missing team '${node.ref}'.`,
        );
      }
      if (
        node.refScope === "application_owned" &&
        ((child.ownershipScope ?? "shared") !== "application_owned" ||
          !containingApplicationId ||
          child.ownerApplicationId !== containingApplicationId)
      ) {
        throw new Error(
          `Team '${definition.name}' member '${memberName}' must reference a team inside the same application bundle.`,
        );
      }
      members.push(Object.freeze({
        kind: "agent_team",
        memberName,
        absolutePath,
        team: await this.resolveDefinition(
          child,
          lookup,
          absolutePath,
          [...ancestorDefinitionIds, definitionId],
          childDefinitionId,
        ),
      }));
    }

    const coordinatorName = definition.coordinatorMemberName;
    const coordinatorMatches = members.filter(
      (member): member is ResolvedTeamDefinitionAgent =>
        member.kind === "agent" && member.memberName === coordinatorName,
    );
    if (coordinatorMatches.length !== 1) {
      throw new CollaborationContractError(
        "COLLABORATION_TEAM_INGRESS_INVALID",
        `Team '${createAgentTeamAddress(mountPath)}' must have exactly one direct Agent coordinator '${coordinatorName}'.`,
      );
    }

    return Object.freeze({
      definition,
      definitionId,
      mountPath: Object.freeze([...mountPath]),
      coordinator: coordinatorMatches[0]!,
      members: Object.freeze(members),
    });
  }

  private assertBoundaryNames(
    definition: AgentTeamDefinition,
    nodes: readonly TeamMember[],
  ): void {
    const seen = new Map<string, string>();
    for (const node of nodes) {
      const memberName = assertValidAgentTeamMemberName(node.memberName);
      const folded = memberName.toLocaleLowerCase("en-US");
      const existing = seen.get(folded);
      if (existing) {
        throw new CollaborationContractError(
          "COLLABORATION_MEMBER_NAME_INVALID",
          `Team '${definition.name}' has case-insensitive sibling collision '${existing}' and '${memberName}'.`,
        );
      }
      seen.set(folded, memberName);
    }
  }
}
