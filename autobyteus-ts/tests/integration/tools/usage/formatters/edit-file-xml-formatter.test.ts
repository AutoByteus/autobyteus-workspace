import { describe, it, expect } from 'vitest';
import { ToolFormattingRegistry } from '../../../../../src/tools/usage/registries/tool-formatting-registry.js';
import { EditFileXmlSchemaFormatter } from '../../../../../src/tools/usage/formatters/edit-file-xml-schema-formatter.js';
import { EditFileXmlExampleFormatter } from '../../../../../src/tools/usage/formatters/edit-file-xml-example-formatter.js';

describe('EditFileXmlFormatter (integration)', () => {
  it('registry returns edit_file-specific formatters', () => {
    (ToolFormattingRegistry as any).instance = undefined;
    const registry = new ToolFormattingRegistry();
    const pair = registry.getFormatterPairForTool('edit_file', null);
    expect(pair.schemaFormatter).toBeInstanceOf(EditFileXmlSchemaFormatter);
    expect(pair.exampleFormatter).toBeInstanceOf(EditFileXmlExampleFormatter);
  });
});
