import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type {
  IdempotencyReservation,
  IdempotencyStore,
} from "../../domain/models/idempotency-store.js";

export type IdempotencyServiceConfig = {
  ttlSeconds: number;
};

export class IdempotencyService {
  private readonly store: IdempotencyStore;
  private readonly config: IdempotencyServiceConfig;

  constructor(store: IdempotencyStore, config: IdempotencyServiceConfig) {
    this.store = store;
    this.config = config;
  }

  async checkAndMark(key: string): Promise<IdempotencyReservation> {
    return this.store.checkAndSet(key, this.config.ttlSeconds);
  }

  async checkAndMarkEnvelope(
    envelope: ExternalMessageEnvelope,
  ): Promise<IdempotencyReservation> {
    const key = buildInboundIdempotencyKey(envelope);
    return this.checkAndMark(key);
  }
}

export function buildInboundIdempotencyKey(envelope: ExternalMessageEnvelope): string {
  const threadPart =
    typeof envelope.threadId === "string" && envelope.threadId.trim().length > 0
      ? envelope.threadId.trim()
      : "_";
  return [
    envelope.provider,
    envelope.transport,
    envelope.accountId,
    envelope.peerId,
    threadPart,
    envelope.externalMessageId,
  ].join(":");
}
