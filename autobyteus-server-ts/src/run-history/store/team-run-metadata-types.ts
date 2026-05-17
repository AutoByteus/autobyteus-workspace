import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export type TeamRunMemberMetadataKind = "agent" | "agent_team";

export interface TeamRunMemberMetadataBase {
  memberKind: TeamRunMemberMetadataKind;
  memberRouteKey: string;
  memberPath: string[];
  memberName: string;
  memberRunId: string;
  role?: string | null;
  description?: string | null;
}

export interface TeamRunAgentMemberMetadata extends TeamRunMemberMetadataBase {
  memberKind: "agent";
  runtimeKind: RuntimeKind;
  platformAgentRunId: string | null;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string | null;
  applicationExecutionContext?: ApplicationExecutionContext | null;
}

export interface TeamRunSubTeamMemberMetadata extends TeamRunMemberMetadataBase {
  memberKind: "agent_team";
  teamDefinitionId: string;
  teamRunId: string | null;
  coordinatorMemberRouteKey: string | null;
  memberTree: TeamRunMemberMetadata[];
}

export type TeamRunMemberMetadata =
  | TeamRunAgentMemberMetadata
  | TeamRunSubTeamMemberMetadata;

export interface TeamRunMetadata {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  coordinatorMemberRouteKey: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  memberTree: TeamRunMemberMetadata[];
}
