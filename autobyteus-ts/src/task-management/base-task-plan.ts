import { EventEmitter } from '../events/event-emitter.js';
import type { Task } from './task.js';
import type { TaskDefinition } from './schemas/task-definition.js';

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  FAILED = 'failed'
}

export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === TaskStatus.COMPLETED || status === TaskStatus.FAILED;
}

export type TaskStatusOverview = {
  taskStatuses: Record<string, TaskStatus>;
  tasks: Task[];
};

export abstract class BaseTaskPlan extends EventEmitter {
  teamId: string;
  tasks: Task[] = [];

  constructor(teamId: string) {
    super();
    this.teamId = teamId;
  }

  abstract addTasks(taskDefinitions: TaskDefinition[]): Task[];

  abstract addTask(taskDefinition: TaskDefinition): Task | null;

  abstract updateTaskStatus(taskId: string, status: TaskStatus, agentName: string): boolean;

  abstract getStatusOverview(): TaskStatusOverview;

  abstract getNextRunnableTasks(): Task[];
}
