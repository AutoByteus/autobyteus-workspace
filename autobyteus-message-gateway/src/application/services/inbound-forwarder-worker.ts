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
  inboxService: Pick<
    InboundInboxService,
    | "leasePending"
    | "markForwarding"
    | "markCompleted"
    | "markBlocked"
    | "markRetry"
    | "markDeadLetter"
  >;
  classifierService: Pick<InboundClassifierService, "classify">;
  serverClient: {
    forwardInbound: (envelope: InboundInboxRecord["payload"]) => Promise<ServerIngressResult>;
  };
  config: InboundForwarderWorkerConfig;
  sleep?: (ms: number) => Promise<void>;
  nowIso?: () => string;
  onLoopError?: (error: unknown) => void;
};

export class InboundForwarderWorker {
  private readonly deps: InboundForwarderWorkerDeps;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly nowIso: () => string;
  private running = false;
  private loopPromise: Promise<void> | null = null;

  constructor(deps: InboundForwarderWorkerDeps) {
    this.deps = deps;
    this.sleep = deps.sleep ?? defaultSleep;
    this.nowIso = deps.nowIso ?? (() => new Date().toISOString());
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.loopPromise = this.runLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.loopPromise;
    this.loopPromise = null;
  }

  isRunning(): boolean {
    return this.running;
  }

  async runOnce(): Promise<void> {
    const pending = await this.deps.inboxService.leasePending(
      this.deps.config.batchSize,
      this.nowIso(),
    );

    for (const record of pending) {
      await this.handleRecord(record);
    }
  }

  private async runLoop(): Promise<void> {
    while (this.running) {
      try {
        await this.runOnce();
      } catch (error) {
        this.deps.onLoopError?.(error);
      }
      if (!this.running) {
        break;
      }
      await this.sleep(this.deps.config.loopIntervalMs);
    }
  }

  private async handleRecord(record: InboundInboxRecord): Promise<void> {
    const classification = this.deps.classifierService.classify(record.payload);
    if (classification.decision === "BLOCKED") {
      await this.deps.inboxService.markBlocked(record.id, classification.reason);
      return;
    }

    await this.deps.inboxService.markForwarding(record.id);
    try {
      const result = await this.deps.serverClient.forwardInbound(record.payload);
      await this.deps.inboxService.markCompleted(record.id, result.disposition);
    } catch (error) {
      await this.handleFailure(record, error);
    }
  }

  private async handleFailure(record: InboundInboxRecord, error: unknown): Promise<void> {
    const nextAttempt = record.attemptCount + 1;
    const message = toErrorMessage(error);
    if (isTerminalFailure(error) || nextAttempt >= this.deps.config.maxAttempts) {
      await this.deps.inboxService.markDeadLetter(record.id, message);
      return;
    }

    const delayMs = nextDelayMs(nextAttempt, {
      baseDelayMs: this.deps.config.baseDelayMs,
      maxDelayMs: this.deps.config.maxDelayMs,
      factor: this.deps.config.backoffFactor,
    });
    const nextAttemptAt = new Date(Date.parse(this.nowIso()) + delayMs).toISOString();
    await this.deps.inboxService.markRetry(record.id, message, nextAttemptAt);
  }
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Unexpected inbound forwarding error.";
};

const isTerminalFailure = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if ((error as { retryable?: boolean }).retryable === true) {
    return false;
  }
  if ((error as { retryable?: boolean }).retryable === false) {
    return true;
  }
  if ("status" in error && typeof (error as { status?: unknown }).status === "number") {
    const status = (error as { status: number }).status;
    return status >= 400 && status < 500;
  }
  return false;
};

const nextDelayMs = (
  attempt: number,
  config: { baseDelayMs: number; maxDelayMs: number; factor: number },
): number => {
  const value = config.baseDelayMs * config.factor ** Math.max(0, attempt - 1);
  return Math.max(0, Math.min(config.maxDelayMs, Math.round(value)));
};
