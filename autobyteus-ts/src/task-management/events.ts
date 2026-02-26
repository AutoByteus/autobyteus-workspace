import { z } from 'zod';
import { TaskSchema } from './task.js';
import { TaskStatus } from './base-task-plan.js';
import { FileDeliverableModelSchema } from './deliverable.js';

export const BaseTaskPlanEventSchema = z.object({
  team_id: z.string()
});

export const TasksCreatedEventSchema = BaseTaskPlanEventSchema.extend({
  tasks: z.array(TaskSchema)
});

export const TaskStatusUpdatedEventSchema = BaseTaskPlanEventSchema.extend({
  task_id: z.string(),
  new_status: z.nativeEnum(TaskStatus),
  agent_name: z.string(),
  deliverables: z.array(FileDeliverableModelSchema).optional()
});

export type BaseTaskPlanEvent = z.infer<typeof BaseTaskPlanEventSchema>;
export type TasksCreatedEvent = z.infer<typeof TasksCreatedEventSchema>;
export type TaskStatusUpdatedEvent = z.infer<typeof TaskStatusUpdatedEventSchema>;
