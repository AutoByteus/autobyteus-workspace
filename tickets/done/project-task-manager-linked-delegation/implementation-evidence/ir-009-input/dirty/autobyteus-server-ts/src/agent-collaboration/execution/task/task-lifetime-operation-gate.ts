import type { TaskLifetimeAdmission } from './task-execution-lifetime.js';

/** Irreversible process latch, with finite admissions; durable authority is checked by its caller. */
export class TaskLifetimeOperationGate {
  private readonly states = new Map<string, { closed: boolean; count: number; drained: Set<() => void> }>();
  private state(id: string) {
    let state = this.states.get(id);
    if (!state) { state = { closed: false, count: 0, drained: new Set() }; this.states.set(id, state); }
    return state;
  }
  assertOpen(id: string): void {
    if (this.state(id).closed) throw new Error(`TASK_LIFETIME_CLOSED: lifetime '${id}' is permanently closed.`);
  }
  acquire(id: string): TaskLifetimeAdmission {
    this.assertOpen(id);
    const state = this.state(id); state.count++;
    let released = false;
    return Object.freeze({ assertOpen: () => this.assertOpen(id), release: () => {
      if (released) return; released = true;
      if (--state.count === 0) { for (const resolve of state.drained) resolve(); state.drained.clear(); }
    } });
  }
  close(id: string): void { this.state(id).closed = true; }
  drain(id: string): Promise<void> {
    const state = this.state(id);
    return state.count ? new Promise(resolve => state.drained.add(resolve)) : Promise.resolve();
  }
}
