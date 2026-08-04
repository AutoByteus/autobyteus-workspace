import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type {
  TeamRunAgentNode,
  TeamRunAgentTeamNode,
  TeamRunNode,
} from "../../agent-team-execution/domain/team-run-config.js";

export type TeamRunMetadataV3 = Readonly<{
  schemaVersion: 3;
  teamDefinitionName: string;
  createdAt: string;
  archivedAt: string | null;
  rootTeam: TeamRunAgentTeamNode;
  handoffs: readonly CollaborationHandoff[];
}>;

export type TeamRunMetadata = TeamRunMetadataV3;
export type TeamRunMemberMetadata = TeamRunNode;
export type TeamRunAgentMemberMetadata = TeamRunAgentNode;
export type TeamRunSubTeamMemberMetadata = TeamRunAgentTeamNode;
