import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import { buildGatewaySignature } from "../../api/rest/middleware/verify-gateway-signature.js";

export type GatewayCallbackPublisherOptions = {
  baseUrl: string;
  sharedSecret?: string | null;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
};

export class GatewayCallbackPublisher {
  private readonly baseUrl: string;

  private readonly sharedSecret: string | null;

  private readonly timeoutMs: number;

  private readonly fetchFn: typeof fetch;

  constructor(options: GatewayCallbackPublisherOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.sharedSecret = normalizeOptionalString(options.sharedSecret ?? null);
    this.timeoutMs = normalizeTimeoutMs(options.timeoutMs ?? 5000);
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async publish(envelope: ExternalOutboundEnvelope): Promise<void> {
    const body = JSON.stringify(envelope);
    const headers = new Headers();
    headers.set("content-type", "application/json");
    const timestamp = Math.floor(Date.now() / 1000).toString();
    if (this.sharedSecret) {
      headers.set(
        "x-autobyteus-server-signature",
        buildGatewaySignature({
          rawBody: body,
          timestampHeader: timestamp,
          secret: this.sharedSecret,
        }),
      );
      headers.set("x-autobyteus-server-timestamp", timestamp);
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const response = await this.fetchFn(
        `${this.baseUrl}/api/server-callback/v1/messages`,
        {
          method: "POST",
          headers,
          body,
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        throw new Error(
          `Gateway callback request failed with status ${response.status}.`,
        );
      }
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error(
          `Gateway callback request timed out after ${this.timeoutMs}ms.`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}

const normalizeBaseUrl = (value: string): string => {
  const normalized = value.trim().replace(/\/+$/, "");
  if (normalized.length === 0) {
    throw new Error("Gateway callback baseUrl must be a non-empty string.");
  }
  return normalized;
};

const normalizeTimeoutMs = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Gateway callback timeoutMs must be a positive number.");
  }
  return value;
};

const normalizeOptionalString = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";
