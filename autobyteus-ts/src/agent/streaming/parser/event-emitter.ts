import { SegmentEvent, SegmentEventType, SegmentType } from './events.js';

export class EventEmitter {
  private eventQueue: SegmentEvent[] = [];
  private segmentCounter = 0;
  private currentSegmentId?: string;
  private currentSegmentType?: SegmentType;
  private currentSegmentContent = '';
  private currentSegmentMetadata: Record<string, any> = {};
  private segmentIdPrefix?: string;

  constructor(segmentIdPrefix?: string) {
    this.segmentIdPrefix = segmentIdPrefix;
  }

  private generateSegmentId(): string {
    this.segmentCounter += 1;
    const baseId = `seg_${this.segmentCounter}`;
    if (this.segmentIdPrefix) {
      return `${this.segmentIdPrefix}${baseId}`;
    }
    return baseId;
  }

  emitSegmentStart(segmentType: SegmentType, metadata: Record<string, any> = {}): string {
    const segmentId = this.generateSegmentId();
    this.currentSegmentId = segmentId;
    this.currentSegmentType = segmentType;
    this.currentSegmentContent = '';
    this.currentSegmentMetadata = { ...metadata };

    const event = SegmentEvent.start(segmentId, segmentType, metadata);
    this.eventQueue.push(event);
    return segmentId;
  }

  emitSegmentContent(delta: any): void {
    if (!this.currentSegmentId) {
      throw new Error('Cannot emit content without an active segment.');
    }

    if (typeof delta === 'string') {
      this.currentSegmentContent += delta;
    }

    const event = SegmentEvent.content(this.currentSegmentId, delta);
    this.eventQueue.push(event);
  }

  emitSegmentEnd(): string | undefined {
    if (!this.currentSegmentId) {
      return undefined;
    }

    const segmentId = this.currentSegmentId;
    const payload = Object.keys(this.currentSegmentMetadata).length
      ? { metadata: { ...this.currentSegmentMetadata } }
      : {};
    const event = new SegmentEvent({
      event_type: SegmentEventType.END,
      segment_id: segmentId,
      payload
    });
    this.eventQueue.push(event);

    this.currentSegmentId = undefined;
    this.currentSegmentType = undefined;

    return segmentId;
  }

  getCurrentSegmentId(): string | undefined {
    return this.currentSegmentId;
  }

  getCurrentSegmentType(): SegmentType | undefined {
    return this.currentSegmentType;
  }

  getCurrentSegmentContent(): string {
    return this.currentSegmentContent;
  }

  getCurrentSegmentMetadata(): Record<string, any> {
    return { ...this.currentSegmentMetadata };
  }

  updateCurrentSegmentMetadata(metadata: Record<string, any>): void {
    this.currentSegmentMetadata = { ...this.currentSegmentMetadata, ...metadata };
  }

  getAndClearEvents(): SegmentEvent[] {
    const events = [...this.eventQueue];
    this.eventQueue = [];
    return events;
  }

  getEvents(): SegmentEvent[] {
    return [...this.eventQueue];
  }

  appendTextSegment(text: string): void {
    if (!text) {
      return;
    }

    if (this.currentSegmentType !== SegmentType.TEXT) {
      if (this.currentSegmentId) {
        console.warn(
          `appendTextSegment called while non-text segment is active (${this.currentSegmentType}); ending it before starting a text segment.`
        );
        this.emitSegmentEnd();
      }
      this.emitSegmentStart(SegmentType.TEXT);
    }

    this.emitSegmentContent(text);
  }
}
