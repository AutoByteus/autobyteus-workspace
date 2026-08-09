import { SegmentEvent, SegmentEventType, SegmentType } from '../segments/segment-events.js';
import { WriteFileContentStreamer, EditFileContentStreamer } from '../api-tool-call/file-content-streamer.js';
import { ToolInvocation } from '../../tool-invocation.js';
import { ChunkResponse } from '../../../llm/utils/response-types.js';
import type {
  ProviderNativeToolCallContext,
  ToolCallDelta
} from '../../../llm/utils/tool-call-delta.js';
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
  nativeToolCallContext?: ProviderNativeToolCallContext;
};

export class LlmStreamingResponseHandler {
  private onSegmentEvent?: (event: SegmentEvent) => void;
  private onToolInvocation?: (invocation: ToolInvocation) => void;
  private turnId: string;
  private segmentIdPrefix: string;
  private readonly toolCallsEnabled: boolean;
  private textSegmentId: string | null = null;
  private activeTools: Map<number, ToolCallState> = new Map();
  private allEvents: SegmentEvent[] = [];
  private allInvocations: ToolInvocation[] = [];
  private isFinalized = false;

  constructor(options: {
    onSegmentEvent?: (event: SegmentEvent) => void;
    onToolInvocation?: (invocation: ToolInvocation) => void;
    turnId: string;
    segmentIdPrefix?: string;
    toolCallsEnabled: boolean;
  }) {
    if (!options.turnId) {
      throw new Error('LlmStreamingResponseHandler requires turnId.');
    }
    this.onSegmentEvent = options.onSegmentEvent;
    this.onToolInvocation = options.onToolInvocation;
    this.turnId = options.turnId;
    this.segmentIdPrefix = options.segmentIdPrefix ?? `turn_${randomUUID().replace(/-/g, '')}:`;
    this.toolCallsEnabled = options.toolCallsEnabled;
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

  private emitEvent(event: SegmentEvent): void {
    this.allEvents.push(event);
    if (this.onSegmentEvent) {
      try {
        this.onSegmentEvent(event);
      } catch (error) {
        console.error(`Error in onSegmentEvent callback: ${error}`);
      }
    }
  }

  private recordInvocation(invocation: ToolInvocation): void {
    this.allInvocations.push(invocation);
    if (this.onToolInvocation) {
      try {
        this.onToolInvocation(invocation);
      } catch (error) {
        console.error(`Error in onToolInvocation callback: ${error}`);
      }
    }
  }

  private buildInvocation(state: ToolCallState): ToolInvocation | null {
    if (!state.name) {
      console.warn(`Native tool call ${state.segmentId} ended without a tool name.`);
      return null;
    }

    let parsedArgs: unknown = {};
    if (state.accumulatedArgs) {
      try {
        parsedArgs = JSON.parse(state.accumulatedArgs);
      } catch (error) {
        console.error(`Failed to parse native tool arguments for ${state.name}: ${error}`);
        parsedArgs = {};
      }
    }
    if (!parsedArgs || typeof parsedArgs !== 'object' || Array.isArray(parsedArgs)) {
      console.warn(`Native tool call ${state.segmentId} produced non-object arguments for ${state.name}.`);
      parsedArgs = {};
    }

    return new ToolInvocation(
      state.name,
      parsedArgs as Record<string, unknown>,
      state.segmentId,
      this.turnId,
      state.nativeToolCallContext
    );
  }

  feed(chunk: ChunkResponse): SegmentEvent[] {
    if (this.isFinalized) {
      throw new Error('Handler has been finalized.');
    }

    const events: SegmentEvent[] = [];

    if (chunk.content) {
      if (!this.textSegmentId) {
        this.textSegmentId = this.generateId();
        const startEvent = SegmentEvent.start(this.turnId, this.textSegmentId, SegmentType.TEXT);
        this.emitEvent(startEvent);
        events.push(startEvent);
      }

      const contentEvent = SegmentEvent.content(this.turnId, this.textSegmentId, chunk.content);
      this.emitEvent(contentEvent);
      events.push(contentEvent);
    }

    if (this.toolCallsEnabled && chunk.tool_calls) {
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
            pendingContent: '',
            nativeToolCallContext: delta.native_context ?? undefined
          });

          if (resolved.segmentType === SegmentType.TOOL_CALL && toolName) {
            const metadata: Record<string, any> = { tool_name: toolName };
            if (delta.native_context) {
              metadata.native_tool_call_context = delta.native_context;
            }
            const startEvent = SegmentEvent.start(this.turnId, segId, resolved.segmentType, metadata);
            const state = this.activeTools.get(delta.index);
            if (state) {
              state.segmentStarted = true;
            }
            this.emitEvent(startEvent);
            events.push(startEvent);
          }
        }

