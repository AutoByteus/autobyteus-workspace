import { randomUUID } from 'node:crypto';
import { StreamingResponseHandler } from './streaming-response-handler.js';
import { ParsingStreamingResponseHandler } from './parsing-streaming-response-handler.js';
import { PassThroughStreamingResponseHandler } from './pass-through-streaming-response-handler.js';
import { ApiToolCallStreamingResponseHandler } from './api-tool-call-streaming-response-handler.js';
import { ParserConfig } from '../parser/parser-context.js';
import { getJsonToolParsingProfile } from '../parser/json-parsing-strategies/registry.js';
import { SegmentEvent } from '../segments/segment-events.js';
import { ToolInvocation } from '../../tool-invocation.js';
import { LLMProvider } from '../../../llm/providers.js';
import { resolveToolCallFormat } from '../../../utils/tool-call-format.js';
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
    segmentIdPrefix?: string | null;
    onSegmentEvent?: (event: SegmentEvent) => void;
    onToolInvocation?: (invocation: ToolInvocation) => void;
    agentId?: string | null;
  }): StreamingHandlerResult {
    const formatOverride = resolveToolCallFormat();
    const parseToolCalls = options.toolNames.length > 0;

    let segmentIdPrefix = options.segmentIdPrefix ?? undefined;
    if (!segmentIdPrefix) {
      segmentIdPrefix = `turn_${randomUUID().replace(/-/g, '')}:`;
    }

    if (!parseToolCalls) {
      return new StreamingHandlerResult(
        new PassThroughStreamingResponseHandler({
          onSegmentEvent: options.onSegmentEvent,
          onToolInvocation: options.onToolInvocation,
          segmentIdPrefix: segmentIdPrefix
        }),
        null
      );
    }

    if (formatOverride === 'api_tool_call') {
      const toolSchemas = StreamingResponseHandlerFactory.buildToolSchemas(
        options.toolNames,
        options.provider ?? null
      );
      return new StreamingHandlerResult(
        new ApiToolCallStreamingResponseHandler({
          onSegmentEvent: options.onSegmentEvent,
          onToolInvocation: options.onToolInvocation,
          segmentIdPrefix: segmentIdPrefix
        }),
        toolSchemas
      );
    }

    const parserName = StreamingResponseHandlerFactory.resolveParserName({
      formatOverride: formatOverride,
      provider: options.provider ?? null
    });

    const jsonProfile = getJsonToolParsingProfile(options.provider ?? null);
    const parserConfig = new ParserConfig({
      parseToolCalls: parseToolCalls,
      jsonToolPatterns: jsonProfile.signaturePatterns,
      jsonToolParser: jsonProfile.parser,
      segmentIdPrefix: segmentIdPrefix
    });

    return new StreamingHandlerResult(
      new ParsingStreamingResponseHandler({
        onSegmentEvent: options.onSegmentEvent,
        onToolInvocation: options.onToolInvocation,
        config: parserConfig,
        parserName: parserName
      }),
      null
    );
  }

  static resolveParserName(options: {
    formatOverride?: string | null;
    provider?: LLMProvider | null;
  }): string {
    const override = options.formatOverride ?? undefined;
    if (override === 'xml' || override === 'json' || override === 'sentinel') {
      return override;
    }
    return options.provider === LLMProvider.ANTHROPIC ? 'xml' : 'json';
  }

  static buildToolSchemas(toolNames: string[], provider?: LLMProvider | null): Array<Record<string, any>> | null {
    if (!toolNames.length) {
      return null;
    }

    const schemas = new ToolSchemaProvider().buildSchema(toolNames, provider ?? null);
    return schemas.length ? schemas : null;
  }
}
