import { describe, it, expect } from 'vitest';
import { ToDoSchema, ToDoStatus } from '../../../src/task-management/todo.js';

const baseTodo = {
  description: 'Finish report',
  todo_id: 'todo_0001'
};

describe('ToDoSchema', () => {
  it('defaults status to pending', () => {
    const parsed = ToDoSchema.parse(baseTodo);
    expect(parsed.status).toBe(ToDoStatus.PENDING);
  });

  it('rejects invalid status values', () => {
    const result = ToDoSchema.safeParse({
      ...baseTodo,
      status: 'unknown'
    });
    expect(result.success).toBe(false);
  });
});
