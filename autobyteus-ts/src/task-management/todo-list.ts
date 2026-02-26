import { ToDo, ToDoSchema, ToDoStatus } from './todo.js';
import type { ToDoDefinition } from './schemas/todo-definition.js';

export class ToDoList {
  agentId: string;
  todos: ToDo[] = [];
  private todoMap: Map<string, ToDo> = new Map();
  private idCounter = 0;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  private generateNextId(): string {
    this.idCounter += 1;
    return `todo_${String(this.idCounter).padStart(4, '0')}`;
  }

  addTodos(todoDefinitions: ToDoDefinition[]): ToDo[] {
    const newTodos: ToDo[] = [];

    for (const definition of todoDefinitions) {
      const todoId = this.generateNextId();
      const todo = ToDoSchema.parse({
        todo_id: todoId,
        description: definition.description,
        status: ToDoStatus.PENDING
      });

      if (this.todoMap.has(todo.todo_id)) {
        continue;
      }

      this.todos.push(todo);
      this.todoMap.set(todo.todo_id, todo);
      newTodos.push(todo);
    }

    return newTodos;
  }

  addTodo(todoDefinition: ToDoDefinition): ToDo {
    const todos = this.addTodos([todoDefinition]);
    return todos[0];
  }

  getTodoById(todoId: string): ToDo | undefined {
    return this.todoMap.get(todoId);
  }

  updateTodoStatus(todoId: string, status: ToDoStatus): boolean {
    const todo = this.getTodoById(todoId);
    if (!todo) {
      return false;
    }

    todo.status = status;
    return true;
  }

  getAllTodos(): ToDo[] {
    return this.todos;
  }

  clear(): void {
    this.todos = [];
    this.todoMap.clear();
    this.idCounter = 0;
  }
}
