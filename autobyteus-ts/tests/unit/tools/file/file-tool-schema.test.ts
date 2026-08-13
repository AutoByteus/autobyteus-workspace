import { beforeEach, describe, expect, it } from 'vitest';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { registerEditFileTool } from '../../../../src/tools/file/edit-file.js';
import { registerReadFileTool } from '../../../../src/tools/file/read-file.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';
import {
  FILE_TOOL_BASE_DIR_DESCRIPTION,
  FILE_TOOL_PATH_DESCRIPTION,
} from '../../../../src/tools/file/file-tool-schema.js';
import { ToolSchemaProvider } from '../../../../src/tools/usage/providers/tool-schema-provider.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

const TOOL_NAMES = ['read_file', 'write_file', 'edit_file'];

describe('generic file-tool native path schemas', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerReadFileTool();
    registerWriteFileTool();
    registerEditFileTool();
  });

  it('uses identical canonical path/base_dir wording and optionality across all three tools', () => {
    const nativeSchemas = new ToolSchemaProvider().buildSchema(TOOL_NAMES, LLMProvider.OPENAI);

    for (const [index, toolName] of TOOL_NAMES.entries()) {
      const definition = defaultToolRegistry.getToolDefinition(toolName);
      const schema = definition?.argumentSchema;
      const pathProperty = schema?.toJsonSchema().properties?.path as Record<string, unknown>;
      const baseDirProperty = schema?.toJsonSchema().properties?.base_dir as Record<string, unknown>;
      const nativeSchema = nativeSchemas[index] as {
        function: {
          parameters: {
          properties: Record<string, Record<string, unknown>>;
          required: string[];
          };
        };
      };

      expect(schema?.getParameter('path')?.description).toBe(FILE_TOOL_PATH_DESCRIPTION);
      expect(schema?.getParameter('base_dir')?.description).toBe(FILE_TOOL_BASE_DIR_DESCRIPTION);
      expect(schema?.getParameter('path')?.required).toBe(true);
      expect(schema?.getParameter('base_dir')?.required).toBe(false);
      expect(pathProperty.description).toBe(FILE_TOOL_PATH_DESCRIPTION);
      expect(baseDirProperty.description).toBe(FILE_TOOL_BASE_DIR_DESCRIPTION);
      expect(nativeSchema.function.parameters.properties.path.description).toBe(FILE_TOOL_PATH_DESCRIPTION);
      expect(nativeSchema.function.parameters.properties.base_dir.description).toBe(FILE_TOOL_BASE_DIR_DESCRIPTION);
      expect(nativeSchema.function.parameters.required).toContain('path');
      expect(nativeSchema.function.parameters.required).not.toContain('base_dir');
    }
  });
});
