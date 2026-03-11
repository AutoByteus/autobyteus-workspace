import type { ExternalAttachment } from "autobyteus-ts/external-channel/external-attachment.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import { ServerMessage, ServerMessageType } from "./models.js";

export const createExternalUserMessageServerMessage = (input: {
  envelope: ExternalMessageEnvelope;
  agentName?: string | null;
  agentId?: string | null;
}): ServerMessage =>
  new ServerMessage(ServerMessageType.EXTERNAL_USER_MESSAGE, {
    content: input.envelope.content,
    received_at: input.envelope.receivedAt,
    provider: input.envelope.provider,
    transport: input.envelope.transport,
    account_id: input.envelope.accountId,
    peer_id: input.envelope.peerId,
    thread_id: input.envelope.threadId,
    external_message_id: input.envelope.externalMessageId,
    context_file_paths: input.envelope.attachments
      .map((attachment) => mapAttachmentToContextFilePath(attachment))
      .filter(
        (
          item,
        ): item is {
          path: string;
          type: "Audio" | "Image" | "Video";
        } => item !== null,
      ),
    ...(input.agentName ? { agent_name: input.agentName } : {}),
    ...(input.agentId ? { agent_id: input.agentId } : {}),
  });

const mapAttachmentToContextFilePath = (
  attachment: ExternalAttachment,
):
  | {
      path: string;
      type: "Audio" | "Image" | "Video";
    }
  | null => {
  if (typeof attachment.url !== "string" || attachment.url.trim().length === 0) {
    return null;
  }

  const kind = attachment.kind.trim().toLowerCase();
  const mimeType = attachment.mimeType?.trim().toLowerCase() ?? "";
  if (kind === "audio" || mimeType.startsWith("audio/")) {
    return {
      path: attachment.url,
      type: "Audio",
    };
  }
  if (kind === "image" || mimeType.startsWith("image/")) {
    return {
      path: attachment.url,
      type: "Image",
    };
  }
  if (kind === "video" || mimeType.startsWith("video/")) {
    return {
      path: attachment.url,
      type: "Video",
    };
  }
  return null;
};
