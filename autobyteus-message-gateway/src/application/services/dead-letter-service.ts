import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";

export type DeadLetterRecord = {
  callbackIdempotencyKey: string;
  correlationMessageId: string;
  provider: string;
  transport: string;
  errorMessage: string;
  recordedAt: string;
};

export class DeadLetterService {
  private readonly records: DeadLetterRecord[] = [];

  async recordFailedOutbound(payload: ExternalOutboundEnvelope, error: Error): Promise<void> {
    this.records.push({
      callbackIdempotencyKey: payload.callbackIdempotencyKey,
      correlationMessageId: payload.correlationMessageId,
      provider: payload.provider,
      transport: payload.transport,
      errorMessage: error.message,
      recordedAt: new Date().toISOString(),
    });
  }

  listDeadLetters(): DeadLetterRecord[] {
    return [...this.records];
  }
}
