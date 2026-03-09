import { type ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
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
export declare function toExternalMessageEnvelope(event: WhatsAppPersonalInboundEvent): ExternalMessageEnvelope;
//# sourceMappingURL=inbound-envelope-mapper.d.ts.map