import { BasePromptRenderer } from '../llm/prompt-renderers/base-prompt-renderer.js';
import { LLMUserMessage } from '../llm/user-message.js';
import { Message, MessageRole } from '../llm/utils/messages.js';
import { MemoryManager } from '../memory/memory-manager.js';
import { PendingCompactionExecutor } from '../memory/compaction/pending-compaction-executor.js';

export type RequestPackage = {
  messages: Message[];
  renderedPayload: unknown;
  didCompact: boolean;
};

export class LLMRequestAssembler {
  constructor(
    private readonly memoryManager: MemoryManager,
    private readonly renderer: BasePromptRenderer,
    private readonly pendingCompactionExecutor: PendingCompactionExecutor | null = null,
  ) {}

  async prepareRequest(
    processedUserInput: string | LLMUserMessage,
    turnId?: string | null,
    systemPrompt?: string | null,
  ): Promise<RequestPackage> {
    const userMessage = this.buildUserMessage(processedUserInput);
    this.ensureSystemPrompt(systemPrompt ?? undefined);

    const didCompact = this.pendingCompactionExecutor
      ? await this.pendingCompactionExecutor.executeIfRequired({
          turnId,
          systemPrompt: systemPrompt ?? '',
        })
      : false;

    this.memoryManager.workingContextSnapshot.appendMessage(userMessage);
    const finalMessages = this.memoryManager.getWorkingContextMessages();
    const renderedPayload = await this.renderPayload(finalMessages);

    return {
      messages: finalMessages,
      renderedPayload,
      didCompact
    };
  }

  async renderPayload(messages: Message[]): Promise<unknown> {
    return this.renderer.render(messages);
  }

  private buildUserMessage(processedUserInput: string | LLMUserMessage): Message {
    if (processedUserInput instanceof LLMUserMessage) {
      return new Message(MessageRole.USER, {
        content: processedUserInput.content,
        image_urls: processedUserInput.image_urls,
        audio_urls: processedUserInput.audio_urls,
        video_urls: processedUserInput.video_urls
      });
    }
    return new Message(MessageRole.USER, { content: String(processedUserInput) });
  }

  private ensureSystemPrompt(systemPrompt?: string): void {
    if (!systemPrompt) {
      return;
    }
    const existing = this.memoryManager.getWorkingContextMessages();
    if (!existing.length) {
      this.memoryManager.workingContextSnapshot.appendMessage(
        new Message(MessageRole.SYSTEM, { content: systemPrompt })
      );
    }
  }
}
