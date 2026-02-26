import { describe, it, expect, vi } from 'vitest';
import { InMemoryTaskPlan } from '../../../src/task-management/in-memory-task-plan.js';
import { TaskStatus } from '../../../src/task-management/base-task-plan.js';
import type { TaskDefinition } from '../../../src/task-management/schemas/task-definition.js';
import { TasksCreatedEventSchema, TaskStatusUpdatedEventSchema } from '../../../src/task-management/events.js';
import { EventType } from '../../../src/events/event-types.js';

const basicPlanTasks: TaskDefinition[] = [
  {
    task_name: 'task_one',
    assignee_name: 'Agent1',
    description: 'First task.',
    dependencies: []
  },
  {
    task_name: 'task_two',
    assignee_name: 'Agent2',
    description: 'Second task.',
    dependencies: []
  }
];

const dependentPlanTasks: TaskDefinition[] = [
  {
    task_name: 'A',
    assignee_name: 'Agent1',
    description: 'Task A, no dependencies.',
    dependencies: []
  },
  {
    task_name: 'B',
    assignee_name: 'Agent2',
    description: 'Task B, depends on A.',
    dependencies: ['A']
  },
  {
    task_name: 'C',
    assignee_name: 'Agent1',
    description: 'Task C, depends on A.',
    dependencies: ['A']
  },
  {
    task_name: 'D',
    assignee_name: 'Agent2',
    description: 'Task D, depends on B.',
    dependencies: ['B']
  }
];

function createPlan(): InMemoryTaskPlan {
  return new InMemoryTaskPlan('test_team');
}

function findTaskIdByName(plan: InMemoryTaskPlan, name: string): string {
  const task = plan.tasks.find((entry) => entry.task_name === name);
  if (!task) {
    throw new Error(`Missing task '${name}'.`);
  }
  return task.task_id;
}

