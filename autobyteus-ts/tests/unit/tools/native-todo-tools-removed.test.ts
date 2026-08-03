import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTools } from '../../../src/tools/register-tools.js';
import { defaultToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import type { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { ToolSchemaProvider } from '../../../src/tools/usage/providers/tool-schema-provider.js';

const removedNativeTodoToolNames = [
  'create_todo_list',
  'add_todo',
  'get_todo_list',
  'update_todo_status',
];
const retainedToolNames = ['read_file', 'write_file', 'edit_file', 'run_bash'];

describe('native ToDo tool removal', () => {
  let registrySnapshot: Map<string, ToolDefinition>;

  beforeEach(() => {
    registrySnapshot = defaultToolRegistry.snapshot();
    defaultToolRegistry.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    defaultToolRegistry.restore(registrySnapshot);
  });

  it('does not register native ToDo tools while preserving file tools and schema composition', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    registerTools();

    for (const toolName of removedNativeTodoToolNames) {
      expect(defaultToolRegistry.getToolDefinition(toolName)).toBeUndefined();
    }
    for (const toolName of retainedToolNames) {
      expect(defaultToolRegistry.getToolDefinition(toolName)).toBeDefined();
    }

    const schemas = new ToolSchemaProvider(defaultToolRegistry).buildSchema([
      ...retainedToolNames,
      ...removedNativeTodoToolNames,
    ]);
    const schemaNames = schemas.map((schema) =>
      (schema.function as { name: string }).name
    );

    expect(schemaNames).toEqual(retainedToolNames);
  });
});
