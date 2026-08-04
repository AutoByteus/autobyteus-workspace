import type { ExternalAttachment } from "autobyteus-ts/external-channel/external-attachment.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";
import { ServerMessage, ServerMessageType } from "./models.js";

export const createExternalUserMessageServerMessage = (input: {
  envelope: ExternalMessageEnvelope;
  executionAddress?: TeamExecutionAddress | null;
  displayName?: string | null;
  agentRunId?: string | null;
}): ServerMessage => new ServerMessage(ServerMessageType.EXTERNAL_USER_MESSAGE, {
  content: input.envelope.content,
  received_at: input.envelope.receivedAt,
  provider: input.envelope.provider,
  transport: input.envelope.transport,
  account_id: input.envelope.accountId,
  peer_id: input.envelope.peerId,
  thread_id: input.envelope.threadId,
  external_message_id: input.envelope.externalMessageId,
  context_file_paths: input.envelope.attachments.map(mapAttachment).filter((item): item is NonNullable<typeof item> => item !== null),
  ...(input.executionAddress ? { execution_address: input.executionAddress } : {}),
  ...(input.displayName ? { agent_name: input.displayName } : {}),
  ...(input.agentRunId ? { agent_id: input.agentRunId } : {}),
});

const mapAttachment = (attachment: ExternalAttachment): { path: string; type: "Audio" | "Image" | "Video" } | null => {
  if (!attachment.url?.trim()) return null;
  const kind = attachment.kind.trim().toLowerCase();
  const mime = attachment.mimeType?.trim().toLowerCase() ?? "";
  if (kind === "audio" || mime.startsWith("audio/")) return { path: attachment.url, type: "Audio" };
  if (kind === "image" || mime.startsWith("image/")) return { path: attachment.url, type: "Image" };
  if (kind === "video" || mime.startsWith("video/")) return { path: attachment.url, type: "Video" };
  return null;
};
