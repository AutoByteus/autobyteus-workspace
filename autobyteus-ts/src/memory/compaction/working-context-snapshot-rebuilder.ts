import { Message, MessageRole } from '../../llm/utils/messages.js';
import { setMessageProvenance } from '../message-provenance.js';
import type { MemoryBundle } from '../retrieval/memory-bundle.js';
import { CompactedMemoryMessageBuilder } from './compacted-memory-message-builder.js';

export type WorkingContextSnapshotRebuildInput = {
  systemPrompt: string;
  headMessages?: Message[];
  bundle: MemoryBundle;
  retainedMessages: Message[];
};

export class WorkingContextSnapshotRebuilder {
  constructor(
    private readonly memoryMessageBuilder: CompactedMemoryMessageBuilder = new CompactedMemoryMessageBuilder(),
  ) {}

  rebuild(input: WorkingContextSnapshotRebuildInput): Message[] {
    const rebuilt: Message[] = [];
    const systemMessages = input.headMessages?.filter((message) => message.role === MessageRole.SYSTEM) ?? [];
    if (systemMessages.length) {
      rebuilt.push(...systemMessages);
    } else if (input.systemPrompt.trim()) {
      rebuilt.push(new Message(MessageRole.SYSTEM, { content: input.systemPrompt }));
    }

    const memoryContent = this.memoryMessageBuilder.build(input.bundle);
    if (memoryContent) {
      rebuilt.push(setMessageProvenance(
        new Message(MessageRole.USER, { content: memoryContent }),
        { sourceKind: 'compacted_memory' },
      ));
    }

    rebuilt.push(...input.retainedMessages.filter((message) => message.role !== MessageRole.SYSTEM));
    return rebuilt;
  }
}
