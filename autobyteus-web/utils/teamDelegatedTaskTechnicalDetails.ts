import type { DelegatedTaskEntry } from '~/utils/teamDelegatedTaskEntries';

export interface DelegatedTaskTechnicalRow {
  key: string;
  labelKey: string;
  dataTest: string;
  value: string;
}

export const buildDelegatedTaskTechnicalRows = (entry: DelegatedTaskEntry): DelegatedTaskTechnicalRow[] => [
  {
    key: 'task-kind',
    labelKey: 'workspace.components.workspace.team.TeamDelegatedTasksSection.task_type',
    dataTest: 'delegated-task-task-kind',
    value: entry.kind,
  },
  ...(entry.taskId ? [{
    key: 'task-id',
    labelKey: 'workspace.components.workspace.team.TeamDelegatedTasksSection.task_id',
    dataTest: 'delegated-task-id',
    value: entry.taskId,
  }] : []),
  ...(entry.runId ? [{
    key: 'run-id',
    labelKey: entry.kind === 'task_team'
      ? 'workspace.components.workspace.team.TeamDelegatedTasksSection.agent_team_run_id'
      : 'workspace.components.workspace.team.TeamDelegatedTasksSection.agent_run_id',
    dataTest: 'delegated-task-run-id',
    value: entry.runId,
  }] : []),
  ...(entry.taskTargetKind ? [{
    key: 'target-kind',
    labelKey: 'workspace.components.workspace.team.TeamDelegatedTasksSection.target_kind',
    dataTest: 'delegated-task-target-kind',
    value: entry.taskTargetKind,
  }] : []),
  ...(entry.taskTargetName ? [{
    key: 'target-name',
    labelKey: 'workspace.components.workspace.team.TeamDelegatedTasksSection.target',
    dataTest: 'delegated-task-target-name',
    value: entry.taskTargetName,
  }] : []),
];

export const buildDelegatedTaskTechnicalInput = (entry: DelegatedTaskEntry): string => {
  const value = entry.taskArguments ?? null;
  return value && Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : '';
};
