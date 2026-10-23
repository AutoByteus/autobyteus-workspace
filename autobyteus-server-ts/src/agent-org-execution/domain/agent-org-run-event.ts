import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionHostIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { DelegatedLaunchSelectionRecord } from "../../agent-collaboration/domain/delegated-launch-selection.js";
import type { RemoteRunRootEvent } from "../../agent-collaboration/execution/remote/remote-run-observation.js";

export type AgentOrgRunEvent =
  | Readonly<{ kind: "agent_presentation"; execution: CollaborationMemberExecutionIdentity; message: AgentPresentationMessage }>
  /** A delegated child was committed to the execution tree under its host. */
  | Readonly<{ kind: "task_execution_started"; host: TaskExecutionHostIdentity; taskExecution: TaskExecutionReference }>
  /** These task executions' Task became DONE or CANCELLED; published before they are stopped. */
  | Readonly<{ kind: "task_executions_closed"; taskExecutions: readonly TaskExecutionReference[] }>
  /** These closed task executions were reactivated by their assigner; published after the Task-side reopen. */
  | Readonly<{ kind: "task_executions_reopened"; taskExecutions: readonly TaskExecutionReference[] }>
  | Readonly<{ kind: "communication"; message: CollaborationCommunicationMessage }>
  /** Committed at the root before any task execution references its address. */
  /** The user's model choices of these copies were committed on the live run (DS-001). */
  | Readonly<{ kind: "delegated_launch_selections_changed"; selections: readonly DelegatedLaunchSelectionRecord[] }>
  | Readonly<{ kind: "lifecycle"; isActive: boolean }>
  /** autobyteus-278: the facts of the runs this Org delegated to other nodes (read only by its DTO projector). */
  | RemoteRunRootEvent;