describe('InMemoryTaskPlan', () => {
  it('initializes with empty state', () => {
    const plan = createPlan();

    expect(plan.teamId).toBe('test_team');
    expect(plan.tasks).toEqual([]);
    expect(Object.keys(plan.taskStatuses)).toEqual([]);
  });

  it('adds tasks and emits creation event', () => {
    const plan = createPlan();
    const emitSpy = vi.spyOn(plan, 'emit');

    const created = plan.addTasks(basicPlanTasks);

    expect(created.length).toBe(2);
    expect(plan.tasks.length).toBe(2);
    expect(Object.keys(plan.taskStatuses).length).toBe(2);

    const taskOneId = created.find((task) => task.task_name === 'task_one')?.task_id;
    expect(taskOneId).toBeTruthy();
    expect(plan.taskStatuses[taskOneId!]).toBe(TaskStatus.NOT_STARTED);

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const [eventType, payloadWrapper] = emitSpy.mock.calls[0];
    expect(eventType).toBe(EventType.TASK_PLAN_TASKS_CREATED);
    expect(payloadWrapper).toBeDefined();
    const parsed = TasksCreatedEventSchema.parse(payloadWrapper!.payload);
    expect(parsed.tasks).toEqual(created);
  });

  it('adds a single task via addTask', () => {
    const plan = createPlan();
    const definition: TaskDefinition = {
      task_name: 'single_task',
      assignee_name: 'SoloAgent',
      description: 'A single task.',
      dependencies: []
    };

    const addTasksSpy = vi.spyOn(plan, 'addTasks');
    const created = plan.addTask(definition);

    expect(addTasksSpy).toHaveBeenCalledWith([definition]);
    expect(created?.task_name).toBe('single_task');
    expect(plan.tasks.length).toBe(1);
  });

  it('updates task status and emits status update event', () => {
    const plan = createPlan();
    plan.addTasks(basicPlanTasks);
    const taskId = findTaskIdByName(plan, 'task_one');

    const emitSpy = vi.spyOn(plan, 'emit');
    const result = plan.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS, 'Agent1');

    expect(result).toBe(true);
    expect(plan.taskStatuses[taskId]).toBe(TaskStatus.IN_PROGRESS);

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const [eventType, payloadWrapper] = emitSpy.mock.calls[0];
    expect(eventType).toBe(EventType.TASK_PLAN_STATUS_UPDATED);
    expect(payloadWrapper).toBeDefined();
    const parsed = TaskStatusUpdatedEventSchema.parse(payloadWrapper!.payload);
    expect(parsed.task_id).toBe(taskId);
    expect(parsed.new_status).toBe(TaskStatus.IN_PROGRESS);
    expect(parsed.agent_name).toBe('Agent1');
  });

  it('returns false when updating a missing task', () => {
    const plan = createPlan();
    const result = plan.updateTaskStatus('fake_id', TaskStatus.COMPLETED, 'AgentX');
    expect(result).toBe(false);
  });

  it('returns no runnable tasks when empty', () => {
    const plan = createPlan();
    expect(plan.getNextRunnableTasks()).toEqual([]);
  });

  it('returns all tasks as runnable with no dependencies', () => {
    const plan = createPlan();
    plan.addTasks(basicPlanTasks);

    const runnable = plan.getNextRunnableTasks();
    expect(runnable.length).toBe(2);
    const runnableNames = new Set(runnable.map((task) => task.task_name));
    expect(runnableNames).toEqual(new Set(['task_one', 'task_two']));
  });

  it('returns only dependency-free tasks initially', () => {
    const plan = createPlan();
    plan.addTasks(dependentPlanTasks);

    const runnable = plan.getNextRunnableTasks();
    expect(runnable.length).toBe(1);
    expect(runnable[0].task_name).toBe('A');
  });

  it('unlocks dependent tasks when prerequisites complete', () => {
    const plan = createPlan();
    plan.addTasks(dependentPlanTasks);

    const taskAId = findTaskIdByName(plan, 'A');
    plan.updateTaskStatus(taskAId, TaskStatus.COMPLETED, 'Agent1');

    const runnable = plan.getNextRunnableTasks();
    const runnableNames = new Set(runnable.map((task) => task.task_name));
    expect(runnableNames).toEqual(new Set(['B', 'C']));
  });

  it('handles multi-level dependency flow', () => {
    const plan = createPlan();
    plan.addTasks(dependentPlanTasks);

    const taskAId = findTaskIdByName(plan, 'A');
    const taskBId = findTaskIdByName(plan, 'B');

    expect(new Set(plan.getNextRunnableTasks().map((task) => task.task_name))).toEqual(new Set(['A']));

    plan.updateTaskStatus(taskAId, TaskStatus.COMPLETED, 'Agent1');
    expect(new Set(plan.getNextRunnableTasks().map((task) => task.task_name))).toEqual(new Set(['B', 'C']));

    plan.updateTaskStatus(taskBId, TaskStatus.COMPLETED, 'Agent2');
    expect(new Set(plan.getNextRunnableTasks().map((task) => task.task_name))).toEqual(new Set(['C', 'D']));
  });

  it('blocks tasks when a dependency fails', () => {
    const plan = createPlan();
    plan.addTasks(dependentPlanTasks);

    const taskAId = findTaskIdByName(plan, 'A');
    plan.updateTaskStatus(taskAId, TaskStatus.FAILED, 'Agent1');

    expect(plan.getNextRunnableTasks()).toEqual([]);
  });

  it('does not return tasks that are in progress', () => {
    const plan = createPlan();
    plan.addTasks(dependentPlanTasks);

    const taskAId = findTaskIdByName(plan, 'A');
    expect(new Set(plan.getNextRunnableTasks().map((task) => task.task_name))).toEqual(new Set(['A']));

    plan.updateTaskStatus(taskAId, TaskStatus.IN_PROGRESS, 'Agent1');
    expect(plan.getNextRunnableTasks()).toEqual([]);
  });

  it('provides a serializable status overview', () => {
    const plan = createPlan();

    const overviewEmpty = plan.getStatusOverview();
    expect(overviewEmpty.taskStatuses).toEqual({});
    expect(overviewEmpty.tasks).toEqual([]);

    plan.addTasks(basicPlanTasks);
    const taskOneId = findTaskIdByName(plan, 'task_one');
    plan.updateTaskStatus(taskOneId, TaskStatus.COMPLETED, 'Agent1');

    const overviewLoaded = plan.getStatusOverview();
    expect(overviewLoaded.tasks.length).toBe(2);
    expect(overviewLoaded.taskStatuses[taskOneId]).toBe('completed');
  });
});
