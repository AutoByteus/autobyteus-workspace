import type { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";

export interface TeamMemberConfigPayload {
  memberName: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  memberRouteKey?: string | null;
  runtimeKind?: string | null;
}

export interface CreateAgentTeamRunPayload {
  teamDefinitionId: string;
  memberConfigs: TeamMemberConfigPayload[];
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
