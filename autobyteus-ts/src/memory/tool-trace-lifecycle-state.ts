import type { RawTraceItem } from './models/raw-trace-item.js';
import {
  buildToolTraceLifecycleIndex,
  type ToolTraceLifecycleGroup,
} from './tool-trace-lifecycle-index.js';

export class ToolTraceLifecycleState {
  private readonly groups = new Map<string, ToolTraceLifecycleGroup>();

  constructor(rawTraces: readonly RawTraceItem[]) {
    for (const [key, group] of buildToolTraceLifecycleIndex(rawTraces)) {
      this.groups.set(key, group);
    }
  }

  get(key: string): ToolTraceLifecycleGroup | undefined {
    return this.groups.get(key);
  }

  values(): IterableIterator<ToolTraceLifecycleGroup> {
    return this.groups.values();
  }

  record(trace: RawTraceItem): void {
    if (trace.traceType !== 'tool_call' && trace.traceType !== 'tool_result') return;
    for (const [key, incoming] of buildToolTraceLifecycleIndex([trace])) {
      const existing = this.groups.get(key);
      this.groups.set(key, {
        identity: incoming.identity,
        call: existing?.call ?? incoming.call,
        result: existing?.result ?? incoming.result,
      });
    }
  }
}
