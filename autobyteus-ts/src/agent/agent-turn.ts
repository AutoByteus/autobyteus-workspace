import type { ToolInvocation } from './tool-invocation.js';
import { ToolInvocationBatch } from './tool-invocation-batch.js';
import { TurnToolInputPort } from './loop/turn-tool-input-port.js';
import { TurnExecutionScope } from './interruption/turn-execution-scope.js';
import type { AgentInterruptResult } from './interruption/agent-interruption.js';

export type TurnOutcome =
  | { kind: 'completed'; turnId: string }
  | { kind: 'interrupted'; turnId: string; reason: string }
  | { kind: 'failed'; turnId: string; error: unknown }
  | { kind: 'stopped'; turnId: string; reason: string };

export class AgentTurn {
  turnId: string;
  readonly toolInputPort: TurnToolInputPort;
  readonly executionScope: TurnExecutionScope;
  toolInvocationBatches: ToolInvocationBatch[] = [];
  activeToolInvocationBatch: ToolInvocationBatch | null = null;
  private settledOutcome: TurnOutcome | null = null;
  private settlementResolve!: (outcome: TurnOutcome) => void;
  readonly settlementPromise: Promise<TurnOutcome>;

  constructor(turnId: string) {
    if (!turnId) {
      throw new Error('AgentTurn requires a non-empty turnId.');
    }
    this.turnId = turnId;
    this.toolInputPort = new TurnToolInputPort(turnId);
    this.executionScope = new TurnExecutionScope(turnId);
    this.settlementPromise = new Promise<TurnOutcome>((resolve) => {
      this.settlementResolve = resolve;
    });
  }

  get isSettled(): boolean {
    return this.settledOutcome !== null;
  }

  get outcome(): TurnOutcome | null {
    return this.settledOutcome;
  }

  interrupt(reason: string): AgentInterruptResult {
    if (this.settledOutcome) {
      return {
        accepted: false,
        status: 'already_settled',
        turnId: this.turnId,
        reason,
        message: `Turn '${this.turnId}' is already settled.`
      };
    }
    const result = this.executionScope.interrupt(reason);
    this.toolInputPort.close('interrupted');
    return result;
  }

  settle(outcome: TurnOutcome): TurnOutcome {
    if (this.settledOutcome) {
      return this.settledOutcome;
    }
    this.settledOutcome = outcome;
    this.executionScope.markSettled();
    this.toolInputPort.close(outcome.kind === 'completed' ? 'completed' : outcome.kind);
    this.settlementResolve(outcome);
    return outcome;
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
    this.toolInputPort.registerToolInvocations(batch.getExpectedInvocationIds());
    return batch;
  }

  clearActiveToolInvocationBatch(batch?: ToolInvocationBatch): void {
    if (!batch || this.activeToolInvocationBatch === batch) {
      this.activeToolInvocationBatch = null;
    }
  }
}
