import type { TeamMemberRuntimeReference } from "../../../run-history/domain/team-models.js";
import type { RuntimeKind } from "../../../runtime-management/runtime-kind.js";

export interface TeamMemberConfigPayload {
  memberName: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  memberRouteKey?: string | null;
  memberRunId?: string | null;
  runtimeKind?: string | null;
}

export interface CreateAgentTeamRunPayload {
  teamDefinitionId: string;
  memberConfigs: TeamMemberConfigPayload[];
}

export interface SendMessageToTeamPayload {
  userInput: unknown;
  teamRunId?: string | null;
  targetNodeName?: string | null;
  targetMemberName?: string | null;
  teamDefinitionId?: string | null;
  memberConfigs?: TeamMemberConfigPayload[] | null;
}

export interface CreateAgentTeamRunResultPayload {
  success: boolean;
  message: string;
  teamRunId?: string | null;
}

export interface TerminateAgentTeamRunResultPayload {
  success: boolean;
  message: string;
}

export interface SendMessageToTeamResultPayload {
  success: boolean;
  message: string;
  teamRunId?: string | null;
}

export type TeamRuntimeMemberConfig = {
  memberName: string;
  runtimeKind: RuntimeKind;
  runtimeReference?: TeamMemberRuntimeReference | null;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  memoryDir?: string | null;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  memberRouteKey: string;
  memberRunId: string;
};
