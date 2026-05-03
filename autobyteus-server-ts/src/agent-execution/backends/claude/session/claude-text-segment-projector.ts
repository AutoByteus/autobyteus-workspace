import {
  asNonEmptyRawString,
  asObject,
  asString,
  type ClaudeSessionEvent,
} from "../claude-runtime-shared.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";
import { resolveClaudeIncrementalDelta } from "./claude-session-output-events.js";

type ClaudeTextSegmentSource =
  | "full_message"
  | "partial_stream"
  | "generic_stream"
  | "result";

type ClaudeTextSegmentState = {
  text: string;
  completed: boolean;
};

type ClaudeTextSegmentProjectorInput = {
  turnId: string;
  getSessionId: () => string;
  emitEvent: (event: ClaudeSessionEvent) => void;
};

const asFiniteIndex = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

const resolveChunkIdentity = (payload: Record<string, unknown>): string | null =>
  asString(payload.uuid) ??
  asString(payload.id) ??
  asString(payload.message_id) ??
  asString(payload.messageId);

const extractFullContentBlockText = (blockRaw: unknown): string | null => {
  if (typeof blockRaw === "string" && blockRaw.length > 0) {
    return blockRaw;
  }

  const block = asObject(blockRaw);
  if (!block) {
    return null;
  }

  const blockType = asString(block.type);
  if (blockType && blockType !== "text") {
    return null;
  }

  return (
    asNonEmptyRawString(block.text) ??
    asNonEmptyRawString(block.delta) ??
    asNonEmptyRawString(block.textDelta) ??
    asNonEmptyRawString(block.text_delta) ??
    null
  );
};

const extractGenericStreamDelta = (payload: Record<string, unknown>): string | null => {
  const nested = asObject(payload.message) ?? asObject(payload.content) ?? null;
  return (
    asNonEmptyRawString(payload.delta) ??
    asNonEmptyRawString(payload.textDelta) ??
    asNonEmptyRawString(payload.text_delta) ??
    asNonEmptyRawString(payload.output_text_delta) ??
    asNonEmptyRawString(nested?.delta) ??
    asNonEmptyRawString(nested?.textDelta) ??
    asNonEmptyRawString(nested?.text_delta) ??
    null
  );
};

export class ClaudeTextSegmentProjector {
  private assistantOutput = "";
  private hasObservedStreamingDelta = false;
  private anonymousSegmentSequence = 0;
  private resultSegmentSequence = 0;
  private activeGenericStreamSegmentId: string | null = null;
  private activePartialMessageIdentity: string | null = null;
  private readonly activePartialSegmentIdsByIndex = new Map<number, string>();
  private readonly segmentsById = new Map<string, ClaudeTextSegmentState>();

  constructor(private readonly input: ClaudeTextSegmentProjectorInput) {}

  getAssistantOutput(): string {
    return this.assistantOutput;
  }

  processAssistantContentBlock(input: {
    chunk: Record<string, unknown>;
    message: Record<string, unknown>;
    block: unknown;
    contentBlockIndex: number;
  }): void {
    const text = extractFullContentBlockText(input.block);
    if (!text) {
      return;
    }

    const messageIdentity = asString(input.message.id);
    const chunkIdentity = resolveChunkIdentity(input.chunk);
    const providerIdentity = messageIdentity ?? chunkIdentity;
    let segmentId = this.buildProviderSegmentId(providerIdentity, input.contentBlockIndex);
    const existingSegment = this.segmentsById.get(segmentId);
    if (
      existingSegment?.completed &&
      existingSegment.text !== text &&
      messageIdentity &&
      chunkIdentity &&
      chunkIdentity !== messageIdentity
    ) {
      segmentId = this.buildProviderSegmentId(
        `${messageIdentity}:${chunkIdentity}`,
        input.contentBlockIndex,
      );
    }
    if (this.emitTextDelta(segmentId, text, "full_message", { aggregate: true })) {
      this.completeSegment(segmentId);
    }
  }

