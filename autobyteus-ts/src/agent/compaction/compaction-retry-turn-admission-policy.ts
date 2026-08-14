import type { MemoryManager } from '../../memory/memory-manager.js';
import type { TurnStartEventInboxEntry } from '../event-inbox/agent-event-inbox-entry.js';

export class CompactionRetryTurnAdmissionPolicy {
  constructor(private readonly getMemoryManager: () => MemoryManager | null) {}

  isDispatchable(entry: TurnStartEventInboxEntry): boolean {
    const memoryManager = this.getMemoryManager();
    return !memoryManager?.isCompactionAwaitingUserRetry() || entry.origin === 'user';
  }
}
