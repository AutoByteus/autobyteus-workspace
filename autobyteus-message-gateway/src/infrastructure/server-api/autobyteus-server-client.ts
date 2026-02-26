import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalDeliveryEvent } from "autobyteus-ts/external-channel/external-delivery-event.js";
import { createServerSignature } from "./server-signature.js";

export type ServerIngressResult = {
  accepted: boolean;
  duplicate: boolean;
  disposition: "ROUTED" | "UNBOUND" | "DUPLICATE";
  bindingResolved: boolean;
};

export type AutobyteusServerClientConfig = {
  baseUrl: string;
  sharedSecret: string | null;
  fetchImpl?: typeof fetch;
};

export class AutobyteusServerClient {
  private static readonly inboundIngressPath = "/rest/api/channel-ingress/v1/messages";
  private static readonly deliveryIngressPath = "/rest/api/channel-ingress/v1/delivery-events";

  private readonly baseUrl: string;
  private readonly sharedSecret: string | null;
  private readonly fetchImpl: typeof fetch;

  constructor(config: AutobyteusServerClientConfig) {
    this.baseUrl = config.baseUrl;
    this.sharedSecret = config.sharedSecret;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async forwardInbound(payload: ExternalMessageEnvelope): Promise<ServerIngressResult> {
    const response = await this.postJson(AutobyteusServerClient.inboundIngressPath, payload);
    const body = await response.json();
    const duplicate = Boolean(body.duplicate);
    const disposition = parseIngressDisposition(body.disposition);
    const bindingResolved =
      typeof body.bindingResolved === "boolean"
        ? body.bindingResolved
        : disposition === "ROUTED";

    return {
      accepted: Boolean(body.accepted),
      duplicate,
      disposition,
      bindingResolved,
    };
  }

  async postDeliveryEvent(payload: ExternalDeliveryEvent): Promise<void> {
    const response = await this.postJson(AutobyteusServerClient.deliveryIngressPath, payload);
    if (!response.ok) {
      throw new Error(`Server delivery event rejected with status ${response.status}.`);
    }
  }

  private async postJson(path: string, payload: unknown): Promise<Response> {
    const body = JSON.stringify(payload);
    const headers = new Headers({
      "content-type": "application/json",
    });

    if (this.sharedSecret) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      headers.set("x-autobyteus-gateway-timestamp", timestamp);
      headers.set(
        "x-autobyteus-gateway-signature",
        createServerSignature(body, timestamp, this.sharedSecret),
      );
    }

    const response = await this.fetchImpl(new URL(path, this.baseUrl), {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`Server request failed for ${path} with status ${response.status}.`);
    }

    return response;
  }
}

const parseIngressDisposition = (
  value: unknown,
): ServerIngressResult["disposition"] => {
  if (value === "ROUTED" || value === "UNBOUND" || value === "DUPLICATE") {
    return value;
  }
  throw new Error(
    `Server ingress response contains unsupported disposition: ${String(value)}.`,
  );
};
