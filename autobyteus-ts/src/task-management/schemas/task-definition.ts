import { z } from 'zod';

export const TaskDefinitionSchema = z.object({
  task_name: z.string().describe(
    "A short, unique, descriptive name for this task within the plan (e.g., 'setup_project', 'implement_scraper'). Used for defining dependencies."
  ),
  assignee_name: z.string().describe('The name of the agent or sub-team assigned to this task.'),
  description: z.string().describe(
    'A clear, detailed, and unambiguous description of what this task entails. Provide all necessary context for the assignee to complete the work. For example, if the task involves a file, specify its full, absolute path. If it requires creating a file, specify where it should be saved. Mention any specific requirements or expected outputs.'
  ),
  dependencies: z
    .array(z.string())
    .default([])
    .describe("A list of 'task_name' values for tasks that must be completed first.")
});

export const TasksDefinitionSchema = z
  .object({
    tasks: z.array(TaskDefinitionSchema).describe('The list of tasks to be published.')
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.tasks.forEach((task, index) => {
      if (seen.has(task.task_name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate task_name '${task.task_name}' found in task list. Each task_name must be unique.`,
          path: ['tasks', index, 'task_name']
        });
      } else {
        seen.add(task.task_name);
      }
    });
  });

export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;
export type TasksDefinition = z.infer<typeof TasksDefinitionSchema>;
