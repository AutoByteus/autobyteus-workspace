import type { TaskDelegationRecordDto } from '@autobyteus/team-stream-contracts';

export type TaskDelegationDisplayStatus =
  | 'in_progress'
  | 'awaiting_review'
  | 'revision_requested'
  | 'accepted'
  | 'interrupted';

export interface TeamExecutionTaskPresentation {
  readonly taskId: string;
  readonly description: string;
  readonly displayStatus: TaskDelegationDisplayStatus;
}

const deriveDisplayStatus = (
  task: TaskDelegationRecordDto,
): TaskDelegationDisplayStatus => {
  if (task.status !== 'active') return task.status;
  const latestUpdate = task.updates.at(-1);
  return latestUpdate?.kind === 'review' && latestUpdate.decision === 'request_revision'
    ? 'revision_requested'
    : 'in_progress';
};

export const deriveTaskDelegationPresentation = (
  task: TaskDelegationRecordDto,
): TeamExecutionTaskPresentation => Object.freeze({
  taskId: task.task_id,
  description: task.description.trim().replace(/\s+/g, ' '),
  displayStatus: deriveDisplayStatus(task),
});
