import { MemoryType, MemoryItem } from './memory-types.js';

export type RawTraceMedia = {
  images?: string[];
  audio?: string[];
  video?: string[];
};

export type RawTraceItemOptions = {
  id: string;
  ts: number;
  turnId: string;
  seq: number;
  traceType: string;
  content: string;
  sourceEvent: string;
  media?: RawTraceMedia | null;
  toolName?: string | null;
  toolCallId?: string | null;
  toolArgs?: Record<string, unknown> | null;
  toolResult?: unknown;
  toolError?: string | null;
  correlationId?: string | null;
  tags?: string[];
  toolResultRef?: string | null;
};

export class RawTraceItem implements MemoryItem {
  id: string;
  ts: number;
  turnId: string;
  seq: number;
  traceType: string;
  content: string;
  sourceEvent: string;
  media: RawTraceMedia | null;
  toolName: string | null;
  toolCallId: string | null;
  toolArgs: Record<string, unknown> | null;
  toolResult: unknown;
  toolError: string | null;
  correlationId: string | null;
  tags: string[];
  toolResultRef: string | null;

  constructor(options: RawTraceItemOptions) {
    this.id = options.id;
    this.ts = options.ts;
    this.turnId = options.turnId;
    this.seq = options.seq;
    this.traceType = options.traceType;
    this.content = options.content;
    this.sourceEvent = options.sourceEvent;
    this.media = options.media ?? null;
    this.toolName = options.toolName ?? null;
    this.toolCallId = options.toolCallId ?? null;
    this.toolArgs = options.toolArgs ?? null;
    this.toolResult = options.toolResult ?? null;
    this.toolError = options.toolError ?? null;
    this.correlationId = options.correlationId ?? null;
    this.tags = options.tags ?? [];
    this.toolResultRef = options.toolResultRef ?? null;
  }

  get memoryType(): MemoryType {
    return MemoryType.RAW_TRACE;
  }

  toDict(): Record<string, unknown> {
    const data: Record<string, unknown> = {
      id: this.id,
      ts: this.ts,
      turn_id: this.turnId,
      seq: this.seq,
      trace_type: this.traceType,
      content: this.content,
      source_event: this.sourceEvent
    };

    if (this.media) data.media = this.media;
    if (this.toolName) data.tool_name = this.toolName;
    if (this.toolCallId) data.tool_call_id = this.toolCallId;
    if (this.toolArgs) data.tool_args = this.toolArgs;
    if (this.toolResult !== null && this.toolResult !== undefined) data.tool_result = this.toolResult;
    if (this.toolError) data.tool_error = this.toolError;
    if (this.correlationId) data.correlation_id = this.correlationId;
    if (this.tags.length) data.tags = this.tags;
    if (this.toolResultRef) data.tool_result_ref = this.toolResultRef;

    return data;
  }

  static fromDict(data: Record<string, unknown>): RawTraceItem {
    return new RawTraceItem({
      id: String(data.id),
      ts: Number(data.ts),
      turnId: String(data.turn_id),
      seq: Number(data.seq),
      traceType: String(data.trace_type),
      content: typeof data.content === 'string' ? data.content : '',
      sourceEvent: String(data.source_event),
      media: (data.media as RawTraceMedia | undefined) ?? null,
      toolName: typeof data.tool_name === 'string' ? data.tool_name : null,
      toolCallId: typeof data.tool_call_id === 'string' ? data.tool_call_id : null,
      toolArgs: (data.tool_args as Record<string, unknown> | undefined) ?? null,
      toolResult: data.tool_result,
      toolError: typeof data.tool_error === 'string' ? data.tool_error : null,
      correlationId: typeof data.correlation_id === 'string' ? data.correlation_id : null,
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      toolResultRef: typeof data.tool_result_ref === 'string' ? data.tool_result_ref : null
    });
  }
}
