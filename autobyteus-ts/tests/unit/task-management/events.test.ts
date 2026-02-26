import { describe, it, expect } from 'vitest';
import { TaskStatus } from '../../../src/task-management/base-task-plan.js';
import { TaskStatusUpdatedEventSchema, TasksCreatedEventSchema } from '../../../src/task-management/events.js';

const task = {
  task_name: 'task_a',
  assignee_name: 'AgentA',
  description: 'Task A'
};

describe('Task management event schemas', () => {
  it('validates TasksCreatedEvent payloads', () => {
    const result = TasksCreatedEventSchema.safeParse({
      team_id: 'team-1',
      tasks: [task]
    });

    expect(result.success).toBe(true);
  });

  it('validates TaskStatusUpdatedEvent payloads', () => {
    const result = TaskStatusUpdatedEventSchema.safeParse({
      team_id: 'team-1',
      task_id: 'task_123',
      new_status: TaskStatus.IN_PROGRESS,
      agent_name: 'AgentA'
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid status values', () => {
    const result = TaskStatusUpdatedEventSchema.safeParse({
      team_id: 'team-1',
      task_id: 'task_123',
      new_status: 'unknown',
      agent_name: 'AgentA'
    });

    expect(result.success).toBe(false);
  });
});
