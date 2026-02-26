import { randomUUID } from 'node:crypto';
import { StreamingResponseHandler } from './streaming-response-handler.js';
import { SegmentEvent, SegmentType } from '../segments/segment-events.js';
import { ToolInvocation } from '../../tool-invocation.js';
import { ChunkResponse } from '../../../llm/utils/response-types.js';

export class PassThroughStreamingResponseHandler extends StreamingResponseHandler {
  private onSegmentEvent?: (event: SegmentEvent) => void;
  private segmentIdPrefix: string;
  private segmentId: string;
  private isActive = false;
  private isFinalized = false;
  private allEvents: SegmentEvent[] = [];

  constructor(options?: {
    onSegmentEvent?: (event: SegmentEvent) => void;
    onToolInvocation?: (invocation: ToolInvocation) => void;
    segmentIdPrefix?: string;
  }) {
    super();
    this.onSegmentEvent = options?.onSegmentEvent;
    this.segmentIdPrefix = options?.segmentIdPrefix ?? `pt_${randomUUID().replace(/-/g, '')}:`;
    this.segmentId = `${this.segmentIdPrefix}text_0`;
  }

  feed(chunk: ChunkResponse): SegmentEvent[] {
    if (this.isFinalized) {
      throw new Error('Handler has been finalized, cannot feed more chunks.');
    }

    const textContent = chunk instanceof ChunkResponse ? chunk.content : (chunk as any);
    if (!textContent) {
      return [];
    }

    const events: SegmentEvent[] = [];
    if (!this.isActive) {
      this.isActive = true;
      events.push(SegmentEvent.start(this.segmentId, SegmentType.TEXT));
    }

    events.push(SegmentEvent.content(this.segmentId, textContent));
    this.processEvents(events);
    return events;
  }

  finalize(): SegmentEvent[] {
    if (this.isFinalized) {
      return [];
    }
    this.isFinalized = true;
    const events: SegmentEvent[] = [];
    if (this.isActive) {
      events.push(SegmentEvent.end(this.segmentId));
      this.isActive = false;
    }
    this.processEvents(events);
    return events;
  }

  private processEvents(events: SegmentEvent[]): void {
    for (const event of events) {
      this.allEvents.push(event);
      if (this.onSegmentEvent) {
        try {
          this.onSegmentEvent(event);
        } catch (error) {
          console.error(`Error in onSegmentEvent callback: ${error}`);
        }
      }
    }
  }

  getAllEvents(): SegmentEvent[] {
    return [...this.allEvents];
  }

  getAllInvocations(): ToolInvocation[] {
    return [];
  }

  reset(): void {
    this.segmentId = `${this.segmentIdPrefix}text_${randomUUID().replace(/-/g, '')}`;
    this.isActive = false;
    this.isFinalized = false;
    this.allEvents = [];
  }
}
