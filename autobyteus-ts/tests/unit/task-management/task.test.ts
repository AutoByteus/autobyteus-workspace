import { describe, it, expect } from 'vitest';
import { TaskSchema } from '../../../src/task-management/task.js';

const baseTask = {
  task_name: 'task_one',
  assignee_name: 'Agent1',
  description: 'First task.'
};

describe('TaskSchema', () => {
  it('defaults dependencies and deliverables', () => {
    const parsed = TaskSchema.parse(baseTask);
    expect(parsed.dependencies).toEqual([]);
    expect(parsed.file_deliverables).toEqual([]);
  });

  it('generates task_id by default', () => {
    const parsed = TaskSchema.parse(baseTask);
    expect(parsed.task_id).toMatch(/^task_[a-f0-9]+$/);
  });

  it('maps local_id to task_name', () => {
    const parsed = TaskSchema.parse({
      local_id: 'legacy_task',
      assignee_name: 'Agent1',
      description: 'Legacy task.'
    });

    expect(parsed.task_name).toBe('legacy_task');
  });

  it('ignores produced_artifact_ids for backward compatibility', () => {
    const parsed = TaskSchema.parse({
      ...baseTask,
      produced_artifact_ids: ['old']
    });

    expect(parsed.task_name).toBe(baseTask.task_name);
  });
});
