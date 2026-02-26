import { describe, it, expect } from 'vitest';
import { WriteFileXmlSchemaFormatter } from '../../../../../src/tools/usage/formatters/write-file-xml-schema-formatter.js';
import { WriteFileXmlExampleFormatter } from '../../../../../src/tools/usage/formatters/write-file-xml-example-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { ToolCategory } from '../../../../../src/tools/tool-category.js';

describe('WriteFileXmlFormatter', () => {
  const toolDef = new ToolDefinition(
    'write_file',
    'Writes a file.',
    ToolOrigin.LOCAL,
    ToolCategory.GENERAL,
    () => null,
    () => null,
    { customFactory: () => ({} as any) }
  );

  it('schema uses standard XML structure', () => {
    const formatter = new WriteFileXmlSchemaFormatter();
    const schema = formatter.provide(toolDef);
    expect(schema).toContain('<tool name="write_file">');
    expect(schema).toContain('</tool>');
    expect(schema).toContain('<arguments>');
  });

  it('schema includes sentinel instructions', () => {
    const formatter = new WriteFileXmlSchemaFormatter();
    const schema = formatter.provide(toolDef);
    expect(schema).toContain('__START_CONTENT__');
    expect(schema).toContain('__END_CONTENT__');
    expect(schema).toContain('sentinel tags');
  });

  it('example uses standard XML structure', () => {
    const formatter = new WriteFileXmlExampleFormatter();
    const example = formatter.provide(toolDef);
    expect(example).toContain('<tool name="write_file">');
    expect(example).toContain('</tool>');
    expect(example).toContain('<arguments>');
  });

  it('example includes sentinel tags', () => {
    const formatter = new WriteFileXmlExampleFormatter();
    const example = formatter.provide(toolDef);
    expect(example).toContain('__START_CONTENT__');
    expect(example).toContain('__END_CONTENT__');
    expect(example).toContain('<arg name="path">/path/to/hello.py</arg>');
  });
});
