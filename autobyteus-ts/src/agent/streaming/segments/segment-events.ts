export enum SegmentType {
  TEXT = 'text',
  TOOL_CALL = 'tool_call',
  WRITE_FILE = 'write_file',
  EDIT_FILE = 'edit_file',
  RUN_BASH = 'run_bash',
  REASONING = 'reasoning',
  MEDIA = 'media'
}

export enum SegmentEventType {
  START = 'SEGMENT_START',
  CONTENT = 'SEGMENT_CONTENT',
  END = 'SEGMENT_END'
}

export type SegmentEventPayload = Record<string, any>;

export class SegmentEvent {
  public event_type: SegmentEventType;
  public segment_id: string;
  public segment_type?: SegmentType;
  public payload: SegmentEventPayload;

  constructor({
    event_type,
    segment_id,
    segment_type,
    payload = {}
  }: {
    event_type: SegmentEventType;
    segment_id: string;
    segment_type?: SegmentType;
    payload?: SegmentEventPayload;
  }) {
    this.event_type = event_type;
    this.segment_id = segment_id;
    this.segment_type = segment_type;
    this.payload = payload;
  }

  toDict(): Record<string, any> {
    const result: Record<string, any> = {
      type: this.event_type,
      segment_id: this.segment_id,
      payload: this.payload
    };
    if (this.segment_type !== undefined) {
      result['segment_type'] = this.segment_type;
    }
    return result;
  }

  static start(segment_id: string, segment_type: SegmentType, metadata: Record<string, any> = {}): SegmentEvent {
    return new SegmentEvent({
      event_type: SegmentEventType.START,
      segment_id,
      segment_type,
      payload: Object.keys(metadata).length ? { metadata } : {}
    });
  }

  static content(segment_id: string, delta: any): SegmentEvent {
    return new SegmentEvent({
      event_type: SegmentEventType.CONTENT,
      segment_id,
      payload: { delta }
    });
  }

  static end(segment_id: string): SegmentEvent {
    return new SegmentEvent({
      event_type: SegmentEventType.END,
      segment_id
    });
  }
}
