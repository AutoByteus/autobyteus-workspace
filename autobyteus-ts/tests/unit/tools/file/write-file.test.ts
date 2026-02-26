import { describe, it, expect, beforeEach } from 'vitest';
import { defaultToolRegistry, ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';

const TOOL_NAME_WRITE_FILE = 'write_file';

describe('write_file tool definition', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerWriteFileTool();
  });

  it('registers definition with expected schema', () => {
    const definition = defaultToolRegistry.getToolDefinition(TOOL_NAME_WRITE_FILE);
    expect(definition).toBeInstanceOf(ToolDefinition);
    expect(definition?.name).toBe(TOOL_NAME_WRITE_FILE);
    expect(definition?.description).toContain('Creates or overwrites a file');

    const schema = definition?.argumentSchema;
    expect(schema).toBeInstanceOf(ParameterSchema);
    expect(schema?.parameters.length).toBe(2);

    const paramPath = schema?.getParameter('path');
    expect(paramPath).toBeInstanceOf(ParameterDefinition);
    expect(paramPath?.type).toBe(ParameterType.STRING);
    expect(paramPath?.required).toBe(true);
    expect(paramPath?.description).toContain("Parameter 'path' for tool 'write_file'");
    expect(paramPath?.description).toContain('This is expected to be a path.');

    const paramContent = schema?.getParameter('content');
    expect(paramContent).toBeInstanceOf(ParameterDefinition);
    expect(paramContent?.type).toBe(ParameterType.STRING);
    expect(paramContent?.required).toBe(true);
    expect(paramContent?.description).toContain("Parameter 'content' for tool 'write_file'");
  });
});
