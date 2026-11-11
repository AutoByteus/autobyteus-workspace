import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { RemoteRunRootEvent } from "../../agent-collaboration/execution/remote/remote-run-observation.js";

export type AgentOrgRunEvent =
  | Readonly<{ kind: "agent_presentation"; execution: CollaborationMemberExecutionIdentity; message: AgentPresentationMessage }>
  | Readonly<{ kind: "communication"; message: CollaborationCommunicationMessage }>
  | Readonly<{ kind: "lifecycle"; isActive: boolean }>
  /** autobyteus-278: the facts of the runs this Org delegated to other nodes (read only by its DTO projector). */
  | RemoteRunRootEvent;

/** The Org's message events: the ones the client adds to the Team tab's lists (autobyteus-358, SR-008). */
export const isAgentOrgMessageEvent = (event: AgentOrgRunEvent): boolean => event.kind === "communication";
