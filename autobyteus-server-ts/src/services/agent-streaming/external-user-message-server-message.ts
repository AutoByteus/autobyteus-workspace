import {
  parseTeamStreamServerMessage,
  type TeamStreamServerMessage,
} from "@autobyteus/team-stream-contracts";
import type { ExternalAttachment } from "autobyteus-ts/external-channel/external-attachment.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { ServerMessage, ServerMessageType } from "./models.js";

export const createExternalUserMessageServerMessage = (input: {
  envelope: ExternalMessageEnvelope;
  displayName?: string | null;
  agentRunId?: string | null;
}): ServerMessage => new ServerMessage(ServerMessageType.EXTERNAL_USER_MESSAGE, {
  ...basePayload(input.envelope),
  ...(input.displayName ? { agent_name: input.displayName } : {}),
  ...(input.agentRunId ? { agent_id: input.agentRunId } : {}),
});

export const createTeamExternalUserMessageServerMessage = (input: {
  envelope: ExternalMessageEnvelope;
  memberAddress: AgentTeamAddress;
  agentRunId: string;
}): TeamStreamServerMessage => parseTeamStreamServerMessage({
  type: "EXTERNAL_USER_MESSAGE",
  payload: {
    member_address: input.memberAddress,
    agent_run_id: input.agentRunId,
    ...basePayload(input.envelope),
  },
});

const basePayload = (envelope: ExternalMessageEnvelope) => ({
  content: envelope.content,
  received_at: envelope.receivedAt,
  provider: envelope.provider,
  transport: envelope.transport,
  account_id: envelope.accountId,
  peer_id: envelope.peerId,
  thread_id: envelope.threadId,
  external_message_id: envelope.externalMessageId,
  context_file_paths: envelope.attachments
    .map(mapAttachment)
    .filter((item): item is NonNullable<typeof item> => item !== null),
});

const mapAttachment = (
  attachment: ExternalAttachment,
): { path: string; type: "Audio" | "Image" | "Video" } | null => {
  if (!attachment.url?.trim()) return null;
  const kind = attachment.kind.trim().toLowerCase();
  const mime = attachment.mimeType?.trim().toLowerCase() ?? "";
  if (kind === "audio" || mime.startsWith("audio/")) return { path: attachment.url, type: "Audio" };
  if (kind === "image" || mime.startsWith("image/")) return { path: attachment.url, type: "Image" };
  if (kind === "video" || mime.startsWith("video/")) return { path: attachment.url, type: "Video" };
  return null;
};
