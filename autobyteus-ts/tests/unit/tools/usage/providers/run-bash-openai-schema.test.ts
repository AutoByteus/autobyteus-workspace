import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { LLMProvider } from '../../../../../src/llm/providers.js';
import { registerRunBashTool } from '../../../../../src/tools/terminal/tools/run-bash.js';
import { ToolSchemaProvider } from '../../../../../src/tools/usage/providers/tool-schema-provider.js';
import { defaultToolRegistry } from '../../../../../src/tools/registry/tool-registry.js';

const registrySnapshot = defaultToolRegistry.snapshot();

describe('run_bash OpenAI-compatible schema', () => {
  afterEach(() => {
    defaultToolRegistry.restore(registrySnapshot);
  });

  it('uses the function-tool envelope with closed object parameters and no default strict flag', () => {
    registerRunBashTool();

    const [schema] = new ToolSchemaProvider(defaultToolRegistry).buildSchema(['run_bash'], LLMProvider.LMSTUDIO);

    expect(schema.type).toBe('function');
    expect(schema.function.name).toBe('run_bash');
    expect(schema.function.description).toContain('Any provided cwd must be an absolute path');
    expect(schema.function.description).not.toContain('relative cwd');
    expect(schema.function.description).toContain('does not change workspace identity');
    expect(schema.function.parameters.properties.cwd.description).toBe('Optional working directory for the command.');
    expect(schema.function.parameters).toMatchObject({
      type: 'object',
      additionalProperties: false
    });
    expect(schema.function.parameters.required).toContain('command');
    expect(schema.function.parameters.required).not.toContain('cwd');
    expect(Object.keys(schema.function.parameters.properties)).toEqual(['command', 'cwd', 'timeout_seconds', 'run_in_background']);
    expect(schema.function.parameters.properties.run_in_background.type).toBe('boolean');
    expect(schema.function.parameters.required).not.toContain('run_in_background');
    expect(schema.function.description).toContain('`kill <pid>`');
    expect(schema.function.description).toContain('tail -n 50 <outputFile>');
    expect(schema.function.strict).toBeUndefined();
  });

  it('keeps both durable terminal docs aligned with serialized cwd semantics', () => {
    registerRunBashTool();
    const provider = new ToolSchemaProvider(defaultToolRegistry);
    const [runSchema] = provider.buildSchema(['run_bash'], LLMProvider.LMSTUDIO);
    const docs = [
      readFileSync(path.resolve(process.cwd(), 'docs/terminal_tools.md'), 'utf8'),
      readFileSync(path.resolve(process.cwd(), 'docs/tool_schema_and_configuration.md'), 'utf8')
    ];
    const schemaContractTerms = [
      'absolute',
      'system temporary directory',
      'workspace identity',
      'persist across calls'
    ];

    for (const document of docs) {
      for (const term of schemaContractTerms) {
        expect(document).toContain(term);
      }
    }
    expect(docs[0]).toMatch(/any provided `cwd`\s+must be absolute/);
    expect(docs[0]).not.toContain('workspace-root-relative');
    expect(docs[1]).toMatch(/any provided `cwd`\s+to be absolute/);
    expect(docs[1]).not.toContain('relative terminal `cwd`');
    expect(runSchema.function.parameters.properties.cwd.description).toBe('Optional working directory for the command.');

    const genericFileContractTerms = [
      'an absolute `path` is used directly',
      'a relative `path` requires an explicit absolute `base_dir`',
      'when `path` is absolute it takes precedence',
      'omitting `base_dir` for a relative path is an error',
      '`base_dir` is invocation-scoped'
    ];
    for (const term of genericFileContractTerms) {
      expect(docs[1]).toContain(term);
    }
  });
});
