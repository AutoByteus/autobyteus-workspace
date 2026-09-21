import type { AgentTeamDefinition, TeamMember } from "../domain/agent-team-definition.js";
import {
  buildScopedMemberResolutionContext,
  resolveScopedAgentMemberRef,
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

export type ResolvedFlatTeamDefinition = Readonly<{
  definition: AgentTeamDefinition;
  definitionId: string;
  mountPath: readonly string[];
  coordinator: ResolvedTeamDefinitionAgent;
  members: readonly ResolvedTeamDefinitionAgent[];
}>;

export type FlatTeamDefinitionLookup = {
  getAgentById?: (id: string) => Promise<unknown | null> | unknown | null;
};

export class FlatTeamDefinitionResolver {
  async resolve(input: {
    rootDefinition: AgentTeamDefinition;
    lookup: FlatTeamDefinitionLookup;
    rootDefinitionId?: string | null;
    mountPath?: readonly string[];
  }): Promise<ResolvedFlatTeamDefinition> {
    const definition = input.rootDefinition;
    const definitionId = definition.id?.trim() || input.rootDefinitionId?.trim() || "";
    if (!definitionId) throw new Error(`Team definition '${definition.name}' is missing id.`);
    this.assertBoundaryNames(definition, definition.nodes);
    const mountPath = Object.freeze([...(input.mountPath ?? [])]);
    const resolutionContext = buildScopedMemberResolutionContext(definition, definitionId);
    const members: ResolvedTeamDefinitionAgent[] = [];
    for (const node of definition.nodes) {
      const memberName = assertValidAgentTeamMemberName(node.memberName);
      const agentDefinitionId = resolveScopedAgentMemberRef(resolutionContext, node);
      if (input.lookup.getAgentById && !(await input.lookup.getAgentById(agentDefinitionId))) {
        throw new CollaborationContractError(
          "COLLABORATION_TARGET_NOT_FOUND",
          `Team '${definition.name}' member '${memberName}' references missing agent '${node.ref}'.`,
        );
      }
      members.push(Object.freeze({
        kind: "agent",
        memberName,
        agentDefinitionId,
        absolutePath: Object.freeze([...mountPath, memberName]),
      }));
    }
    const coordinatorMatches = members.filter(
      (member) => member.memberName === definition.coordinatorMemberName,
    );
    if (coordinatorMatches.length !== 1) {
      throw new CollaborationContractError(
        "COLLABORATION_TEAM_INGRESS_INVALID",
        `Team '${createAgentTeamAddress(mountPath)}' must have exactly one direct Agent coordinator '${definition.coordinatorMemberName}'.`,
      );
    }
    return Object.freeze({
      definition,
      definitionId,
      mountPath,
      coordinator: coordinatorMatches[0]!,
      members: Object.freeze(members),
    });
  }

  private assertBoundaryNames(definition: AgentTeamDefinition, nodes: readonly TeamMember[]): void {
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
