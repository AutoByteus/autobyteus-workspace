import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import {
  FileGatewayCallbackOutboxStore,
  type GatewayCallbackOutboxEnqueueResult,
  type GatewayCallbackOutboxRecord,
  type GatewayCallbackOutboxStatus,
} from "./gateway-callback-outbox-store.js";

export class GatewayCallbackOutboxService {
  constructor(private readonly store: FileGatewayCallbackOutboxStore) {}

  async enqueueOrGet(
    callbackIdempotencyKey: string,
    payload: ExternalOutboundEnvelope,
  ): Promise<GatewayCallbackOutboxEnqueueResult> {
    return this.store.enqueueOrGet({
      callbackIdempotencyKey,
      payload,
    });
  }

  async leaseBatch(input: {
    limit: number;
    nowIso: string;
    leaseDurationMs: number;
  }): Promise<GatewayCallbackOutboxRecord[]> {
    return this.store.leaseBatch(input);
  }

  async markSent(recordId: string, leaseToken: string): Promise<GatewayCallbackOutboxRecord> {
    return this.store.markSent(recordId, leaseToken);
  }

  async markRetry(
    recordId: string,
    leaseToken: string,
    input: { nextAttemptAt: string; lastError: string },
  ): Promise<GatewayCallbackOutboxRecord> {
    return this.store.markRetry(recordId, leaseToken, input);
  }

  async markDeadLetter(
    recordId: string,
    leaseToken: string,
    lastError: string,
  ): Promise<GatewayCallbackOutboxRecord> {
    return this.store.markDeadLetter(recordId, leaseToken, { lastError });
  }

  async getById(recordId: string): Promise<GatewayCallbackOutboxRecord | null> {
    return this.store.getById(recordId);
  }

  async listByStatus(
    statuses: GatewayCallbackOutboxStatus[],
  ): Promise<GatewayCallbackOutboxRecord[]> {
    return this.store.listByStatus(statuses);
  }
}
