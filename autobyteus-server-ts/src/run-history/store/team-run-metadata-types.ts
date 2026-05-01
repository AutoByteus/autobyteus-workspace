import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export interface TeamRunMemberMetadata {
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
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

export interface TeamRunMetadata {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  coordinatorMemberRouteKey: string;
  runVersion: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  memberMetadata: TeamRunMemberMetadata[];
}
