import { describe, it, expect } from 'vitest';
import { EditFileXmlSchemaFormatter } from '../../../../../src/tools/usage/formatters/edit-file-xml-schema-formatter.js';
import { EditFileXmlExampleFormatter } from '../../../../../src/tools/usage/formatters/edit-file-xml-example-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { ToolCategory } from '../../../../../src/tools/tool-category.js';

describe('EditFileXmlFormatter', () => {
  const toolDef = new ToolDefinition(
    'edit_file',
    'Patches a file.',
    ToolOrigin.LOCAL,
    ToolCategory.GENERAL,
    () => null,
    () => null,
    { customFactory: () => ({} as any) }
  );

  it('schema uses standard XML structure', () => {
    const formatter = new EditFileXmlSchemaFormatter();
    const schema = formatter.provide(toolDef);
    expect(schema).toContain('<tool name="edit_file">');
    expect(schema).toContain('</tool>');
    expect(schema).toContain('<arguments>');
  });

  it('schema includes sentinel instructions', () => {
    const formatter = new EditFileXmlSchemaFormatter();
    const schema = formatter.provide(toolDef);
    expect(schema).toContain('__START_PATCH__');
    expect(schema).toContain('__END_PATCH__');
    expect(schema).toContain('sentinel tags');
  });

  it('example uses standard XML structure', () => {
    const formatter = new EditFileXmlExampleFormatter();
    const example = formatter.provide(toolDef);
    expect(example).toContain('<tool name="edit_file">');
    expect(example).toContain('</tool>');
    expect(example).toContain('<arguments>');
  });

  it('example includes sentinel tags', () => {
    const formatter = new EditFileXmlExampleFormatter();
    const example = formatter.provide(toolDef);
    expect(example).toContain('__START_PATCH__');
    expect(example).toContain('__END_PATCH__');
    expect(example).toContain('<arg name="path">/path/to/utils.py</arg>');
  });
});
