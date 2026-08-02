import type { AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { TaskAgentInstanceIdentity } from "./task-agent-instance.js";
import type { TaskTeamInstanceIdentity } from "./task-team-instance.js";
import type { ConversationTargetAddress } from "./conversation-target-address.js";
import { buildMemberRouteKeyFromPath } from "./team-run-member-identity.js";

export enum TeamRunEventSourceType {
  AGENT = "AGENT",
  TASK_DELEGATION = "TASK_DELEGATION",
  COMMUNICATION = "COMMUNICATION",
  MEMBER_INPUT = "MEMBER_INPUT",
}

export type TeamRunAgentEventPayload = {
  runtimeKind: RuntimeKind;
  memberName: string;
  memberRunId: string;
  memberPath: string[];
  memberRouteKey: string;
  agentEvent: AgentRunEvent;
  taskAgentInstance?: TaskAgentInstanceIdentity | null;
};


export type TeamRunTaskDelegationEventPayload = {
  eventType:
    | "TASK_DELEGATION_TERMINAL_STATUS"
    | "TASK_DELEGATION_STATUS_UPDATED"
    | "TASK_DELEGATION_ACTIVATED"
    | "TASK_DELEGATION_RESULT_SUBMITTED"
    | "TASK_DELEGATION_RESULT_REVIEWED";
  payload: unknown;
};

export type TeamCommunicationReferenceFile = {
  referenceId: string;
  path: string;
  type: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamRunCommunicationEventPayload = {
  messageId: string;
  teamRunId: string;
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
  content: string;
  messageType: string;
  referenceFiles: TeamCommunicationReferenceFile[];
  createdAt: string;
};

export type TeamRunMemberInputOrigin =
  | "user_message"
  | "inter_agent_delivery";

export type TeamRunMemberInputContextFile = {
  path: string;
  type?: string | null;
};

export type TeamRunMemberInputEventPayload = {
  messageId: string;
  dedupeKey: string;
  teamRunId: string;
  recipientMemberRunId: string;
  recipientMemberName: string;
  recipientMemberPath: string[];
  recipientMemberRouteKey: string;
  content: string;
  inputOrigin: TeamRunMemberInputOrigin;
  receivedAt: string;
  contextFilePaths: TeamRunMemberInputContextFile[];
  senderRunId?: string | null;
  senderMemberName?: string | null;
  senderMemberPath?: string[] | null;
  senderMemberRouteKey?: string | null;
  parentCommunicationMessageId?: string | null;
  taskAgentInstance?: TaskAgentInstanceIdentity | null;
};

export type TeamRunEventData =
  | TeamRunAgentEventPayload
  | TeamRunTaskDelegationEventPayload
  | TeamRunCommunicationEventPayload
  | TeamRunMemberInputEventPayload;

export type TeamRunEvent = {
  eventSourceType: TeamRunEventSourceType;
  teamRunId: string;
  data: TeamRunEventData;
  /** Canonical runtime source identity. Root/team-level events use an empty path. */
  sourcePath: string[];
  /** Concrete task-team execution marker for child-run events republished to the parent stream. */
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
  /** Deprecated transport/display alias only. Do not use as domain identity. */
  subTeamNodeName?: string | null;
};

export const getTeamRunEventSourceRouteKey = (event: TeamRunEvent): string | null =>
  Array.isArray(event.sourcePath) && event.sourcePath.length > 0
    ? buildMemberRouteKeyFromPath(event.sourcePath)
    : null;

export type TeamRunEventListener = (event: TeamRunEvent) => void;

export type TeamRunEventUnsubscribe = () => void;
