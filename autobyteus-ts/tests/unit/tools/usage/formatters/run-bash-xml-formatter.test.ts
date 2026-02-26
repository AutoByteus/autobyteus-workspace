import { describe, it, expect } from 'vitest';
import { RunBashXmlSchemaFormatter } from '../../../../../src/tools/usage/formatters/run-bash-xml-schema-formatter.js';
import { RunBashXmlExampleFormatter } from '../../../../../src/tools/usage/formatters/run-bash-xml-example-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { ToolCategory } from '../../../../../src/tools/tool-category.js';

describe('RunBashXmlFormatter', () => {
  const toolDef = new ToolDefinition(
    'run_bash',
    'Runs shell commands.',
    ToolOrigin.LOCAL,
    ToolCategory.GENERAL,
    () => null,
    () => null,
    { customFactory: () => ({} as any) }
  );

  it('schema uses shorthand XML syntax', () => {
    const formatter = new RunBashXmlSchemaFormatter();
    const schema = formatter.provide(toolDef);
    expect(schema).toContain('<run_bash>');
    expect(schema).toContain('</run_bash>');
    expect(schema).toContain('Runs a command in the terminal');
  });

  it('example uses shorthand XML syntax', () => {
    const formatter = new RunBashXmlExampleFormatter();
    const example = formatter.provide(toolDef);
    expect(example).toContain('<run_bash>');
    expect(example).toContain('</run_bash>');
    expect(example).toContain('ls -la');
  });
});
