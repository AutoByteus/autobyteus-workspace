import { describe, it, expect, vi } from 'vitest';
import { AssignTaskTo } from '../../../../../src/task-management/tools/task-tools/assign-task-to.js';
import { InMemoryTaskPlan } from '../../../../../src/task-management/in-memory-task-plan.js';
import { TaskDefinitionSchema } from '../../../../../src/task-management/schemas/task-definition.js';
import { InterAgentMessageRequestEvent } from '../../../../../src/agent-team/events/agent-team-events.js';

const makeAgentContext = () => ({
  agentId: 'sender_agent_id',
  config: { name: 'SenderAgent' },
  customData: {} as Record<string, any>
});

const makeTeamContext = () => {
  const taskPlan = new InMemoryTaskPlan('test_team');
  const setupTaskDef = TaskDefinitionSchema.parse({
    task_name: 'setup',
    assignee_name: 'a',
    description: 'd',
    dependencies: []
  });
  taskPlan.addTask(setupTaskDef);

  return {
    state: { taskPlan: taskPlan },
    teamManager: {
      dispatchInterAgentMessageRequest: vi.fn().mockResolvedValue(undefined)
    }
  };
};

describe('AssignTaskTo tool', () => {
  it('exposes name and description', () => {
    expect(AssignTaskTo.getName()).toBe('assign_task_to');
    expect(AssignTaskTo.getDescription()).toContain('assigns a single new task to a specific team member');
  });

  it('publishes the task and sends a notification', async () => {
    const tool = new AssignTaskTo();
    const context = makeAgentContext();
    const teamContext = makeTeamContext();
    context.customData.teamContext = teamContext;

    const taskDef = TaskDefinitionSchema.parse({
      task_name: 'new_delegated_task',
      assignee_name: 'RecipientAgent',
      description: 'Please do this work.',
      dependencies: ['setup']
    });

    const result = await (tool as any)._execute(context, taskDef);

    expect(result).toBe("Successfully assigned task 'new_delegated_task' to agent 'RecipientAgent' and sent a notification.");

    const taskPlan = teamContext.state.taskPlan as InMemoryTaskPlan;
    expect(taskPlan.tasks.length).toBe(2);

    const newTask = taskPlan.tasks.find((task) => task.task_name === 'new_delegated_task');
    expect(newTask).toBeTruthy();
    expect(newTask?.assignee_name).toBe('RecipientAgent');
    expect(newTask?.task_id).toBe('task_0002');

    const teamManager = teamContext.teamManager;
    expect(teamManager.dispatchInterAgentMessageRequest).toHaveBeenCalledOnce();
    const [sentEvent] = teamManager.dispatchInterAgentMessageRequest.mock.calls[0];

    expect(sentEvent).toBeInstanceOf(InterAgentMessageRequestEvent);
    expect(sentEvent.senderAgentId).toBe('sender_agent_id');
    expect(sentEvent.recipientName).toBe('RecipientAgent');
    expect(sentEvent.messageType).toBe('task_assignment');
    expect(sentEvent.content).toContain("**Task Name**: 'new_delegated_task'");
    expect(sentEvent.content).toContain('**Description**: Please do this work.');
    expect(sentEvent.content).toContain('**Dependencies**: setup');
  });

  it('returns an error when team context is missing', async () => {
    const tool = new AssignTaskTo();
    const context = makeAgentContext();

    const result = await (tool as any)._execute(context, {
      task_name: 't',
      assignee_name: 'a',
      description: 'd'
    });

    expect(result).toContain('Error: Team context is not available');
  });

  it('returns an error when task plan is missing', async () => {
    const tool = new AssignTaskTo();
    const context = makeAgentContext();
    context.customData.teamContext = { state: { taskPlan: null } };

    const result = await (tool as any)._execute(context, {
      task_name: 't',
      assignee_name: 'a',
      description: 'd'
    });

    expect(result).toContain('Error: Task plan has not been initialized');
  });

  it('returns a warning when team manager is missing', async () => {
    const tool = new AssignTaskTo();
    const context = makeAgentContext();
    const teamContext = makeTeamContext();
    teamContext.teamManager = null as any;
    context.customData.teamContext = teamContext;

    const taskDef = TaskDefinitionSchema.parse({
      task_name: 'delegated_task_no_notify',
      assignee_name: 'RecipientAgent',
      description: 'Work to be done.',
      dependencies: []
    });

    const result = await (tool as any)._execute(context, taskDef);

    expect(result).toContain("Successfully published task 'delegated_task_no_notify', but could not send a direct notification");
    const taskPlan = teamContext.state.taskPlan as InMemoryTaskPlan;
    expect(taskPlan.tasks.length).toBe(2);
  });

  it('returns an error for invalid task definitions', async () => {
    const tool = new AssignTaskTo();
    const context = makeAgentContext();
    const teamContext = makeTeamContext();
    context.customData.teamContext = teamContext;

    const result = await (tool as any)._execute(context, { task_name: 'invalid_task' });

    expect(result).toContain('Error: Invalid task definition provided');
    const taskPlan = teamContext.state.taskPlan as InMemoryTaskPlan;
    expect(taskPlan.tasks.length).toBe(1);
  });
});
