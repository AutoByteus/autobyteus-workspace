import type { TeamAgentExecutionBinding } from "./team-agent-execution-binding.js";
import type { TeamAgentEvent } from "./team-agent-event.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { TeamCommunicationMessageV1 } from "../../services/team-communication/team-communication-v1-types.js";

export enum TeamRunEventSourceType {
  AGENT = "AGENT",
  TASK_EXECUTION = "TASK_EXECUTION",
  COMMUNICATION = "COMMUNICATION",
  MEMBER_INPUT = "MEMBER_INPUT",
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
