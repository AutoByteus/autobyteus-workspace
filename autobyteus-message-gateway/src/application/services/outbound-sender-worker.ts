import type { OutboundProviderAdapter } from "../../domain/models/provider-adapter.js";
import type { OutboundOutboxRecord } from "../../domain/models/outbox-store.js";
import { nextDelayMs as nextRetryDelayMs } from "../../infrastructure/retry/exponential-backoff.js";
import { isTerminalRetryFailure } from "../../infrastructure/retry/retry-decision.js";
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
  outboxService: Pick<
    OutboundOutboxService,
    "leasePending" | "markSending" | "markSent" | "markRetry" | "markDeadLetter"
  >;
  outboundAdaptersByRoutingKey: Map<string, OutboundProviderAdapter>;
  config: OutboundSenderWorkerConfig;
  sleep?: (ms: number) => Promise<void>;
  nowIso?: () => string;
  onLoopError?: (error: unknown) => void;
};

export class OutboundSenderWorker {
  private readonly deps: OutboundSenderWorkerDeps;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly nowIso: () => string;
  private running = false;
  private loopPromise: Promise<void> | null = null;

  constructor(deps: OutboundSenderWorkerDeps) {
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
    const pending = await this.deps.outboxService.leasePending(
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

  private async handleRecord(record: OutboundOutboxRecord): Promise<void> {
    const routingKey = `${record.provider}:${record.transport}`;
    const adapter = this.deps.outboundAdaptersByRoutingKey.get(routingKey);
    if (!adapter) {
      await this.deps.outboxService.markDeadLetter(
        record.id,
        `Adapter is not configured for routing key ${routingKey}.`,
      );
      return;
    }

    await this.deps.outboxService.markSending(record.id);
    try {
      await adapter.sendOutbound(record.payload);
      await this.deps.outboxService.markSent(record.id);
    } catch (error) {
      await this.handleFailure(record, error);
    }
  }

  private async handleFailure(record: OutboundOutboxRecord, error: unknown): Promise<void> {
    const nextAttempt = record.attemptCount + 1;
    const message = toErrorMessage(error);
    if (isTerminalRetryFailure(error) || nextAttempt >= this.deps.config.maxAttempts) {
      await this.deps.outboxService.markDeadLetter(record.id, message);
      return;
    }

    const delayMs = nextRetryDelayMs(nextAttempt, {
      baseDelayMs: this.deps.config.baseDelayMs,
      maxDelayMs: this.deps.config.maxDelayMs,
      factor: this.deps.config.backoffFactor,
    });
    const nextAttemptAt = new Date(Date.parse(this.nowIso()) + delayMs).toISOString();
    await this.deps.outboxService.markRetry(record.id, message, nextAttemptAt);
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
  return "Unexpected outbound sending error.";
};
