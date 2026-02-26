import { describe, it, expect } from 'vitest';
import { TaskDefinitionSchema, TasksDefinitionSchema } from '../../../../src/task-management/schemas/task-definition.js';

const baseTask = {
  task_name: 'task_a',
  assignee_name: 'AgentA',
  description: 'Task A.'
};

describe('TaskDefinitionSchema', () => {
  it('defaults dependencies to empty array', () => {
    const parsed = TaskDefinitionSchema.parse(baseTask);
    expect(parsed.dependencies).toEqual([]);
  });

  it('requires task_name, assignee_name, and description', () => {
    const result = TaskDefinitionSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('task_name'))).toBe(true);
      expect(result.error.issues.some((issue) => issue.path.includes('assignee_name'))).toBe(true);
      expect(result.error.issues.some((issue) => issue.path.includes('description'))).toBe(true);
    }
  });
});

describe('TasksDefinitionSchema', () => {
  it('rejects duplicate task_name values', () => {
    const result = TasksDefinitionSchema.safeParse({
      tasks: [
        { ...baseTask, task_name: 'dup' },
        { ...baseTask, task_name: 'dup' }
      ]
    });

    expect(result.success).toBe(false);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
    expect(messages.some((msg) => msg.includes("Duplicate task_name 'dup'"))).toBe(true);
  });
});
