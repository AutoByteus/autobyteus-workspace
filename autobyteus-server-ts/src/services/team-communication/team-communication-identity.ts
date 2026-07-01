import { createHash } from "node:crypto";
import path from "node:path";
import {
  conversationTargetAddressDebugString,
  normalizeConversationTargetAddress,
  type ConversationTargetAddress,
} from "../../agent-team-execution/domain/conversation-target-address.js";
import {
  isAgentRunFilePathAbsolute,
  normalizeAgentRunFilePathDisplay,
} from "../../agent-execution/domain/agent-run-file-path-identity.js";

const normalizeIdentityPart = (value: string | null | undefined): string =>
  (value ?? "").trim();

const normalizeAddressIdentityPart = (address: ConversationTargetAddress): string =>
  conversationTargetAddressDebugString(normalizeConversationTargetAddress(address));

export const normalizeTeamCommunicationReferencePath = (value: string): string =>
  normalizeAgentRunFilePathDisplay(value);

export const isAbsoluteTeamCommunicationReferencePath = (value: string): boolean =>
  isAgentRunFilePathAbsolute(value) || path.isAbsolute(value);

export const buildTeamCommunicationMessageId = (input: {
  teamRunId: string;
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
  messageType: string;
  content: string;
  createdAt: string;
}): string => {
  const hashInput = [
    normalizeIdentityPart(input.teamRunId),
    normalizeAddressIdentityPart(input.senderAddress),
    normalizeAddressIdentityPart(input.receiverAddress),
    normalizeIdentityPart(input.messageType),
    normalizeIdentityPart(input.createdAt),
    input.content,
  ].join("\0");
  return `teammsg_${createHash("sha256").update(hashInput).digest("base64url").slice(0, 32)}`;
};

export const buildTeamCommunicationReferenceId = (input: {
  teamRunId: string;
  messageId: string;
  path: string;
}): string => {
  const hashInput = [
    normalizeIdentityPart(input.teamRunId),
    normalizeIdentityPart(input.messageId),
    normalizeTeamCommunicationReferencePath(input.path),
  ].join("\0");
  return `teamref_${createHash("sha256").update(hashInput).digest("base64url").slice(0, 32)}`;
};
