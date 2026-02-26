import { SegmentEvent } from '../segments/segment-events.js';
import { ToolInvocation } from '../../tool-invocation.js';
import { ChunkResponse } from '../../../llm/utils/response-types.js';

export abstract class StreamingResponseHandler {
  abstract feed(chunk: ChunkResponse): SegmentEvent[];

  abstract finalize(): SegmentEvent[];

  abstract getAllInvocations(): ToolInvocation[];

  abstract getAllEvents(): SegmentEvent[];

  abstract reset(): void;
}
