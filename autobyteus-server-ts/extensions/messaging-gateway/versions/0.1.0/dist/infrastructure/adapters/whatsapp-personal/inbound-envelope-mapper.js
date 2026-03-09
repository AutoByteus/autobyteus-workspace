import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType, } from "autobyteus-ts/external-channel/peer-type.js";
import { parseExternalMessageEnvelope, } from "autobyteus-ts/external-channel/external-message-envelope.js";
export function toExternalMessageEnvelope(event) {
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
//# sourceMappingURL=inbound-envelope-mapper.js.map