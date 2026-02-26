import { SegmentEvent, SegmentEventType, SegmentType } from '../segments/segment-events.js';
import { getToolSyntaxSpec } from './tool-syntax-registry.js';
import { parseJsonToolCall, parseXmlArguments, type JsonToolParsingStrategy } from './tool-call-parsing.js';
import { ToolInvocation } from '../../tool-invocation.js';

export class ToolInvocationAdapter {
  private activeSegments: Map<string, Record<string, any>> = new Map();
  private jsonToolParser?: JsonToolParsingStrategy;

  constructor(jsonToolParser?: JsonToolParsingStrategy) {
    this.jsonToolParser = jsonToolParser;
  }

  processEvent(event: SegmentEvent): ToolInvocation | null {
    if (event.event_type === SegmentEventType.START) {
      this.handleStart(event);
      return null;
    }
    if (event.event_type === SegmentEventType.CONTENT) {
      this.handleContent(event);
      return null;
    }
    if (event.event_type === SegmentEventType.END) {
      return this.handleEnd(event);
    }
    return null;
  }

  processEvents(events: SegmentEvent[]): ToolInvocation[] {
    const invocations: ToolInvocation[] = [];
    for (const event of events) {
      const result = this.processEvent(event);
      if (result) {
        invocations.push(result);
      }
    }
    return invocations;
  }

  reset(): void {
    this.activeSegments.clear();
  }

  getActiveSegmentIds(): string[] {
    return Array.from(this.activeSegments.keys());
  }

  private handleStart(event: SegmentEvent): void {
    if (event.segment_type !== SegmentType.TOOL_CALL && !getToolSyntaxSpec(event.segment_type!)) {
      return;
    }

    const metadata = event.payload?.metadata ?? {};
    let toolName = metadata.tool_name;
    const syntaxSpec = event.segment_type ? getToolSyntaxSpec(event.segment_type) : undefined;
    if (syntaxSpec) {
      toolName = syntaxSpec.toolName;
    }

    this.activeSegments.set(event.segment_id, {
      segmentType: event.segment_type,
      toolName,
      contentBuffer: '',
      toolArguments: {},
      syntaxSpec,
      metadata
    });
  }

  private handleContent(event: SegmentEvent): void {
    const segmentData = this.activeSegments.get(event.segment_id);
    if (!segmentData) {
      return;
    }

    const delta = event.payload?.delta ?? '';
    segmentData.contentBuffer += delta;
  }

  private handleEnd(event: SegmentEvent): ToolInvocation | null {
    const segmentData = this.activeSegments.get(event.segment_id);
    if (!segmentData) {
      return null;
    }

    this.activeSegments.delete(event.segment_id);

    const metadata = event.payload?.metadata ?? {};
    const segmentType = segmentData.segmentType as SegmentType | undefined;
    let toolName = metadata.tool_name || segmentData.toolName;
    let argumentsValue: Record<string, any> = segmentData.toolArguments ?? {};
    const contentBuffer = segmentData.contentBuffer ?? '';
    const startMetadata = segmentData.metadata ?? {};
    const syntaxSpec = segmentData.syntaxSpec;

    if (syntaxSpec) {
      toolName = syntaxSpec.toolName;
      const args = syntaxSpec.buildArguments({ ...startMetadata, ...metadata }, contentBuffer);
      if (!args) {
        console.warn(`Tool segment ${event.segment_id} ended without required arguments for ${toolName}`);
        return null;
      }
      argumentsValue = args;
    } else if (segmentType === SegmentType.TOOL_CALL) {
      const content = contentBuffer;
      const stripped = content.trimStart();
      let parsedCall: { name?: string; arguments?: any } | null = null;

      if (startMetadata.arguments) {
        argumentsValue = startMetadata.arguments;
      } else if (metadata.arguments) {
        argumentsValue = metadata.arguments;
      } else if (stripped.startsWith('{') || stripped.startsWith('[')) {
        parsedCall = parseJsonToolCall(stripped, this.jsonToolParser);
      } else {
        argumentsValue = parseXmlArguments(content);
      }

      if (parsedCall) {
        toolName = toolName || parsedCall.name;
        argumentsValue = parsedCall.arguments ?? {};
      }
    }

    if (!toolName) {
      console.warn(`Tool segment ${event.segment_id} ended without tool_name`);
      return null;
    }

    const invocation = new ToolInvocation(toolName, argumentsValue, event.segment_id);
    return invocation;
  }
}
