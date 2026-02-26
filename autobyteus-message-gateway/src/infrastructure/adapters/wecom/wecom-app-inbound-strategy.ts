import type { SignatureResult } from "../../../domain/models/provider-adapter.js";
import type { InboundHttpRequest } from "../../../domain/models/inbound-http-request.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import {
  parseExternalMessageEnvelope,
  type ExternalMessageEnvelope,
} from "autobyteus-ts/external-channel/external-message-envelope.js";
import { WeComAdapter } from "./wecom-adapter.js";
import { normalizeInboundMessageId } from "./wecom-inbound-message-id-normalizer.js";

export class WeComAppInboundStrategy {
  constructor(private readonly legacyAdapter: WeComAdapter) {}

  verifyHandshake(input: {
    timestamp: string;
    nonce: string;
    signature: string;
    echo: string;
  }): SignatureResult {
    const expected = this.legacyAdapter.createSignature(
      input.timestamp,
      input.nonce,
      input.echo,
    );
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

  verifyCallback(request: InboundHttpRequest, rawBody: string): SignatureResult {
    return this.legacyAdapter.verifyInboundSignature(request, rawBody);
  }

  parseCallback(
    accountId: string,
    request: InboundHttpRequest,
  ): ExternalMessageEnvelope[] {
    if (isRecord(request.body) && Array.isArray(request.body.events)) {
      return request.body.events.map((event) =>
        this.mapEventEnvelope(event, accountId),
      );
    }

    if (Array.isArray(request.body)) {
      return request.body.map((entry) =>
        this.mapEventEnvelope(entry, accountId),
      );
    }

    if (isRecord(request.body)) {
      return [this.mapEventEnvelope(request.body, accountId)];
    }

    return [parseExternalMessageEnvelope(request.body)];
  }

  createSignature(timestamp: string, nonce: string, rawBody: string): string {
    return this.legacyAdapter.createSignature(timestamp, nonce, rawBody);
  }

  private mapEventEnvelope(
    input: unknown,
    accountIdFallback: string,
  ): ExternalMessageEnvelope {
    if (!isRecord(input)) {
      throw new Error("Invalid WeCom app callback event payload.");
    }

    const accountId =
      normalizeOptionalString(input.accountId) ?? accountIdFallback;
    const peerId =
      normalizeOptionalString(input.peerId) ??
      normalizeOptionalString(input.from);
    const content =
      normalizeOptionalString(input.content) ??
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
      peerType:
        normalizeOptionalString(input.peerType) ?? ExternalPeerType.GROUP,
      threadId: normalizeOptionalString(input.threadId),
      externalMessageId: normalizeInboundMessageId(input),
      content,
      attachments: Array.isArray(input.attachments) ? input.attachments : [],
      receivedAt:
        normalizeOptionalString(input.receivedAt) ??
        normalizeOptionalString(input.timestamp) ??
        new Date().toISOString(),
      metadata: isRecord(input.metadata) ? input.metadata : {},
    });
  }
}

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null && !Array.isArray(input);

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
