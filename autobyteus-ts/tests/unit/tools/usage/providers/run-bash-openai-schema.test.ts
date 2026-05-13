import { afterEach, describe, expect, it } from 'vitest';
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
    expect(schema.function.parameters).toMatchObject({
      type: 'object',
      additionalProperties: false
    });
    expect(schema.function.parameters.required).toContain('command');
    expect(schema.function.parameters.required).not.toContain('cwd');
    expect(schema.function.strict).toBeUndefined();
  });
});
