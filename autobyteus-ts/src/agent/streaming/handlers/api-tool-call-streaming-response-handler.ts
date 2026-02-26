import { StreamingResponseHandler } from './streaming-response-handler.js';
import { SegmentEvent, SegmentEventType, SegmentType } from '../segments/segment-events.js';
import { ToolInvocationAdapter } from '../adapters/invocation-adapter.js';
import { WriteFileContentStreamer, EditFileContentStreamer } from '../api-tool-call/file-content-streamer.js';
import { ToolInvocation } from '../../tool-invocation.js';
import { ChunkResponse } from '../../../llm/utils/response-types.js';
import type { ToolCallDelta } from '../../../llm/utils/tool-call-delta.js';
import { randomUUID } from 'node:crypto';

type ToolCallState = {
  segmentId: string;
  name: string;
  accumulatedArgs: string;
  segmentType: SegmentType;
  streamer?: WriteFileContentStreamer | EditFileContentStreamer | null;
  path?: string;
  segmentStarted: boolean;
  pendingContent: string;
};

export class ApiToolCallStreamingResponseHandler extends StreamingResponseHandler {
  private onSegmentEvent?: (event: SegmentEvent) => void;
  private onToolInvocation?: (invocation: ToolInvocation) => void;
  private segmentIdPrefix: string;
  private adapter: ToolInvocationAdapter;
  private textSegmentId: string | null = null;
  private activeTools: Map<number, ToolCallState> = new Map();
  private allEvents: SegmentEvent[] = [];
  private allInvocations: ToolInvocation[] = [];
  private isFinalized = false;

  constructor(options?: {
    onSegmentEvent?: (event: SegmentEvent) => void;
    onToolInvocation?: (invocation: ToolInvocation) => void;
    segmentIdPrefix?: string;
  }) {
    super();
    this.onSegmentEvent = options?.onSegmentEvent;
    this.onToolInvocation = options?.onToolInvocation;
    this.segmentIdPrefix = options?.segmentIdPrefix ?? '';
    this.adapter = new ToolInvocationAdapter();
  }

  private generateId(): string {
    return `${this.segmentIdPrefix}${randomUUID().replace(/-/g, '')}`;
  }

  private resolveSegmentType(toolName: string): { segmentType: SegmentType; streamer?: any } {
    if (toolName === 'write_file') {
      return { segmentType: SegmentType.WRITE_FILE, streamer: new WriteFileContentStreamer() };
    }
    if (toolName === 'edit_file') {
      return { segmentType: SegmentType.EDIT_FILE, streamer: new EditFileContentStreamer() };
    }
    return { segmentType: SegmentType.TOOL_CALL, streamer: null };
  }

