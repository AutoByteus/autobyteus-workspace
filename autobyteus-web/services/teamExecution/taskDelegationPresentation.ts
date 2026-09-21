import type { TaskDelegationRecordDto } from '@autobyteus/team-stream-contracts';

import type { DelegatedTaskDisplayStatus, CollaborationTaskHeadingPresentation } from '~/types/workspace/collaborationTaskPresentation';

const deriveDisplayStatus = (
  task: TaskDelegationRecordDto,
): DelegatedTaskDisplayStatus => {
  if (task.status !== 'active') return task.status;
  const latestUpdate = task.updates.at(-1);
  return latestUpdate?.kind === 'review' && latestUpdate.decision === 'request_revision'
    ? 'revision_requested'
    : 'in_progress';
};

export const deriveTaskDelegationPresentation = (
  task: TaskDelegationRecordDto,
): CollaborationTaskHeadingPresentation => Object.freeze({
  taskId: task.task_id,
  description: task.description.trim().replace(/\s+/g, ' '),
  displayStatus: deriveDisplayStatus(task),
});
