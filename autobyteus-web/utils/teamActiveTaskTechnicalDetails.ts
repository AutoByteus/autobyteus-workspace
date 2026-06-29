import type { ActiveTaskEntry } from '~/utils/teamActiveTaskEntries';

export interface ActiveTaskTechnicalRow {
  key: string;
  labelKey: string;
  dataTest: string;
  value: string;
}

export const buildActiveTaskTechnicalRows = (entry: ActiveTaskEntry): ActiveTaskTechnicalRow[] => [
  {
    key: 'task-kind',
    labelKey: 'workspace.components.workspace.team.TeamActiveTasksSection.task_type',
    dataTest: 'active-task-task-kind',
    value: entry.kind,
  },
  ...(entry.taskId ? [{
    key: 'task-id',
    labelKey: 'workspace.components.workspace.team.TeamActiveTasksSection.task_id',
    dataTest: 'active-task-id',
    value: entry.taskId,
  }] : []),
  ...(entry.runId ? [{
    key: 'run-id',
    labelKey: entry.kind === 'task_team'
      ? 'workspace.components.workspace.team.TeamActiveTasksSection.agent_team_run_id'
      : 'workspace.components.workspace.team.TeamActiveTasksSection.agent_run_id',
    dataTest: 'active-task-run-id',
    value: entry.runId,
  }] : []),
  ...(entry.taskTargetKind ? [{
    key: 'target-kind',
    labelKey: 'workspace.components.workspace.team.TeamActiveTasksSection.target_kind',
    dataTest: 'active-task-target-kind',
    value: entry.taskTargetKind,
  }] : []),
  ...(entry.taskTargetName ? [{
    key: 'target-name',
    labelKey: 'workspace.components.workspace.team.TeamActiveTasksSection.target',
    dataTest: 'active-task-target-name',
    value: entry.taskTargetName,
  }] : []),
];

export const buildActiveTaskTechnicalInput = (entry: ActiveTaskEntry): string => {
  const value = entry.taskArguments ?? null;
  return value && Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : '';
};
