import { createHmac } from "node:crypto";
import { ExternalChannelTransport, } from "autobyteus-ts/external-channel/channel-transport.js";
import { parseExternalMessageEnvelope, } from "autobyteus-ts/external-channel/external-message-envelope.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
export class WhatsAppBusinessAdapter {
    provider = ExternalChannelProvider.WHATSAPP;
    transport = ExternalChannelTransport.BUSINESS_API;
    appSecret;
    sendImpl;
    constructor(config) {
        this.appSecret = config.appSecret;
        this.sendImpl =
            config.sendImpl ??
                (async () => ({
                    providerMessageId: null,
                    deliveredAt: new Date().toISOString(),
                    metadata: {},
                }));
    }
    verifyInboundSignature(request, rawBody) {
        if (!this.appSecret) {
            return {
                valid: true,
                code: null,
                detail: "Signature verification bypassed because appSecret is unset.",
            };
        }
        const signatureHeader = request.headers["x-whatsapp-signature"];
        if (!signatureHeader) {
            return {
                valid: false,
                code: "MISSING_SIGNATURE",
                detail: "Missing x-whatsapp-signature header.",
            };
        }
        const expected = this.createSignature(rawBody);
        if (expected !== signatureHeader) {
            return {
                valid: false,
                code: "INVALID_SIGNATURE",
                detail: "WhatsApp signature mismatch.",
            };
        }
        return {
            valid: true,
            code: null,
            detail: "Signature verified.",
        };
    }
    parseInbound(request) {
        if (Array.isArray(request.body)) {
            return request.body.map((item) => parseExternalMessageEnvelope(item));
        }
        if (isRecord(request.body) && Array.isArray(request.body.events)) {
            const accountId = normalizeString(request.body.accountId);
            return request.body.events.map((event) => {
                if (!isRecord(event)) {
                    throw new Error("Invalid WhatsApp event payload.");
                }
                return parseExternalMessageEnvelope({
                    provider: this.provider,
                    transport: this.transport,
                    accountId,
                    peerId: normalizeString(event.peerId ?? event.from),
                    peerType: normalizeString(event.peerType ?? ExternalPeerType.USER),
                    threadId: event.threadId ?? null,
                    externalMessageId: normalizeString(event.externalMessageId ?? event.id),
                    content: typeof event.content === "string" ? event.content : normalizeString(event.text),
                    attachments: Array.isArray(event.attachments) ? event.attachments : [],
                    receivedAt: event.receivedAt ?? event.timestamp ?? new Date().toISOString(),
                    metadata: isRecord(event.metadata) ? event.metadata : {},
                });
            });
        }
        return [parseExternalMessageEnvelope(request.body)];
    }
    async sendOutbound(payload) {
        return this.sendImpl(payload);
    }
    createSignature(rawBody) {
        if (!this.appSecret) {
            throw new Error("Cannot create signature without appSecret.");
        }
        const digest = createHmac("sha256", this.appSecret).update(rawBody).digest("hex");
        return `sha256=${digest}`;
    }
}
const isRecord = (input) => typeof input === "object" && input !== null && !Array.isArray(input);
const normalizeString = (value) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error("Expected non-empty string value.");
    }
    return value.trim();
};
//# sourceMappingURL=whatsapp-business-adapter.js.map