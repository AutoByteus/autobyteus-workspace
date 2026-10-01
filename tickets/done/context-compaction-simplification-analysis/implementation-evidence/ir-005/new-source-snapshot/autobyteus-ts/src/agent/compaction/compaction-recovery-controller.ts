import { AgentInterruptionError } from '../interruption/agent-interruption.js';
import type { AgentContext } from '../context/agent-context.js';
import type { CompactionRecoveryBlock, CompactionRetryRequest } from '../../memory/compaction/compaction-recovery.js';
import { publishCompactionRecoveryStatus } from '../status/status-update-utils.js';

/** Runtime-owned waiting/control, never an input queue or a second gate. */
export class CompactionRecoveryController {
  private readonly waiters = new Set<() => void>();
  constructor(private readonly context: AgentContext) {}

  snapshot(): CompactionRecoveryBlock | null {
    return this.context.state.memoryManager?.getCompactionRecovery() ?? null;
  }

  authorize(input: CompactionRetryRequest): 'accepted' | 'stale' {
    const block = this.snapshot();
    if (block?.position.kind === 'held_turn' && this.context.state.activeTurn?.turnId !== block.position.turnId) return 'stale';
    const result = this.context.state.memoryManager?.authorizeCompactionRetry(input) ?? 'stale';
    if (result === 'accepted') {
      this.publish();
      for (const wake of [...this.waiters]) wake();
      this.context.state.agentEventInbox?.wakeAvailability();
    }
    return result;
  }

  revokeUnused(input: CompactionRetryRequest): 'revoked' | 'stale' | 'in_use' {
    const result = this.context.state.memoryManager?.revokeUnusedCompactionRetry(input) ?? 'stale';
    if (result === 'revoked') this.publish();
    return result;
  }

  waitForRetry(turnId: string, signal: AbortSignal): Promise<void> {
    // Register before publishing the held fact. An earlier grant is already latched by MemoryManager.
    const waiting = new Promise<void>((resolve, reject) => {
      const cleanup = () => { this.waiters.delete(wake); signal.removeEventListener('abort', abort); };
      const abort = () => { cleanup(); reject(new AgentInterruptionError({ turnId, reason: typeof signal.reason === 'string' ? signal.reason : 'user_interrupt', operationKind: 'compaction_recovery_wait' })); };
      const wake = () => {
        if (signal.aborted) { abort(); return; }
        if (this.context.state.memoryManager?.isCompactionRetryAuthorizedForTurn(turnId)) {
          cleanup(); resolve();
        }
      };
      this.waiters.add(wake);
      signal.addEventListener('abort', abort, { once: true });
      wake();
    });
    this.publish();
    return waiting;
  }

  retireTurn(turnId: string): void {
    this.context.state.memoryManager?.retireCompactionTurn(turnId);
    this.publish();
  }

  revoke(): void {
    this.context.state.memoryManager?.revokeCompactionRetry();
    this.publish();
  }

  publish(previous: CompactionRecoveryBlock | null = null): void {
    const recovery = this.snapshot();
    const identity = recovery ?? previous;
    try {
    if (identity) {
      this.context.statusManager?.notifier.notifyCompactionRecovery({
        block: { operationId: identity.operationId, failureEpoch: identity.failureEpoch }, recovery,
      });
    }
    } catch { /* Diagnostic observers cannot prevent wakeup or retirement. */ }
    try { publishCompactionRecoveryStatus(this.context); } catch { /* State is already authoritative. */ }
  }
}
