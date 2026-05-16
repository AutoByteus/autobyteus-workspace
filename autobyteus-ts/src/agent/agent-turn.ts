import type { ToolInvocation } from './tool-invocation.js';
import { ToolInvocationBatch } from './tool-invocation-batch.js';
import { TurnToolInputPort } from './loop/turn-tool-input-port.js';
import { TurnExecutionScope } from './interruption/turn-execution-scope.js';
import type { AgentInterruptResult } from './interruption/agent-interruption.js';
import { ToolExecutionApprovalEvent, ToolResultEvent } from './events/agent-events.js';
import {
  normalizeToolApprovalInvocationId,
  type PostToolApprovalResult
} from './tool-approval-result.js';
import {
  normalizeToolResultInvocationId,
  type PostToolResultResult
} from './tool-result-posting.js';

export type TurnOutcome =
  | { kind: 'completed'; turnId: string }
  | { kind: 'interrupted'; turnId: string; reason: string }
  | { kind: 'failed'; turnId: string; error: unknown }
  | { kind: 'stopped'; turnId: string; reason: string };

export type AgentTurnRunnerLike<TTrigger> = {
  run(trigger: TTrigger): Promise<TurnOutcome>;
};

export type AgentTurnExecutionOptions<TTrigger> = {
  trigger: TTrigger;
  runnerFactory: () => AgentTurnRunnerLike<TTrigger>;
  onUnexpectedError?: (error: unknown) => Promise<TurnOutcome> | TurnOutcome;
};

export class AgentTurn {
  turnId: string;
  readonly toolInputPort: TurnToolInputPort;
  readonly executionScope: TurnExecutionScope;
  toolInvocationBatches: ToolInvocationBatch[] = [];
  activeToolInvocationBatch: ToolInvocationBatch | null = null;
  private readonly pendingToolApprovals = new Map<string, ToolInvocation>();
  private executionPromise: Promise<TurnOutcome> | null = null;
  private settledOutcome: TurnOutcome | null = null;
  private settlementResolve!: (outcome: TurnOutcome) => void;
  private readonly settlementPromise: Promise<TurnOutcome>;

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

  get pendingToolApprovalsSnapshot(): Record<string, ToolInvocation> {
    return Object.fromEntries(this.pendingToolApprovals.entries());
  }

  startExecution<TTrigger>(options: AgentTurnExecutionOptions<TTrigger>): void {
    if (this.executionPromise) {
      throw new Error(`Turn '${this.turnId}' execution has already started.`);
    }

    this.executionPromise = (async () => {
      try {
        const runner = options.runnerFactory();
        const outcome = await runner.run(options.trigger);
        return this.settle(outcome);
      } catch (error) {
        const outcome = options.onUnexpectedError
          ? await options.onUnexpectedError(error)
          : { kind: 'failed' as const, turnId: this.turnId, error };
        return this.settle(outcome);
      }
    })();

    void this.executionPromise.catch(() => undefined);
  }

