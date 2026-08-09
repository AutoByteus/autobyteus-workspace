import { randomUUID } from 'node:crypto';
import { StreamingResponseHandler } from './streaming-response-handler.js';
import { PassThroughStreamingResponseHandler } from './pass-through-streaming-response-handler.js';
import { ApiToolCallStreamingResponseHandler } from './api-tool-call-streaming-response-handler.js';
import { SegmentEvent } from '../segments/segment-events.js';
import { ToolInvocation } from '../../tool-invocation.js';
import { LLMProvider } from '../../../llm/providers.js';
import { ToolSchemaProvider } from '../../../tools/usage/providers/tool-schema-provider.js';

export class StreamingHandlerResult {
  handler: StreamingResponseHandler;
  toolSchemas: Array<Record<string, any>> | null;

  constructor(handler: StreamingResponseHandler, toolSchemas: Array<Record<string, any>> | null = null) {
    this.handler = handler;
    this.toolSchemas = toolSchemas;
  }
}

export class StreamingResponseHandlerFactory {
  static create(options: {
    toolNames: string[];
    provider?: LLMProvider | null;
    turnId: string;
    segmentIdPrefix?: string | null;
    onSegmentEvent?: (event: SegmentEvent) => void;
    onToolInvocation?: (invocation: ToolInvocation) => void;
  }): StreamingHandlerResult {
    let segmentIdPrefix = options.segmentIdPrefix ?? undefined;
    if (!segmentIdPrefix) {
      segmentIdPrefix = `turn_${randomUUID().replace(/-/g, '')}:`;
    }

    if (options.toolNames.length === 0) {
      return new StreamingHandlerResult(
        new PassThroughStreamingResponseHandler({
          onSegmentEvent: options.onSegmentEvent,
          onToolInvocation: options.onToolInvocation,
          turnId: options.turnId,
          segmentIdPrefix: segmentIdPrefix
        }),
        null
      );
    }

    const toolSchemas = StreamingResponseHandlerFactory.buildToolSchemas(
      options.toolNames,
      options.provider ?? null
    );
    return new StreamingHandlerResult(
      new ApiToolCallStreamingResponseHandler({
        onSegmentEvent: options.onSegmentEvent,
        onToolInvocation: options.onToolInvocation,
        turnId: options.turnId,
        segmentIdPrefix
      }),
      toolSchemas
    );
  }

  static buildToolSchemas(toolNames: string[], provider?: LLMProvider | null): Array<Record<string, any>> | null {
    if (!toolNames.length) {
      return null;
    }

    const schemas = new ToolSchemaProvider().buildSchema(toolNames, provider ?? null);
    return schemas.length ? schemas : null;
  }
}
