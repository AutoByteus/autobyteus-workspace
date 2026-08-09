import { describe, it, expect, beforeEach } from 'vitest';
import { defaultToolRegistry, ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';
import { registerReadFileTool } from '../../../../src/tools/file/read-file.js';
import { ToolSchemaProvider } from '../../../../src/tools/usage/providers/tool-schema-provider.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

const TOOL_NAME_READ_FILE = 'read_file';

describe('read_file tool definition', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerReadFileTool();
  });

  it('registers definition with expected schema', () => {
    const definition = defaultToolRegistry.getToolDefinition(TOOL_NAME_READ_FILE);
    expect(definition).toBeInstanceOf(ToolDefinition);
    expect(definition?.name).toBe(TOOL_NAME_READ_FILE);
    expect(definition?.description).toContain('Reads content from a specified file');
    expect(definition?.description).toContain('Raises FileNotFoundError if the file does not exist');

    const schema = definition?.argumentSchema;
    expect(schema).toBeInstanceOf(ParameterSchema);
    expect(schema?.parameters.length).toBe(5);

    const paramPath = schema?.getParameter('path');
    expect(paramPath).toBeInstanceOf(ParameterDefinition);
    expect(paramPath?.name).toBe('path');
    expect(paramPath?.type).toBe(ParameterType.STRING);
    expect(paramPath?.required).toBe(true);
    expect(paramPath?.description).toContain('If path is relative, you must provide an absolute base_dir');
    expect(paramPath?.description).toContain('Absolute paths are used directly and take precedence');
    expect(paramPath?.description).toContain('never resolved from the configured workspace, process cwd, or prior shell cd state');

    const paramBaseDir = schema?.getParameter('base_dir');
    expect(paramBaseDir).toBeInstanceOf(ParameterDefinition);
    expect(paramBaseDir?.type).toBe(ParameterType.STRING);
    expect(paramBaseDir?.required).toBe(false);
    expect(paramBaseDir?.description).toContain('required for a relative path');

    const paramStartLine = schema?.getParameter('start_line');
    expect(paramStartLine?.type).toBe(ParameterType.INTEGER);
    expect(paramStartLine?.required).toBe(false);

    const paramEndLine = schema?.getParameter('end_line');
    expect(paramEndLine?.type).toBe(ParameterType.INTEGER);
    expect(paramEndLine?.required).toBe(false);

    const paramInclude = schema?.getParameter('include_line_numbers');
    expect(paramInclude?.type).toBe(ParameterType.BOOLEAN);
    expect(paramInclude?.required).toBe(false);
  });

  it('provides the native OpenAI JSON schema', () => {
    const [nativeSchema] = new ToolSchemaProvider().buildSchema(
      [TOOL_NAME_READ_FILE],
      LLMProvider.OPENAI
    ) as Array<Record<string, any>>;

    expect(nativeSchema.type).toBe('function');
    expect(nativeSchema.function.name).toBe(TOOL_NAME_READ_FILE);
    expect(nativeSchema.function.description).toContain('Reads content from a specified file');

    const parameters = nativeSchema.function.parameters;
    expect(parameters.type).toBe('object');
    expect(parameters.properties.path.type).toBe('string');
    expect(parameters.properties.base_dir.type).toBe('string');
    expect(parameters.required).toContain('path');
    expect(parameters.required).not.toContain('base_dir');
    expect(parameters.properties.start_line.type).toBe('integer');
    expect(parameters.properties.end_line.type).toBe('integer');
    expect(parameters.properties.include_line_numbers.type).toBe('boolean');
  });
});
