import { AsyncQueue } from "../../file-explorer/watcher/event-batcher.js";

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

  constructor(
    sessionId: string,
    workspaceId: string,
    eventStreamFactory: () => AsyncGenerator<string, void, void>,
  ) {
    this.sessionId = sessionId;
    this.workspaceId = workspaceId;
    this.eventStreamFactory = eventStreamFactory;

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
    try {
      for await (const event of this.eventStreamFactory()) {
        if (!this.active) {
          break;
        }
        this.eventQueue.push(event);
      }
    } catch (error) {
      logger.error(`Session ${this.sessionId}: Error forwarding events: ${String(error)}`);
    } finally {
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

  close(): void {
    this.active = false;
    this.eventQueue.push(null);
    logger.info(`FileExplorerSession closed: ${this.sessionId}`);
  }
}
