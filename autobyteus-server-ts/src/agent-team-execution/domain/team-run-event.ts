import type { TeamAgentExecutionBinding } from "./team-agent-execution-binding.js";
import type { TeamAgentEvent } from "./team-agent-event.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { DelegatedLaunchSelectionRecord } from "../../agent-collaboration/domain/delegated-launch-selection.js";
import type { RemoteRunRootEvent } from "../../agent-collaboration/execution/remote/remote-run-observation.js";

export enum TeamRunEventSourceType {
  AGENT = "AGENT",
  TASK_EXECUTION = "TASK_EXECUTION",
  TASK_EXECUTIONS_CLOSED = "TASK_EXECUTIONS_CLOSED",
  TASK_EXECUTIONS_REOPENED = "TASK_EXECUTIONS_REOPENED",
  COMMUNICATION = "COMMUNICATION",
  MEMBER_INPUT = "MEMBER_INPUT",
  DELEGATED_LAUNCH_SELECTIONS = "DELEGATED_LAUNCH_SELECTIONS",
  /** autobyteus-278: a fact of a run this Team delegated to another node (read only by the stream projector). */
  REMOTE = "REMOTE",
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
      /** These task executions' Task became DONE or CANCELLED; published before they are stopped. */
      eventSourceType: TeamRunEventSourceType.TASK_EXECUTIONS_CLOSED;
      taskExecutions: readonly TaskExecutionReference[];
    }>
  | Readonly<{
      /** These closed task executions were reactivated by their assigner; published after the Task-side reopen. */
      eventSourceType: TeamRunEventSourceType.TASK_EXECUTIONS_REOPENED;
      taskExecutions: readonly TaskExecutionReference[];
    }>
  | Readonly<{
      eventSourceType: TeamRunEventSourceType.COMMUNICATION;
      payload: CollaborationCommunicationMessage;
    }>
  | Readonly<{
      eventSourceType: TeamRunEventSourceType.MEMBER_INPUT;
      agentRunId: string;
      payload: TeamRunMemberInputEventPayload;
    }>
  | Readonly<{
      /** The user's model choices of these copies were committed on the live run (DS-001). */
      eventSourceType: TeamRunEventSourceType.DELEGATED_LAUNCH_SELECTIONS;
      selections: readonly DelegatedLaunchSelectionRecord[];
    }>
  | Readonly<{ eventSourceType: TeamRunEventSourceType.REMOTE; event: RemoteRunRootEvent }>;

export type TeamRunEventListener = (event: TeamRunEvent) => void;
export type TeamRunEventUnsubscribe = () => void;