  private emit(event: SegmentEvent): void {
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

  feed(chunk: ChunkResponse): SegmentEvent[] {
    if (this.isFinalized) {
      throw new Error('Handler has been finalized.');
    }

    const events: SegmentEvent[] = [];

    if (chunk.content) {
      if (!this.textSegmentId) {
        this.textSegmentId = this.generateId();
        const startEvent = SegmentEvent.start(this.textSegmentId, SegmentType.TEXT);
        this.emit(startEvent);
        events.push(startEvent);
      }

      const contentEvent = SegmentEvent.content(this.textSegmentId, chunk.content);
      this.emit(contentEvent);
      events.push(contentEvent);
    }

    if (chunk.tool_calls) {
      for (const delta of chunk.tool_calls as ToolCallDelta[]) {
        if (!this.activeTools.has(delta.index)) {
          const segId = delta.call_id ?? this.generateId();
          const toolName = delta.name ?? '';
          const resolved = this.resolveSegmentType(toolName);
          this.activeTools.set(delta.index, {
            segmentId: segId,
            name: toolName,
            accumulatedArgs: '',
            segmentType: resolved.segmentType,
            streamer: resolved.streamer,
            segmentStarted: false,
            pendingContent: ''
          });

          if (resolved.segmentType === SegmentType.TOOL_CALL && toolName) {
            const startEvent = SegmentEvent.start(segId, resolved.segmentType, { tool_name: toolName });
            const state = this.activeTools.get(delta.index);
            if (state) {
              state.segmentStarted = true;
            }
            this.emit(startEvent);
            events.push(startEvent);
          }
        }

        const state = this.activeTools.get(delta.index)!;

        if (delta.arguments_delta !== undefined && delta.arguments_delta !== null) {
          state.accumulatedArgs += delta.arguments_delta;

          if (state.segmentType === SegmentType.TOOL_CALL) {
            if (!state.segmentStarted) {
              if (!state.name) {
                state.pendingContent += delta.arguments_delta;
                continue;
              }
              const startEvent = SegmentEvent.start(state.segmentId, state.segmentType, { tool_name: state.name });
              state.segmentStarted = true;
              this.emit(startEvent);
              events.push(startEvent);
              if (state.pendingContent) {
                const pendingEvent = SegmentEvent.content(state.segmentId, state.pendingContent);
                this.emit(pendingEvent);
                events.push(pendingEvent);
                state.pendingContent = '';
              }
            }
            const contentEvent = SegmentEvent.content(state.segmentId, delta.arguments_delta);
            this.emit(contentEvent);
            events.push(contentEvent);
          } else if (state.streamer) {
            const update = state.streamer.feed(delta.arguments_delta);
            if (update.path && !state.path) {
              state.path = update.path;
            }

            if (!state.segmentStarted && state.path) {
              const startEvent = SegmentEvent.start(state.segmentId, state.segmentType, {
                tool_name: state.name,
                path: state.path
              });
              state.segmentStarted = true;
              this.emit(startEvent);
              events.push(startEvent);
              if (state.pendingContent) {
                const pendingEvent = SegmentEvent.content(state.segmentId, state.pendingContent);
                this.emit(pendingEvent);
                events.push(pendingEvent);
                state.pendingContent = '';
              }
            }

            if (update.contentDelta) {
              if (state.segmentStarted) {
                const contentEvent = SegmentEvent.content(state.segmentId, update.contentDelta);
                this.emit(contentEvent);
                events.push(contentEvent);
              } else {
                state.pendingContent += update.contentDelta;
              }
            }
          }
        }

        if (delta.name && !state.name) {
          state.name = delta.name;
          if (state.segmentType === SegmentType.TOOL_CALL && !state.segmentStarted) {
            const startEvent = SegmentEvent.start(state.segmentId, state.segmentType, { tool_name: state.name });
            state.segmentStarted = true;
            this.emit(startEvent);
            events.push(startEvent);
            if (state.pendingContent) {
              const pendingEvent = SegmentEvent.content(state.segmentId, state.pendingContent);
              this.emit(pendingEvent);
              events.push(pendingEvent);
              state.pendingContent = '';
            }
          }
        }
      }
    }

    return events;
  }

  finalize(): SegmentEvent[] {
    if (this.isFinalized) {
      return [];
    }
    this.isFinalized = true;
    const events: SegmentEvent[] = [];

    if (this.textSegmentId) {
      const endEvent = new SegmentEvent({
        event_type: SegmentEventType.END,
        segment_id: this.textSegmentId
      });
      this.emit(endEvent);
      events.push(endEvent);
    }

    for (const state of this.activeTools.values()) {
      if (state.segmentType === SegmentType.WRITE_FILE || state.segmentType === SegmentType.EDIT_FILE) {
        if (!state.segmentStarted) {
          const metadata: Record<string, any> = { tool_name: state.name };
          if (state.path) {
            metadata.path = state.path;
          }
          const startEvent = SegmentEvent.start(state.segmentId, state.segmentType, metadata);
          state.segmentStarted = true;
          this.emit(startEvent);
          events.push(startEvent);
          if (state.pendingContent) {
            const pendingEvent = SegmentEvent.content(state.segmentId, state.pendingContent);
            this.emit(pendingEvent);
            events.push(pendingEvent);
            state.pendingContent = '';
          }
        }
      }
      if (state.segmentType === SegmentType.TOOL_CALL && !state.segmentStarted && state.name) {
        const startEvent = SegmentEvent.start(state.segmentId, state.segmentType, { tool_name: state.name });
        state.segmentStarted = true;
        this.emit(startEvent);
        events.push(startEvent);
        if (state.pendingContent) {
          const pendingEvent = SegmentEvent.content(state.segmentId, state.pendingContent);
          this.emit(pendingEvent);
          events.push(pendingEvent);
          state.pendingContent = '';
        }
      }

      let endEvent: SegmentEvent;
      if (state.segmentType === SegmentType.TOOL_CALL) {
        let parsedArgs: Record<string, any> = {};
        if (state.accumulatedArgs) {
          try {
            parsedArgs = JSON.parse(state.accumulatedArgs);
          } catch (error) {
            console.error(`Failed to parse tool arguments for ${state.name}: ${error}`);
            parsedArgs = {};
          }
        }
        endEvent = new SegmentEvent({
          event_type: SegmentEventType.END,
          segment_id: state.segmentId,
          payload: {
            metadata: {
              tool_name: state.name,
              arguments: parsedArgs
            }
          }
        });
      } else {
        const metadata: Record<string, any> = {};
        if (state.path) {
          metadata.path = state.path;
        }
        endEvent = new SegmentEvent({
          event_type: SegmentEventType.END,
          segment_id: state.segmentId,
          payload: Object.keys(metadata).length ? { metadata } : {}
        });
      }
      this.emit(endEvent);
      events.push(endEvent);
    }

    if (this.allInvocations.length) {
      console.info(
        `ApiToolCallStreamingResponseHandler finalized ${this.allInvocations.length} tool invocations.`
      );
    }

    return events;
  }

  getAllEvents(): SegmentEvent[] {
    return [...this.allEvents];
  }

  getAllInvocations(): ToolInvocation[] {
    return [...this.allInvocations];
  }

  reset(): void {
    this.textSegmentId = null;
    this.activeTools.clear();
    this.allEvents = [];
    this.allInvocations = [];
    this.adapter = new ToolInvocationAdapter();
    this.isFinalized = false;
  }
}
