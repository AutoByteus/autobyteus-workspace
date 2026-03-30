import { AgentInputUserMessage, ContextFile, ContextFileType } from "autobyteus-ts";
import { buildAgentExternalSourceMetadata } from "autobyteus-ts/agent/message/external-source-metadata.js";
import type { ExternalAttachment } from "autobyteus-ts/external-channel/external-attachment.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";

export const buildAgentInputMessage = (
  envelope: ExternalMessageEnvelope,
): AgentInputUserMessage => {
  const externalSource = buildAgentExternalSourceMetadata(envelope);
  const contextFiles = envelope.attachments
    .map((attachment) => mapAttachmentToContextFile(attachment))
    .filter((item): item is ContextFile => item !== null);
  const metadata: Record<string, unknown> = {
    ...envelope.metadata,
    externalSource,
  };

  return AgentInputUserMessage.fromDict({
    content: envelope.content,
    context_files: contextFiles.length > 0 ? contextFiles.map((file) => file.toDict()) : null,
    metadata,
  });
};

const mapAttachmentToContextFile = (attachment: ExternalAttachment): ContextFile | null => {
  if (typeof attachment.url !== "string" || attachment.url.trim().length === 0) {
    return null;
  }

  const fileType = inferContextFileType(attachment);
  if (fileType === null) {
    return null;
  }

  return new ContextFile(
    attachment.url,
    fileType,
    attachment.fileName,
    {
      source: "external-attachment",
      kind: attachment.kind,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      ...attachment.metadata,
    },
  );
};

const inferContextFileType = (attachment: ExternalAttachment): ContextFileType | null => {
  const kind = attachment.kind.trim().toLowerCase();
  const mimeType = attachment.mimeType?.trim().toLowerCase() ?? "";

  if (kind === "audio" || mimeType.startsWith("audio/")) {
    return ContextFileType.AUDIO;
  }
  if (kind === "image" || mimeType.startsWith("image/")) {
    return ContextFileType.IMAGE;
  }
  if (kind === "video" || mimeType.startsWith("video/")) {
    return ContextFileType.VIDEO;
  }

  return null;
};
