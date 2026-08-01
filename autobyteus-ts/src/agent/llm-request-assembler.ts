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
import type { LlmRequestRecoverySnapshot } from '../memory/llm-request-recovery.js';

export type LlmRequestAssemblyIdentity = Readonly<{
  turnId: string;
  requestId: string;
}>;

export type RequestPackage = {
  canonicalMessages: Message[];
  outboundMessages: Message[];
  renderedPayload: unknown;
  mediaDiagnostics: MediaInputDiagnostic[];
  didCompact: boolean;
  recoverySnapshot: LlmRequestRecoverySnapshot;
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
    identity: LlmRequestAssemblyIdentity,
    systemPrompt?: string | null,
  ): Promise<RequestPackage> {
    const userMessage = this.buildUserMessage(processedUserInput);
    this.ensureSystemPrompt(systemPrompt ?? undefined);
    this.memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
      recoverySourceEvent: 'LLMRequestAssembler.preCompaction',
    });

    const didCompact = this.pendingCompactionExecutor
      ? await this.pendingCompactionExecutor.executeIfRequired({
          turnId: identity.turnId,
        })
      : false;

    const recoverySnapshot = this.captureRecoverySnapshot(identity);
    try {
      this.memoryManager.appendWorkingContextUserMessage(userMessage, { turnId: identity.turnId });
      this.memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
        recoverySourceEvent: 'LLMRequestAssembler.preRender',
      });
      const finalMessages = this.memoryManager.getWorkingContextMessages();
      return await this.buildRequestPackage(finalMessages, didCompact, recoverySnapshot);
    } catch (error) {
      this.memoryManager.restoreLlmRequestRecoverySnapshot(recoverySnapshot, {
        reason: 'request assembly failed after the stable-base checkpoint',
        sourceEvent: 'LLMRequestAssembler.prepareRequest',
      });
      throw error;
    }
  }

  async prepareToolContinuationRequest(
    identity: LlmRequestAssemblyIdentity,
    systemPrompt?: string | null,
  ): Promise<RequestPackage> {
    this.ensureSystemPrompt(systemPrompt ?? undefined);
    this.memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
      recoverySourceEvent: 'LLMRequestAssembler.preCompaction',
    });

    const didCompact = this.pendingCompactionExecutor
      ? await this.pendingCompactionExecutor.executeIfRequired({
          turnId: identity.turnId,
        })
      : false;

    const recoverySnapshot = this.captureRecoverySnapshot(identity);
    try {
      this.memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
        recoverySourceEvent: 'LLMRequestAssembler.preRender',
      });
      const finalMessages = this.memoryManager.getWorkingContextMessages();
      return await this.buildRequestPackage(finalMessages, didCompact, recoverySnapshot);
    } catch (error) {
      this.memoryManager.restoreLlmRequestRecoverySnapshot(recoverySnapshot, {
        reason: 'tool-continuation assembly failed after the stable-base checkpoint',
        sourceEvent: 'LLMRequestAssembler.prepareToolContinuationRequest',
      });
      throw error;
    }
  }

  async renderPayload(messages: Message[]): Promise<unknown> {
    return this.renderer.render(messages);
  }

  private async buildRequestPackage(
    canonicalMessages: Message[],
    didCompact: boolean,
    recoverySnapshot: LlmRequestRecoverySnapshot,
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
      recoverySnapshot,
    };
  }

  private captureRecoverySnapshot(
    identity: LlmRequestAssemblyIdentity,
  ): LlmRequestRecoverySnapshot {
    return this.memoryManager.captureLlmRequestRecoverySnapshot({
      turnId: identity.turnId,
      requestId: identity.requestId,
    });
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
