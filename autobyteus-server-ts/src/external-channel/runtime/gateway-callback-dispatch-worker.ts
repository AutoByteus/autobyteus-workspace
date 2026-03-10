import { GatewayCallbackPublisher } from "./gateway-callback-publisher.js";
import type { DeliveryEventService } from "../services/delivery-event-service.js";
import type { GatewayCallbackDispatchTarget } from "./gateway-callback-dispatch-target-resolver.js";
import type { GatewayCallbackOutboxRecord } from "./gateway-callback-outbox-store.js";
import type { GatewayCallbackOutboxService } from "./gateway-callback-outbox-service.js";

export type GatewayCallbackDispatchWorkerConfig = {
  batchSize: number;
  loopIntervalMs: number;
  leaseDurationMs: number;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
};

type DeliveryEventPort = Pick<DeliveryEventService, "recordSent" | "recordFailed">;

export type GatewayCallbackDispatchWorkerDeps = {
  outboxService: Pick<
    GatewayCallbackOutboxService,
    "leaseBatch" | "markSent" | "markRetry" | "markDeadLetter"
  >;
  deliveryEventService: DeliveryEventPort;
  targetResolver: {
    resolveGatewayCallbackDispatchTarget: () => Promise<GatewayCallbackDispatchTarget>;
  };
  config: GatewayCallbackDispatchWorkerConfig;
  sleep?: (ms: number) => Promise<void>;
  nowIso?: () => string;
  onLoopError?: (error: unknown) => void;
};

export class GatewayCallbackDispatchWorker {
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly nowIso: () => string;
  private running = false;
  private loopPromise: Promise<void> | null = null;

  constructor(private readonly deps: GatewayCallbackDispatchWorkerDeps) {
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

  async runOnce(): Promise<void> {
    const records = await this.deps.outboxService.leaseBatch({
      limit: this.deps.config.batchSize,
      nowIso: this.nowIso(),
      leaseDurationMs: this.deps.config.leaseDurationMs,
    });

    for (const record of records) {
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

  private async handleRecord(record: GatewayCallbackOutboxRecord): Promise<void> {
    const target = await this.deps.targetResolver.resolveGatewayCallbackDispatchTarget();
    if (target.state === "DISABLED") {
      await this.markDeadLetter(record, target.reason);
      return;
    }
    if (target.state === "UNAVAILABLE") {
      await this.markRetryOrDeadLetter(record, {
        message: target.reason,
        retryable: true,
      });
      return;
    }
    if (!target.options) {
      await this.markRetryOrDeadLetter(record, {
        message: "Gateway callback target resolved without delivery options.",
        retryable: true,
      });
      return;
    }

    try {
      const publisher = new GatewayCallbackPublisher(target.options);
      await publisher.publish(record.payload);
      await this.deps.outboxService.markSent(record.id, requireLeaseToken(record));
      await this.deps.deliveryEventService.recordSent(toDeliveryEventInput(record));
    } catch (error) {
      await this.markRetryOrDeadLetter(record, normalizeFailure(error));
    }
  }

  private async markRetryOrDeadLetter(
    record: GatewayCallbackOutboxRecord,
    failure: { message: string; retryable: boolean },
  ): Promise<void> {
    const nextAttempt = record.attemptCount + 1;
    if (!failure.retryable || nextAttempt >= this.deps.config.maxAttempts) {
      await this.markDeadLetter(record, failure.message);
      return;
    }

    const delayMs = nextDelayMs(nextAttempt, this.deps.config);
    const nextAttemptAt = new Date(Date.parse(this.nowIso()) + delayMs).toISOString();
    await this.deps.outboxService.markRetry(record.id, requireLeaseToken(record), {
      nextAttemptAt,
      lastError: failure.message,
    });
  }

  private async markDeadLetter(
    record: GatewayCallbackOutboxRecord,
    message: string,
  ): Promise<void> {
    await this.deps.outboxService.markDeadLetter(
      record.id,
      requireLeaseToken(record),
      message,
    );
    await this.deps.deliveryEventService.recordFailed({
      ...toDeliveryEventInput(record),
      errorMessage: message,
    });
  }
}

const requireLeaseToken = (record: GatewayCallbackOutboxRecord): string => {
  if (!record.leaseToken) {
    throw new Error(`Gateway callback outbox record '${record.id}' is missing a lease token.`);
  }
  return record.leaseToken;
};

const toDeliveryEventInput = (record: GatewayCallbackOutboxRecord) => ({
  provider: record.payload.provider,
  transport: record.payload.transport,
  accountId: record.payload.accountId,
  peerId: record.payload.peerId,
  threadId: record.payload.threadId,
  correlationMessageId: record.payload.correlationMessageId,
  callbackIdempotencyKey: record.payload.callbackIdempotencyKey,
  metadata: record.payload.metadata,
});

const normalizeFailure = (
  error: unknown,
): { message: string; retryable: boolean } => {
  if (isGatewayCallbackError(error)) {
    return {
      message: error.message,
      retryable: error.retryable !== false,
    };
  }
  if (error instanceof Error) {
    return {
      message: error.message,
      retryable: true,
    };
  }
  return {
    message: "Unknown gateway callback dispatch failure.",
    retryable: true,
  };
};

const isGatewayCallbackError = (
  error: unknown,
): error is Error & { retryable?: boolean } =>
  error instanceof Error;

const nextDelayMs = (
  attempt: number,
  config: GatewayCallbackDispatchWorkerConfig,
): number => {
  const value = config.baseDelayMs * config.backoffFactor ** Math.max(0, attempt - 1);
  return Math.max(0, Math.min(config.maxDelayMs, Math.round(value)));
};

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
