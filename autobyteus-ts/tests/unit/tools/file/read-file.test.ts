import { describe, it, expect, beforeEach } from 'vitest';
import { defaultToolRegistry, ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';
import { registerReadFileTool } from '../../../../src/tools/file/read-file.js';

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
    expect(schema?.parameters.length).toBe(4);

    const paramPath = schema?.getParameter('path');
    expect(paramPath).toBeInstanceOf(ParameterDefinition);
    expect(paramPath?.name).toBe('path');
    expect(paramPath?.type).toBe(ParameterType.STRING);
    expect(paramPath?.required).toBe(true);
    expect(paramPath?.description).toContain("Parameter 'path' for tool 'read_file'");
    expect(paramPath?.description).toContain('This is expected to be a path.');

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

  it('formats XML usage', () => {
    const definition = defaultToolRegistry.getToolDefinition(TOOL_NAME_READ_FILE);
    const xmlOutput = definition?.getUsageXml() ?? '';
    expect(xmlOutput).toContain(`<tool name="${TOOL_NAME_READ_FILE}"`);
    expect(xmlOutput).toContain('Reads content from a specified file');
    expect(xmlOutput).toContain("Parameter 'path' for tool 'read_file'");
    expect(xmlOutput).toContain('This is expected to be a path.');
    expect(xmlOutput).toContain('include_line_numbers');
    expect(xmlOutput).toContain('default="True"');
  });

  it('formats JSON usage', () => {
    const definition = defaultToolRegistry.getToolDefinition(TOOL_NAME_READ_FILE);
    const jsonOutput = definition?.getUsageJson() as Record<string, any>;

    expect(jsonOutput.name).toBe(TOOL_NAME_READ_FILE);
    expect(jsonOutput.description).toContain('Reads content from a specified file');

    const inputSchema = jsonOutput.inputSchema;
    expect(inputSchema.type).toBe('object');
    expect(inputSchema.properties.path.type).toBe('string');
    expect(inputSchema.required).toContain('path');
    expect(inputSchema.properties.start_line.type).toBe('integer');
    expect(inputSchema.properties.end_line.type).toBe('integer');
    expect(inputSchema.properties.include_line_numbers.type).toBe('boolean');
  });
});
