import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type {
  CollaborationMemberExecutionIdentity,
  TaskExecutionHostIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { CollaborationCommunicationMessageV1 } from "../../agent-collaboration/execution/communication/collaboration-communication-message-v1.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";

/** Events of one Agent root. Children present here; the host presents on its own Agent stream. */
export type StandaloneRootEvent =
  | Readonly<{ kind: "agent_presentation"; execution: CollaborationMemberExecutionIdentity; message: AgentPresentationMessage }>
  | Readonly<{ kind: "task_execution_started"; host: TaskExecutionHostIdentity; taskExecution: TaskExecutionReference }>
  /** These task executions' Task became DONE; published before they are stopped. */
  | Readonly<{ kind: "task_executions_closed"; taskExecutions: readonly TaskExecutionReference[] }>
  | Readonly<{ kind: "communication"; message: CollaborationCommunicationMessageV1 }>
  | Readonly<{ kind: "collaborator_added"; collaborator: CollaboratorEntry }>
  | Readonly<{ kind: "lifecycle"; isActive: boolean }>;
