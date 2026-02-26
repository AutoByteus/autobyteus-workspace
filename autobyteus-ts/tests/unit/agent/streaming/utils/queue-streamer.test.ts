import { describe, it, expect, vi } from 'vitest';
import { streamQueueItems, SimpleQueue } from '../../../../../src/agent/streaming/utils/queue-streamer.js';

const collectStream = async <T>(stream: AsyncIterable<T>): Promise<T[]> => {
  const results: T[] = [];
  for await (const item of stream) {
    results.push(item);
  }
  return results;
};

describe('streamQueueItems', () => {
  it('streams items until sentinel is encountered', async () => {
    const sentinel = {};
    const queue = new SimpleQueue<any>();
    const items = [1, 'two', { three: 3 }, [4, 4.0]];
    items.forEach((item) => queue.put(item));
    queue.put(sentinel);

    const results = await collectStream(streamQueueItems(queue, sentinel));
    expect(results).toEqual(items);
    expect(queue.empty()).toBe(true);
  });

  it('waits for sentinel when queue starts empty', async () => {
    const sentinel = {};
    const queue = new SimpleQueue<any>();

    setTimeout(() => queue.put(sentinel), 10);

    const results = await collectStream(streamQueueItems(queue, sentinel));
    expect(results).toEqual([]);
    expect(queue.empty()).toBe(true);
  });

  it('stops when sentinel is first item', async () => {
    const sentinel = {};
    const queue = new SimpleQueue<any>();
    queue.put(sentinel);
    queue.put(1);

    const results = await collectStream(streamQueueItems(queue, sentinel));
    expect(results).toEqual([]);
    expect(queue.empty()).toBe(false);
    expect(queue.getNowait()).toBe(1);
  });

  it('streams multiple items before sentinel', async () => {
    const sentinel = {};
    const queue = new SimpleQueue<any>();
    const items = Array.from({ length: 10 }, (_, i) => i);
    items.forEach((item) => queue.put(item));
    queue.put(sentinel);

    const results = await collectStream(streamQueueItems(queue, sentinel));
    expect(results).toEqual(items);
  });

  it.each([
    100,
    'hello world',
    { key: 'value', nested: [1, 2] },
    [true, false, null],
    42.75
  ])('streams various data types', async (dataItem) => {
    const sentinel = {};
    const queue = new SimpleQueue<any>();
    queue.put(dataItem);
    queue.put(sentinel);

    const results = await collectStream(streamQueueItems(queue, sentinel));
    expect(results).toEqual([dataItem]);
  });

  it('throws when queue type is invalid', async () => {
    const sentinel = {};
    await expect(collectStream(streamQueueItems([] as any, sentinel))).rejects.toThrow(/SimpleQueue/);
  });

  it('throws when sentinel is null', async () => {
    const queue = new SimpleQueue<any>();
    await expect(collectStream(streamQueueItems(queue, null as any))).rejects.toThrow(/sentinel object cannot be None/);
  });

  it('respects cancellation via AbortSignal', async () => {
    const sentinel = {};
    const queue = new SimpleQueue<any>();
    queue.put(1);
    queue.put(2);

    const controller = new AbortController();
    const stream = streamQueueItems(queue, sentinel, 'test_queue', controller.signal);
    const task = collectStream(stream);

    setTimeout(() => controller.abort(), 5);

    await expect(task).rejects.toThrow(/Stream cancelled/);
    queue.put(sentinel);
  });

  it('logs source name in debug output', async () => {
    const sentinel = {};
    const queue = new SimpleQueue<any>();
    const sourceName = 'my_custom_test_queue';
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    queue.put('data');
    queue.put(sentinel);

    await collectStream(streamQueueItems(queue, sentinel, sourceName));

    const messages = debugSpy.mock.calls.map((call) => call[0]);
    expect(messages).toContain(`Starting to stream items from queue '${sourceName}'.`);
    expect(messages.some((msg) => String(msg).includes('Sentinel'))).toBe(true);
    expect(messages).toContain(`Exiting streamQueueItems for queue '${sourceName}'.`);

    debugSpy.mockRestore();
  });
});
