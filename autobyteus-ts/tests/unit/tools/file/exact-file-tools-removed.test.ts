import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTools } from '../../../../src/tools/register-tools.js';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import type { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { ToolSchemaProvider } from '../../../../src/tools/usage/providers/tool-schema-provider.js';

const removedToolNames = [
  ['replace', 'in', 'file'].join('_'),
  ['insert', 'in', 'file'].join('_'),
];
const retainedToolNames = ['read_file', 'edit_file', 'write_file', 'run_bash'];

describe('redundant exact file tools removal', () => {
  let registrySnapshot: Map<string, ToolDefinition>;

  beforeEach(() => {
    registrySnapshot = defaultToolRegistry.snapshot();
    defaultToolRegistry.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    defaultToolRegistry.restore(registrySnapshot);
  });

  it('omits removed definitions and schemas while preserving retained and unrelated tools', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    registerTools();

    for (const toolName of removedToolNames) {
      expect(defaultToolRegistry.getToolDefinition(toolName)).toBeUndefined();
    }
    for (const toolName of retainedToolNames) {
      expect(defaultToolRegistry.getToolDefinition(toolName)).toBeDefined();
    }
    expect(defaultToolRegistry.getToolDefinition('add_todo')).toBeDefined();

    const schemas = new ToolSchemaProvider(defaultToolRegistry).buildSchema([
      ...retainedToolNames,
      ...removedToolNames,
    ]);
    const schemaNames = schemas.map((schema) =>
      (schema.function as { name: string }).name
    );

    expect(schemaNames).toEqual(retainedToolNames);
  });
});
