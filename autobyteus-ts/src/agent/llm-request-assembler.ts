import { LLMUserMessage } from '../llm/user-message.js';
import { Message, MessageRole, leadingSystemMessages } from '../llm/utils/messages.js';
import { computeLlmRequestPrefixDigest } from './llm-request-prefix-digest.js';
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
  isToolContinuation?: boolean;
  signal: AbortSignal;
}>;

export type RequestPackage = {
  canonicalMessages: Message[];
  outboundMessages: Message[];
  /** The exact tool schemas to send; they are part of the prefix the request is bound to. */
  tools: ReadonlyArray<Record<string, unknown>>;
  mediaDiagnostics: MediaInputDiagnostic[];
  didCompact: boolean;
  recoverySnapshot: LlmRequestRecoverySnapshot;
};

export class LLMRequestAssembler {
  constructor(
    private readonly memoryManager: MemoryManager,
    private readonly pendingCompactionExecutor: PendingCompactionExecutor | null = null,
    private readonly multimodalCapabilities: MultimodalCapabilities = UNKNOWN_MULTIMODAL_CAPABILITIES,
  ) {}

  async prepareRequest(
    additionalUserMessage: LLMUserMessage | null,
    identity: LlmRequestAssemblyIdentity,
    systemPrompt: string | null | undefined,
    requestTools: ReadonlyArray<Record<string, unknown>>,
  ): Promise<RequestPackage> {
    this.ensureSystemPrompt(systemPrompt ?? undefined);
    this.memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
      recoverySourceEvent: 'LLMRequestAssembler.preCompaction',
    });

    // Compaction runs only on independent turns. Its cached summary request replays the history
    // under the current prefix, so reasoning bound to a changed prefix is removed first.
    const compactionExecutor = identity.isToolContinuation ? null : this.pendingCompactionExecutor;
    if (compactionExecutor) this.bindRequestPrefix(requestTools);
    const didCompact = compactionExecutor
      ? await compactionExecutor.executeIfAuthorized({
          executionSite: 'before_parent_request',
          turnId: identity.turnId,
          signal: identity.signal,
        })
      : false;
    // Compaction can change the leading system run, so bind again before the checkpoint.
    this.bindRequestPrefix(requestTools);

    const recoverySnapshot = this.captureRecoverySnapshot(identity);
    try {
      if (additionalUserMessage) {
        this.memoryManager.appendWorkingContextUserMessage(
          this.buildUserMessage(additionalUserMessage),
          { turnId: identity.turnId }
        );
      }
      this.memoryManager.ensureWorkingContextToolProtocolSafeForNextLlm({
        recoverySourceEvent: 'LLMRequestAssembler.preRender',
      });
      const finalMessages = this.memoryManager.getWorkingContextMessages();
      return await this.buildRequestPackage(finalMessages, requestTools, didCompact, recoverySnapshot);
    } catch (error) {
      this.memoryManager.restoreLlmRequestRecoverySnapshot(recoverySnapshot, {
        reason: 'request assembly failed after the stable-base checkpoint',
        sourceEvent: 'LLMRequestAssembler.prepareRequest',
      });
      throw error;
    }
  }

  /**
   * Binds retained provider reasoning to the request prefix (leading system run + `requestTools`).
   * Runs on tool continuations too: tool definitions can change mid tool cycle. Any removal is
   * persisted immediately, so a later checkpoint restore cannot bring it back.
   */
  bindRequestPrefix(requestTools: ReadonlyArray<Record<string, unknown>>): void {
    this.memoryManager.bindRetainedReasoningToRequestPrefix(computeLlmRequestPrefixDigest({
      leadingSystem: leadingSystemMessages(this.memoryManager.getWorkingContextMessages()),
      tools: requestTools,
    }));
  }

  private async buildRequestPackage(
    canonicalMessages: Message[],
    tools: ReadonlyArray<Record<string, unknown>>,
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
      tools,
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

  private buildUserMessage(userMessage: LLMUserMessage): Message {
    return new Message(MessageRole.USER, {
      content: userMessage.content,
      image_urls: userMessage.image_urls,
      audio_urls: userMessage.audio_urls,
      video_urls: userMessage.video_urls
    });
  }

  private ensureSystemPrompt(systemPrompt?: string): void {
    if (!systemPrompt) {
      return;
    }
    this.memoryManager.ensureWorkingContextSystemMessage(systemPrompt);
  }
}
