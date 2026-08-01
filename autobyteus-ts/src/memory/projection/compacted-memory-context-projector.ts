import { Message, MessageRole } from '../../llm/utils/messages.js';
import {
  WorkingContextFinalizer,
  createCompactedMemoryUserMessage,
} from '../working-context-finalizer.js';
import { WorkingContext } from '../working-context.js';
import type { CompactedMemoryProjectionBundle } from './compacted-memory-projection-bundle.js';
import { CompactedMemoryMessageBuilder } from './compacted-memory-message-builder.js';

export type CompactedMemoryContextProjectionInput = {
  systemPrompt?: string;
  headMessages?: readonly Message[];
  continuationMessages: readonly Message[];
  bundle: CompactedMemoryProjectionBundle | null;
};

export class CompactedMemoryContextProjector {
  constructor(
    private readonly memoryMessageBuilder = new CompactedMemoryMessageBuilder(),
    private readonly finalizer = new WorkingContextFinalizer(),
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

    if (input.bundle) {
      const memoryContent = this.memoryMessageBuilder.build(input.bundle);
      if (!memoryContent) throw new Error('Compacted-memory bundle rendered no content.');
      projected.push(createCompactedMemoryUserMessage(memoryContent));
    }

    projected.push(...input.continuationMessages.filter(
      (message) => message.role !== MessageRole.SYSTEM,
    ));
    return this.finalizer.finalize({ messages: projected });
  }
}
