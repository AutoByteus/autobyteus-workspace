import { randomUUID } from 'node:crypto';
import { CompleteResponse, type ChunkResponse } from '../../llm/utils/response-types.js';
import type { LlmResponseFinish } from '../../llm/utils/llm-response-finish.js';
import type { LlmTokenUsageObservation } from '../../llm/utils/llm-token-usage-observation.js';
import type { ProviderNativeAssistantTurn } from '../../llm/provider-native/provider-native-assistant-turn.js';
import { LlmStreamingResponseHandler } from '../streaming/handlers/llm-streaming-response-handler.js';
import { SegmentEvent, SegmentType } from '../streaming/segments/segment-events.js';
import type { SegmentEventPayload } from '../streaming/segments/segment-events.js';
import type { TurnExecutionScope } from '../interruption/turn-execution-scope.js';
import type { AgentExternalEventNotifier } from '../events/notifiers.js';
import type { ToolInvocation } from '../tool-invocation.js';

/**
 * Consumes one provider stream for one LLM call: iterates it under the turn's fences,
 * accumulates the response parts, owns the reasoning-segment lifecycle and the stream
 * handler (text and tool segments, tool invocations), and finalizes them in exactly one mode.
 * It never touches memory, recovery snapshots or the turn; `LlmPhase` settles the call.
 */
export class LlmResponseStreamCollector {
  private readonly handler: LlmStreamingResponseHandler;
  private readonly segmentIdPrefix = `segment_${randomUUID().replace(/-/g, '')}:`;
  private reasoningPartId: string | null = null;
  private finalized = false;
  private responseText = '';
  private reasoningText = '';
  private responseUsage: LlmTokenUsageObservation | null = null;
  private responseFinish: LlmResponseFinish | null = null;
  private nativeTurn: ProviderNativeAssistantTurn | null = null;
  private readonly imageUrls: string[] = [];
  private readonly audioUrls: string[] = [];
  private readonly videoUrls: string[] = [];
  private readonly turnId: string;
  private readonly notifier: AgentExternalEventNotifier | null;

  constructor(options: { turnId: string; notifier: AgentExternalEventNotifier | null; toolCallsEnabled: boolean }) {
    this.turnId = options.turnId;
    this.notifier = options.notifier;
    this.handler = new LlmStreamingResponseHandler({
      onSegmentEvent: (segmentEvent) => this.notifier?.notifyAgentSegmentEvent(segmentEvent.toDict()),
      turnId: options.turnId,
      toolCallsEnabled: options.toolCallsEnabled,
    });
  }

  get text(): string { return this.responseText; }
  get reasoning(): string { return this.reasoningText; }
  get usage(): LlmTokenUsageObservation | null { return this.responseUsage; }
  get finish(): LlmResponseFinish | null { return this.responseFinish; }

  async consume(stream: AsyncIterable<ChunkResponse>, scope: TurnExecutionScope): Promise<void> {
    for await (const chunk of scope.iterateAbortable({ kind: 'llm_stream' }, stream)) {
      scope.throwIfAborted({ kind: 'llm_stream_chunk' });
      this.accumulate(chunk);
      if (chunk.reasoning) this.emitReasoning(chunk.reasoning);
      this.handler.feed(chunk);
    }
  }

  /** The full response of a normally finished stream. */
  buildResponse(): CompleteResponse {
    return new CompleteResponse({
      content: this.responseText,
      reasoning: this.reasoningText || null,
      usage: this.responseUsage,
      image_urls: this.imageUrls,
      audio_urls: this.audioUrls,
      video_urls: this.videoUrls,
      providerNativeAssistantTurn: this.nativeTurn,
      finish: this.responseFinish,
    });
  }

  /** Ends every segment normally and returns the parsed tool invocations (none when tools are disabled). */
  completeNormally(): ToolInvocation[] {
    if (this.finalized) return [];
    this.finalized = true;
    this.handler.finalize();
    this.endReasoning();
    return this.handler.getAllInvocations();
  }

  /** Text ends normally, every tool call is discarded; returns the discarded tool names. */
  completeOutputLimited(discardedToolCallError: string): string[] {
    if (this.finalized) return [];
    this.finalized = true;
    const discardedToolNames = this.handler.finalizeOutputLimited(discardedToolCallError);
    this.endReasoning();
    return discardedToolNames;
  }

  /** No-op when the stream was already finalized. */
  abandonInterrupted(reason: string): void {
    if (!this.finalized) {
      this.finalized = true;
      this.handler.finalizeInterrupted(reason);
    }
    this.endReasoning({ interrupted: true, reason });
  }

  /** No-op when the stream was already finalized. */
  abandonFailed(message: string): void {
    if (!this.finalized) {
      this.finalized = true;
      this.handler.finalizeFailed(message);
    }
    this.endReasoning({ failed: true, error: message });
  }

  private accumulate(chunk: ChunkResponse): void {
    if (chunk.content) this.responseText += chunk.content;
    if (chunk.reasoning) this.reasoningText += chunk.reasoning;
    if (chunk.providerNativeAssistantTurn) this.nativeTurn = chunk.providerNativeAssistantTurn;
    if (chunk.is_complete) {
      this.responseUsage = chunk.usage ?? null;
      this.responseFinish = chunk.finish;
      if (chunk.image_urls?.length) this.imageUrls.push(...chunk.image_urls);
      if (chunk.audio_urls?.length) this.audioUrls.push(...chunk.audio_urls);
      if (chunk.video_urls?.length) this.videoUrls.push(...chunk.video_urls);
    }
  }

  private emitReasoning(delta: string): void {
    if (!this.reasoningPartId) {
      this.reasoningPartId = `${this.segmentIdPrefix}reasoning_${randomUUID().replace(/-/g, '')}`;
      this.notifier?.notifyAgentSegmentEvent(
        SegmentEvent.start(this.turnId, this.reasoningPartId, SegmentType.REASONING).toDict()
      );
    }
    this.notifier?.notifyAgentSegmentEvent(SegmentEvent.content(this.turnId, this.reasoningPartId, delta).toDict());
  }

  /** Ends an open reasoning segment once; later calls emit nothing. */
  private endReasoning(payload?: SegmentEventPayload): void {
    if (!this.reasoningPartId) return;
    this.notifier?.notifyAgentSegmentEvent(SegmentEvent.end(this.turnId, this.reasoningPartId, payload).toDict());
    this.reasoningPartId = null;
  }
}
