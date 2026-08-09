import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as publicApi from '../../src/index.js';
import { StreamingResponseHandlerFactory } from '../../src/agent/streaming/handlers/streaming-handler-factory.js';
import { ApiToolCallStreamingResponseHandler } from '../../src/agent/streaming/handlers/api-tool-call-streaming-response-handler.js';
import { PassThroughStreamingResponseHandler } from '../../src/agent/streaming/handlers/pass-through-streaming-response-handler.js';
import { ToolSchemaProvider } from '../../src/tools/usage/providers/tool-schema-provider.js';

const sourcePath = (relativePath: string): string =>
  fileURLToPath(new URL(`../../src/${relativePath}`, import.meta.url));

describe('native-only tool-calling public surface', () => {
  it('keeps the supported native schema and streaming contracts importable', () => {
    expect(StreamingResponseHandlerFactory).toBeTypeOf('function');
    expect(ApiToolCallStreamingResponseHandler).toBeTypeOf('function');
    expect(PassThroughStreamingResponseHandler).toBeTypeOf('function');
    expect(ToolSchemaProvider).toBeTypeOf('function');
  });

  it.each([
    'resolveToolCallFormat',
    'ToolCallFormat',
    'ParsingStreamingResponseHandler',
    'ToolManifestInjectorProcessor',
    'ToolFormattingRegistry',
    'ToolFormatterPair',
    'registerToolFormatter'
  ])('does not alias the removed %s contract from the root package', (exportName) => {
    expect(publicApi).not.toHaveProperty(exportName);
  });

  it.each([
    'utils/tool-call-format.ts',
    'agent/streaming/parsing-streaming-response-handler.ts',
    'agent/streaming/handlers/parsing-streaming-response-handler.ts',
    'agent/streaming/parser/index.ts',
    'agent/system-prompt-processor/tool-manifest-injector-processor.ts',
    'tools/usage/providers/tool-manifest-provider.ts',
    'tools/usage/registries/tool-formatting-registry.ts',
    'llm/prompt-renderers/provider-tool-history-renderer-selection.ts'
  ])('has no compatibility module at removed broad subpath %s', (relativePath) => {
    expect(fs.existsSync(sourcePath(relativePath))).toBe(false);
  });
});
