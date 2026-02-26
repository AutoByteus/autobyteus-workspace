import { describe, it, expect, vi } from 'vitest';
import { CreateTasks } from '../../../../../src/task-management/tools/task-tools/create-tasks.js';
import { TasksDefinitionSchema } from '../../../../../src/task-management/schemas/task-definition.js';
import { ParameterSchema, ParameterType } from '../../../../../src/utils/parameter-schema.js';

const makeAgentContext = () => ({
  agentId: 'test_agent_create_tasks',
  config: { name: 'test_agent' },
  customData: {} as Record<string, any>
});

const makeTeamContext = () => ({
  state: {
    taskPlan: {
      addTasks: vi.fn()
    }
  }
});

describe('CreateTasks tool', () => {
  it('exposes name and description', () => {
    expect(CreateTasks.getName()).toBe('create_tasks');
    expect(CreateTasks.getDescription()).toContain('Adds a list of new tasks');
  });

  it('exposes an argument schema based on TasksDefinitionSchema', () => {
    const schema = CreateTasks.getArgumentSchema();
    expect(schema).toBeTruthy();

    const tasksParam = schema?.getParameter('tasks');
    expect(tasksParam).toBeTruthy();
    expect(tasksParam?.type).toBe(ParameterType.ARRAY);
    expect(tasksParam?.arrayItemSchema).toBeTruthy();

    const itemSchema = tasksParam?.arrayItemSchema;
    expect(itemSchema).toBeInstanceOf(ParameterSchema);
    const parameterSchema = itemSchema as ParameterSchema;
    expect(parameterSchema.getParameter('task_name')).toBeTruthy();
    expect(parameterSchema.getParameter('assignee_name')).toBeTruthy();
  });

  it('creates tasks successfully', async () => {
    const tool = new CreateTasks();
    const context = makeAgentContext();
    const teamContext = makeTeamContext();
    context.customData.teamContext = teamContext;

    const taskPlan = teamContext.state.taskPlan;
    taskPlan.addTasks.mockReturnValue([{ task_name: 'task1' }, { task_name: 'task2' }]);

    const tasksDef = TasksDefinitionSchema.parse({
      tasks: [
        { task_name: 'task1', assignee_name: 'dev', description: 'd1' },
        { task_name: 'task2', assignee_name: 'qa', description: 'd2' }
      ]
    });

    const result = await (tool as any)._execute(context, { tasks: tasksDef.tasks });

    expect(result).toBe('Successfully created 2 new task(s) in the task plan.');
    expect(taskPlan.addTasks).toHaveBeenCalledOnce();

    const [addedTasks] = taskPlan.addTasks.mock.calls[0];
    expect(Array.isArray(addedTasks)).toBe(true);
    expect(addedTasks).toHaveLength(2);
    expect(addedTasks[0].task_name).toBe('task1');
    expect(addedTasks[1].assignee_name).toBe('qa');
  });

  it('returns an error when team context is missing', async () => {
    const tool = new CreateTasks();
    const context = makeAgentContext();

    const result = await (tool as any)._execute(context, { tasks: [] });

    expect(result).toContain('Error: Team context is not available.');
  });

  it('returns an error when task plan is missing', async () => {
    const tool = new CreateTasks();
    const context = makeAgentContext();
    const teamContext = { state: { taskPlan: null } };
    context.customData.teamContext = teamContext;

    const result = await (tool as any)._execute(context, { tasks: [] });

    expect(result).toContain('Error: Task plan has not been initialized');
  });

  it('returns an error for invalid task definitions', async () => {
    const tool = new CreateTasks();
    const context = makeAgentContext();
    const teamContext = makeTeamContext();
    context.customData.teamContext = teamContext;

    const result = await (tool as any)._execute(context, { tasks: [{ task_name: 'task1' }] });

    expect(result).toContain('Error: Invalid task definitions provided');
    expect(teamContext.state.taskPlan.addTasks).not.toHaveBeenCalled();
  });

  it('surfaces duplicate task name validation errors', async () => {
    const tool = new CreateTasks();
    const context = makeAgentContext();
    const teamContext = makeTeamContext();
    context.customData.teamContext = teamContext;

    const result = await (tool as any)._execute(context, {
      tasks: [
        { task_name: 'duplicate', assignee_name: 'a1', description: 'd1' },
        { task_name: 'duplicate', assignee_name: 'a2', description: 'd2' }
      ]
    });

    expect(result).toContain('Error: Invalid task definitions provided');
    expect(result).toContain("Duplicate task_name 'duplicate' found");
  });
});
