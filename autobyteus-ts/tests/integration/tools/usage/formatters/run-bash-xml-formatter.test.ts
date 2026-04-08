import { describe, it, expect } from 'vitest';
import { RunBashXmlSchemaFormatter } from '../../../../../src/tools/usage/formatters/run-bash-xml-schema-formatter.js';
import { RunBashXmlExampleFormatter } from '../../../../../src/tools/usage/formatters/run-bash-xml-example-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';

class DummyToolFactory {
  static create(): any {
    return {} as any;
  }
}

describe('RunBashXmlFormatter (integration)', () => {
  it('provides schema and example strings for run_bash', () => {
    const toolDef = new ToolDefinition(
      'run_bash',
      'Runs shell commands.',
      ToolOrigin.LOCAL,
      'general',
      () => null,
      () => null,
      { customFactory: () => DummyToolFactory.create() }
    );

    const schema = new RunBashXmlSchemaFormatter().provide(toolDef);
    const example = new RunBashXmlExampleFormatter().provide(toolDef);

    expect(schema).toContain('## run_bash');
    expect(schema).toContain(
      '`cwd="/absolute/path"` (optional; must be absolute when provided, for example `/Users/alice/project` or `/tmp/scratch-task`)'
    );
    expect(example).toContain('python -m pytest tests/ -v');
    expect(example).toContain('cwd="/absolute/path/to/workspace/tests"');
  });
});
