import { z } from 'zod';

export enum ToDoStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  DONE = 'done'
}

export const ToDoSchema = z.object({
  description: z
    .string()
    .describe('A clear and concise description of what this to-do item or step entails.'),
  todo_id: z
    .string()
    .describe("A unique, sequential, system-generated identifier for this to-do item (e.g., 'todo_1')."),
  status: z.nativeEnum(ToDoStatus).default(ToDoStatus.PENDING).describe('The current status of this to-do item.')
});

export type ToDo = z.infer<typeof ToDoSchema>;
