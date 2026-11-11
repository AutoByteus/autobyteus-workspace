import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { RemoteRunRootEvent } from "../../agent-collaboration/execution/remote/remote-run-observation.js";

/**
 * Events of one standalone run's view: the run's own agent presents on its own Agent stream; a child run's live output
 * presents here while viewed (`agent_presentation`, DS-8); its peer children's facts are `RemoteRunRootEvent`s.
 */
export type StandaloneRootEvent =
  | Readonly<{ kind: "agent_presentation"; execution: CollaborationMemberExecutionIdentity; message: AgentPresentationMessage }>
  | Readonly<{ kind: "communication"; message: CollaborationCommunicationMessage }>
  | Readonly<{ kind: "lifecycle"; isActive: boolean }>
  | RemoteRunRootEvent;

/** The Agent root's message events: the ones the client adds to the Team tab's lists (autobyteus-358, SR-008). */
export const isStandaloneRootMessageEvent = (event: StandaloneRootEvent): boolean => event.kind === "communication";
