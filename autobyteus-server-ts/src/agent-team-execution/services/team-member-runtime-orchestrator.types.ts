import type { RuntimeKind } from "../../runtime-management/runtime-kind.js";
import type { TeamMemberRuntimeReference } from "../../run-history/domain/team-models.js";

export interface TeamRuntimeMemberConfig {
  memberName: string;
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind: RuntimeKind;
  runtimeReference?: TeamMemberRuntimeReference | null;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
}

export interface TeamMemberAcceptedTurn {
  memberName: string;
  memberRunId: string;
  runtimeKind: RuntimeKind;
  turnId: string | null;
}

export interface RelayInterAgentMessageInput {
  teamRunId: string;
  senderMemberRunId: string;
  senderTurnId?: string | null;
  recipientName: string;
  content: string;
  messageType?: string | null;
  senderAgentName?: string | null;
}
