import { z } from 'zod';
import { TaskStatus } from '../base-task-plan.js';
import { FileDeliverableModelSchema } from '../deliverable.js';

export const TaskStatusReportItemSchema = z.object({
  task_name: z.string().describe('The unique, descriptive name for this task.'),
  assignee_name: z.string().describe('The name of the agent or sub-team assigned to this task.'),
  description: z.string().describe(
    'A clear, detailed, and unambiguous description of what this task entails. Provide all necessary context for the assignee to complete the work. For example, if the task involves a file, specify its full, absolute path. If it requires creating a file, specify where it should be saved. Mention any specific requirements or expected outputs.'
  ),
  dependencies: z.array(z.string()).describe("A list of 'task_name' values for tasks that must be completed first."),
  status: z.nativeEnum(TaskStatus).describe('The current status of this task.'),
  file_deliverables: z
    .array(FileDeliverableModelSchema)
    .default([])
    .describe('A list of files submitted as deliverables for this task.')
});

export const TaskStatusReportSchema = z.object({
  tasks: z.array(TaskStatusReportItemSchema).describe('The list of tasks and their current statuses.')
});

export type TaskStatusReportItem = z.infer<typeof TaskStatusReportItemSchema>;
export type TaskStatusReport = z.infer<typeof TaskStatusReportSchema>;
