import { describe, it, expect, vi } from 'vitest';
import { GetTaskPlanStatus } from '../../../../../src/task-management/tools/task-tools/get-task-plan-status.js';
import { TaskPlanConverter } from '../../../../../src/task-management/converters/task-plan-converter.js';
import { TaskStatusReportSchema } from '../../../../../src/task-management/schemas/task-status-report.js';
import { TaskStatus } from '../../../../../src/task-management/base-task-plan.js';
import { createFileDeliverable } from '../../../../../src/task-management/deliverable.js';

const makeAgentContext = () => ({
  agentId: 'test_agent_get_status',
  customData: {} as Record<string, any>
});

const makeTeamContext = () => ({
  state: {
    taskPlan: {}
  }
});

describe('GetTaskPlanStatus tool', () => {
  it('returns JSON from the converter', async () => {
    const tool = new GetTaskPlanStatus();
    const context = makeAgentContext();
    const teamContext = makeTeamContext();
    context.customData.teamContext = teamContext;

    const report = TaskStatusReportSchema.parse({
      tasks: [
        {
          task_name: 'task1',
          assignee_name: 'a1',
          description: 'd1',
          dependencies: [],
          status: TaskStatus.NOT_STARTED,
          file_deliverables: []
        }
      ]
    });

    const spy = vi.spyOn(TaskPlanConverter, 'toSchema').mockReturnValue(report);

    const result = await (tool as any)._execute(context);

    expect(spy).toHaveBeenCalledWith(teamContext.state.taskPlan);

    const resultData = JSON.parse(result);
    expect(resultData.overall_goal).toBeUndefined();
    expect(resultData.tasks[0].task_name).toBe('task1');
    expect(resultData.tasks[0].file_deliverables).toEqual([]);
  });

  it('serializes deliverables in the JSON output', async () => {
    const tool = new GetTaskPlanStatus();
    const context = makeAgentContext();
    const teamContext = makeTeamContext();
    context.customData.teamContext = teamContext;

    const deliverable = createFileDeliverable({
      file_path: 'report.pdf',
      summary: 'Final report',
      author_agent_name: 'TestAgent'
    });

    const report = TaskStatusReportSchema.parse({
      tasks: [
        {
          task_name: 'task1',
          assignee_name: 'a1',
          description: 'd1',
          dependencies: [],
          status: TaskStatus.COMPLETED,
          file_deliverables: [deliverable]
        }
      ]
    });

    vi.spyOn(TaskPlanConverter, 'toSchema').mockReturnValue(report);

    const result = await (tool as any)._execute(context);

    const resultData = JSON.parse(result);
    expect(resultData.tasks[0].file_deliverables.length).toBe(1);
    const deliverableData = resultData.tasks[0].file_deliverables[0];
    expect(deliverableData.file_path).toBe('report.pdf');
    expect(deliverableData.summary).toBe('Final report');
    expect(resultData.overall_goal).toBeUndefined();
  });

  it('returns a message when the task plan is empty', async () => {
    const tool = new GetTaskPlanStatus();
    const context = makeAgentContext();
    const teamContext = makeTeamContext();
    context.customData.teamContext = teamContext;

    vi.spyOn(TaskPlanConverter, 'toSchema').mockReturnValue(null);

    const result = await (tool as any)._execute(context);

    expect(result).toBe('The task plan is currently empty. No tasks have been published.');
  });

  it('returns an error when team context is missing', async () => {
    const tool = new GetTaskPlanStatus();
    const context = makeAgentContext();

    const result = await (tool as any)._execute(context);

    expect(result).toContain('Error: Team context is not available');
  });

  it('returns an error when task plan is missing', async () => {
    const tool = new GetTaskPlanStatus();
    const context = makeAgentContext();
    context.customData.teamContext = { state: { taskPlan: null } };

    const result = await (tool as any)._execute(context);

    expect(result).toContain('Error: Task plan has not been initialized');
  });
});
