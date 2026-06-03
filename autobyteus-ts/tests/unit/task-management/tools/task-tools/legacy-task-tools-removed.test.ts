import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerTools } from '../../../../../src/tools/register-tools.js';
import { defaultToolRegistry } from '../../../../../src/tools/registry/tool-registry.js';
import type { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';

const removedModelFacingTaskTools = [
  'assign_task_to',
  'create_task',
  'create_tasks',
  'get_my_tasks',
  'get_task_plan_status',
  'update_task_status',
];

describe('legacy model-facing task-plan tools removal', () => {
  let registrySnapshot: Map<string, ToolDefinition>;

  beforeEach(() => {
    registrySnapshot = defaultToolRegistry.snapshot();
    defaultToolRegistry.clear();
  });

  afterEach(() => {
    defaultToolRegistry.restore(registrySnapshot);
  });


  it('does not register deleted task-plan tool names in the default local tool registry', () => {
    registerTools();

    for (const toolName of removedModelFacingTaskTools) {
      expect(defaultToolRegistry.getToolDefinition(toolName)).toBeUndefined();
    }
    expect(defaultToolRegistry.getToolDefinition('add_todo')).toBeDefined();
  });
});
