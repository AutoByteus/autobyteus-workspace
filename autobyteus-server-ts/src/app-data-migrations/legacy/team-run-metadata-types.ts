import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type {
  TeamRunAgentNode,
  TeamRunAgentTeamNode,
} from "../../agent-team-execution/domain/team-run-config.js";

/** Historical schema-v3 Agent facts, isolated from the current TeamRun runtime model. */
export type TeamRunAgentMemberMetadata = Readonly<TeamRunAgentNode & {
  applicationExecutionContext: Readonly<Record<string, unknown>> | null;
}>;

export type TeamRunSubTeamMemberMetadata = Readonly<
  Omit<TeamRunAgentTeamNode, "children"> & {
    children: readonly TeamRunMemberMetadata[];
  }
>;

export type TeamRunMemberMetadata =
  | TeamRunAgentMemberMetadata
  | TeamRunSubTeamMemberMetadata;

export type TeamRunMetadataV3 = Readonly<{
  schemaVersion: 3;
  teamDefinitionName: string;
  createdAt: string;
  archivedAt: string | null;
  rootTeam: TeamRunSubTeamMemberMetadata;
  handoffs: readonly CollaborationHandoff[];
}>;

export type TeamRunMetadata = TeamRunMetadataV3;
