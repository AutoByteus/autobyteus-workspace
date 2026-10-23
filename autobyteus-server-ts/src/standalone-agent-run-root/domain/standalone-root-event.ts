import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type {
  CollaborationMemberExecutionIdentity,
  TaskExecutionHostIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { DelegatedLaunchSelectionRecord } from "../../agent-collaboration/domain/delegated-launch-selection.js";
import type { RemoteRunRootEvent } from "../../agent-collaboration/execution/remote/remote-run-observation.js";

/**
 * Events of one Agent root. Children present here; the host presents on its own Agent stream. Its remote children's
 * facts are `RemoteRunRootEvent`s (autobyteus-278), read only by the root's DTO projector.
 */
export type StandaloneRootEvent =
  | Readonly<{ kind: "agent_presentation"; execution: CollaborationMemberExecutionIdentity; message: AgentPresentationMessage }>
  | Readonly<{ kind: "task_execution_started"; host: TaskExecutionHostIdentity; taskExecution: TaskExecutionReference }>
  /** These task executions' Task became DONE or CANCELLED; published before they are stopped. */
  | Readonly<{ kind: "task_executions_closed"; taskExecutions: readonly TaskExecutionReference[] }>
  /** These closed task executions were reactivated by their assigner; published after the Task-side reopen. */
  | Readonly<{ kind: "task_executions_reopened"; taskExecutions: readonly TaskExecutionReference[] }>
  | Readonly<{ kind: "communication"; message: CollaborationCommunicationMessage }>
  /** The user's model choices of these copies were committed on the live run (DS-001). */
  | Readonly<{ kind: "delegated_launch_selections_changed"; selections: readonly DelegatedLaunchSelectionRecord[] }>
  | Readonly<{ kind: "lifecycle"; isActive: boolean }>
  | RemoteRunRootEvent;
