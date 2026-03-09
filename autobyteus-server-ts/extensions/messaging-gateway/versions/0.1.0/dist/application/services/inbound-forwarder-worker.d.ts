import type { ServerIngressResult } from "../../infrastructure/server-api/autobyteus-server-client.js";
import type { InboundInboxRecord } from "../../domain/models/inbox-store.js";
import type { InboundInboxService } from "./inbound-inbox-service.js";
import type { InboundClassifierService } from "./inbound-classifier-service.js";
export type InboundForwarderWorkerConfig = {
    batchSize: number;
    loopIntervalMs: number;
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffFactor: number;
};
export type InboundForwarderWorkerDeps = {
    inboxService: Pick<InboundInboxService, "leasePending" | "markForwarding" | "markCompleted" | "markBlocked" | "markRetry" | "markDeadLetter">;
    classifierService: Pick<InboundClassifierService, "classify">;
    serverClient: {
        forwardInbound: (envelope: InboundInboxRecord["payload"]) => Promise<ServerIngressResult>;
    };
    config: InboundForwarderWorkerConfig;
    sleep?: (ms: number) => Promise<void>;
    nowIso?: () => string;
    onLoopError?: (error: unknown) => void;
};
export declare class InboundForwarderWorker {
    private readonly deps;
    private readonly sleep;
    private readonly nowIso;
    private running;
    private loopPromise;
    constructor(deps: InboundForwarderWorkerDeps);
    start(): void;
    stop(): Promise<void>;
    isRunning(): boolean;
    runOnce(): Promise<void>;
    private runLoop;
    private handleRecord;
    private handleFailure;
}
//# sourceMappingURL=inbound-forwarder-worker.d.ts.map