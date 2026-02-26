import { describe, it, expect } from 'vitest';
import { ToDoDefinitionSchema, ToDosDefinitionSchema } from '../../../../src/task-management/schemas/todo-definition.js';

describe('ToDoDefinitionSchema', () => {
  it('requires description', () => {
    const result = ToDoDefinitionSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('description'))).toBe(true);
    }
  });
});

describe('ToDosDefinitionSchema', () => {
  it('requires todos array', () => {
    const result = ToDosDefinitionSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('todos'))).toBe(true);
    }
  });

  it('accepts list of todo definitions', () => {
    const result = ToDosDefinitionSchema.safeParse({
      todos: [{ description: 'First todo' }, { description: 'Second todo' }]
    });

    expect(result.success).toBe(true);
  });
});
