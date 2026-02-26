import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolManifestProvider } from '../../../../../src/tools/usage/providers/tool-manifest-provider.js';
import { ToolFormatterPair } from '../../../../../src/tools/usage/registries/tool-formatter-pair.js';
import { BaseXmlSchemaFormatter, BaseSchemaFormatter } from '../../../../../src/tools/usage/formatters/base-formatter.js';

const mockRegistry = { getFormatterPairForTool: vi.fn() };

vi.mock('../../../../../src/tools/usage/registries/tool-formatting-registry.js', () => {
  class ToolFormattingRegistry {
    constructor() {
      return mockRegistry;
    }
  }
  return { ToolFormattingRegistry };
});

class MockXmlSchemaFormatter extends BaseXmlSchemaFormatter {
  provide(): any {
    return "<tool name='TestTool' />";
  }
}

class MockJsonSchemaFormatter implements BaseSchemaFormatter {
  provide(): any {
    return { name: 'TestTool', parameters: {} };
  }
}

describe('ToolManifestProvider', () => {
  beforeEach(() => {
    mockRegistry.getFormatterPairForTool.mockReset();
  });

  it('formats XML using registry formatter pair', () => {
    const schemaFormatter = new MockXmlSchemaFormatter();
    const exampleFormatter = { provide: vi.fn().mockReturnValue("<tool name='TestTool'><arguments /></tool>") };
    mockRegistry.getFormatterPairForTool.mockReturnValue(
      new ToolFormatterPair(schemaFormatter, exampleFormatter as any)
    );

    const provider = new ToolManifestProvider();
    const manifest = provider.provide([{ name: 'TestTool' } as any]);

    expect(mockRegistry.getFormatterPairForTool).toHaveBeenCalledOnce();
    expect(manifest).toContain(ToolManifestProvider.XML_SCHEMA_HEADER);
    expect(manifest).toContain("<tool name='TestTool' />");
    expect(manifest).toContain(ToolManifestProvider.XML_EXAMPLE_HEADER);
    expect(manifest).toContain("<tool name='TestTool'><arguments /></tool>");
  });

  it('formats JSON using registry formatter pair', () => {
    const schemaFormatter = new MockJsonSchemaFormatter();
    const exampleFormatter = { provide: vi.fn().mockReturnValue('{"example":"usage"}') };
    mockRegistry.getFormatterPairForTool.mockReturnValue(
      new ToolFormatterPair(schemaFormatter, exampleFormatter as any)
    );

    const provider = new ToolManifestProvider();
    const manifest = provider.provide([{ name: 'TestTool' } as any]);

    expect(manifest).toContain(ToolManifestProvider.JSON_SCHEMA_HEADER);
    expect(manifest).toContain('"name": "TestTool"');
    expect(manifest).toContain(ToolManifestProvider.JSON_EXAMPLE_HEADER);
    expect(manifest).toContain('{"example":"usage"}');
    expect(manifest).not.toContain(ToolManifestProvider.XML_GENERAL_GUIDELINES);
  });

  it('joins multiple XML tools with separators', () => {
    const schemaFormatter = new MockXmlSchemaFormatter();
    const exampleFormatter = { provide: vi.fn() };
    exampleFormatter.provide
      .mockReturnValueOnce('<example1 />')
      .mockReturnValueOnce('<example2 />');

    mockRegistry.getFormatterPairForTool.mockReturnValue(
      new ToolFormatterPair(schemaFormatter, exampleFormatter as any)
    );

    const provider = new ToolManifestProvider();
    const manifest = provider.provide([{ name: 'Tool1' } as any, { name: 'Tool2' } as any]);

    expect(manifest).toContain("<tool name='TestTool' />");
    expect(manifest).toContain('<example1 />');
    expect(manifest).toContain('<example2 />');
    expect(manifest).toContain('\n\n---\n\n');
  });

  it('joins multiple JSON tools with separators', () => {
    const schemaFormatter = new MockJsonSchemaFormatter();
    const exampleFormatter = { provide: vi.fn() };
    exampleFormatter.provide
      .mockReturnValueOnce('{"example":"one"}')
      .mockReturnValueOnce('{"example":"two"}');

    mockRegistry.getFormatterPairForTool.mockReturnValue(
      new ToolFormatterPair(schemaFormatter, exampleFormatter as any)
    );

    const provider = new ToolManifestProvider();
    const manifest = provider.provide([{ name: 'Tool1' } as any, { name: 'Tool2' } as any]);

    expect(manifest).toContain('"name": "TestTool"');
    expect(manifest).toContain('{"example":"one"}');
    expect(manifest).toContain('{"example":"two"}');
    expect(manifest).toContain('\n\n---\n\n');
  });
});
