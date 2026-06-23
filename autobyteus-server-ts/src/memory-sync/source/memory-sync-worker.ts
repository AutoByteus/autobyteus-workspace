import { getMemorySyncConfigService } from "./memory-sync-config-service.js";
import { getMemorySyncService } from "./memory-sync-service.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

export class MemorySyncWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private unsubscribe: (() => void) | null = null;

  start(): void {
    if (!this.unsubscribe) {
      this.unsubscribe = getMemorySyncConfigService().onConfigChanged(() => {
        void this.reload();
      });
    }
    void this.reload();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async reload(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const config = await getMemorySyncConfigService().getConfig();
    if (!config.source.enabled || !config.source.backgroundEnabled) {
      return;
    }
    this.schedule(config.source.intervalMs);
  }

  private schedule(intervalMs: number): void {
    this.timer = setTimeout(() => {
      void this.tick();
    }, intervalMs);
  }

  private async tick(): Promise<void> {
    if (this.running) {
      await this.reload();
      return;
    }
    this.running = true;
    try {
      await getMemorySyncService().startSync();
      logger.info("Memory Sync background cycle completed.");
    } catch (error) {
      logger.warn(`Memory Sync background cycle failed: ${String(error)}`);
    } finally {
      this.running = false;
      await this.reload();
    }
  }
}

let singleton: MemorySyncWorker | null = null;

export const getMemorySyncWorker = (): MemorySyncWorker => {
  singleton ??= new MemorySyncWorker();
  return singleton;
};

export const startMemorySyncWorker = (): void => {
  getMemorySyncWorker().start();
};

export const stopMemorySyncWorker = (): void => {
  getMemorySyncWorker().stop();
};

export const resetMemorySyncWorkerForTests = (): void => {
  singleton?.stop();
  singleton = null;
};
