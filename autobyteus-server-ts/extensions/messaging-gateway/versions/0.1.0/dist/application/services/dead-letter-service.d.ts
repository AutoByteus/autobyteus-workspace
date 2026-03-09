import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
export type DeadLetterRecord = {
    callbackIdempotencyKey: string;
    correlationMessageId: string;
    provider: string;
    transport: string;
    errorMessage: string;
    recordedAt: string;
};
export declare class DeadLetterService {
    private readonly records;
    recordFailedOutbound(payload: ExternalOutboundEnvelope, error: Error): Promise<void>;
    listDeadLetters(): DeadLetterRecord[];
}
//# sourceMappingURL=dead-letter-service.d.ts.map