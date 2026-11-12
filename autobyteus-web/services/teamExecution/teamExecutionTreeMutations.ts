import {
  teamRunExecutionTreeDtoSchema,
  type TaskExecutionDto,
  type TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts';

/** A TeamRun that hosts delegations: the root Team or a task Team. Teams are flat: members are Agents. */
type MutableTeam = {
  team_run_id: string;
  members: Array<{ agent_run_id: string }>;
  task_executions: TaskExecutionDto[];
};

const visitTeams = (
  team: MutableTeam,
  visitor: (team: MutableTeam) => boolean,
): boolean => {
  if (visitor(team)) return true;
  for (const task of team.task_executions) {
    if (task.kind === 'task_team' && visitTeams(task as unknown as MutableTeam, visitor)) return true;
  }
  return false;
};

const executionIds = (tree: TeamRunExecutionTreeDto): ReadonlySet<string> => {
  const ids = new Set<string>();
  visitTeams(structuredClone(tree.root_team) as unknown as MutableTeam, (team) => {
    ids.add(team.team_run_id);
    for (const member of team.members) ids.add(member.agent_run_id);
    for (const task of team.task_executions) {
      ids.add(task.kind === 'task_agent' ? task.agent_run_id : task.team_run_id);
    }
    return false;
  });
  return ids;
};

const containedExecutionIds = (execution: TaskExecutionDto): readonly string[] => {
  const ids: string[] = [];
  const visitTask = (task: TaskExecutionDto): void => {
    ids.push(task.kind === 'task_agent' ? task.agent_run_id : task.team_run_id);
    if (task.kind !== 'task_team') return;
    task.members.forEach((member) => ids.push(member.agent_run_id));
    task.task_executions.forEach(visitTask);
  };
  visitTask(execution);
  return ids;
};

export const insertTaskExecution = (input: {
  tree: TeamRunExecutionTreeDto;
  parentTeamRunId: string;
  execution: TaskExecutionDto;
}): TeamRunExecutionTreeDto => {
  const currentIds = executionIds(input.tree);
  for (const id of containedExecutionIds(input.execution)) {
    if (currentIds.has(id)) throw new Error(`Execution '${id}' already exists in the Team execution tree.`);
  }
  const candidate = structuredClone(input.tree) as TeamRunExecutionTreeDto;
  const inserted = visitTeams(candidate.root_team as unknown as MutableTeam, (team) => {
    if (team.team_run_id !== input.parentTeamRunId) return false;
    team.task_executions.push(structuredClone(input.execution));
    return true;
  });
  if (!inserted) throw new Error(`Task execution parent TeamRun '${input.parentTeamRunId}' is missing.`);
  return teamRunExecutionTreeDtoSchema.parse(candidate);
};

