import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import {
  ExternalPeerType,
} from "autobyteus-ts/external-channel/peer-type.js";
import {
  parseExternalMessageEnvelope,
  type ExternalMessageEnvelope,
} from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { PersonalInboundAttachment } from "./baileys-session-client.js";

export type WhatsAppPersonalInboundEvent = {
  sessionId: string;
  accountLabel: string;
  chatJid: string;
  senderJid: string;
  participantJid: string | null;
  messageId: string;
  text: string | null;
  attachments?: PersonalInboundAttachment[];
  receivedAt: string;
};

export function toExternalMessageEnvelope(
  event: WhatsAppPersonalInboundEvent,
): ExternalMessageEnvelope {
  const isGroup = event.chatJid.endsWith("@g.us");
  const peerId = isGroup ? event.participantJid ?? event.senderJid : event.senderJid;
  const peerType = isGroup ? ExternalPeerType.GROUP : ExternalPeerType.USER;
  const threadId = isGroup ? event.chatJid : null;

  return parseExternalMessageEnvelope({
    provider: ExternalChannelProvider.WHATSAPP,
    transport: ExternalChannelTransport.PERSONAL_SESSION,
    accountId: event.accountLabel,
    peerId,
    peerType,
    threadId,
    externalMessageId: event.messageId,
    content: event.text ?? "",
    attachments: Array.isArray(event.attachments) ? event.attachments : [],
    receivedAt: event.receivedAt,
    metadata: {
      sessionId: event.sessionId,
      chatJid: event.chatJid,
      senderJid: event.senderJid,
      ...(event.participantJid ? { participantJid: event.participantJid } : {}),
    },
  });
}
