import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskNotifierInitializationStep } from '../../../../src/agent-team/bootstrap-steps/task-notifier-initialization-step.js';
import { AgentTeamContext } from '../../../../src/agent-team/context/agent-team-context.js';
import { AgentTeamConfig } from '../../../../src/agent-team/context/agent-team-config.js';
import { TeamNodeConfig } from '../../../../src/agent-team/context/team-node-config.js';
import { AgentTeamRuntimeState } from '../../../../src/agent-team/context/agent-team-runtime-state.js';
import { TaskNotificationMode, ENV_TASK_NOTIFICATION_MODE } from '../../../../src/agent-team/task-notification/task-notification-mode.js';
import { InMemoryTaskPlan } from '../../../../src/task-management/in-memory-task-plan.js';

vi.mock('../../../../src/agent-team/task-notification/system-event-driven-agent-task-notifier.js', () => {
  return { SystemEventDrivenAgentTaskNotifier: vi.fn() };
});

import { SystemEventDrivenAgentTaskNotifier } from '../../../../src/agent-team/task-notification/system-event-driven-agent-task-notifier.js';

const makeContext = (): AgentTeamContext => {
  const node = new TeamNodeConfig({ nodeDefinition: { name: 'Coordinator' } });
  const config = new AgentTeamConfig({
    name: 'Team',
    description: 'desc',
    nodes: [node],
    coordinatorNode: node
  });
  const state = new AgentTeamRuntimeState({ teamId: 'team-1' });
  state.teamManager = { teamId: 'team-1' } as any;
  return new AgentTeamContext('team-1', config, state);
};

describe('TaskNotifierInitializationStep', () => {
  let step: TaskNotifierInitializationStep;
  let context: AgentTeamContext;

  beforeEach(() => {
    step = new TaskNotifierInitializationStep();
    context = makeContext();
    delete process.env[ENV_TASK_NOTIFICATION_MODE];
  });

  it('skips in manual mode', async () => {
    const manualConfig = new AgentTeamConfig({
      name: context.config.name,
      description: context.config.description,
      nodes: context.config.nodes,
      coordinatorNode: context.config.coordinatorNode
    });
    context.config = manualConfig;

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(SystemEventDrivenAgentTaskNotifier).not.toHaveBeenCalled();
    expect(context.state.taskNotifier).toBeNull();
  });

  it('initializes notifier in event-driven mode', async () => {
    process.env[ENV_TASK_NOTIFICATION_MODE] = TaskNotificationMode.SYSTEM_EVENT_DRIVEN;
    const config = new AgentTeamConfig({
      name: context.config.name,
      description: context.config.description,
      nodes: context.config.nodes,
      coordinatorNode: context.config.coordinatorNode
    });
    context.config = config;
    context.state.taskPlan = new InMemoryTaskPlan('team-1');

    const mockNotifierInstance = { startMonitoring: vi.fn() };
    (SystemEventDrivenAgentTaskNotifier as any).mockImplementation(function () {
      return mockNotifierInstance;
    });

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(SystemEventDrivenAgentTaskNotifier).toHaveBeenCalledWith(
      context.state.taskPlan,
      context.teamManager
    );
    expect(mockNotifierInstance.startMonitoring).toHaveBeenCalledTimes(1);
    expect(context.state.taskNotifier).toBe(mockNotifierInstance as any);
  });

  it('fails if task plan missing in event-driven mode', async () => {
    process.env[ENV_TASK_NOTIFICATION_MODE] = TaskNotificationMode.SYSTEM_EVENT_DRIVEN;
    const config = new AgentTeamConfig({
      name: context.config.name,
      description: context.config.description,
      nodes: context.config.nodes,
      coordinatorNode: context.config.coordinatorNode
    });
    context.config = config;
    context.state.taskPlan = null;

    const success = await step.execute(context);

    expect(success).toBe(false);
  });

  it('fails if team manager missing in event-driven mode', async () => {
    process.env[ENV_TASK_NOTIFICATION_MODE] = TaskNotificationMode.SYSTEM_EVENT_DRIVEN;
    const config = new AgentTeamConfig({
      name: context.config.name,
      description: context.config.description,
      nodes: context.config.nodes,
      coordinatorNode: context.config.coordinatorNode
    });
    context.config = config;
    context.state.taskPlan = new InMemoryTaskPlan('team-1');
    context.state.teamManager = null;

    const success = await step.execute(context);

    expect(success).toBe(false);
  });
});
