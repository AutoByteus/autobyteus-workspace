import type { ToolInvocation } from './tool-invocation.js';

export class ToolInvocationBatch {
  private readonly turnId: string;
  private readonly expectedInvocationIds: string[];
  private readonly expectedInvocationSet: Set<string>;

  constructor(turnId: string, invocations: ToolInvocation[]) {
    if (!turnId) {
      throw new Error('ToolInvocationBatch requires a non-empty turnId.');
    }
    this.turnId = turnId;
    this.expectedInvocationIds = invocations.map((invocation) => invocation.id);
    this.expectedInvocationSet = new Set(this.expectedInvocationIds);
  }

  expectsInvocation(invocationId: string): boolean {
    return this.expectedInvocationSet.has(invocationId);
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

  getExpectedInvocationIds(): string[] {
    return [...this.expectedInvocationIds];
  }
}
