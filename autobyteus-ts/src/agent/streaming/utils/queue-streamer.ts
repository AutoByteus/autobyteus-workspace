export class QueueEmpty extends Error {
  constructor() {
    super('QueueEmpty');
  }
}

export class SimpleQueue<T> {
  private items: T[] = [];

  put(item: T): void {
    this.items.push(item);
  }

  getNowait(): T {
    if (this.items.length === 0) {
      throw new QueueEmpty();
    }
    return this.items.shift() as T;
  }

  empty(): boolean {
    return this.items.length === 0;
  }
}

export async function* streamQueueItems<T>(
  queue: SimpleQueue<T>,
  sentinel: object,
  sourceName = 'unspecified_queue',
  abortSignal?: AbortSignal
): AsyncGenerator<T, void, unknown> {
  if (!(queue instanceof SimpleQueue)) {
    throw new TypeError(`queue must be an instance of SimpleQueue for source '${sourceName}'.`);
  }
  if (sentinel === null || sentinel === undefined) {
    throw new Error(`sentinel object cannot be None for source '${sourceName}'.`);
  }

  console.debug(`Starting to stream items from queue '${sourceName}'.`);
  try {
    while (true) {
      if (abortSignal?.aborted) {
        throw new Error('Stream cancelled');
      }
      let item: T | object;
      try {
        item = queue.getNowait();
      } catch (error) {
        if (error instanceof QueueEmpty) {
          await new Promise((resolve) => setTimeout(resolve, 10));
          continue;
        }
        throw error;
      }
      if (item === sentinel) {
        console.debug(`Sentinel ${String(sentinel)} received from queue '${sourceName}'. Ending stream.`);
        break;
      }
      yield item as T;
    }
  } catch (error: any) {
    if (error?.message === 'Stream cancelled') {
      console.info(`Stream from queue '${sourceName}' was cancelled.`);
      throw error;
    }
    console.error(`Error streaming from queue '${sourceName}': ${error}`);
    throw error;
  } finally {
    console.debug(`Exiting streamQueueItems for queue '${sourceName}'.`);
  }
}
