import { describe, it, expect, beforeEach } from 'vitest';
import { ToolSchemaProvider } from '../../../../../src/tools/usage/providers/tool-schema-provider.js';
import { defaultToolRegistry } from '../../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../../src/utils/parameter-schema.js';
import { BaseTool } from '../../../../../src/tools/base-tool.js';

class DummyTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }
  static getDescription() { return 'Dummy tool.'; }
  static getArgumentSchema() { return null; }
}

describe('ToolSchemaProvider (integration)', () => {
  it('uses the default tool registry when none is provided', () => {
    const registry = defaultToolRegistry;
    const schema = new ParameterSchema([
      new ParameterDefinition({
        name: 'input',
        type: ParameterType.STRING,
        description: 'Input value.',
        required: true
      })
    ]);

    registry.registerTool(new ToolDefinition(
      'ToolDefault',
      'Default registry tool.',
      ToolOrigin.LOCAL,
      'general',
      () => schema,
      () => null,
      { toolClass: DummyTool }
    ));

    const provider = new ToolSchemaProvider();
    const output = provider.buildSchema(['ToolDefault']);

    expect(output).toHaveLength(1);
    expect(output[0].function?.name ?? output[0].name).toBe('ToolDefault');

    registry.unregisterTool('ToolDefault');
  });
});