        const state = this.activeTools.get(delta.index)!;
        if (delta.native_context) {
          state.nativeToolCallContext = delta.native_context;
        }

        if (delta.arguments_delta !== undefined && delta.arguments_delta !== null) {
          state.accumulatedArgs += delta.arguments_delta;

          if (state.segmentType === SegmentType.TOOL_CALL) {
            if (!state.segmentStarted) {
              if (!state.name) {
                state.pendingContent += delta.arguments_delta;
                continue;
              }
              const metadata: Record<string, any> = { tool_name: state.name };
              if (state.nativeToolCallContext) {
                metadata.native_tool_call_context = state.nativeToolCallContext;
              }
              const startEvent = SegmentEvent.start(this.turnId, state.segmentId, state.segmentType, metadata);
              state.segmentStarted = true;
              this.emitEvent(startEvent);
              events.push(startEvent);
              if (state.pendingContent) {
                const pendingEvent = SegmentEvent.content(this.turnId, state.segmentId, state.pendingContent);
                this.emitEvent(pendingEvent);
                events.push(pendingEvent);
                state.pendingContent = '';
              }
            }
            const contentEvent = SegmentEvent.content(this.turnId, state.segmentId, delta.arguments_delta);
            this.emitEvent(contentEvent);
            events.push(contentEvent);
          } else if (state.streamer) {
            const update = state.streamer.feed(delta.arguments_delta);
            if (update.path && !state.path) {
              state.path = update.path;
            }

            if (!state.segmentStarted && state.path) {
              const metadata: Record<string, any> = { tool_name: state.name, path: state.path };
              if (state.nativeToolCallContext) {
                metadata.native_tool_call_context = state.nativeToolCallContext;
              }
              const startEvent = SegmentEvent.start(this.turnId, state.segmentId, state.segmentType, metadata);
              state.segmentStarted = true;
              this.emitEvent(startEvent);
              events.push(startEvent);
              if (state.pendingContent) {
                const pendingEvent = SegmentEvent.content(this.turnId, state.segmentId, state.pendingContent);
                this.emitEvent(pendingEvent);
                events.push(pendingEvent);
                state.pendingContent = '';
              }
            }

            if (update.contentDelta) {
              if (state.segmentStarted) {
                const contentEvent = SegmentEvent.content(this.turnId, state.segmentId, update.contentDelta);
                this.emitEvent(contentEvent);
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
            const metadata: Record<string, any> = { tool_name: state.name };
            if (state.nativeToolCallContext) {
              metadata.native_tool_call_context = state.nativeToolCallContext;
            }
            const startEvent = SegmentEvent.start(this.turnId, state.segmentId, state.segmentType, metadata);
            state.segmentStarted = true;
            this.emitEvent(startEvent);
            events.push(startEvent);
            if (state.pendingContent) {
              const pendingEvent = SegmentEvent.content(this.turnId, state.segmentId, state.pendingContent);
              this.emitEvent(pendingEvent);
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
      const endEvent = SegmentEvent.end(this.turnId, this.textSegmentId);
      this.emitEvent(endEvent);
      events.push(endEvent);
    }

    for (const state of this.activeTools.values()) {
      if (state.segmentType === SegmentType.WRITE_FILE || state.segmentType === SegmentType.EDIT_FILE) {
        if (!state.segmentStarted) {
          const metadata: Record<string, any> = { tool_name: state.name };
          if (state.path) {
            metadata.path = state.path;
          }
          if (state.nativeToolCallContext) {
            metadata.native_tool_call_context = state.nativeToolCallContext;
          }
          const startEvent = SegmentEvent.start(this.turnId, state.segmentId, state.segmentType, metadata);
          state.segmentStarted = true;
          this.emitEvent(startEvent);
          events.push(startEvent);
          if (state.pendingContent) {
            const pendingEvent = SegmentEvent.content(this.turnId, state.segmentId, state.pendingContent);
            this.emitEvent(pendingEvent);
            events.push(pendingEvent);
            state.pendingContent = '';
          }
        }
      }
      if (state.segmentType === SegmentType.TOOL_CALL && !state.segmentStarted && state.name) {
        const metadata: Record<string, any> = { tool_name: state.name };
        if (state.nativeToolCallContext) {
          metadata.native_tool_call_context = state.nativeToolCallContext;
        }
        const startEvent = SegmentEvent.start(this.turnId, state.segmentId, state.segmentType, metadata);
        state.segmentStarted = true;
        this.emitEvent(startEvent);
        events.push(startEvent);
        if (state.pendingContent) {
          const pendingEvent = SegmentEvent.content(this.turnId, state.segmentId, state.pendingContent);
          this.emitEvent(pendingEvent);
          events.push(pendingEvent);
          state.pendingContent = '';
        }
      }

      const invocation = this.buildInvocation(state);
      let endEvent: SegmentEvent;
      if (state.segmentType === SegmentType.TOOL_CALL) {
        endEvent = new SegmentEvent({
          event_type: SegmentEventType.END,
          segment_id: state.segmentId,
          turn_id: this.turnId,
          payload: {
            metadata: {
              tool_name: state.name,
              arguments: invocation?.arguments ?? {},
              ...(state.nativeToolCallContext
                ? { native_tool_call_context: state.nativeToolCallContext }
                : {})
            }
          }
        });
      } else {
        const metadata: Record<string, any> = {};
        if (state.path) {
          metadata.path = state.path;
        }
        if (state.nativeToolCallContext) {
          metadata.native_tool_call_context = state.nativeToolCallContext;
        }
        endEvent = SegmentEvent.end(
          this.turnId,
          state.segmentId,
          Object.keys(metadata).length ? { metadata } : {}
        );
      }
      this.emitEvent(endEvent);
      events.push(endEvent);
      if (invocation) {
        this.recordInvocation(invocation);
      }
    }

    if (this.allInvocations.length) {
      console.info(
        `LlmStreamingResponseHandler finalized ${this.allInvocations.length} tool invocations.`
      );
    }

    return events;
  }

  finalizeInterrupted(reason: string): SegmentEvent[] {
    if (this.isFinalized) {
      return [];
    }
    this.isFinalized = true;
    const events: SegmentEvent[] = [];

    if (this.textSegmentId) {
      const endEvent = SegmentEvent.end(this.turnId, this.textSegmentId, {
        interrupted: true,
        reason
      });
      this.emitEvent(endEvent);
      events.push(endEvent);
      this.textSegmentId = null;
    }

    for (const state of this.activeTools.values()) {
      if (!state.segmentStarted) {
        continue;
      }
      const metadata: Record<string, any> = {};
      if (state.name) {
        metadata.tool_name = state.name;
      }
      if (state.path) {
        metadata.path = state.path;
      }
      const endEvent = SegmentEvent.end(this.turnId, state.segmentId, {
        interrupted: true,
        reason,
        ...(Object.keys(metadata).length ? { metadata } : {})
      });
      this.emitEvent(endEvent);
      events.push(endEvent);
    }
    this.activeTools.clear();

    return events;
  }

  finalizeFailed(error: string): SegmentEvent[] {
    if (this.isFinalized) {
      return [];
    }
    this.isFinalized = true;
    const events: SegmentEvent[] = [];

    if (this.textSegmentId) {
      const endEvent = SegmentEvent.end(this.turnId, this.textSegmentId, {
        failed: true,
        error
      });
      this.emitEvent(endEvent);
      events.push(endEvent);
      this.textSegmentId = null;
    }

    for (const state of this.activeTools.values()) {
      if (!state.segmentStarted) {
        continue;
      }
      const metadata: Record<string, any> = {};
      if (state.name) {
        metadata.tool_name = state.name;
      }
      if (state.path) {
        metadata.path = state.path;
      }
      const endEvent = SegmentEvent.end(this.turnId, state.segmentId, {
        failed: true,
        error,
        ...(Object.keys(metadata).length ? { metadata } : {})
      });
      this.emitEvent(endEvent);
      events.push(endEvent);
    }
    this.activeTools.clear();

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
    this.isFinalized = false;
  }
}
