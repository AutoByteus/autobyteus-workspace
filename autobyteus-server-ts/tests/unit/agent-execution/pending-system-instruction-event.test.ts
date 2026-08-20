import { describe, expect, it, vi } from 'vitest';
import { PendingSystemInstructionEvent } from '../../../src/agent-execution/events/pending-system-instruction-event.js';
import type { AgentRunSourceEventBatchListener } from '../../../src/agent-execution/backends/agent-run-backend.js';

const trace = {
  id: 'raw-system-id',
  ts: 123.5,
  trace_type: 'system_instruction' as const,
  content: ' exact\ncontent ',
  source_event: 'SYSTEM_INSTRUCTIONS_SUPPLIED' as const,
};

describe('PendingSystemInstructionEvent', () => {
  it('requires listener binding and publishes the committed trace exactly once', async () => {
    const pending = new PendingSystemInstructionEvent(trace);
    await expect(pending.publishOnce('run-1', new Set())).rejects.toThrow('before listener binding');

    const listener = vi.fn<AgentRunSourceEventBatchListener>();
    const listeners = new Set<AgentRunSourceEventBatchListener>([listener]);
    await pending.publishOnce('run-1', listeners);
    await pending.publishOnce('run-1', listeners);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith([{
      eventType: 'SYSTEM_INSTRUCTIONS_SUPPLIED',
      runId: 'run-1',
      payload: { trace_id: 'raw-system-id', content: ' exact\ncontent ', ts: 123.5 },
      statusHint: null,
    }]);
  });
});
