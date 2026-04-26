import type { ChannelRunOutputDeliveryRecord } from "../domain/models.js";

const RECOVERY_RETRY_DELAY_MS = 1_000;
const MAX_RECOVERY_ATTEMPTS = 12;

export class ChannelRunOutputRecoveryScheduler {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  schedule(
    record: ChannelRunOutputDeliveryRecord,
    attempt: number,
    work: (record: ChannelRunOutputDeliveryRecord, attempt: number) => Promise<void>,
  ): void {
    if (attempt > MAX_RECOVERY_ATTEMPTS || this.timers.has(record.deliveryKey)) {
      return;
    }
    const timer = setTimeout(() => {
      this.timers.delete(record.deliveryKey);
      void work(record, attempt).catch((error) => {
        console.error(
          `Channel run output recovery failed for '${record.deliveryKey}'.`,
          error,
        );
      });
    }, RECOVERY_RETRY_DELAY_MS);
    timer.unref?.();
    this.timers.set(record.deliveryKey, timer);
  }

  clear(deliveryKey: string): void {
    const timer = this.timers.get(deliveryKey);
    if (!timer) {
      return;
    }
    clearTimeout(timer);
    this.timers.delete(deliveryKey);
  }

  clearAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}
