import { describe, it, expect, vi } from 'vitest';
import { CreateTask } from '../../../../../src/task-management/tools/task-tools/create-task.js';
import { TaskDefinitionSchema } from '../../../../../src/task-management/schemas/task-definition.js';
import { ParameterType } from '../../../../../src/utils/parameter-schema.js';

const makeAgentContext = () => ({
  agentId: 'test_agent_create_task',
  config: { name: 'test_agent' },
  customData: {} as Record<string, any>
});

const makeTeamContext = () => ({
  state: {
    taskPlan: {
      addTask: vi.fn()
    }
  }
});

describe('CreateTask tool', () => {
  it('exposes name and description', () => {
    expect(CreateTask.getName()).toBe('create_task');
    expect(CreateTask.getDescription()).toContain('Adds a single new task');
  });

  it('exposes an argument schema based on TaskDefinitionSchema', () => {
    const schema = CreateTask.getArgumentSchema();
    expect(schema).toBeTruthy();
    expect(schema?.getParameter('task_name')).toBeTruthy();
    expect(schema?.getParameter('assignee_name')).toBeTruthy();
    expect(schema?.getParameter('description')).toBeTruthy();
    expect(schema?.getParameter('dependencies')).toBeTruthy();
    expect(schema?.getParameter('task_name')?.type).toBe(ParameterType.STRING);
    expect(schema?.getParameter('dependencies')?.type).toBe(ParameterType.ARRAY);
  });

  it('creates a task successfully', async () => {
    const tool = new CreateTask();
    const context = makeAgentContext();
    const teamContext = makeTeamContext();
    context.customData.teamContext = teamContext;

    const taskPlan = teamContext.state.taskPlan;
    taskPlan.addTask.mockReturnValue({ task_name: 'test_task', task_id: 'task_mock_0001' });

    const taskDef = TaskDefinitionSchema.parse({
      task_name: 'test_task',
      assignee_name: 'dev_agent',
      description: 'A test task.',
      dependencies: ['another_task']
    });

    const result = await (tool as any)._execute(context, taskDef);

    expect(result).toBe("Successfully created new task 'test_task' (ID: task_mock_0001) in the task plan.");
    expect(taskPlan.addTask).toHaveBeenCalledOnce();

    const [addedTask] = taskPlan.addTask.mock.calls[0];
    expect(addedTask.task_name).toBe('test_task');
    expect(addedTask.assignee_name).toBe('dev_agent');
    expect(addedTask.dependencies).toEqual(['another_task']);
  });

  it('returns an error when team context is missing', async () => {
    const tool = new CreateTask();
    const context = makeAgentContext();

    const result = await (tool as any)._execute(context, {
      task_name: 't',
      assignee_name: 'a',
      description: 'd'
    });

    expect(result).toContain('Error: Team context is not available.');
  });

  it('returns an error when task plan is missing', async () => {
    const tool = new CreateTask();
    const context = makeAgentContext();
    context.customData.teamContext = { state: { taskPlan: null } };

    const result = await (tool as any)._execute(context, {
      task_name: 't',
      assignee_name: 'a',
      description: 'd'
    });

    expect(result).toContain('Error: Task plan has not been initialized');
  });

  it('returns an error for invalid task definitions', async () => {
    const tool = new CreateTask();
    const context = makeAgentContext();
    const teamContext = makeTeamContext();
    context.customData.teamContext = teamContext;

    const result = await (tool as any)._execute(context, { task_name: 'missing_fields_task' });

    expect(result).toContain('Error: Invalid task definition provided');
    expect(teamContext.state.taskPlan.addTask).not.toHaveBeenCalled();
  });
});
