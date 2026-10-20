import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunInputReservationResult } from "../../../agent-execution/input/agent-run-input-contract.js";
import type {
  CollaborationMemberExecutionIdentity,
  RootExecutionIdentity,
} from "../domain/root-execution-identity.js";
import type { CollaborationCommunicationMessage } from "./collaboration-communication-message.js";

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

export type RootCommunicationAppendResult =
  | Readonly<{ committed: true }>
  | Readonly<{ committed: false; code: string; message: string }>;

/** Subject-private persistence and event port for RootCommunicationEngine. */
export interface RootCommunicationAdapter {
  readonly root: RootExecutionIdentity;
  readonly initialMessages: readonly CollaborationCommunicationMessage[];
  isOpen(): boolean;
  /** Task scope of a message between two runs, by run ID (either may be a remote run of this root). */
  assertDeliveryAllowed(senderAgentRunId: string, receiverAgentRunId: string): void;
  isCurrentAgent(identity: CollaborationMemberExecutionIdentity): boolean;
  buildRecipientInput(input: Readonly<{
    delivery: RootCommunicationDeliveryInput;
    message: CollaborationCommunicationMessage;
  }>): AgentInputUserMessage;
  reserveRecipientInput(agentRunId: string, message: AgentInputUserMessage): Promise<AgentRunInputReservationResult>;
  commitAppend(input: Readonly<{
    message: CollaborationCommunicationMessage;
    inputMessage: AgentInputUserMessage;
    reservation: Extract<AgentRunInputReservationResult, { reserved: true }>["reservation"];
    getCurrentMessages(): readonly CollaborationCommunicationMessage[];
    commitMessages(messages: readonly CollaborationCommunicationMessage[]): void;
    /**
     * Whether the root publishes the message to its view stream. The view shows messages between its own
     * agents; a message from a remote run is not published, so it takes no change sequence.
     */
    publishToRootView: boolean;
  }>): Promise<RootCommunicationAppendResult>;
  /**
   * A message a local agent sent to a remote run, after the peer accepted it: appended to the sender's log
   * only (the peer stores its side, CM-9) and committed to `current`. It is never published to the root's
   * view, which shows messages between its own agents.
   */
  commitSentToRemote(input: Readonly<{
    message: CollaborationCommunicationMessage;
    getCurrentMessages(): readonly CollaborationCommunicationMessage[];
    commitMessages(messages: readonly CollaborationCommunicationMessage[]): void;
  }>): Promise<RootCommunicationAppendResult>;
}
