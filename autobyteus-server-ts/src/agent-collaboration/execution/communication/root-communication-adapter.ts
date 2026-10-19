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
  assertDeliveryAllowed(sender: CollaborationMemberExecutionIdentity, receiver: CollaborationMemberExecutionIdentity): void;
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
  }>): Promise<RootCommunicationAppendResult>;
}
