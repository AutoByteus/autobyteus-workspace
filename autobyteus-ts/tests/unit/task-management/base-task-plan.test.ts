import { describe, it, expect } from 'vitest';
import { BaseTaskPlan, TaskStatus, isTerminalTaskStatus } from '../../../src/task-management/base-task-plan.js';
import type { Task } from '../../../src/task-management/task.js';
import type { TaskDefinition } from '../../../src/task-management/schemas/task-definition.js';

class DummyPlan extends BaseTaskPlan {
  addTasks(_taskDefinitions: TaskDefinition[]): Task[] {
    return [];
  }

  addTask(_taskDefinition: TaskDefinition): Task | null {
    return null;
  }

  updateTaskStatus(_taskId: string, _status: TaskStatus, _agentName: string): boolean {
    return false;
  }

  getStatusOverview() {
    return { taskStatuses: {}, tasks: [] };
  }

  getNextRunnableTasks(): Task[] {
    return [];
  }
}

describe('BaseTaskPlan', () => {
  it('stores teamId and initializes tasks', () => {
    const plan = new DummyPlan('team-123');
    expect(plan.teamId).toBe('team-123');
    expect(plan.tasks).toEqual([]);
  });
});

describe('TaskStatus', () => {
  it('identifies terminal statuses', () => {
    expect(isTerminalTaskStatus(TaskStatus.COMPLETED)).toBe(true);
    expect(isTerminalTaskStatus(TaskStatus.FAILED)).toBe(true);
    expect(isTerminalTaskStatus(TaskStatus.IN_PROGRESS)).toBe(false);
  });
});
