import type { OutboundProviderAdapter } from "../../domain/models/provider-adapter.js";
import type { OutboundOutboxService } from "./outbound-outbox-service.js";
export type OutboundSenderWorkerConfig = {
    batchSize: number;
    loopIntervalMs: number;
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffFactor: number;
};
export type OutboundSenderWorkerDeps = {
    outboxService: Pick<OutboundOutboxService, "leasePending" | "markSending" | "markSent" | "markRetry" | "markDeadLetter">;
    outboundAdaptersByRoutingKey: Map<string, OutboundProviderAdapter>;
    config: OutboundSenderWorkerConfig;
    sleep?: (ms: number) => Promise<void>;
    nowIso?: () => string;
    onLoopError?: (error: unknown) => void;
};
export declare class OutboundSenderWorker {
    private readonly deps;
    private readonly sleep;
    private readonly nowIso;
    private running;
    private loopPromise;
    constructor(deps: OutboundSenderWorkerDeps);
    start(): void;
    stop(): Promise<void>;
    isRunning(): boolean;
    runOnce(): Promise<void>;
    private runLoop;
    private handleRecord;
    private handleFailure;
}
//# sourceMappingURL=outbound-sender-worker.d.ts.map