import { createAgentTeamAddress } from "../domain/agent-team-address.js";
import type { ResolvedFlatTeamDefinition } from "../../agent-team-definition/services/flat-team-definition-resolver.js";
import type { ResolvedAgentOrgDefinition } from "./resolved-collaboration-topology.js";

export type DefinitionEndpointCatalogItem = Readonly<{
  kind: "agent" | "agent_team";
  address: string;
  memberName: string;
  definitionId: string;
  coordinatorAddress: string | null;
  coordinatorMemberName: string | null;
}>;

export type DefinitionEndpointCatalogProjection = Readonly<{
  from: readonly DefinitionEndpointCatalogItem[];
  to: readonly DefinitionEndpointCatalogItem[];
}>;

const agentItem = (input: {
  memberName: string;
  definitionId: string;
  absolutePath: readonly string[];
}): DefinitionEndpointCatalogItem => Object.freeze({
  kind: "agent",
  address: createAgentTeamAddress(input.absolutePath),
  memberName: input.memberName,
  definitionId: input.definitionId,
  coordinatorAddress: null,
  coordinatorMemberName: null,
});

export class DefinitionEndpointCatalog {
  projectTeam(team: ResolvedFlatTeamDefinition): DefinitionEndpointCatalogProjection {
    const agents = team.members.map((member) => agentItem({
      memberName: member.memberName,
      definitionId: member.agentDefinitionId,
      absolutePath: member.absolutePath,
    }));
    return Object.freeze({ from: Object.freeze(agents), to: Object.freeze([...agents]) });
  }

  projectOrg(org: ResolvedAgentOrgDefinition): DefinitionEndpointCatalogProjection {
    const agents: DefinitionEndpointCatalogItem[] = [];
    const teams: DefinitionEndpointCatalogItem[] = [];
    for (const member of org.members) {
      if (member.kind === "agent") {
        agents.push(agentItem({
          memberName: member.memberName,
          definitionId: member.agentDefinitionId,
          absolutePath: member.absolutePath,
        }));
        continue;
      }
      teams.push(Object.freeze({
        kind: "agent_team",
        address: createAgentTeamAddress(member.absolutePath),
        memberName: member.memberName,
        definitionId: member.teamDefinitionId,
        coordinatorAddress: createAgentTeamAddress(member.team.coordinator.absolutePath),
        coordinatorMemberName: member.team.coordinator.memberName,
      }));
      for (const agent of member.team.members) {
        agents.push(agentItem({
          memberName: agent.memberName,
          definitionId: agent.agentDefinitionId,
          absolutePath: agent.absolutePath,
        }));
      }
    }
    return Object.freeze({
      from: Object.freeze(agents),
      to: Object.freeze([...agents, ...teams]),
    });
  }
}
