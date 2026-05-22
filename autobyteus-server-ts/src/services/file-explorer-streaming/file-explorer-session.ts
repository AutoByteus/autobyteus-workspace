import { AsyncQueue } from "../../file-explorer/watcher/event-batcher.js";
import type { WatcherLease } from "../../file-explorer/base-file-explorer.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  debug: (...args: unknown[]) => console.debug(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class FileExplorerSession {
  readonly sessionId: string;
  readonly workspaceId: string;
  private eventStreamFactory: () => AsyncGenerator<string, void, void>;
  private active = true;
  private eventQueue = new AsyncQueue<string | null>();
  private forwarder: Promise<void> | null = null;
  private eventGenerator: AsyncGenerator<string, void, void> | null = null;
  private watcherLease: WatcherLease | null;
  private closePromise: Promise<void> | null = null;

  constructor(
    sessionId: string,
    workspaceId: string,
    eventStreamFactory: () => AsyncGenerator<string, void, void>,
    watcherLease: WatcherLease | null = null,
  ) {
    this.sessionId = sessionId;
    this.workspaceId = workspaceId;
    this.eventStreamFactory = eventStreamFactory;
    this.watcherLease = watcherLease;

    logger.info(`FileExplorerSession created: ${sessionId} for workspace ${workspaceId}`);
  }

  async start(): Promise<void> {
    if (this.forwarder) {
      return;
    }

    this.forwarder = this.forwardEvents();
    logger.debug(`Session ${this.sessionId}: Started event forwarding task`);
  }

  private async forwardEvents(): Promise<void> {
    const generator = this.eventStreamFactory();
    this.eventGenerator = generator;
    try {
      for await (const event of generator) {
        if (!this.active) {
          break;
        }
        this.eventQueue.push(event);
      }
    } catch (error) {
      logger.error(`Session ${this.sessionId}: Error forwarding events: ${String(error)}`);
    } finally {
      if (this.eventGenerator === generator) {
        this.eventGenerator = null;
      }
      this.eventQueue.push(null);
    }
  }

  async *events(): AsyncGenerator<string, void, void> {
    while (true) {
      const event = await this.eventQueue.pop();
      if (event === null || !this.active) {
        break;
      }
      yield event;
    }
  }

  async close(): Promise<void> {
    if (this.closePromise) {
      return this.closePromise;
    }

    this.closePromise = this.closeOnce();
    return this.closePromise;
  }

  private async closeOnce(): Promise<void> {
    this.active = false;
    this.eventQueue.push(null);

    const lease = this.watcherLease;
    this.watcherLease = null;
    try {
      await lease?.release();
    } catch (error) {
      logger.error(`Session ${this.sessionId}: Error releasing watcher lease: ${String(error)}`);
    }

    try {
      await this.eventGenerator?.return?.();
    } catch (error) {
      logger.error(`Session ${this.sessionId}: Error cancelling event generator: ${String(error)}`);
    }

    if (this.forwarder) {
      try {
        await this.forwarder;
      } catch {
        // ignore
      }
    }

    logger.info(`FileExplorerSession closed: ${this.sessionId}`);
  }
}
