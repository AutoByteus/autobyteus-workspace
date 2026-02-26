import { StreamingResponseHandler } from './streaming-response-handler.js';
import { createStreamingParser, resolveParserName, type StreamingParserProtocol } from '../parser/parser-factory.js';
import { SegmentEvent } from '../segments/segment-events.js';
import { ToolInvocationAdapter } from '../adapters/invocation-adapter.js';
import { ParserConfig } from '../parser/parser-context.js';
import { ToolInvocation } from '../../tool-invocation.js';
import { ChunkResponse } from '../../../llm/utils/response-types.js';

export class ParsingStreamingResponseHandler extends StreamingResponseHandler {
  private parserNameValue: string;
  private parserConfig?: ParserConfig;
  private parser: StreamingParserProtocol;
  private adapter: ToolInvocationAdapter;
  private onSegmentEvent?: (event: SegmentEvent) => void;
  private onToolInvocation?: (invocation: ToolInvocation) => void;
  private isFinalized = false;

  private allEvents: SegmentEvent[] = [];
  private allInvocations: ToolInvocation[] = [];

  constructor(options?: {
    onSegmentEvent?: (event: SegmentEvent) => void;
    onToolInvocation?: (invocation: ToolInvocation) => void;
    config?: ParserConfig;
    parserName?: string;
  }) {
    super();
    const parserName = resolveParserName(options?.parserName);
    this.parserNameValue = parserName;
    this.parserConfig = options?.config;
    this.parser = createStreamingParser({ config: options?.config, parserName: parserName });
    this.adapter = new ToolInvocationAdapter(this.parser.config.jsonToolParser);
    this.onSegmentEvent = options?.onSegmentEvent;
    this.onToolInvocation = options?.onToolInvocation;
  }

  feed(chunk: ChunkResponse): SegmentEvent[] {
    if (this.isFinalized) {
      throw new Error('Handler has been finalized, cannot feed more chunks.');
    }

    const anyChunk = chunk as unknown as ChunkResponse | string;
    const textContent = typeof anyChunk === 'string' ? anyChunk : anyChunk.content;

    if (!textContent) {
      return [];
    }

    const events = this.parser.feed(textContent);
    this.processEvents(events);
    return events;
  }

  finalize(): SegmentEvent[] {
    if (this.isFinalized) {
      return [];
    }

    this.isFinalized = true;
    const events = this.parser.finalize();
    this.processEvents(events);
    return events;
  }

  getAllEvents(): SegmentEvent[] {
    return [...this.allEvents];
  }

  getAllInvocations(): ToolInvocation[] {
    return [...this.allInvocations];
  }

  reset(): void {
    this.parser = createStreamingParser({ config: this.parserConfig, parserName: this.parserNameValue });
    this.adapter = new ToolInvocationAdapter(this.parser.config.jsonToolParser);
    this.allEvents = [];
    this.allInvocations = [];
    this.isFinalized = false;
  }

  get parserName(): string {
    return this.parserNameValue;
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

      const invocation = this.adapter.processEvent(event);
      if (invocation) {
        this.allInvocations.push(invocation);
        if (this.onToolInvocation) {
          try {
            this.onToolInvocation(invocation);
          } catch (error) {
            console.error(`Error in onToolInvocation callback: ${error}`);
          }
        }
      }
    }
  }
}
