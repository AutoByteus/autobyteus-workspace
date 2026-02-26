import { describe, it, expect } from 'vitest';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../../src/utils/parameter-schema.js';
import { ToolOrigin } from '../../../../src/tools/tool-origin.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';

class DummyTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }

  static getDescription(): string {
    return 'Dummy tool';
  }

  static getArgumentSchema(): ParameterSchema | null {
    return null;
  }
}

describe('ToolDefinition (integration)', () => {
  it('produces provider-agnostic JSON schema output', () => {
    const schema = new ParameterSchema([
      new ParameterDefinition({
        name: 'path',
        type: ParameterType.STRING,
        description: 'File path',
        required: true
      })
    ]);

    const toolDef = new ToolDefinition(
      'FileReader',
      'Reads a file',
      ToolOrigin.LOCAL,
      'file',
      () => schema,
      () => null,
      { toolClass: DummyTool }
    );

    const usage = toolDef.getUsageJson();

    expect(usage).toEqual({
      name: 'FileReader',
      description: 'Reads a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            description: 'File path',
            type: 'string'
          }
        },
        required: ['path']
      }
    });
  });
});
