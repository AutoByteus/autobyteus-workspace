import type { TeamAgentExecutionBinding } from "./team-agent-execution-binding.js";
import type { TeamAgentEvent } from "./team-agent-event.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { TeamCommunicationMessageV1 } from "../../services/team-communication/team-communication-v1-types.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";

export enum TeamRunEventSourceType {
  AGENT = "AGENT",
  TASK_EXECUTION = "TASK_EXECUTION",
  TASK_EXECUTIONS_CLOSED = "TASK_EXECUTIONS_CLOSED",
  COMMUNICATION = "COMMUNICATION",
  MEMBER_INPUT = "MEMBER_INPUT",
  COLLABORATOR = "COLLABORATOR",
}

export type TeamRunTaskExecutionEvent = Readonly<{
  eventType: "TASK_EXECUTION_STARTED";
  details: Readonly<{ parentTeamRunId: string }>;
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
      eventSourceType: TeamRunEventSourceType.TASK_EXECUTION;
      taskExecution: TaskExecutionReference;
      payload: TeamRunTaskExecutionEvent;
    }>
  | Readonly<{
      /** These task executions' Task became DONE; published before they are stopped. */
      eventSourceType: TeamRunEventSourceType.TASK_EXECUTIONS_CLOSED;
      taskExecutions: readonly TaskExecutionReference[];
    }>
  | Readonly<{
      eventSourceType: TeamRunEventSourceType.COMMUNICATION;
      payload: TeamCommunicationMessageV1;
    }>
  | Readonly<{
      eventSourceType: TeamRunEventSourceType.MEMBER_INPUT;
      agentRunId: string;
      payload: TeamRunMemberInputEventPayload;
    }>
  | Readonly<{
      /** Committed at the root before any task execution references its address. */
      eventSourceType: TeamRunEventSourceType.COLLABORATOR;
      payload: Readonly<{ eventType: "COLLABORATOR_ADDED"; collaborator: CollaboratorEntry }>;
    }>;

export type TeamRunEventListener = (event: TeamRunEvent) => void;
export type TeamRunEventUnsubscribe = () => void;
