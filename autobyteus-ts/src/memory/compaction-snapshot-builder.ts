import { Message, MessageRole } from '../llm/utils/messages.js';
import { setMessageProvenance } from './message-provenance.js';
import { CompactedMemoryMessageBuilder } from './compaction/compacted-memory-message-builder.js';
import type { MemoryBundle } from './retrieval/memory-bundle.js';
import type { CompactionPlan } from './compaction/compaction-plan.js';

export type CompactionSnapshotBuildOptions = {
  maxItemChars?: number | null;
};

/**
 * Natural compacted-memory snapshot builder.
 *
 * Runtime compaction now rebuilds working context through WorkingContextSnapshotRebuilder.
 * This builder intentionally emits only system + natural compacted-memory content and
 * never renders raw frontier blocks into LLM-facing text.
 */
export class CompactionSnapshotBuilder {
  constructor(
    private readonly memoryMessageBuilder: CompactedMemoryMessageBuilder = new CompactedMemoryMessageBuilder(),
  ) {}

  build(
    systemPrompt: string,
    bundle: MemoryBundle,
    _plan: CompactionPlan,
    _options: CompactionSnapshotBuildOptions = {}
  ): Message[] {
    const messages = [new Message(MessageRole.SYSTEM, { content: systemPrompt })];
    const memoryContent = this.memoryMessageBuilder.build(bundle);
    if (memoryContent) {
      messages.push(setMessageProvenance(
        new Message(MessageRole.USER, { content: memoryContent }),
        { sourceKind: 'compacted_memory' },
      ));
    }
    return messages;
  }
}
