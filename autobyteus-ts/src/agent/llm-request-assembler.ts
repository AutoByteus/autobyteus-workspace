import { BasePromptRenderer } from '../llm/prompt-renderers/base-prompt-renderer.js';
import { LLMUserMessage } from '../llm/user-message.js';
import { Message, MessageRole } from '../llm/utils/messages.js';
import { CompactionSnapshotBuilder } from '../memory/compaction-snapshot-builder.js';
import { MemoryManager } from '../memory/memory-manager.js';

export type RequestPackage = {
  messages: Message[];
  renderedPayload: unknown;
  didCompact: boolean;
};

export class LLMRequestAssembler {
  private memoryManager: MemoryManager;
  private renderer: BasePromptRenderer;
  private compactionSnapshotBuilder: CompactionSnapshotBuilder;
  private maxEpisodic: number;
  private maxSemantic: number;

  constructor(
    memoryManager: MemoryManager,
    renderer: BasePromptRenderer,
    compactionSnapshotBuilder?: CompactionSnapshotBuilder,
    maxEpisodic = 3,
    maxSemantic = 20
  ) {
    this.memoryManager = memoryManager;
    this.renderer = renderer;
    this.compactionSnapshotBuilder = compactionSnapshotBuilder ?? new CompactionSnapshotBuilder();
    this.maxEpisodic = maxEpisodic;
    this.maxSemantic = maxSemantic;
  }

  async prepareRequest(
    processedUserInput: string | LLMUserMessage,
    currentTurnId?: string | null,
    systemPrompt?: string | null
  ): Promise<RequestPackage> {
    const userMessage = this.buildUserMessage(processedUserInput);
    this.ensureSystemPrompt(systemPrompt ?? undefined);

    let didCompact = false;
    const policy = this.memoryManager.compactionPolicy;
    const compactor = this.memoryManager.compactor;

    if (this.memoryManager.compactionRequired && policy && compactor) {
      const turnIds = compactor.selectCompactionWindow();
      if (turnIds.length) {
        compactor.compact(turnIds);
        const bundle = this.memoryManager.retriever.retrieve(this.maxEpisodic, this.maxSemantic);
        const rawTail = this.memoryManager.getRawTail(policy.rawTailTurns, currentTurnId ?? undefined);
        const snapshotMessages = this.compactionSnapshotBuilder.build(
          systemPrompt ?? '',
          bundle,
          rawTail
        );
        this.memoryManager.resetWorkingContextSnapshot(snapshotMessages);
        this.memoryManager.clearCompactionRequest();
        didCompact = true;
      }
    }

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
