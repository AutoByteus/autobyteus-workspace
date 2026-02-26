import { EventType } from '../events/event-types.js';
import { BaseTaskPlan, TaskStatus, type TaskStatusOverview } from './base-task-plan.js';
import type { TaskDefinition } from './schemas/task-definition.js';
import { TaskSchema, type Task } from './task.js';
import { TasksCreatedEventSchema, TaskStatusUpdatedEventSchema } from './events.js';

export class InMemoryTaskPlan extends BaseTaskPlan {
  taskStatuses: Record<string, TaskStatus> = {};
  private taskMap: Map<string, Task> = new Map();
  private idCounter = 0;

  private generateNextId(): string {
    this.idCounter += 1;
    return `task_${String(this.idCounter).padStart(4, '0')}`;
  }

  addTasks(taskDefinitions: TaskDefinition[]): Task[] {
    const newTasks: Task[] = [];

    for (const taskDef of taskDefinitions) {
      const taskId = this.generateNextId();
      const task = TaskSchema.parse({
        task_id: taskId,
        task_name: taskDef.task_name,
        assignee_name: taskDef.assignee_name,
        description: taskDef.description,
        dependencies: taskDef.dependencies ?? [],
        file_deliverables: 'file_deliverables' in taskDef ? (taskDef as Task).file_deliverables : undefined
      });

      this.tasks.push(task);
      this.taskStatuses[task.task_id] = TaskStatus.NOT_STARTED;
      this.taskMap.set(task.task_id, task);
      newTasks.push(task);
    }

    this.hydrateAllDependencies();

    const eventPayload = TasksCreatedEventSchema.parse({
      team_id: this.teamId,
      tasks: newTasks
    });

    this.emit(EventType.TASK_PLAN_TASKS_CREATED, { payload: eventPayload });
    return newTasks;
  }

  addTask(taskDefinition: TaskDefinition): Task | null {
    const created = this.addTasks([taskDefinition]);
    return created.length ? created[0] : null;
  }

  private hydrateAllDependencies(): void {
    const nameToIdMap = new Map(this.tasks.map((task) => [task.task_name, task.task_id]));
    const allTaskIds = new Set(this.taskMap.keys());

    for (const task of this.tasks) {
      if (!task.dependencies || task.dependencies.length === 0) {
        continue;
      }

      const resolvedDeps: string[] = [];
      for (const dep of task.dependencies) {
        if (allTaskIds.has(dep)) {
          resolvedDeps.push(dep);
          continue;
        }
        const mapped = nameToIdMap.get(dep);
        if (mapped) {
          resolvedDeps.push(mapped);
        }
      }

      task.dependencies = resolvedDeps;
    }
  }

  updateTaskStatus(taskId: string, status: TaskStatus, agentName: string): boolean {
    if (!(taskId in this.taskStatuses)) {
      return false;
    }

    this.taskStatuses[taskId] = status;
    const task = this.taskMap.get(taskId);

    const eventPayload = TaskStatusUpdatedEventSchema.parse({
      team_id: this.teamId,
      task_id: taskId,
      new_status: status,
      agent_name: agentName,
      deliverables: task?.file_deliverables
    });

    this.emit(EventType.TASK_PLAN_STATUS_UPDATED, { payload: eventPayload });
    return true;
  }

  getStatusOverview(): TaskStatusOverview {
    return {
      taskStatuses: { ...this.taskStatuses },
      tasks: this.tasks
    };
  }

  getNextRunnableTasks(): Task[] {
    const runnable: Task[] = [];

    for (const [taskId, status] of Object.entries(this.taskStatuses)) {
      if (status !== TaskStatus.NOT_STARTED) {
        continue;
      }

      const task = this.taskMap.get(taskId);
      if (!task) {
        continue;
      }

      const dependencies = task.dependencies ?? [];
      if (dependencies.length === 0) {
        runnable.push(task);
        continue;
      }

      const dependenciesMet = dependencies.every(
        (depId) => this.taskStatuses[depId] === TaskStatus.COMPLETED
      );

      if (dependenciesMet) {
        runnable.push(task);
      }
    }

    return runnable;
  }
}
