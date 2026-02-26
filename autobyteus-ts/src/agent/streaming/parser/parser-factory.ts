import { ParserConfig } from './parser-context.js';
import { StreamingParser } from './streaming-parser.js';
import type { SegmentEvent } from './events.js';
import type { JsonToolParsingStrategy } from './json-parsing-strategies/base.js';

export interface StreamingParserProtocol {
  readonly config: ParserConfig;
  feed(chunk: string): SegmentEvent[];
  finalize(): SegmentEvent[];
}

export const ENV_PARSER_NAME = 'AUTOBYTEUS_STREAM_PARSER';
export const DEFAULT_PARSER_NAME = 'xml';

type ParserBuilder = (config?: ParserConfig) => StreamingParserProtocol;

function cloneConfig(
  config: ParserConfig | undefined,
  options: {
    parseToolCalls?: boolean;
    jsonToolPatterns?: string[];
    jsonToolParser?: JsonToolParsingStrategy;
    strategyOrder?: string[];
    segmentIdPrefix?: string;
  }
): ParserConfig {
  const base = config ?? new ParserConfig();
  return new ParserConfig({
    parseToolCalls: options.parseToolCalls ?? base.parseToolCalls,
    jsonToolPatterns: options.jsonToolPatterns ?? [...base.jsonToolPatterns],
    jsonToolParser: options.jsonToolParser ?? base.jsonToolParser,
    strategyOrder: options.strategyOrder ?? [...base.strategyOrder],
    segmentIdPrefix: options.segmentIdPrefix ?? base.segmentIdPrefix
  });
}

function buildXml(config?: ParserConfig): StreamingParserProtocol {
  const xmlConfig = cloneConfig(config, { parseToolCalls: true, strategyOrder: ['xml_tag'] });
  return new StreamingParser(xmlConfig);
}

function buildJson(config?: ParserConfig): StreamingParserProtocol {
  const jsonConfig = cloneConfig(config, { parseToolCalls: true, strategyOrder: ['json_tool'] });
  return new StreamingParser(jsonConfig);
}

function buildApiToolCall(config?: ParserConfig): StreamingParserProtocol {
  const apiToolCallConfig = cloneConfig(config, { parseToolCalls: false });
  return new StreamingParser(apiToolCallConfig);
}

function buildSentinel(config?: ParserConfig): StreamingParserProtocol {
  const sentinelConfig = cloneConfig(config, { parseToolCalls: true, strategyOrder: ['sentinel'] });
  return new StreamingParser(sentinelConfig);
}

export const PARSER_REGISTRY: Record<string, ParserBuilder> = {
  xml: buildXml,
  json: buildJson,
  api_tool_call: buildApiToolCall,
  sentinel: buildSentinel
};

export function resolveParserName(explicitName?: string): string {
  const name = explicitName ?? process.env[ENV_PARSER_NAME] ?? DEFAULT_PARSER_NAME;
  return name.trim().toLowerCase();
}

export function createStreamingParser(options?: {
  config?: ParserConfig;
  parserName?: string;
}): StreamingParserProtocol {
  const name = resolveParserName(options?.parserName);
  const builder = PARSER_REGISTRY[name];
  if (!builder) {
    throw new Error(`Unknown parser strategy '${name}'. Supported: ${Object.keys(PARSER_REGISTRY).sort().join(', ')}.`);
  }
  return builder(options?.config);
}
