import type { ToolInvocation } from './tool-invocation.js';
import { ToolInvocationBatch } from './tool-invocation-batch.js';

export class AgentTurn {
  turnId: string;
  toolInvocationBatches: ToolInvocationBatch[] = [];
  activeToolInvocationBatch: ToolInvocationBatch | null = null;

  constructor(turnId: string) {
    if (!turnId) {
      throw new Error('AgentTurn requires a non-empty turnId.');
    }
    this.turnId = turnId;
  }

  startToolInvocationBatch(toolInvocations: ToolInvocation[]): ToolInvocationBatch {
    const batch = new ToolInvocationBatch(
      this.turnId,
      toolInvocations.map((toolInvocation) => {
        if (toolInvocation.turnId && toolInvocation.turnId !== this.turnId) {
          throw new Error(
            `Tool invocation '${toolInvocation.id}' belongs to turn '${toolInvocation.turnId}', not '${this.turnId}'.`
          );
        }
        toolInvocation.turnId = this.turnId;
        return toolInvocation;
      })
    );

    this.toolInvocationBatches.push(batch);
    this.activeToolInvocationBatch = batch;
    return batch;
  }

  clearActiveToolInvocationBatch(batch?: ToolInvocationBatch): void {
    if (!batch || this.activeToolInvocationBatch === batch) {
      this.activeToolInvocationBatch = null;
    }
  }
}
