import { createHash } from "node:crypto";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import {
  rootExecutionIdentityKey,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../domain/root-execution-identity.js";
import type { RootCommunicationDeliveryInput } from "./root-communication-adapter.js";
import { receivedMessageHeader } from "./received-message-header.js";
import type { CollaborationCommunicationMessage } from "./collaboration-communication-message.js";

const references = (values: readonly string[] | null | undefined): readonly string[] => Object.freeze([
  ...new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
]);
const hash = (values: readonly string[]): string => createHash("sha256")
  .update(values.join("\0")).digest("base64url").slice(0, 32);

export const buildRootCommunicationInputMessage = (input: {
  delivery: RootCommunicationDeliveryInput;
  message: CollaborationCommunicationMessage;
}): AgentInputUserMessage => {
  const files = references(input.message.referenceFiles);
  const fileBlock = files.length ? `\n\nReference files:\n${files.map((file) => `- ${file}`).join("\n")}` : "";
  const header = receivedMessageHeader({ runId: input.delivery.senderIdentity.agentRunId, address: input.delivery.senderAddress });
  const content = `${header}\nmessage:\n${input.message.content}${fileBlock}`;
  const rootKey = rootExecutionIdentityKey(input.delivery.senderIdentity.root);
  const messageId = `memberinput_${hash([rootKey, input.delivery.receiverIdentity.agentRunId, input.message.messageId, content])}`;
  return new AgentInputUserMessage(content, SenderType.AGENT, null, {
    message_id: messageId,
    recipient_input_message_id: messageId,
    dedupe_key: `member_input:${rootKey}:${input.delivery.receiverIdentity.agentRunId}:${messageId}`,
    input_origin: "inter_agent_delivery",
    sender_agent_id: input.delivery.senderIdentity.agentRunId,
    sender_agent_name: input.delivery.senderDisplayName,
    sender_member_address: input.delivery.senderIdentity.memberAddress,
    receiver_member_address: input.delivery.receiverIdentity.memberAddress,
    original_message_type: input.message.messageType,
    root_subject_kind: input.delivery.senderIdentity.root.rootSubjectKind,
    root_run_id: input.delivery.senderIdentity.root.rootRunId,
    parent_communication_message_id: input.message.messageId,
    reference_files: files,
  });
};

/**
 * The receiver's input for a message from a run on a peer node (`acceptFromRemote`): the header names the
 * sender's run id and node; the peer's message ID keys its dedupe, so the same message is admitted once.
 */
export const buildRemoteCommunicationInputMessage = (input: {
  root: RootExecutionIdentity;
  message: CollaborationCommunicationMessage;
  receiverIdentity: CollaborationMemberExecutionIdentity;
  senderNodeName: string;
}): AgentInputUserMessage => {
  const header = receivedMessageHeader({ runId: input.message.senderAgentRunId, address: null, node: input.senderNodeName });
  const content = `${header}\nmessage:\n${input.message.content}`;
  const rootKey = rootExecutionIdentityKey(input.root);
  const messageId = `memberinput_${hash([rootKey, input.receiverIdentity.agentRunId, input.message.messageId, content])}`;
  return new AgentInputUserMessage(content, SenderType.AGENT, null, {
    message_id: messageId,
    recipient_input_message_id: messageId,
    dedupe_key: `member_input:${rootKey}:${input.receiverIdentity.agentRunId}:${messageId}`,
    input_origin: "inter_agent_delivery",
    sender_agent_id: input.message.senderAgentRunId,
    sender_agent_name: input.message.senderAgentRunId,
    sender_node_name: input.senderNodeName,
    receiver_member_address: input.receiverIdentity.memberAddress,
    original_message_type: input.message.messageType,
    root_subject_kind: input.root.rootSubjectKind,
    root_run_id: input.root.rootRunId,
    parent_communication_message_id: input.message.messageId,
    reference_files: [],
  });
};
