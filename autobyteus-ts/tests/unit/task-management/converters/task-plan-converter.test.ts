import { describe, it, expect } from 'vitest';
import { InMemoryTaskPlan } from '../../../../src/task-management/in-memory-task-plan.js';
import { TaskPlanConverter } from '../../../../src/task-management/converters/task-plan-converter.js';
import { TaskStatus } from '../../../../src/task-management/base-task-plan.js';
import { TaskStatusReportSchema } from '../../../../src/task-management/schemas/task-status-report.js';
import { createFileDeliverable } from '../../../../src/task-management/deliverable.js';
import type { TaskDefinition } from '../../../../src/task-management/schemas/task-definition.js';

const planTasks: TaskDefinition[] = [
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
    dependencies: ['task_one']
  },
  {
    task_name: 'task_three',
    assignee_name: 'Agent1',
    description: 'Third task.',
    dependencies: ['task_one']
  }
];

function buildPlan(): InMemoryTaskPlan {
  const taskPlan = new InMemoryTaskPlan('test_team_converter');
  taskPlan.addTasks(planTasks);

  const taskOne = taskPlan.tasks.find((task) => task.task_name === 'task_one');
  const taskThree = taskPlan.tasks.find((task) => task.task_name === 'task_three');

  if (!taskOne || !taskThree) {
    throw new Error('Expected tasks missing in plan.');
  }

  taskPlan.updateTaskStatus(taskOne.task_id, TaskStatus.COMPLETED, 'Agent1');
  taskPlan.updateTaskStatus(taskThree.task_id, TaskStatus.IN_PROGRESS, 'Agent1');

  taskOne.file_deliverables.push(
    createFileDeliverable({
      file_path: 'final_doc.md',
      summary: 'Completed the final documentation.',
      author_agent_name: 'Agent1'
    })
  );

  return taskPlan;
}

describe('TaskPlanConverter', () => {
  it('converts a populated task plan to a status report schema', () => {
    const taskPlan = buildPlan();

    const report = TaskPlanConverter.toSchema(taskPlan);

    expect(report).not.toBeNull();
    const parsed = TaskStatusReportSchema.parse(report);
    expect(parsed.tasks.length).toBe(3);

    const taskOneReport = parsed.tasks.find((task) => task.task_name === 'task_one');
    const taskTwoReport = parsed.tasks.find((task) => task.task_name === 'task_two');
    const taskThreeReport = parsed.tasks.find((task) => task.task_name === 'task_three');

    expect(taskOneReport?.status).toBe(TaskStatus.COMPLETED);
    expect(taskTwoReport?.status).toBe(TaskStatus.NOT_STARTED);
    expect(taskThreeReport?.status).toBe(TaskStatus.IN_PROGRESS);

    expect(taskTwoReport?.dependencies).toEqual(['task_one']);
    expect(taskOneReport?.dependencies).toEqual([]);

    expect(taskOneReport?.file_deliverables.length).toBe(1);
    expect(taskThreeReport?.file_deliverables).toEqual([]);

    const deliverable = taskOneReport?.file_deliverables[0];
    expect(deliverable?.file_path).toBe('final_doc.md');
    expect(deliverable?.author_agent_name).toBe('Agent1');
    expect('status' in (deliverable ?? {})).toBe(false);
  });

  it('returns null for an empty task plan', () => {
    const emptyPlan = new InMemoryTaskPlan('empty_team');

    const report = TaskPlanConverter.toSchema(emptyPlan);

    expect(report).toBeNull();
  });
});
