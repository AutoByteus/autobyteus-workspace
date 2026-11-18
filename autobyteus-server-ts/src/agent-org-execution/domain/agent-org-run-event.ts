import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";

export type AgentOrgRunEvent =
  | Readonly<{ kind: "agent_presentation"; execution: CollaborationMemberExecutionIdentity; message: AgentPresentationMessage }>
  | Readonly<{ kind: "communication"; message: CollaborationCommunicationMessage }>
  | Readonly<{ kind: "lifecycle"; isActive: boolean }>;

/** The Org's message events: the ones the client adds to the Team tab's lists (autobyteus-358, SR-008). */
export const isAgentOrgMessageEvent = (event: AgentOrgRunEvent): boolean => event.kind === "communication";
/** A committed message as the Org's message event (SR-072: the node's message feed numbers it in each view). */
export const agentOrgMessageEvent = (message: CollaborationCommunicationMessage): AgentOrgRunEvent => ({ kind: "communication", message });
