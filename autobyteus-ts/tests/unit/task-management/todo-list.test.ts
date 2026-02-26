import { describe, it, expect } from 'vitest';
import { ToDoList } from '../../../src/task-management/todo-list.js';
import { ToDoStatus } from '../../../src/task-management/todo.js';

const todoDef = { description: 'Outline proposal' };

describe('ToDoList', () => {
  it('adds todos with sequential ids', () => {
    const list = new ToDoList('agent-1');
    const todo = list.addTodo(todoDef);

    expect(todo.todo_id).toBe('todo_0001');
    expect(list.getAllTodos().length).toBe(1);
  });

  it('updates todo status', () => {
    const list = new ToDoList('agent-1');
    const todo = list.addTodo(todoDef);

    const success = list.updateTodoStatus(todo.todo_id, ToDoStatus.DONE);
    expect(success).toBe(true);
    expect(todo.status).toBe(ToDoStatus.DONE);
  });

  it('returns false for missing todo', () => {
    const list = new ToDoList('agent-1');
    const success = list.updateTodoStatus('missing', ToDoStatus.DONE);
    expect(success).toBe(false);
  });
});
