import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunInputReservationResult } from "../../../agent-execution/input/agent-run-input-contract.js";
import type { StoredMessageLogOwner } from "../../../run-history/store/task-agent-message-logs.js";
import type {
  CollaborationMemberExecutionIdentity,
  RootExecutionIdentity,
} from "../domain/root-execution-identity.js";
import type { CollaborationCommunicationMessage } from "./collaboration-communication-message.js";
import type { RootMessageAppend, RootMessageAppendResult } from "./root-message-append.js";
import { ROOT_NOT_ACTIVE_MESSAGE } from "../task/task-delegation-command.js";

export type RootCommunicationDeliveryInput = Readonly<{
  senderIdentity: CollaborationMemberExecutionIdentity;
  senderDisplayName: string;
  /** The sender's address when, from the receiver, it reaches the sender (design T-5); null otherwise. */
  senderAddress: string | null;
  receiverIdentity: CollaborationMemberExecutionIdentity;
  receiverDisplayName: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: readonly string[] | null;
}>;

export type RootCommunicationRejection = Readonly<{ code: string; message: string }>;

/** The generic not-accepting refusal: every root's remote forms, and the standalone and Org roots' `deliver`. */
export const ROOT_NOT_ACCEPTING_MESSAGES: RootCommunicationRejection = Object.freeze({
  code: "COLLABORATION_ROOT_NOT_ACCEPTING_MESSAGES",
  message: ROOT_NOT_ACTIVE_MESSAGE,
});

/**
 * One root's facts and effects for RootCommunicationEngine (DS-001..DS-004). It owns no sequencing: the engine
 * decides when each member is called, and the root's persistence coordinator runs the append under its lock.
 */
export interface RootCommunicationPort {
  readonly root: RootExecutionIdentity;
  readonly initialMessages: readonly CollaborationCommunicationMessage[];
  readonly rejections: Readonly<{
    /** Same-root `deliver` only, when the root no longer accepts messages (the remote forms keep the generic one). */
    deliverNotAccepting: RootCommunicationRejection;
    /** The root closed or the message ID is already in the list, found under the lock. */
    commitConflict: RootCommunicationRejection;
    /** The log was not written; the rejection's message is the write failure's own message. */
    historyCommitFailedCode: string;
  }>;
  /** Root-specific openness, checked together with the engine's own admission. */
  isOpen(): boolean;
  isCurrentAgent(identity: CollaborationMemberExecutionIdentity): boolean;
  /** Task scope of a message between two runs, by run ID (either may be a remote run of this root). */
  assertDeliveryAllowed(senderAgentRunId: string, receiverAgentRunId: string): void;
  buildRecipientInput(input: Readonly<{
    delivery: RootCommunicationDeliveryInput;
    message: CollaborationCommunicationMessage;
  }>): AgentInputUserMessage;
  reserveRecipientInput(agentRunId: string, message: AgentInputUserMessage): Promise<AgentRunInputReservationResult>;
  /** The logs the message belongs to (receiver's first; D-4), resolved against the current tree. */
  logOwnersOf(message: CollaborationCommunicationMessage): readonly StoredMessageLogOwner[];
  /** The root persistence coordinator's `commitMessageAppend` (lock, log write, post-durability step). */
  commitMessageAppend(append: RootMessageAppend): Promise<RootMessageAppendResult>;
  /** The message in the root's view stream (messages between its own agents only). */
  publishToRootView(message: CollaborationCommunicationMessage): void;
  /** Shows the committed input in the recipient's conversation. */
  presentRecipientInput(message: CollaborationCommunicationMessage, input: AgentInputUserMessage): void;
}
