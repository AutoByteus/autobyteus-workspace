import { Message, MessageRole } from '../../llm/utils/messages.js';
import { setMessageProvenance } from '../message-provenance.js';
import { Retriever } from '../retrieval/retriever.js';
import { WorkingContext } from '../working-context.js';
import { CompactedMemoryMessageBuilder } from './compacted-memory-message-builder.js';

export type CompactedMemoryContextProjectionInput = {
  systemPrompt?: string;
  headMessages?: readonly Message[];
  continuationMessages: readonly Message[];
  maxEpisodic: number;
  maxSemantic: number;
};

export class CompactedMemoryContextProjector {
  constructor(
    private readonly retriever: Retriever,
    private readonly memoryMessageBuilder = new CompactedMemoryMessageBuilder(),
  ) {}

  project(input: CompactedMemoryContextProjectionInput): WorkingContext {
    const projected: Message[] = [];
    const systemMessages = input.headMessages?.filter(
      (message) => message.role === MessageRole.SYSTEM,
    ) ?? [];
    if (systemMessages.length) {
      projected.push(...systemMessages);
    } else if (input.systemPrompt?.trim()) {
      projected.push(new Message(MessageRole.SYSTEM, { content: input.systemPrompt }));
    }

    const bundle = this.retriever.retrieve(input.maxEpisodic, input.maxSemantic);
    const memoryContent = this.memoryMessageBuilder.build(bundle);
    if (memoryContent) {
      projected.push(setMessageProvenance(
        new Message(MessageRole.USER, { content: memoryContent }),
        { sourceKind: 'compacted_memory' },
      ));
    }

    projected.push(...input.continuationMessages.filter(
      (message) => message.role !== MessageRole.SYSTEM,
    ));
    return new WorkingContext(projected);
  }
}
