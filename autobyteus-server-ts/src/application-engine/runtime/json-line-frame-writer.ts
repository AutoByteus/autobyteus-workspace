import type { Writable } from "node:stream";

export const APPLICATION_ENGINE_FRAME_QUEUE_LIMIT = 512;
export const APPLICATION_ENGINE_FRAME_BYTES_LIMIT = 4 * 1024 * 1024;

type QueuedFrame = { line: string; bytes: number; resolve: () => void; reject: (error: Error) => void };

export class JsonLineFrameWriter {
  private readonly queue: QueuedFrame[] = [];
  private queuedBytes = 0;
  private waitingForDrain = false;
  private failed: Error | null = null;

  constructor(private readonly stream: Writable) {
    stream.on("error", (error) => this.fail(error instanceof Error ? error : new Error(String(error))));
  }

  write(frame: Record<string, unknown>): Promise<void> {
    if (this.failed) return Promise.reject(this.failed);
    let line: string;
    try { line = `${JSON.stringify(frame)}\n`; } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
    const bytes = Buffer.byteLength(line, "utf8");
    if (this.queue.length >= APPLICATION_ENGINE_FRAME_QUEUE_LIMIT ||
        this.queuedBytes + bytes > APPLICATION_ENGINE_FRAME_BYTES_LIMIT) {
      return Promise.reject(new Error("Application engine frame queue backpressure limit exceeded."));
    }
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ line, bytes, resolve, reject });
      this.queuedBytes += bytes;
      this.flush();
    });
  }

  fail(error: Error): void {
    if (this.failed) return;
    this.failed = error;
    for (const item of this.queue.splice(0)) item.reject(error);
    this.queuedBytes = 0;
  }

  private flush(): void {
    if (this.waitingForDrain || this.failed) return;
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.queuedBytes -= item.bytes;
      let accepted = false;
      try { accepted = this.stream.write(item.line); } catch (error) {
        item.reject(error instanceof Error ? error : new Error(String(error)));
        this.fail(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      item.resolve();
      if (!accepted) {
        this.waitingForDrain = true;
        this.stream.once("drain", () => {
          this.waitingForDrain = false;
          this.flush();
        });
        return;
      }
    }
  }
}
