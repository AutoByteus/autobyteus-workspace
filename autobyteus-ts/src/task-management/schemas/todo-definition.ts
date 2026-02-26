import { z } from 'zod';

export const ToDoDefinitionSchema = z.object({
  description: z.string().describe('A clear, detailed description of what this to-do item or step entails.')
});

export const ToDosDefinitionSchema = z.object({
  todos: z.array(ToDoDefinitionSchema).describe('The list of to-do items to create.')
});

export type ToDoDefinition = z.infer<typeof ToDoDefinitionSchema>;
export type ToDosDefinition = z.infer<typeof ToDosDefinitionSchema>;
