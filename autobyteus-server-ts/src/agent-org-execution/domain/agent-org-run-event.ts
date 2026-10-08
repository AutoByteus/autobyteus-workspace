import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionHostIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { CollaborationCommunicationMessageV1 } from "../../agent-collaboration/execution/communication/collaboration-communication-message-v1.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";

export type AgentOrgRunEvent =
  | Readonly<{ kind: "agent_presentation"; execution: CollaborationMemberExecutionIdentity; message: AgentPresentationMessage }>
  /** A delegated child was committed to the execution tree under its host. */
  | Readonly<{ kind: "task_execution_started"; host: TaskExecutionHostIdentity; taskExecution: TaskExecutionReference }>
  /** These task executions' Task became DONE or CLOSED; published before they are stopped. */
  | Readonly<{ kind: "task_executions_closed"; taskExecutions: readonly TaskExecutionReference[] }>
  /** These closed task executions were reactivated by their assigner; published after the Task-side reopen. */
  | Readonly<{ kind: "task_executions_reopened"; taskExecutions: readonly TaskExecutionReference[] }>
  | Readonly<{ kind: "communication"; message: CollaborationCommunicationMessageV1 }>
  /** Committed at the root before any task execution references its address. */
  | Readonly<{ kind: "collaborator_added"; collaborator: CollaboratorEntry }>
  | Readonly<{ kind: "lifecycle"; isActive: boolean }>;
