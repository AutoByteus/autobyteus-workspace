import { EventType } from '../../events/event-types.js';
import { TaskStatus } from '../../task-management/base-task-plan.js';
import type { BaseTaskPlan } from '../../task-management/base-task-plan.js';
import type { TasksCreatedEvent, TaskStatusUpdatedEvent } from '../../task-management/events.js';
import type { Task } from '../../task-management/task.js';
import type { TeamManager } from '../context/team-manager.js';
import { ActivationPolicy } from './activation-policy.js';
import { TaskActivator } from './task-activator.js';

export class SystemEventDrivenAgentTaskNotifier {
  private taskPlan: BaseTaskPlan;
  private teamManager: TeamManager;
  private policy: ActivationPolicy;
  private activator: TaskActivator;

  constructor(taskPlan: BaseTaskPlan, teamManager: TeamManager) {
    if (!taskPlan || !teamManager) {
      throw new Error('TaskPlan and TeamManager are required for the notifier.');
    }

    this.taskPlan = taskPlan;
    this.teamManager = teamManager;
    this.policy = new ActivationPolicy(this.teamManager.teamId);
    this.activator = new TaskActivator(this.teamManager);

    console.info(
      `SystemEventDrivenAgentTaskNotifier orchestrator initialized for team '${this.teamManager.teamId}'.`
    );
  }

  startMonitoring(): void {
    this.taskPlan.subscribe(EventType.TASK_PLAN_TASKS_CREATED, (payload) =>
      this.handleTasksChanged(payload as TasksCreatedEvent)
    );
    this.taskPlan.subscribe(EventType.TASK_PLAN_STATUS_UPDATED, (payload) =>
      this.handleTasksChanged(payload as TaskStatusUpdatedEvent)
    );
    console.info(
      `Team '${this.teamManager.teamId}': Task notifier orchestrator is now monitoring TaskPlan events.`
    );
  }

  handleTasksChanged = async (payload: TasksCreatedEvent | TaskStatusUpdatedEvent): Promise<void> => {
    const teamId = this.teamManager.teamId;
    const isTasksCreated = 'tasks' in payload;

    console.info(
      `Team '${teamId}': Task plan changed (${isTasksCreated ? 'TasksCreatedEvent' : 'TaskStatusUpdatedEvent'}). ` +
      'Orchestrating activation check.'
    );

    if (isTasksCreated) {
      console.info(`Team '${teamId}': New tasks created. Resetting activation policy.`);
      this.policy.reset();
    }

    const runnableTasks = this.taskPlan.getNextRunnableTasks();
    if (!runnableTasks.length) {
      console.debug(`Team '${teamId}': No runnable tasks found after change. No action needed.`);
      return;
    }

    const agentsToActivate = this.policy.determineActivations(runnableTasks);
    if (!agentsToActivate.length) {
      console.info(
        `Team '${teamId}': Runnable tasks exist, but policy determined no new agents need activation.`
      );
      return;
    }

    for (const agentName of agentsToActivate) {
      const agentRunnableTasks = runnableTasks.filter(
        (task: Task) => task.assignee_name === agentName
      );

      for (const task of agentRunnableTasks) {
        const taskId = task.task_id;
        const statusOverview = this.taskPlan.getStatusOverview();
        if (statusOverview.taskStatuses?.[taskId] === TaskStatus.NOT_STARTED) {
          this.taskPlan.updateTaskStatus(taskId, TaskStatus.QUEUED, 'SystemTaskNotifier');
        }
      }

      await this.activator.activateAgent(agentName);
    }
  };
}
