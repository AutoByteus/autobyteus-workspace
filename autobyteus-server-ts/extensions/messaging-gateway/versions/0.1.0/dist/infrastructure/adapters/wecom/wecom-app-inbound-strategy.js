import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { parseExternalMessageEnvelope, } from "autobyteus-ts/external-channel/external-message-envelope.js";
import { normalizeInboundMessageId } from "./wecom-inbound-message-id-normalizer.js";
export class WeComAppInboundStrategy {
    legacyAdapter;
    constructor(legacyAdapter) {
        this.legacyAdapter = legacyAdapter;
    }
    verifyHandshake(input) {
        const expected = this.legacyAdapter.createSignature(input.timestamp, input.nonce, input.echo);
        if (expected !== input.signature) {
            return {
                valid: false,
                code: "INVALID_SIGNATURE",
                detail: "WeCom app handshake signature mismatch.",
            };
        }
        return {
            valid: true,
            code: null,
            detail: "Signature verified.",
        };
    }
    verifyCallback(request, rawBody) {
        return this.legacyAdapter.verifyInboundSignature(request, rawBody);
    }
    parseCallback(accountId, request) {
        if (isRecord(request.body) && Array.isArray(request.body.events)) {
            return request.body.events.map((event) => this.mapEventEnvelope(event, accountId));
        }
        if (Array.isArray(request.body)) {
            return request.body.map((entry) => this.mapEventEnvelope(entry, accountId));
        }
        if (isRecord(request.body)) {
            return [this.mapEventEnvelope(request.body, accountId)];
        }
        return [parseExternalMessageEnvelope(request.body)];
    }
    createSignature(timestamp, nonce, rawBody) {
        return this.legacyAdapter.createSignature(timestamp, nonce, rawBody);
    }
    mapEventEnvelope(input, accountIdFallback) {
        if (!isRecord(input)) {
            throw new Error("Invalid WeCom app callback event payload.");
        }
        const accountId = normalizeOptionalString(input.accountId) ?? accountIdFallback;
        const peerId = normalizeOptionalString(input.peerId) ??
            normalizeOptionalString(input.from);
        const content = normalizeOptionalString(input.content) ??
            normalizeOptionalString(input.text) ??
            "";
        if (!peerId) {
            throw new Error("WeCom app callback event is missing peer identifier.");
        }
        return parseExternalMessageEnvelope({
            provider: ExternalChannelProvider.WECOM,
            transport: ExternalChannelTransport.BUSINESS_API,
            accountId,
            peerId,
            peerType: normalizeOptionalString(input.peerType) ?? ExternalPeerType.GROUP,
            threadId: normalizeOptionalString(input.threadId),
            externalMessageId: normalizeInboundMessageId(input),
            content,
            attachments: Array.isArray(input.attachments) ? input.attachments : [],
            receivedAt: normalizeOptionalString(input.receivedAt) ??
                normalizeOptionalString(input.timestamp) ??
                new Date().toISOString(),
            metadata: isRecord(input.metadata) ? input.metadata : {},
        });
    }
}
const isRecord = (input) => typeof input === "object" && input !== null && !Array.isArray(input);
const normalizeOptionalString = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};
//# sourceMappingURL=wecom-app-inbound-strategy.js.map