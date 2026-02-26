import { describe, it, expect } from 'vitest';
import { CreateToDoList } from '../../../../../src/task-management/tools/todo-tools/create-todo-list.js';
import { ToDoList } from '../../../../../src/task-management/todo-list.js';
import { ToDosDefinitionSchema } from '../../../../../src/task-management/schemas/todo-definition.js';

const buildContext = () => ({
  agentId: 'agent_create_todos',
  customData: {},
  statusManager: { notifier: { notifyAgentDataTodoListUpdated: () => {} } },
  state: { todoList: null as ToDoList | null }
});

describe('CreateToDoList tool', () => {
  it('exposes name and description', () => {
    expect(CreateToDoList.getName()).toBe('create_todo_list');
    expect(CreateToDoList.getDescription()).toContain('Creates a new personal to-do list');
    expect(CreateToDoList.getDescription()).toContain('Returns the full list');
  });

  it('creates a new list and returns JSON', async () => {
    const tool = new CreateToDoList();
    const context = buildContext();

    const todosDef = ToDosDefinitionSchema.parse({
      todos: [
        { description: 'Write project outline' },
        { description: 'Review outline with team' }
      ]
    });

    const result = await (tool as any)._execute(context, todosDef);

    const createdTodos = JSON.parse(result);
    expect(Array.isArray(createdTodos)).toBe(true);
    expect(createdTodos).toHaveLength(2);
    expect(createdTodos[0].description).toBe('Write project outline');
    expect(createdTodos[0].todo_id).toBe('todo_0001');
    expect(createdTodos[1].description).toBe('Review outline with team');
    expect(createdTodos[1].todo_id).toBe('todo_0002');

    const todoList = context.state.todoList;
    expect(todoList).toBeInstanceOf(ToDoList);
    const todosInState = todoList?.getAllTodos() ?? [];
    expect(todosInState).toHaveLength(2);
    expect(todosInState.map((todo) => todo.description)).toEqual([
      'Write project outline',
      'Review outline with team'
    ]);
    expect(todosInState.map((todo) => todo.todo_id)).toEqual(['todo_0001', 'todo_0002']);
  });

  it('overwrites an existing list', async () => {
    const tool = new CreateToDoList();
    const context = buildContext();
    const existingList = new ToDoList(context.agentId);
    existingList.addTodos([{ description: 'Old item' }]);
    context.state.todoList = existingList;

    const newListDef = ToDosDefinitionSchema.parse({
      todos: [{ description: 'New task A' }, { description: 'New task B' }]
    });

    const result = await (tool as any)._execute(context, newListDef);
    JSON.parse(result);

    const newList = context.state.todoList;
    expect(newList).not.toBe(existingList);
    const descriptions = newList?.getAllTodos().map((todo) => todo.description) ?? [];
    expect(descriptions).toEqual(['New task A', 'New task B']);
    const ids = newList?.getAllTodos().map((todo) => todo.todo_id) ?? [];
    expect(ids).toEqual(['todo_0001', 'todo_0002']);
  });

  it('returns an error for invalid payload', async () => {
    const tool = new CreateToDoList();
    const context = buildContext();

    const result = await (tool as any)._execute(context, { todos: [{ invalid: 'missing description' }] });

    expect(result).toContain('Error: Invalid to-do list definition provided');
    expect(context.state.todoList).toBeNull();
  });
});
