import { describe, it, expect, vi } from 'vitest';
import { AgentEventBridge } from '../../../../src/agent-team/streaming/agent-event-bridge.js';
import { StreamEvent, StreamEventType } from '../../../../src/agent/streaming/stream-events.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';

const SENTINEL = Symbol('sentinel');

class MockAgentEventStream {
  queue: Array<StreamEvent | typeof SENTINEL> = [];
  waiters: Array<(value: StreamEvent | typeof SENTINEL) => void> = [];
  close = vi.fn(async () => {
    this.put(SENTINEL);
  });

  put(item: StreamEvent | typeof SENTINEL): void {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(item);
      return;
    }
    this.queue.push(item);
  }

  private get(): Promise<StreamEvent | typeof SENTINEL> {
    const item = this.queue.shift();
    if (item !== undefined) {
      return Promise.resolve(item);
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  async *allEvents(): AsyncGenerator<StreamEvent, void, unknown> {
    while (true) {
      const item = await this.get();
      if (item === SENTINEL) {
        break;
      }
      yield item as StreamEvent;
    }
  }
}

describe('AgentEventBridge', () => {
  it('forwards agent events to notifier', async () => {
    const notifier = { publishAgentEvent: vi.fn() } as any;
    const stream = new MockAgentEventStream();

    const bridge = new AgentEventBridge(
      { agentId: 'agent-1' } as any,
      'TestAgent',
      notifier,
      { stream } as any
    );

    const event1 = new StreamEvent({
      agent_id: 'a1',
      event_type: StreamEventType.ASSISTANT_CHUNK,
      data: { content: 'chunk text', is_complete: false }
    });
    const event2 = new StreamEvent({
      agent_id: 'a1',
      event_type: StreamEventType.AGENT_STATUS_UPDATED,
      data: { new_status: AgentStatus.IDLE, old_status: AgentStatus.BOOTSTRAPPING }
    });

    stream.put(event1);
    stream.put(event2);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(notifier.publishAgentEvent).toHaveBeenCalledTimes(2);
    expect(notifier.publishAgentEvent).toHaveBeenCalledWith('TestAgent', event1);
    expect(notifier.publishAgentEvent).toHaveBeenCalledWith('TestAgent', event2);

    await bridge.cancel();
    expect(stream.close).toHaveBeenCalledTimes(1);
  });
});
