import type { ToolResultEvent } from './events/agent-events.js';
import type { ToolInvocation } from './tool-invocation.js';

export class ToolInvocationTurn {
  turnId: string | null;
  expectedInvocationIds: string[];
  private expectedInvocationSet: Set<string>;
  private settledResultsByInvocationId: Map<string, ToolResultEvent>;

  constructor(turnId: string | null, invocations: ToolInvocation[]) {
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

  settleResult(result: ToolResultEvent): boolean {
    const invocationId = result.toolInvocationId;
    if (!invocationId) {
      return false;
    }
    if (!this.expectsInvocation(invocationId)) {
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
