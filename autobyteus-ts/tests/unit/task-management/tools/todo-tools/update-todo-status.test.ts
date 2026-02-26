import { describe, it, expect } from 'vitest';
import { UpdateToDoStatus } from '../../../../../src/task-management/tools/todo-tools/update-todo-status.js';
import { ToDoDefinitionSchema } from '../../../../../src/task-management/schemas/todo-definition.js';
import { ToDoStatus } from '../../../../../src/task-management/todo.js';
import { ToDoList } from '../../../../../src/task-management/todo-list.js';

const buildContext = (agentId = 'agent_update_todo', withList = true) => {
  const state: { todoList: ToDoList | null } = { todoList: null };
  if (withList) {
    const todoList = new ToDoList(agentId);
    todoList.addTodo(ToDoDefinitionSchema.parse({ description: 'Initial step' }));
    state.todoList = todoList;
  }

  return {
    agentId,
    statusManager: { notifier: { notifyAgentDataTodoListUpdated: () => {} } },
    state
  };
};

describe('UpdateToDoStatus tool', () => {
  it('exposes name and description', () => {
    expect(UpdateToDoStatus.getName()).toBe('update_todo_status');
    expect(UpdateToDoStatus.getDescription()).toContain('Updates the status of a specific item');
  });

  it('updates a todo successfully', async () => {
    const tool = new UpdateToDoStatus();
    const context = buildContext();
    const todo = context.state.todoList?.getAllTodos()[0];
    expect(todo?.todo_id).toBe('todo_0001');

    const result = await (tool as any)._execute(context, {
      todo_id: todo?.todo_id,
      status: ToDoStatus.DONE
    });

    expect(result).toBe(`Successfully updated status of to-do item 'todo_0001' to '${ToDoStatus.DONE}'.`);
    expect(todo?.status).toBe(ToDoStatus.DONE);
  });

  it('returns an error when no list exists', async () => {
    const tool = new UpdateToDoStatus();
    const context = buildContext('agent_update_todo', false);

    const result = await (tool as any)._execute(context, {
      todo_id: 'missing',
      status: ToDoStatus.DONE
    });

    expect(result).toBe('Error: You do not have a to-do list to update.');
  });

  it('returns an error for invalid status', async () => {
    const tool = new UpdateToDoStatus();
    const context = buildContext();
    const todo = context.state.todoList?.getAllTodos()[0];

    const result = await (tool as any)._execute(context, {
      todo_id: todo?.todo_id,
      status: 'unknown'
    });

    expect(result).toContain("Error: Invalid status 'unknown'");
    expect(todo?.status).toBe(ToDoStatus.PENDING);
  });

  it('returns an error for missing todo', async () => {
    const tool = new UpdateToDoStatus();
    const context = buildContext();

    const result = await (tool as any)._execute(context, {
      todo_id: 'todo_nonexistent',
      status: ToDoStatus.IN_PROGRESS
    });

    expect(result).toContain(
      "Error: Failed to update status. A to-do item with ID 'todo_nonexistent' does not exist"
    );
  });
});
