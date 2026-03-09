import type { ExternalOutboundChunk, ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
export declare class OutboundChunkPlanner {
    planChunks(payload: ExternalOutboundEnvelope): ExternalOutboundChunk[];
    private resolveChunkLimit;
}
//# sourceMappingURL=outbound-chunk-planner.d.ts.map