  processChunk(chunk: unknown): void {
    if (typeof chunk === "string") {
      this.emitGenericStreamDelta(chunk);
      return;
    }

    const payload = asObject(chunk);
    if (!payload) {
      return;
    }

    if (this.processPartialStreamEvent(payload)) {
      return;
    }

    if (asString(payload.type)?.toLowerCase() === "result") {
      this.processResultPayload(payload);
      return;
    }

    const message = asObject(payload.message);
    if (Array.isArray(message?.content)) {
      return;
    }

    const genericDelta = extractGenericStreamDelta(payload);
    if (genericDelta) {
      this.emitGenericStreamDelta(genericDelta);
    }
  }

  finishTurn(): void {
    for (const segmentId of [...this.activePartialSegmentIdsByIndex.values()]) {
      this.completeSegment(segmentId);
    }
    this.activePartialSegmentIdsByIndex.clear();

    if (this.activeGenericStreamSegmentId) {
      this.completeSegment(this.activeGenericStreamSegmentId);
      this.activeGenericStreamSegmentId = null;
    }
  }

  private processPartialStreamEvent(payload: Record<string, unknown>): boolean {
    if (asString(payload.type)?.toLowerCase() !== "stream_event") {
      return false;
    }

    const event = asObject(payload.event);
    const eventType = asString(event?.type);
    if (!event || !eventType) {
      return true;
    }

    switch (eventType) {
      case "message_start": {
        const message = asObject(event.message);
        this.activePartialMessageIdentity =
          asString(message?.id) ??
          resolveChunkIdentity(payload) ??
          this.activePartialMessageIdentity;
        return true;
      }
      case "content_block_start":
        this.processPartialContentBlockStart(payload, event);
        return true;
      case "content_block_delta":
        this.processPartialContentBlockDelta(payload, event);
        return true;
      case "content_block_stop":
        this.processPartialContentBlockStop(event);
        return true;
      case "message_stop":
        this.finishPartialMessage();
        return true;
      default:
        return true;
    }
  }

  private processPartialContentBlockStart(
    payload: Record<string, unknown>,
    event: Record<string, unknown>,
  ): void {
    const index = asFiniteIndex(event.index);
    if (index === null) {
      return;
    }

    const contentBlock = asObject(event.content_block);
    const blockType = asString(contentBlock?.type);
    if (blockType && blockType !== "text") {
      return;
    }

    const segmentId = this.getOrCreatePartialSegmentId(index, payload);
    const initialText = asNonEmptyRawString(contentBlock?.text);
    if (initialText) {
      this.emitTextDelta(segmentId, initialText, "partial_stream");
    }
  }

  private processPartialContentBlockDelta(
    payload: Record<string, unknown>,
    event: Record<string, unknown>,
  ): void {
    const index = asFiniteIndex(event.index);
    const delta = asObject(event.delta);
    if (index === null || asString(delta?.type) !== "text_delta") {
      return;
    }

    const text = asNonEmptyRawString(delta?.text);
    if (!text) {
      return;
    }

    const segmentId = this.getOrCreatePartialSegmentId(index, payload);
    this.emitTextDelta(segmentId, text, "partial_stream");
  }

  private processPartialContentBlockStop(event: Record<string, unknown>): void {
    const index = asFiniteIndex(event.index);
    if (index === null) {
      return;
    }

    const segmentId = this.activePartialSegmentIdsByIndex.get(index);
    if (!segmentId) {
      return;
    }

    this.completeSegment(segmentId);
    this.activePartialSegmentIdsByIndex.delete(index);
  }

  private finishPartialMessage(): void {
    for (const segmentId of [...this.activePartialSegmentIdsByIndex.values()]) {
      this.completeSegment(segmentId);
    }
    this.activePartialSegmentIdsByIndex.clear();
    this.activePartialMessageIdentity = null;
  }

  private processResultPayload(payload: Record<string, unknown>): void {
    const resultText =
      asNonEmptyRawString(payload.result) ??
      asNonEmptyRawString(payload.text) ??
      null;
    if (!resultText) {
      return;
    }

    const incrementalDelta = resolveClaudeIncrementalDelta({
      normalizedDelta: resultText,
      source: "result",
      assistantOutput: this.assistantOutput,
      hasObservedStreamingDelta: this.hasObservedStreamingDelta,
    });
    if (!incrementalDelta) {
      return;
    }

    const activeSegmentId = this.resolveSingleOpenSegmentId();
    if (activeSegmentId) {
      this.emitTextDelta(activeSegmentId, incrementalDelta, "result");
      return;
    }

    const segmentId = this.buildResultSegmentId(payload);
    if (this.emitTextDelta(segmentId, incrementalDelta, "result")) {
      this.completeSegment(segmentId);
    }
  }

