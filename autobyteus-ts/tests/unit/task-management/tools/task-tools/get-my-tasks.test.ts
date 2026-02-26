import { describe, it, expect } from 'vitest';
import { GetMyTasks } from '../../../../../src/task-management/tools/task-tools/get-my-tasks.js';
import { InMemoryTaskPlan } from '../../../../../src/task-management/in-memory-task-plan.js';
import { TaskStatus } from '../../../../../src/task-management/base-task-plan.js';
import type { TaskDefinition } from '../../../../../src/task-management/schemas/task-definition.js';

const buildTaskPlan = () => {
  const plan = new InMemoryTaskPlan('team');
  const tasks: TaskDefinition[] = [
    { task_name: 'my_task', assignee_name: 'AgentOne', description: 'Mine.', dependencies: [] },
    { task_name: 'other_task', assignee_name: 'AgentTwo', description: 'Not mine.', dependencies: [] }
  ];
  plan.addTasks(tasks);
  return plan;
};

describe('GetMyTasks tool', () => {
  it('returns an error when team context is missing', async () => {
    const tool = new GetMyTasks();
    const context = { config: { name: 'AgentOne' }, customData: {} };

    const result = await (tool as any)._execute(context);

    expect(result).toContain('Error: Team context is not available.');
  });

  it('returns an error when task plan is missing', async () => {
    const tool = new GetMyTasks();
    const context = { config: { name: 'AgentOne' }, customData: { teamContext: { state: { taskPlan: null } } } };

    const result = await (tool as any)._execute(context);

    expect(result).toContain('Error: Task plan has not been initialized');
  });

  it('returns an empty message when no queued tasks exist', async () => {
    const tool = new GetMyTasks();
    const taskPlan = buildTaskPlan();
    const context = { config: { name: 'AgentOne' }, customData: { teamContext: { state: { taskPlan: taskPlan } } } };

    const result = await (tool as any)._execute(context);

    expect(result).toBe('Your personal task queue is empty. You have no new tasks assigned and ready to be started.');
  });

  it('returns queued tasks assigned to the agent', async () => {
    const tool = new GetMyTasks();
    const taskPlan = buildTaskPlan();
    const context = { config: { name: 'AgentOne' }, customData: { teamContext: { state: { taskPlan: taskPlan } } } };

    const myTask = taskPlan.tasks.find((task) => task.task_name === 'my_task');
    if (!myTask) {
      throw new Error('Expected task missing.');
    }
    taskPlan.updateTaskStatus(myTask.task_id, TaskStatus.QUEUED, 'AgentOne');

    const result = await (tool as any)._execute(context);
    const parsed = JSON.parse(result);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].task_name).toBe('my_task');
    expect(parsed[0].assignee_name).toBe('AgentOne');
    expect(parsed[0].description).toBe('Mine.');
    expect(parsed[0].task_id).toBeUndefined();
  });
});
