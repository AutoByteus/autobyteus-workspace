import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";

/**
 * Events of one standalone run's view: its messages and its agent's lifecycle. The run's own agent presents on its own
 * Agent stream, and each run it delegated on its own (rule 2; a peer's run through `/ws/peer-run`, SR-086 G-D1). Its
 * tree's changes are `run_tree_changed` notices (`ChildRowsFeed`, SR-084); a row's status is its own run's (SR-083).
 */
export type StandaloneRootEvent =
  | Readonly<{ kind: "communication"; message: CollaborationCommunicationMessage }>
  | Readonly<{ kind: "lifecycle"; isActive: boolean }>;

/** The Agent root's message events: the ones the client adds to the Team tab's lists (autobyteus-358, SR-008). */
export const isStandaloneRootMessageEvent = (event: StandaloneRootEvent): boolean => event.kind === "communication";
/** A committed message as the Agent root's message event (SR-072: the node's message feed numbers it in each view). */
export const standaloneRootMessageEvent = (message: CollaborationCommunicationMessage): StandaloneRootEvent => ({ kind: "communication", message });
