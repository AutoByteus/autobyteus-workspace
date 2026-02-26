import { ParserContext, ParserConfig } from './parser-context.js';
import { TextState } from './states/text-state.js';
import { SegmentEvent, SegmentEventType, SegmentType } from './events.js';

export class StreamingParser {
  private context: ParserContext;
  private isFinalizedFlag = false;

  constructor(config?: ParserConfig) {
    this.context = new ParserContext(config);
    this.context.currentState = new TextState(this.context);
  }

  get config(): ParserConfig {
    return this.context.config;
  }

  feed(chunk: string): SegmentEvent[] {
    if (this.isFinalizedFlag) {
      throw new Error('Cannot feed chunks after finalize() has been called');
    }

    if (!chunk) {
      return [];
    }

    this.context.append(chunk);

    while (this.context.hasMoreChars()) {
      this.context.currentState.run();
    }

    this.context.compact();

    return this.context.getAndClearEvents();
  }

  finalize(): SegmentEvent[] {
    if (this.isFinalizedFlag) {
      throw new Error('finalize() has already been called');
    }

    this.isFinalizedFlag = true;

    this.context.currentState.finalize();

    if (this.context.getCurrentSegmentType() === SegmentType.TEXT) {
      this.context.emitSegmentEnd();
    }

    this.context.compact();

    return this.context.getAndClearEvents();
  }

  feedAndFinalize(text: string): SegmentEvent[] {
    const events = this.feed(text);
    events.push(...this.finalize());
    return events;
  }

  get isFinalized(): boolean {
    return this.isFinalizedFlag;
  }

  getCurrentSegmentId(): string | undefined {
    return this.context.getCurrentSegmentId();
  }

  getCurrentSegmentType(): SegmentType | undefined {
    return this.context.getCurrentSegmentType();
  }
}

export function parseCompleteResponse(text: string, config?: ParserConfig): SegmentEvent[] {
  const parser = new StreamingParser(config);
  return parser.feedAndFinalize(text);
}

export function extractSegments(events: SegmentEvent[]): Array<{ id: string; type: string; content: string; metadata: Record<string, any> }> {
  const segments: Array<{ id: string; type: string; content: string; metadata: Record<string, any> }> = [];
  let current: { id: string; type: string; content: string; metadata: Record<string, any> } | null = null;

  for (const event of events) {
    if (event.event_type === SegmentEventType.START) {
      current = {
        id: event.segment_id,
        type: event.segment_type ?? 'unknown',
        content: '',
        metadata: (event.payload?.metadata as Record<string, any>) ?? {}
      };
    } else if (event.event_type === SegmentEventType.CONTENT) {
      if (current) {
        const delta = event.payload?.delta;
        if (typeof delta === 'string') {
          current.content += delta;
        }
      }
    } else if (event.event_type === SegmentEventType.END) {
      if (current) {
        segments.push(current);
        current = null;
      }
    }
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}
