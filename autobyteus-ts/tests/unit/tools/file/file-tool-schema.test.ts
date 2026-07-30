import { beforeEach, describe, expect, it } from 'vitest';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { registerEditFileTool } from '../../../../src/tools/file/edit-file.js';
import { registerInsertInFileTool } from '../../../../src/tools/file/insert-in-file.js';
import { registerReadFileTool } from '../../../../src/tools/file/read-file.js';
import { registerReplaceInFileTool } from '../../../../src/tools/file/replace-in-file.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';
import {
  FILE_TOOL_BASE_DIR_DESCRIPTION,
  FILE_TOOL_PATH_DESCRIPTION,
} from '../../../../src/tools/file/file-tool-schema.js';

const TOOL_NAMES = ['read_file', 'write_file', 'edit_file', 'replace_in_file', 'insert_in_file'];

describe('generic file-tool serialized path schemas', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerReadFileTool();
    registerWriteFileTool();
    registerEditFileTool();
    registerReplaceInFileTool();
    registerInsertInFileTool();
  });

  it('uses identical canonical path/base_dir wording and optionality across all five tools', () => {
    for (const toolName of TOOL_NAMES) {
      const definition = defaultToolRegistry.getToolDefinition(toolName);
      const schema = definition?.argumentSchema;
      const pathProperty = schema?.toJsonSchema().properties?.path as Record<string, unknown>;
      const baseDirProperty = schema?.toJsonSchema().properties?.base_dir as Record<string, unknown>;
      const serialized = definition?.getUsageJson() as {
        inputSchema: {
          properties: Record<string, Record<string, unknown>>;
          required: string[];
        };
      };

      expect(schema?.getParameter('path')?.description).toBe(FILE_TOOL_PATH_DESCRIPTION);
      expect(schema?.getParameter('base_dir')?.description).toBe(FILE_TOOL_BASE_DIR_DESCRIPTION);
      expect(schema?.getParameter('path')?.required).toBe(true);
      expect(schema?.getParameter('base_dir')?.required).toBe(false);
      expect(pathProperty.description).toBe(FILE_TOOL_PATH_DESCRIPTION);
      expect(baseDirProperty.description).toBe(FILE_TOOL_BASE_DIR_DESCRIPTION);
      expect(serialized.inputSchema.properties.path.description).toBe(FILE_TOOL_PATH_DESCRIPTION);
      expect(serialized.inputSchema.properties.base_dir.description).toBe(FILE_TOOL_BASE_DIR_DESCRIPTION);
      expect(serialized.inputSchema.required).toContain('path');
      expect(serialized.inputSchema.required).not.toContain('base_dir');
    }
  });
});
