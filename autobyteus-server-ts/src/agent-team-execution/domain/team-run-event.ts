import type { AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { TaskAgentInstanceIdentity } from "./task-agent-instance.js";
import type { TeamExecutionAddress } from "./team-execution-address.js";

export enum TeamRunEventSourceType {
  AGENT = "AGENT",
  TASK_DELEGATION = "TASK_DELEGATION",
  COMMUNICATION = "COMMUNICATION",
  MEMBER_INPUT = "MEMBER_INPUT",
}

export type TeamRunAgentEventPayload = Readonly<{
  runtimeKind: RuntimeKind;
  executionAddress: TeamExecutionAddress;
  displayName: string;
  agentEvent: AgentRunEvent;
  taskAgentInstance?: TaskAgentInstanceIdentity | null;
}>;

export type TeamRunTaskDelegationEventPayload = Readonly<{
  eventType:
    | "TASK_DELEGATION_TERMINAL_STATUS"
    | "TASK_DELEGATION_STATUS_UPDATED"
    | "TASK_DELEGATION_ACTIVATED"
    | "TASK_DELEGATION_RESULT_SUBMITTED"
    | "TASK_DELEGATION_RESULT_REVIEWED";
  payload: unknown;
}>;

export type TeamCommunicationReferenceFile = Readonly<{
  referenceId: string;
  path: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}>;

export type TeamRunCommunicationEventPayload = Readonly<{
  messageId: string;
  teamRunId: string;
  senderAddress: TeamExecutionAddress;
  receiverAddress: TeamExecutionAddress;
  content: string;
  messageType: string;
  referenceFiles: readonly TeamCommunicationReferenceFile[];
  createdAt: string;
}>;

export type TeamRunMemberInputOrigin = "user_message" | "inter_agent_delivery";

export type TeamRunMemberInputContextFile = Readonly<{
  path: string;
  type?: string | null;
}>;

export type TeamRunMemberInputEventPayload = Readonly<{
  messageId: string;
  dedupeKey: string;
  teamRunId: string;
  recipientAddress: TeamExecutionAddress;
  content: string;
  inputOrigin: TeamRunMemberInputOrigin;
  receivedAt: string;
  contextFilePaths: readonly TeamRunMemberInputContextFile[];
  senderAddress?: TeamExecutionAddress | null;
  parentCommunicationMessageId?: string | null;
  taskAgentInstance?: TaskAgentInstanceIdentity | null;
}>;

export type TeamRunEventData =
  | TeamRunAgentEventPayload
  | TeamRunTaskDelegationEventPayload
  | TeamRunCommunicationEventPayload
  | TeamRunMemberInputEventPayload;

export type TeamRunEvent = Readonly<{
  eventSourceType: TeamRunEventSourceType;
  teamRunId: string;
  executionAddress: TeamExecutionAddress;
  data: TeamRunEventData;
}>;

export type TeamRunEventListener = (event: TeamRunEvent) => void;
export type TeamRunEventUnsubscribe = () => void;
