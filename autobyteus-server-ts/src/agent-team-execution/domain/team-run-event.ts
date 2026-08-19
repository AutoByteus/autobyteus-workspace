import type { TeamAgentExecutionBinding } from "./team-agent-execution-binding.js";
import type { TeamAgentEvent } from "./team-agent-event.js";
import type { TaskExecutionReference } from "../task-delegation/task-delegation-record-v1.js";
import type { TeamCommunicationMessageV1 } from "../../services/team-communication/team-communication-v1-types.js";

export enum TeamRunEventSourceType {
  AGENT = "AGENT",
  TASK_DELEGATION = "TASK_DELEGATION",
  COMMUNICATION = "COMMUNICATION",
  MEMBER_INPUT = "MEMBER_INPUT",
}

export type TeamRunTaskDelegationEvent =
  | Readonly<{
      eventType: "TASK_DELEGATION_ACTIVATED";
      details: Readonly<{
        taskId: string;
        delegatorAgentRunId: string;
        recipientAddress: string;
        taskExecution: TaskExecutionReference;
        description: string;
        referenceFiles: readonly string[];
        createdAt: string;
      }>;
    }>
  | Readonly<{
      eventType: "TASK_DELEGATION_RESULT_SUBMITTED";
      details: Readonly<{ taskId: string; submissionId: string; submittedAt: string }>;
    }>
  | Readonly<{
      eventType: "TASK_DELEGATION_RESULT_REVIEWED";
      details: Readonly<{
        taskId: string;
        reviewId: string;
        reviewedSubmissionId: string;
        decision: "accept" | "request_revision";
        reviewedAt: string;
      }>;
    }>
  | Readonly<{
      eventType: "TASK_DELEGATION_SETTLED";
      details: Readonly<{ taskId: string; settledAt: string }>;
    }>;

export type TeamRunMemberInputOrigin = "user_message" | "inter_agent_delivery";
export type TeamRunMemberInputContextFile = Readonly<{ path: string; type: string | null }>;
export type TeamRunMemberInputEventPayload = Readonly<{
  recipientAgentRunId: string;
  messageId: string;
  dedupeKey: string;
  content: string;
  inputOrigin: TeamRunMemberInputOrigin;
  receivedAt: string;
  contextFilePaths: readonly TeamRunMemberInputContextFile[];
  senderAgentRunId: string | null;
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
      taskExecution: TaskExecutionReference;
      payload: TeamRunTaskDelegationEvent;
    }>
  | Readonly<{
      eventSourceType: TeamRunEventSourceType.COMMUNICATION;
      payload: TeamCommunicationMessageV1;
    }>
  | Readonly<{
      eventSourceType: TeamRunEventSourceType.MEMBER_INPUT;
      agentRunId: string;
      payload: TeamRunMemberInputEventPayload;
    }>;

export type TeamRunEventListener = (event: TeamRunEvent) => void;
export type TeamRunEventUnsubscribe = () => void;
