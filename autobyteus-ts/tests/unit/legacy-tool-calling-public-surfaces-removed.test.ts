import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as publicApi from '../../src/index.js';
import { LlmStreamingResponseHandler } from '../../src/agent/streaming/handlers/llm-streaming-response-handler.js';
import { ToolContinuationInputBuilder } from '../../src/agent/loop/tool-continuation-input-builder.js';
import { SegmentEvent } from '../../src/agent/streaming/segments/segment-events.js';
import { BaseToolExecutionResultProcessor } from '../../src/agent/tool-execution-result-processor/base-processor.js';
import { ToolExecutionResultProcessorRegistry } from '../../src/agent/tool-execution-result-processor/processor-registry.js';
import { ToolSchemaProvider } from '../../src/tools/usage/providers/tool-schema-provider.js';

const sourcePath = (relativePath: string): string =>
  fileURLToPath(new URL(`../../src/${relativePath}`, import.meta.url));

describe('simplified native tool-loop public surface', () => {
  it('keeps the supported native loop and custom processor contracts importable', () => {
    expect(LlmStreamingResponseHandler).toBeTypeOf('function');
    expect(ToolContinuationInputBuilder).toBeTypeOf('function');
    expect(BaseToolExecutionResultProcessor).toBeTypeOf('function');
    expect(ToolExecutionResultProcessorRegistry).toBeTypeOf('function');
    expect(ToolSchemaProvider).toBeTypeOf('function');
  });

  it('exports the retained native stream, schema, segment, and custom processor contracts from the root package', () => {
    expect(publicApi).toMatchObject({
      LlmStreamingResponseHandler,
      ToolSchemaProvider,
      SegmentEvent,
      BaseToolExecutionResultProcessor,
      ToolExecutionResultProcessorRegistry
    });
  });

  it.each([
    'resolveToolCallFormat',
    'ToolCallFormat',
    'ParsingStreamingResponseHandler',
    'ToolManifestInjectorProcessor',
    'ToolFormattingRegistry',
    'ToolFormatterPair',
    'registerToolFormatter',
    'StreamingResponseHandlerFactory',
    'StreamingResponseHandler',
    'StreamingHandlerResult',
    'PassThroughStreamingResponseHandler',
    'ApiToolCallStreamingResponseHandler',
    'MemoryIngestToolResultProcessor',
    'ToolResultContinuationBuilder',
    'ToolContinuationMetadata',
    'ToolContinuationMode',
    'TOOL_CONTINUATION_MODE_PREPARE'
  ])('does not alias the removed %s contract from the root package', (exportName) => {
    expect(publicApi).not.toHaveProperty(exportName);
  });

  it.each([
    'utils/tool-call-format.ts',
    'agent/streaming/parsing-streaming-response-handler.ts',
    'agent/streaming/handlers/parsing-streaming-response-handler.ts',
    'agent/streaming/parser/index.ts',
    'tools/usage/providers/tool-manifest-provider.ts',
    'tools/usage/registries/tool-formatting-registry.ts',
    'llm/prompt-renderers/provider-tool-history-renderer-selection.ts',
    'agent/loop/tool-result-continuation-builder.ts',
    'agent/message/tool-continuation-metadata.ts',
    'agent/streaming/api-tool-call-streaming-response-handler.ts',
    'agent/streaming/handlers/api-tool-call-streaming-response-handler.ts',
    'agent/streaming/handlers/pass-through-streaming-response-handler.ts',
    'agent/streaming/handlers/streaming-handler-factory.ts',
    'agent/streaming/handlers/streaming-response-handler.ts',
    'agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts'
  ])('has no compatibility module at removed broad subpath %s', (relativePath) => {
    expect(fs.existsSync(sourcePath(relativePath))).toBe(false);
  });
});
