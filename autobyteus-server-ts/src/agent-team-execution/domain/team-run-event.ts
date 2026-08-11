import type { TeamAgentExecutionBinding } from "./team-agent-execution-binding.js";
import type { TeamAgentEvent } from "./team-agent-event.js";
import type { TeamExecutionAddress } from "./team-execution-address.js";
import type {
  TaskReferenceFile,
  TaskResultReviewDecision,
} from "../task-delegation/task-delegation-record.js";

export enum TeamRunEventSourceType {
  AGENT = "AGENT",
  TASK_DELEGATION = "TASK_DELEGATION",
  COMMUNICATION = "COMMUNICATION",
  MEMBER_INPUT = "MEMBER_INPUT",
}

export type TaskDelegationActivationEventDetails = Readonly<{
  taskId: string;
  senderAddress: TeamExecutionAddress;
  content: string;
  referenceFiles: readonly TaskReferenceFile[];
  createdAt: string;
  startedAt: string;
}>;

export type TaskDelegationResultSubmittedEventDetails = Readonly<{
  taskId: string;
  submissionId: string;
  submittedAt: string;
}>;

export type TaskDelegationResultReviewedEventDetails = Readonly<{
  taskId: string;
  reviewId: string;
  reviewedSubmissionId: string;
  decision: TaskResultReviewDecision;
  reviewedAt: string;
}>;

export type TeamRunTaskDelegationEvent =
  | Readonly<{ eventType: "TASK_DELEGATION_ACTIVATED"; details: TaskDelegationActivationEventDetails }>
  | Readonly<{ eventType: "TASK_DELEGATION_RESULT_SUBMITTED"; details: TaskDelegationResultSubmittedEventDetails }>
  | Readonly<{ eventType: "TASK_DELEGATION_RESULT_REVIEWED"; details: TaskDelegationResultReviewedEventDetails }>;

export type TeamCommunicationReferenceFile = Readonly<{
  referenceId: string;
  path: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}>;

export type TeamRunCommunicationEventPayload = Readonly<{
  messageId: string;
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
  type: string | null;
}>;

export type TeamRunMemberInputEventPayload = Readonly<{
  messageId: string;
  dedupeKey: string;
  content: string;
  inputOrigin: TeamRunMemberInputOrigin;
  receivedAt: string;
  contextFilePaths: readonly TeamRunMemberInputContextFile[];
  senderAddress: TeamExecutionAddress | null;
  parentCommunicationMessageId: string | null;
}>;

export type TeamRunEvent =
  | Readonly<{
      eventSourceType: TeamRunEventSourceType.AGENT;
      execution: TeamAgentExecutionBinding;
      payload: TeamAgentEvent;
    }>
  | Readonly<{
      eventSourceType: TeamRunEventSourceType.TASK_DELEGATION;
      executionAddress: TeamExecutionAddress;
      payload: TeamRunTaskDelegationEvent;
    }>
  | Readonly<{
      eventSourceType: TeamRunEventSourceType.COMMUNICATION;
      payload: TeamRunCommunicationEventPayload;
    }>
  | Readonly<{
      eventSourceType: TeamRunEventSourceType.MEMBER_INPUT;
      executionAddress: TeamExecutionAddress;
      payload: TeamRunMemberInputEventPayload;
    }>;

export type TeamRunEventListener = (event: TeamRunEvent) => void;
export type TeamRunEventUnsubscribe = () => void;