  private emitGenericStreamDelta(delta: string): void {
    if (!this.activeGenericStreamSegmentId) {
      this.activeGenericStreamSegmentId = this.buildAnonymousSegmentId();
    }
    this.emitTextDelta(this.activeGenericStreamSegmentId, delta, "generic_stream");
  }

  private getOrCreatePartialSegmentId(
    contentBlockIndex: number,
    payload: Record<string, unknown>,
  ): string {
    const existing = this.activePartialSegmentIdsByIndex.get(contentBlockIndex);
    if (existing) {
      return existing;
    }

    const providerIdentity =
      this.activePartialMessageIdentity ??
      resolveChunkIdentity(payload);
    const segmentId = this.buildProviderSegmentId(providerIdentity, contentBlockIndex);
    this.activePartialSegmentIdsByIndex.set(contentBlockIndex, segmentId);
    return segmentId;
  }

  private buildProviderSegmentId(
    providerIdentity: string | null,
    contentBlockIndex: number,
  ): string {
    if (providerIdentity) {
      return `${this.input.turnId}:claude-text:${providerIdentity}:${contentBlockIndex}`;
    }
    return this.buildAnonymousSegmentId();
  }

  private buildAnonymousSegmentId(): string {
    this.anonymousSegmentSequence += 1;
    return `${this.input.turnId}:claude-text:anonymous:${this.anonymousSegmentSequence}`;
  }

  private buildResultSegmentId(payload: Record<string, unknown>): string {
    const providerIdentity = resolveChunkIdentity(payload);
    if (providerIdentity) {
      return `${this.input.turnId}:claude-text:result:${providerIdentity}`;
    }
    this.resultSegmentSequence += 1;
    return `${this.input.turnId}:claude-text:result:${this.resultSegmentSequence}`;
  }

  private resolveSingleOpenSegmentId(): string | null {
    const candidates = [
      ...(this.activeGenericStreamSegmentId ? [this.activeGenericStreamSegmentId] : []),
      ...this.activePartialSegmentIdsByIndex.values(),
    ].filter((segmentId) => this.segmentsById.get(segmentId)?.completed === false);

    return candidates.length === 1 ? candidates[0] ?? null : null;
  }

  private emitTextDelta(
    segmentId: string,
    delta: string,
    source: ClaudeTextSegmentSource,
    options: { aggregate?: boolean } = {},
  ): boolean {
    const segment = this.getOrCreateSegment(segmentId);
    if (segment.completed) {
      return false;
    }

    let incrementalDelta = delta;
    if (options.aggregate && segment.text.length > 0) {
      if (delta.startsWith(segment.text)) {
        incrementalDelta = delta.slice(segment.text.length);
      } else if (segment.text.startsWith(delta)) {
        return false;
      }
    }

    if (incrementalDelta.length === 0) {
      return false;
    }

    segment.text += incrementalDelta;
    this.assistantOutput += incrementalDelta;
    if (source === "partial_stream" || source === "generic_stream") {
      this.hasObservedStreamingDelta = true;
    }
    this.input.emitEvent({
      method: ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA,
      params: {
        id: segmentId,
        turnId: this.input.turnId,
        sessionId: this.input.getSessionId(),
        delta: incrementalDelta,
      },
    });
    return true;
  }

  private completeSegment(segmentId: string): void {
    const segment = this.segmentsById.get(segmentId);
    if (!segment || segment.completed || segment.text.length === 0) {
      return;
    }

    segment.completed = true;
    this.input.emitEvent({
      method: ClaudeSessionEventName.ITEM_OUTPUT_TEXT_COMPLETED,
      params: {
        id: segmentId,
        turnId: this.input.turnId,
        sessionId: this.input.getSessionId(),
        text: segment.text,
      },
    });
  }

  private getOrCreateSegment(segmentId: string): ClaudeTextSegmentState {
    const existing = this.segmentsById.get(segmentId);
    if (existing) {
      return existing;
    }

    const created: ClaudeTextSegmentState = {
      text: "",
      completed: false,
    };
    this.segmentsById.set(segmentId, created);
    return created;
  }
}
