import type { AgentOrgDefinition } from "../../agent-org-definition/domain/agent-org-definition.js";
import type { AgentTeamDefinition, TeamMember } from "../../agent-team-definition/domain/agent-team-definition.js";
import {
  buildScopedMemberResolutionContext,
  resolveScopedAgentMemberRef,
} from "../../agent-team-definition/utils/scoped-team-member-resolution.js";
import { isTeamLocalAgentDefinitionId } from "../../agent-team-definition/utils/team-local-definition-id.js";
import type { MemoryGroupMember } from "../domain/models.js";
import type { StoredGroupMember } from "./collaboration-root-memory-catalog.js";

/** The node's definitions as the Memory page's team and org pages read them (autobyteus-554). */
export type GroupDefinitions = Readonly<{
  teamById(id: string): Promise<AgentTeamDefinition | null>;
  orgById(id: string): Promise<AgentOrgDefinition | null>;
  allTeams(): Promise<AgentTeamDefinition[]>;
  allOrgs(): Promise<AgentOrgDefinition[]>;
  /** Every agent definition's name by ID, team-local ones included. */
  agentNames(): Promise<ReadonlyMap<string, string>>;
}>;

/** The process definition services, imported on first use (the explorer is built per request). */
export const PROCESS_GROUP_DEFINITIONS: GroupDefinitions = {
  teamById: async (id) => (await teamService()).getDefinitionById(id),
  orgById: async (id) => (await orgService()).getDefinitionById(id),
  allTeams: async () => (await teamService()).getAllDefinitions(),
  allOrgs: async () => (await orgService()).getAllDefinitions(),
  agentNames: async () => {
    const { AgentDefinitionService } = await import("../../agent-definition/services/agent-definition-service.js");
    const definitions = await AgentDefinitionService.getInstance().getAgentDefinitionsWithTeamLocal();
    return new Map(definitions.flatMap((definition) => (definition.id ? [[definition.id, definition.name]] : [])));
  },
};

const teamService = async () =>
  (await import("../../agent-team-definition/services/agent-team-definition-service.js")).AgentTeamDefinitionService.getInstance();
const orgService = async () =>
  (await import("../../agent-org-definition/services/agent-org-definition-service.js")).AgentOrgDefinitionService.getInstance();

/** A team's members from its definition: agents, shared or local to the team (team-local IDs as runs record them). */
export const teamMembersFromDefinition = (
  team: AgentTeamDefinition,
  teamDefinitionId: string,
  agentNames: ReadonlyMap<string, string>,
): MemoryGroupMember[] => team.nodes.map((node) => {
  const id = teamMemberAgentId(team, teamDefinitionId, node);
  return { kind: "AGENT", id, name: agentNames.get(id) ?? node.memberName, shared: node.refScope === "shared", memberCount: null };
});

/** An org's members from its definition: agents and teams, each by the definition ID its member names. */
export const orgMembersFromDefinition = async (
  org: AgentOrgDefinition,
  agentNames: ReadonlyMap<string, string>,
  teamById: GroupDefinitions["teamById"],
): Promise<MemoryGroupMember[]> => {
  const members: MemoryGroupMember[] = [];
  for (const member of org.members) {
    const shared = member.refScope === "shared";
    if (member.refType === "agent") {
      members.push({ kind: "AGENT", id: member.ref, name: agentNames.get(member.ref) ?? member.memberName, shared, memberCount: null });
      continue;
    }
    const team = await teamById(member.ref);
    members.push({ kind: "TEAM", id: member.ref, name: team?.name ?? member.memberName, shared, memberCount: team?.nodes.length ?? null });
  }
  return members;
};

/** Members as a stored run's tree records them, named by their definitions when this node has them. */
export const membersFromStoredRun = (
  stored: readonly StoredGroupMember[],
  agentNames: ReadonlyMap<string, string>,
  teamNames: ReadonlyMap<string, string>,
): MemoryGroupMember[] => stored.map((member) => member.kind === "TEAM"
  ? { kind: "TEAM", id: member.id, name: teamNames.get(member.id) ?? member.name, shared: true, memberCount: member.memberCount }
  : { kind: "AGENT", id: member.id, name: agentNames.get(member.id) ?? member.name, shared: !isTeamLocalAgentDefinitionId(member.id), memberCount: null });

const teamMemberAgentId = (team: AgentTeamDefinition, teamDefinitionId: string, node: TeamMember): string => {
  try {
    return resolveScopedAgentMemberRef(buildScopedMemberResolutionContext(team, teamDefinitionId), node);
  } catch {
    return node.ref;
  }
};
