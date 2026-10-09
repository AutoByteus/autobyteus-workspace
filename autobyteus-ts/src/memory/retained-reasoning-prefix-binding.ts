import type { Message } from '../llm/utils/messages.js';
import { messageWithoutPrefixBoundReasoning } from '../llm/provider-native/provider-native-history.js';
import { WorkingContext } from './working-context.js';

/**
 * Keeps retained provider reasoning valid for the request prefix it is replayed under.
 *
 * Some providers bind the reasoning in their native assistant turns to the request prefix
 * (leading system run + tools) it was produced under and reject a request that replays it
 * under a changed prefix. Normal requests therefore leave history untouched (append-only,
 * cacheable). When the prefix digest differs from the previous request of this in-memory
 * agent, all prefix-bound reasoning is removed once and the stripped context is persisted.
 * The digest is not persisted, so the first request after creation or restore re-binds.
 */
export class RetainedReasoningPrefixBinding {
  private boundDigest: string | null = null;

  constructor(private readonly workingContext: {
    getMessages: () => Message[];
    replace: (workingContext: WorkingContext) => void;
  }) {}

  /** Returns whether reasoning was removed. */
  bind(digest: string): boolean {
    if (digest === this.boundDigest) return false;
    const current = this.workingContext.getMessages();
    const stripped = current.map(messageWithoutPrefixBoundReasoning);
    const removed = stripped.some(
      (message, index) => JSON.stringify(message.metadata) !== JSON.stringify(current[index]!.metadata),
    );
    if (removed) this.workingContext.replace(new WorkingContext(stripped));
    this.boundDigest = digest;
    return removed;
  }
}
