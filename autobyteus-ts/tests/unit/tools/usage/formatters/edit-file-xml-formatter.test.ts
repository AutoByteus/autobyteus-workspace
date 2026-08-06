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
    expect(schema).toContain('<tool name="edit_file"');
    expect(schema).toContain('</tool>');
    expect(schema).toContain('<arguments>');
  });

  it('schema includes sentinel instructions', () => {
    const formatter = new EditFileXmlSchemaFormatter();
    const schema = formatter.provide(toolDef);
    expect(schema).toContain('__START_PATCH__');
    expect(schema).toContain('__END_PATCH__');
    expect(schema).toContain('sentinel tags');
    expect(schema).toContain('If path is relative, you must provide an absolute base_dir');
    expect(schema).toContain('name="base_dir"');
    expect(schema).toContain('prior shell cd state');
    expect(schema).toContain('context-located patch');
    expect(schema).toContain('simplified unified-diff-style format');
    expect(schema).toContain('read the current relevant file region unless it was just read');
    expect(schema).toContain('do not reconstruct them from memory');
    expect(schema).toContain('After an intervening edit or a context-match failure');
    expect(schema).toContain('bare `@@` line');
    expect(schema).toContain('Copy unchanged and removal lines exactly');
    expect(schema).toContain('`diff --git`, `---`, or `+++`');
    expect(schema).toContain('numeric hunk coordinates');
    expect(schema).toContain('`*** Begin Patch` and `*** End Patch`');
    expect(schema).not.toContain('@@ -10,7 +10,8 @@');
  });

  it('places the canonical bare-hunk example in patch-field guidance before sentinels', () => {
    const formatter = new EditFileXmlSchemaFormatter();
    const schema = formatter.provide(toolDef);
    const example = "Example patch:\n@@\n-const mode = 'old'\n+const mode = 'new'\n const keep = true";

    expect(schema).toContain(example);
    expect(schema.indexOf(example)).toBeLessThan(schema.indexOf('IMPORTANT: To ensure reliable streaming'));
    expect(schema.split('\n')).toContain(' const keep = true');
    expect(schema.slice(schema.indexOf('Example patch:'), schema.indexOf('IMPORTANT:')))
      .not.toMatch(/diff --git|---|\+\+\+|@@ -|\*\*\* Begin Patch|__START_PATCH__/);
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
    expect(example).toContain('<arg name="path">/path/to/config/settings.yaml</arg>');
  });
});
