import { afterEach, describe, expect, it } from 'vitest';
import { LLMProvider } from '../../../../../src/llm/providers.js';
import { registerRunBashTool } from '../../../../../src/tools/terminal/tools/run-bash.js';
import { registerStartBackgroundProcessTool } from '../../../../../src/tools/terminal/tools/start-background-process.js';
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
    expect(schema.function.description).toContain('outside the workspace');
    expect(schema.function.description).toContain('relative cwd');
    expect(schema.function.description).toContain('does not change workspace identity');
    expect(schema.function.parameters.properties.cwd.description).toContain('system temporary directory');
    expect(schema.function.parameters).toMatchObject({
      type: 'object',
      additionalProperties: false
    });
    expect(schema.function.parameters.required).toContain('command');
    expect(schema.function.parameters.required).not.toContain('cwd');
    expect(Object.keys(schema.function.parameters.properties)).not.toContain('background');
    expect(schema.function.strict).toBeUndefined();
  });

  it('describes the same cwd contract for start_background_process', () => {
    registerStartBackgroundProcessTool();

    const [schema] = new ToolSchemaProvider(defaultToolRegistry).buildSchema(
      ['start_background_process'],
      LLMProvider.LMSTUDIO
    );

    expect(schema.function.description).toContain('outside the workspace');
    expect(schema.function.description).toContain('relative cwd');
    expect(schema.function.description).toContain('does not change workspace identity');
    expect(schema.function.parameters.properties.cwd.description).toContain('system temporary directory');
  });
});
