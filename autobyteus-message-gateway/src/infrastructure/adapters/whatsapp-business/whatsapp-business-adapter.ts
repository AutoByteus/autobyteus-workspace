import { createHmac } from "node:crypto";
import {
  ExternalChannelTransport,
} from "autobyteus-ts/external-channel/channel-transport.js";
import {
  parseExternalMessageEnvelope,
  type ExternalMessageEnvelope,
} from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type {
  ProviderAdapter,
  ProviderSendResult,
  SignatureResult,
} from "../../../domain/models/provider-adapter.js";
import type { InboundHttpRequest } from "../../../domain/models/inbound-http-request.js";

export type WhatsAppBusinessAdapterConfig = {
  appSecret: string | null;
  sendImpl?: (payload: ExternalOutboundEnvelope) => Promise<ProviderSendResult>;
};

export class WhatsAppBusinessAdapter implements ProviderAdapter {
  readonly provider = ExternalChannelProvider.WHATSAPP;
  readonly transport = ExternalChannelTransport.BUSINESS_API;
  private readonly appSecret: string | null;
  private readonly sendImpl: (payload: ExternalOutboundEnvelope) => Promise<ProviderSendResult>;

  constructor(config: WhatsAppBusinessAdapterConfig) {
    this.appSecret = config.appSecret;
    this.sendImpl =
      config.sendImpl ??
      (async () => ({
        providerMessageId: null,
        deliveredAt: new Date().toISOString(),
        metadata: {},
      }));
  }

  verifyInboundSignature(request: InboundHttpRequest, rawBody: string): SignatureResult {
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

  parseInbound(request: InboundHttpRequest): ExternalMessageEnvelope[] {
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

  async sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult> {
    return this.sendImpl(payload);
  }

  createSignature(rawBody: string): string {
    if (!this.appSecret) {
      throw new Error("Cannot create signature without appSecret.");
    }
    const digest = createHmac("sha256", this.appSecret).update(rawBody).digest("hex");
    return `sha256=${digest}`;
  }
}

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null && !Array.isArray(input);

const normalizeString = (value: unknown): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Expected non-empty string value.");
  }
  return value.trim();
};
