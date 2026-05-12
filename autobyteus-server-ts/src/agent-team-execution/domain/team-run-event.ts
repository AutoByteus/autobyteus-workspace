import type { AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { buildMemberRouteKeyFromPath } from "./team-run-member-identity.js";

export enum TeamRunEventSourceType {
  AGENT = "AGENT",
  TEAM = "TEAM",
  TASK_PLAN = "TASK_PLAN",
  COMMUNICATION = "COMMUNICATION",
}

export type TeamRunStatusUpdateData = {
  new_status: string;
  old_status?: string | null;
  error_message?: string | null;
};

export type TeamRunAgentEventPayload = {
  runtimeKind: RuntimeKind;
  memberName: string;
  memberRunId: string;
  memberPath: string[];
  memberRouteKey: string;
  agentEvent: AgentRunEvent;
};

export type TeamRunTaskPlanEventPayload = Record<string, unknown>;

export type TeamCommunicationReferenceFile = {
  referenceId: string;
  path: string;
  type: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamCommunicationParticipant = {
  memberKind: "agent" | "agent_team";
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  platformRunId?: string | null;
  teamDefinitionId?: string | null;
};

export type TeamRunCommunicationEventPayload = {
  messageId: string;
  teamRunId: string;
  sender: TeamCommunicationParticipant;
  receiver: TeamCommunicationParticipant;
  content: string;
  messageType: string;
  referenceFiles: TeamCommunicationReferenceFile[];
  createdAt: string;
};

export type TeamRunEventData =
  | TeamRunStatusUpdateData
  | TeamRunAgentEventPayload
  | TeamRunTaskPlanEventPayload
  | TeamRunCommunicationEventPayload;

export type TeamRunEvent = {
  eventSourceType: TeamRunEventSourceType;
  teamRunId: string;
  data: TeamRunEventData;
  /** Canonical runtime source identity. Root/team-level events use an empty path. */
  sourcePath: string[];
  /** Deprecated transport/display alias only. Do not use as domain identity. */
  subTeamNodeName?: string | null;
};

export const getTeamRunEventSourceRouteKey = (event: TeamRunEvent): string | null =>
  Array.isArray(event.sourcePath) && event.sourcePath.length > 0
    ? buildMemberRouteKeyFromPath(event.sourcePath)
    : null;

export type TeamRunEventListener = (event: TeamRunEvent) => void;

export type TeamRunEventUnsubscribe = () => void;
