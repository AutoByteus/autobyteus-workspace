import {
  teamRunExecutionTreeDtoSchema,
  type ConfiguredMemberExecutionDto,
  type TaskExecutionDto,
  type TaskTeamMemberExecutionDto,
  type TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts';

type MutableTeam = {
  team_run_id: string;
  members: Array<ConfiguredMemberExecutionDto | TaskTeamMemberExecutionDto>;
  task_executions: TaskExecutionDto[];
};

const visitTeams = (
  team: MutableTeam,
  visitor: (team: MutableTeam) => boolean,
): boolean => {
  if (visitor(team)) return true;
  for (const member of team.members) {
    if (member.kind !== 'configured_team' && member.kind !== 'task_team_member') continue;
    if (visitTeams(member as unknown as MutableTeam, visitor)) return true;
  }
  for (const task of team.task_executions) {
    if (task.kind === 'task_team' && visitTeams(task as unknown as MutableTeam, visitor)) return true;
  }
  return false;
};

const executionIds = (tree: TeamRunExecutionTreeDto): ReadonlySet<string> => {
  const ids = new Set<string>([tree.root_team.team_run_id]);
  visitTeams(structuredClone(tree.root_team) as unknown as MutableTeam, (team) => {
    ids.add(team.team_run_id);
    for (const member of team.members) {
      if (member.kind === 'configured_agent' || member.kind === 'task_team_agent') ids.add(member.agent_run_id);
      else ids.add(member.team_run_id);
    }
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
    const visitMember = (member: TaskTeamMemberExecutionDto): void => {
      ids.push(member.kind === 'task_team_agent' ? member.agent_run_id : member.team_run_id);
      if (member.kind === 'task_team_member') {
        member.members.forEach(visitMember);
        member.task_executions.forEach(visitTask);
      }
    };
    task.members.forEach(visitMember);
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
  let inserted = false;
  visitTeams(candidate.root_team as unknown as MutableTeam, (team) => {
    if (team.team_run_id !== input.parentTeamRunId) return false;
    team.task_executions.push(structuredClone(input.execution));
    inserted = true;
    return true;
  });
  if (!inserted) throw new Error(`Task execution parent TeamRun '${input.parentTeamRunId}' is missing.`);
  return teamRunExecutionTreeDtoSchema.parse(candidate);
};

export const settleTaskExecution = (input: {
  tree: TeamRunExecutionTreeDto;
  execution: Readonly<{ agent_run_id: string } | { team_run_id: string }>;
  settledAt: string;
}): TeamRunExecutionTreeDto => {
  const candidate = structuredClone(input.tree) as TeamRunExecutionTreeDto;
  const expectedId = 'agent_run_id' in input.execution
    ? input.execution.agent_run_id
    : input.execution.team_run_id;
  let matches = 0;
  visitTeams(candidate.root_team as unknown as MutableTeam, (team) => {
    team.task_executions.forEach((execution, index) => {
      const runId = execution.kind === 'task_agent' ? execution.agent_run_id : execution.team_run_id;
      if (runId !== expectedId) return;
      team.task_executions.splice(index, 1, {
        ...execution,
        settled_at: input.settledAt,
      });
      matches += 1;
    });
    return false;
  });
  if (matches !== 1) {
    throw new Error(`Task execution '${expectedId}' resolved ${matches} times in the Team execution tree.`);
  }
  return teamRunExecutionTreeDtoSchema.parse(candidate);
};
