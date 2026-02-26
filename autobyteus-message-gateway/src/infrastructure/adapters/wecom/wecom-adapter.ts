import { createHash } from "node:crypto";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import {
  parseExternalMessageEnvelope,
  type ExternalMessageEnvelope,
} from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { InboundHttpRequest } from "../../../domain/models/inbound-http-request.js";
import type {
  ProviderAdapter,
  ProviderSendResult,
  SignatureResult,
} from "../../../domain/models/provider-adapter.js";

export type WeComAdapterConfig = {
  webhookToken: string | null;
  sendImpl?: (payload: ExternalOutboundEnvelope) => Promise<ProviderSendResult>;
};

export class WeComAdapter implements ProviderAdapter {
  readonly provider = ExternalChannelProvider.WECOM;
  readonly transport = ExternalChannelTransport.BUSINESS_API;

  private readonly webhookToken: string | null;
  private readonly sendImpl: (payload: ExternalOutboundEnvelope) => Promise<ProviderSendResult>;

  constructor(config: WeComAdapterConfig) {
    this.webhookToken = config.webhookToken;
    this.sendImpl =
      config.sendImpl ??
      (async () => ({
        providerMessageId: null,
        deliveredAt: new Date().toISOString(),
        metadata: {},
      }));
  }

  verifyInboundSignature(request: InboundHttpRequest, rawBody: string): SignatureResult {
    if (!this.webhookToken) {
      return {
        valid: true,
        code: null,
        detail: "Signature verification bypassed because webhook token is unset.",
      };
    }

    const timestamp = request.headers["x-wecom-timestamp"];
    const nonce = request.headers["x-wecom-nonce"];
    const signature = request.headers["x-wecom-signature"];

    if (!timestamp || !nonce || !signature) {
      return {
        valid: false,
        code: "MISSING_SIGNATURE",
        detail: "Missing WeCom signature headers.",
      };
    }

    const expected = this.createSignature(timestamp, nonce, rawBody);
    if (expected !== signature) {
      return {
        valid: false,
        code: "INVALID_SIGNATURE",
        detail: "WeCom signature mismatch.",
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
      return request.body.map((entry) => parseExternalMessageEnvelope(entry));
    }

    if (isRecord(request.body) && Array.isArray(request.body.events)) {
      const accountId = normalizeString(request.body.accountId);
      return request.body.events.map((event) => {
        if (!isRecord(event)) {
          throw new Error("Invalid WeCom event payload.");
        }

        return parseExternalMessageEnvelope({
          provider: this.provider,
          transport: this.transport,
          accountId,
          peerId: normalizeString(event.peerId ?? event.from),
          peerType: normalizeString(event.peerType ?? ExternalPeerType.GROUP),
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

  createSignature(timestamp: string, nonce: string, rawBody: string): string {
    if (!this.webhookToken) {
      throw new Error("Cannot create WeCom signature without webhook token.");
    }

    const sorted = [this.webhookToken, timestamp, nonce, rawBody].sort().join(":");
    return createHash("sha1").update(sorted).digest("hex");
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
