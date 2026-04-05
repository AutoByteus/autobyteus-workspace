import type { ToolResultEvent } from './events/agent-events.js';
import type { ToolInvocation } from './tool-invocation.js';

export class ToolInvocationBatch {
  turnId: string;
  expectedInvocationIds: string[];
  private expectedInvocationSet: Set<string>;
  private settledResultsByInvocationId: Map<string, ToolResultEvent>;

  constructor(turnId: string, invocations: ToolInvocation[]) {
    if (!turnId) {
      throw new Error('ToolInvocationBatch requires a non-empty turnId.');
    }
    this.turnId = turnId;
    this.expectedInvocationIds = invocations.map((invocation) => invocation.id);
    this.expectedInvocationSet = new Set(this.expectedInvocationIds);
    this.settledResultsByInvocationId = new Map();
  }

  expectsInvocation(invocationId: string): boolean {
    return this.expectedInvocationSet.has(invocationId);
  }

  hasSettled(invocationId: string): boolean {
    return this.settledResultsByInvocationId.has(invocationId);
  }

  accepts(invocationId: string, turnId?: string): boolean {
    if (!this.expectsInvocation(invocationId)) {
      return false;
    }
    if (!turnId) {
      return true;
    }
    return turnId === this.turnId;
  }

  settleResult(result: ToolResultEvent): boolean {
    const invocationId = result.toolInvocationId;
    if (!invocationId) {
      return false;
    }
    if (!this.accepts(invocationId, result.turnId)) {
      return false;
    }
    const wasAlreadySettled = this.settledResultsByInvocationId.has(invocationId);
    this.settledResultsByInvocationId.set(invocationId, result);
    return !wasAlreadySettled;
  }

  isComplete(): boolean {
    return this.settledResultsByInvocationId.size === this.expectedInvocationIds.length;
  }

  getOrderedSettledResults(): ToolResultEvent[] {
    const ordered: ToolResultEvent[] = [];
    for (const invocationId of this.expectedInvocationIds) {
      const result = this.settledResultsByInvocationId.get(invocationId);
      if (result) {
        ordered.push(result);
      }
    }
    return ordered;
  }

  getSettledInvocationIds(): string[] {
    return Array.from(this.settledResultsByInvocationId.keys());
  }
}
