import type { SystemInstructionTraceRecord } from 'autobyteus-ts';
import type { AgentRunSourceEventBatchListener } from '../backends/agent-run-backend.js';
import { buildSystemInstructionsSuppliedEvent } from '../domain/system-instructions-supplied-event.js';

export class PendingSystemInstructionEvent {
  private trace: SystemInstructionTraceRecord | null;

  constructor(trace: SystemInstructionTraceRecord | null | undefined) {
    this.trace = trace ?? null;
  }

  async publishOnce(
    runId: string,
    listeners: ReadonlySet<AgentRunSourceEventBatchListener>,
  ): Promise<void> {
    const trace = this.trace;
    if (!trace) return;
    if (listeners.size === 0) {
      throw new Error(`Cannot publish system instructions for run '${runId}' before listener binding.`);
    }
    const event = buildSystemInstructionsSuppliedEvent(runId, trace);
    for (const listener of listeners) {
      await listener([event]);
    }
    this.trace = null;
  }
}
