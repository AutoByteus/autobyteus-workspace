import { describe, it, expect } from 'vitest';
import { ToolFormattingRegistry } from '../../../../../src/tools/usage/registries/tool-formatting-registry.js';
import { WriteFileXmlSchemaFormatter } from '../../../../../src/tools/usage/formatters/write-file-xml-schema-formatter.js';
import { WriteFileXmlExampleFormatter } from '../../../../../src/tools/usage/formatters/write-file-xml-example-formatter.js';

describe('WriteFileXmlFormatter (integration)', () => {
  it('registry returns write_file-specific formatters', () => {
    (ToolFormattingRegistry as any).instance = undefined;
    const registry = new ToolFormattingRegistry();
    const pair = registry.getFormatterPairForTool('write_file', null);
    expect(pair.schemaFormatter).toBeInstanceOf(WriteFileXmlSchemaFormatter);
    expect(pair.exampleFormatter).toBeInstanceOf(WriteFileXmlExampleFormatter);
  });
});
