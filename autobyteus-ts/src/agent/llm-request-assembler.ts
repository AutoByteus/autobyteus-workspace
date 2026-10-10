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
  /** Not the turn's first LLM call (a tool-result or recovery continuation): no pre-request compaction. */
  isTurnContinuation?: boolean;
  getParentModelIdentifier: () => string;
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

    const didCompact = this.pendingCompactionExecutor && !identity.isTurnContinuation
      ? await this.pendingCompactionExecutor.executeIfAuthorized({
          executionSite: 'before_parent_request',
          turnId: identity.turnId,
          getParentModelIdentifier: identity.getParentModelIdentifier,
          signal: identity.signal,
        })
      : false;

    // Runs on tool continuations too: tool definitions can change mid tool cycle. Any
    // removal is persisted before the checkpoint, so a failed request cannot restore it.
    this.memoryManager.bindRetainedReasoningToRequestPrefix(computeLlmRequestPrefixDigest({
      leadingSystem: leadingSystemMessages(this.memoryManager.getWorkingContextMessages()),
      tools: requestTools,
    }));

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
