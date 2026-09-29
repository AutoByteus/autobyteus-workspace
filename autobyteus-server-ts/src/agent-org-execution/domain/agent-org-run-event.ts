import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionHostIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { CollaborationCommunicationMessageV1 } from "../../agent-collaboration/execution/communication/collaboration-communication-message-v1.js";

export type AgentOrgRunEvent =
  | Readonly<{ kind: "agent_presentation"; execution: CollaborationMemberExecutionIdentity; message: AgentPresentationMessage }>
  /** A delegated child was committed to the execution tree under its host. */
  | Readonly<{ kind: "task_execution_started"; host: TaskExecutionHostIdentity; taskExecution: TaskExecutionReference }>
  | Readonly<{ kind: "communication"; message: CollaborationCommunicationMessageV1 }>
  | Readonly<{ kind: "lifecycle"; isActive: boolean }>;
