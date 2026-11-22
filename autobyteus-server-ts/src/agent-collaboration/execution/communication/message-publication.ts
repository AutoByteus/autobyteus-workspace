import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { CollaborationCommunicationMessage } from "./collaboration-communication-message.js";

/**
 * How a committed message relates to the run that commits it (autobyteus-565), stated by its delivering owner:
 * `same_run` (between the run's own agents), `related` (a Task relates the two runs), `same_container` (two units of one
 * Org container, org-teams-follow-definition), `unrelated` (any other local run, autobyteus-492 CM-13) or `remote` (an
 * agent on another node). `MessageViewScope` decides from it which views show it.
 */
export type MessageRelation = "same_run" | "related" | "same_container" | "unrelated" | "remote";

/** One side of a message: a run of this node, or an agent on another node (by its node ID). */
export type MessageSide = Readonly<{ run: RootExecutionIdentity }> | Readonly<{ nodeId: string }>;

/**
 * One agent of a live message as the commit knows it, without a lookup: its run ID, its address in its own run (when
 * known), and, for an agent on another node, this node's name for that node.
 */
export type MessageParty = Readonly<{ agentRunId: string; address: string | null; nodeName: string | null }>;
export type MessageParties = Readonly<{ sender: MessageParty; receiver: MessageParty }>;

/** A committed message as its publishing commit hands it to the node's message feed (one call per message). */
export type MessagePublication = Readonly<{
  message: CollaborationCommunicationMessage;
  relation: MessageRelation;
  sender: MessageSide;
  receiver: MessageSide;
  parties: MessageParties;
}>;

export const localParty = (agentRunId: string, address: string | null): MessageParty =>
  Object.freeze({ agentRunId, address, nodeName: null });
