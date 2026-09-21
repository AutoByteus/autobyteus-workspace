import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunInputReservationResult } from "../../../agent-execution/input/agent-run-input-contract.js";
import type {
  CollaborationMemberExecutionIdentity,
  RootExecutionIdentity,
} from "../domain/root-execution-identity.js";
import type { CollaborationCommunicationMessageV1 } from "./collaboration-communication-message-v1.js";

export type RootCommunicationDeliveryInput = Readonly<{
  senderIdentity: CollaborationMemberExecutionIdentity;
  senderDisplayName: string;
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
  readonly initialMessages: readonly CollaborationCommunicationMessageV1[];
  isOpen(): boolean;
  isCurrentAgent(identity: CollaborationMemberExecutionIdentity): boolean;
  buildRecipientInput(input: Readonly<{
    delivery: RootCommunicationDeliveryInput;
    message: CollaborationCommunicationMessageV1;
  }>): AgentInputUserMessage;
  reserveRecipientInput(agentRunId: string, message: AgentInputUserMessage): Promise<AgentRunInputReservationResult>;
  commitAppend(input: Readonly<{
    message: CollaborationCommunicationMessageV1;
    inputMessage: AgentInputUserMessage;
    reservation: Extract<AgentRunInputReservationResult, { reserved: true }>["reservation"];
    getCurrentMessages(): readonly CollaborationCommunicationMessageV1[];
    commitMessages(messages: readonly CollaborationCommunicationMessageV1[]): void;
  }>): Promise<RootCommunicationAppendResult>;
}
