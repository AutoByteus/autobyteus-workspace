import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { FileDeliverableModelSchema } from './deliverable.js';

export function generateTaskId(): string {
  return `task_${randomUUID().replace(/-/g, '')}`;
}

const TaskObjectSchema = z.object({
  task_name: z
    .string()
    .describe(
      "A short, unique, descriptive name for this task within the plan (e.g., 'setup_project', 'implement_scraper'). Used for defining dependencies."
    ),
  task_id: z.string().default(generateTaskId),
  assignee_name: z
    .string()
    .describe('The unique name of the agent or sub-team responsible for executing this task (e.g., \'SoftwareEngineer\', \'ResearchTeam\').'),
  description: z.string().describe('A clear and concise description of what this task entails.'),
  dependencies: z
    .array(z.string())
    .default([])
    .describe("A list of 'task_name' values for tasks that must be completed before this one can be started."),
  file_deliverables: z
    .array(FileDeliverableModelSchema)
    .default([])
    .describe('A list of file deliverables that were produced as a result of completing this task.')
});

export const TaskSchema = z.preprocess((input) => {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const data = { ...(input as Record<string, unknown>) };
    if ('local_id' in data) {
      data.task_name = data.local_id;
      delete data.local_id;
    }
    if ('produced_artifact_ids' in data) {
      delete data.produced_artifact_ids;
    }
    return data;
  }
  return input;
}, TaskObjectSchema);

export type Task = z.infer<typeof TaskObjectSchema>;
