import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { InboundMessageService, InboundNormalizedResult } from "./inbound-message-service.js";
export type InboundEnvelopeBridgeErrorReporter = (input: {
    envelope: ExternalMessageEnvelope;
    error: unknown;
}) => void;
export type InboundEnvelopeBridgeInfoReporter = (input: {
    envelope: ExternalMessageEnvelope;
    result: InboundNormalizedResult;
    reason: "DUPLICATE";
}) => void;
export declare class InboundEnvelopeBridgeService {
    private readonly inboundMessageService;
    private readonly errorReporter;
    private readonly infoReporter;
    constructor(inboundMessageService: Pick<InboundMessageService, "handleNormalizedEnvelope">, errorReporter?: InboundEnvelopeBridgeErrorReporter, infoReporter?: InboundEnvelopeBridgeInfoReporter);
    handleEnvelope(envelope: ExternalMessageEnvelope): Promise<void>;
}
//# sourceMappingURL=inbound-envelope-bridge-service.d.ts.map