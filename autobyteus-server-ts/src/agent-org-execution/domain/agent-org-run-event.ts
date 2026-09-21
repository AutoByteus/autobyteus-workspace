import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { RootTaskLifecycleEvent } from "../../agent-collaboration/execution/task/root-task-lifecycle-event.js";
import type { CollaborationCommunicationMessageV1 } from "../../agent-collaboration/execution/communication/collaboration-communication-message-v1.js";

export type AgentOrgRunEvent =
  | Readonly<{ kind: "agent_presentation"; execution: CollaborationMemberExecutionIdentity; message: AgentPresentationMessage }>
  | Readonly<{ kind: "task"; event: RootTaskLifecycleEvent }>
  | Readonly<{ kind: "communication"; message: CollaborationCommunicationMessageV1 }>
  | Readonly<{ kind: "lifecycle"; isActive: boolean }>;
