import type { AgentOrgDefinition } from "../../agent-org-definition/domain/agent-org-definition.js";
import type {
  ResolvedTeamDefinitionAgent,
  ResolvedFlatTeamDefinition,
} from "../../agent-team-definition/services/flat-team-definition-resolver.js";

export type ResolvedAgentOrgDefinitionAgent = Readonly<{
  kind: "agent";
  memberName: string;
  agentDefinitionId: string;
  absolutePath: readonly string[];
}>;

export type ResolvedAgentOrgDefinitionTeam = Readonly<{
  kind: "agent_team";
  memberName: string;
  teamDefinitionId: string;
  absolutePath: readonly string[];
  team: ResolvedFlatTeamDefinition;
}>;

export type ResolvedAgentOrgDefinitionMember =
  | ResolvedAgentOrgDefinitionAgent
  | ResolvedAgentOrgDefinitionTeam;

export type ResolvedAgentOrgDefinition = Readonly<{
  definition: AgentOrgDefinition;
  definitionId: string;
  members: readonly ResolvedAgentOrgDefinitionMember[];
}>;

export type ResolvedCollaborationAgent =
  | ResolvedTeamDefinitionAgent
  | ResolvedAgentOrgDefinitionAgent;