  waitForSettlement(): Promise<TurnOutcome> {
    return this.settlementPromise;
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

  storePendingToolInvocation(invocation: ToolInvocation): void {
    if (!invocation || !invocation.id) {
      return;
    }
    if (invocation.turnId && invocation.turnId !== this.turnId) {
      throw new Error(
        `Pending tool invocation '${invocation.id}' belongs to turn '${invocation.turnId}', not '${this.turnId}'.`
      );
    }
    invocation.turnId = this.turnId;
    this.pendingToolApprovals.set(invocation.id, invocation);
    this.toolInputPort.registerToolInvocation(invocation.id);
  }

  retrievePendingToolInvocation(invocationId: string): ToolInvocation | undefined {
    const invocation = this.pendingToolApprovals.get(invocationId);
    if (invocation) {
      this.pendingToolApprovals.delete(invocationId);
    }
    return invocation;
  }

  clearPendingToolApprovals(): void {
    this.pendingToolApprovals.clear();
  }

  postToolApproval(event: ToolExecutionApprovalEvent): PostToolApprovalResult {
    const invocationId = normalizeToolApprovalInvocationId(event.toolInvocationId) ?? String(event.toolInvocationId ?? '');

    if (this.isSettled) {
      return {
        accepted: false,
        code: 'stale_turn',
        invocationId,
        turnId: this.turnId,
        activeTurnId: this.turnId,
        message: `Tool approval '${invocationId}' targets already-settled turn '${this.turnId}'.`
      };
    }

    if (this.executionScope.isInterrupted) {
      return {
        accepted: false,
        code: 'interrupted_turn',
        invocationId,
        turnId: this.turnId,
        message: `Tool approval '${invocationId}' targets interrupted turn '${this.turnId}'.`
      };
    }

    const pendingInvocation = this.pendingToolApprovals.get(invocationId);
    if (!pendingInvocation || (pendingInvocation.turnId && pendingInvocation.turnId !== this.turnId)) {
      return {
        accepted: false,
        code: 'no_pending_invocation',
        invocationId,
        turnId: this.turnId,
        message: `Tool approval invocation '${invocationId}' is not pending for active turn '${this.turnId}'.`
      };
    }

    event.toolInvocationId = invocationId;
    event.turnId = this.turnId;
    const postResult = this.toolInputPort.postApproval(event);
    if (!postResult.accepted) {
      const code = postResult.code === 'closed' ? 'interrupted_turn' : 'no_pending_invocation';
      return code === 'interrupted_turn'
        ? {
            accepted: false,
            code,
            invocationId,
            turnId: this.turnId,
            message: postResult.message ?? `Tool approval '${invocationId}' could not be posted to interrupted turn.`
          }
        : {
            accepted: false,
            code,
            invocationId,
            turnId: this.turnId,
            message: postResult.message ?? `Tool approval '${invocationId}' is not pending.`
          };
    }

    return {
      accepted: true,
      code: 'posted',
      turnId: this.turnId,
      invocationId
    };
  }

  postToolResult(event: ToolResultEvent): PostToolResultResult {
    const invocationId = normalizeToolResultInvocationId(event.toolInvocationId) ?? String(event.toolInvocationId ?? '');

    if (this.isSettled) {
      return {
        accepted: false,
        code: 'stale_turn',
        invocationId,
        turnId: this.turnId,
        activeTurnId: this.turnId,
        message: `Tool result '${invocationId}' targets already-settled turn '${this.turnId}'.`
      };
    }

    if (this.executionScope.isInterrupted) {
      return {
        accepted: false,
        code: 'interrupted_turn',
        invocationId,
        turnId: this.turnId,
        message: `Tool result '${invocationId}' targets interrupted turn '${this.turnId}'.`
      };
    }

    const activeBatch = this.activeToolInvocationBatch;
    if (!activeBatch || !activeBatch.getExpectedInvocationIds().includes(invocationId)) {
      return {
        accepted: false,
        code: 'no_pending_invocation',
        invocationId,
        turnId: this.turnId,
        message: `Tool result invocation '${invocationId}' is not pending for active turn '${this.turnId}'.`
      };
    }

    if (!this.toolInputPort.hasToolResultWaiter(invocationId)) {
      return {
        accepted: false,
        code: 'no_result_consumer',
        invocationId,
        turnId: this.turnId,
        message: `Tool result invocation '${invocationId}' has no active external result consumer for turn '${this.turnId}'.`
      };
    }

    event.toolInvocationId = invocationId;
    event.turnId = this.turnId;
    const postResult = this.toolInputPort.postToolResult(event);
    if (!postResult.accepted) {
      if (postResult.code === 'closed') {
        return {
          accepted: false,
          code: 'interrupted_turn',
          invocationId,
          turnId: this.turnId,
          message: postResult.message ?? `Tool result '${invocationId}' could not be posted to interrupted turn.`
        };
      }
      if (postResult.code === 'no_waiter') {
        return {
          accepted: false,
          code: 'no_result_consumer',
          invocationId,
          turnId: this.turnId,
          message:
            postResult.message ??
            `Tool result invocation '${invocationId}' has no active external result consumer for turn '${this.turnId}'.`
        };
      }
      return {
        accepted: false,
        code: 'no_pending_invocation',
        invocationId,
        turnId: this.turnId,
        message: postResult.message ?? `Tool result '${invocationId}' is not pending.`
      };
    }

    return {
      accepted: true,
      code: 'posted',
      turnId: this.turnId,
      invocationId
    };
  }

  settle(outcome: TurnOutcome): TurnOutcome {
    if (this.settledOutcome) {
      return this.settledOutcome;
    }
    this.settledOutcome = outcome;
    this.executionScope.markSettled();
    this.toolInputPort.close(outcome.kind === 'completed' ? 'completed' : outcome.kind);
    this.pendingToolApprovals.clear();
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
