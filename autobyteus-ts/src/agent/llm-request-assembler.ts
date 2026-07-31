import { BasePromptRenderer } from '../llm/prompt-renderers/base-prompt-renderer.js';
import { LLMUserMessage } from '../llm/user-message.js';
import { Message, MessageRole } from '../llm/utils/messages.js';
import { MemoryManager } from '../memory/memory-manager.js';
import { PendingCompactionExecutor } from '../memory/compaction/pending-compaction-executor.js';
import {
  UNKNOWN_MULTIMODAL_CAPABILITIES,
  type MultimodalCapabilities,
} from '../llm/multimodal-capabilities.js';
import {
  sanitizeMediaInputMessages,
  type MediaInputDiagnostic,
} from '../llm/utils/media-input-sanitizer.js';

export type RequestPackage = {
  canonicalMessages: Message[];
  outboundMessages: Message[];
  renderedPayload: unknown;
  mediaDiagnostics: MediaInputDiagnostic[];
  didCompact: boolean;
};

export class LLMRequestAssembler {
  constructor(
    private readonly memoryManager: MemoryManager,
    private readonly renderer: BasePromptRenderer,
    private readonly pendingCompactionExecutor: PendingCompactionExecutor | null = null,
    private readonly multimodalCapabilities: MultimodalCapabilities = UNKNOWN_MULTIMODAL_CAPABILITIES,
  ) {}

  async prepareRequest(
    processedUserInput: string | LLMUserMessage,
    turnId?: string | null,
    systemPrompt?: string | null,
  ): Promise<RequestPackage> {
    const userMessage = this.buildUserMessage(processedUserInput);
    this.ensureSystemPrompt(systemPrompt ?? undefined);
    this.memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
      recoverySourceEvent: 'LLMRequestAssembler.preCompaction',
    });

    const didCompact = this.pendingCompactionExecutor
      ? await this.pendingCompactionExecutor.executeIfRequired({
          turnId,
        })
      : false;

    this.memoryManager.appendWorkingContextUserMessage(userMessage, { turnId });
    this.memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
      recoverySourceEvent: 'LLMRequestAssembler.preRender',
    });
    const finalMessages = this.memoryManager.getWorkingContextMessages();
    return this.buildRequestPackage(finalMessages, didCompact);
  }

  async prepareToolContinuationRequest(
    turnId?: string | null,
    systemPrompt?: string | null,
  ): Promise<RequestPackage> {
    this.ensureSystemPrompt(systemPrompt ?? undefined);
    this.memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
      recoverySourceEvent: 'LLMRequestAssembler.preCompaction',
    });

    const didCompact = this.pendingCompactionExecutor
      ? await this.pendingCompactionExecutor.executeIfRequired({
          turnId,
        })
      : false;

    this.memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
      recoverySourceEvent: 'LLMRequestAssembler.preRender',
    });
    const finalMessages = this.memoryManager.getWorkingContextMessages();
    return this.buildRequestPackage(finalMessages, didCompact);
  }

  async renderPayload(messages: Message[]): Promise<unknown> {
    return this.renderer.render(messages);
  }

  private async buildRequestPackage(
    canonicalMessages: Message[],
    didCompact: boolean,
  ): Promise<RequestPackage> {
    const sanitized = await sanitizeMediaInputMessages(canonicalMessages, this.multimodalCapabilities);
    for (const diagnostic of sanitized.diagnostics) {
      console.warn(`[media-input] ${diagnostic.message}`);
    }
    return {
      canonicalMessages,
      outboundMessages: sanitized.outboundMessages,
      renderedPayload: await this.renderPayload(sanitized.outboundMessages),
      mediaDiagnostics: sanitized.diagnostics,
      didCompact,
    };
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
    this.memoryManager.ensureWorkingContextSystemMessage(systemPrompt);
  }
}
