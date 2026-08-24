export enum ToDoStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export interface ToDo {
  description: string;
  todoId: string;
  status: ToDoStatus;
}
