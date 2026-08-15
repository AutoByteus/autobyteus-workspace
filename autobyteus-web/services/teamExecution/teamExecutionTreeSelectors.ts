import type {
  ConfiguredMemberExecutionDto,
  ConfiguredTeamExecutionDto,
  TaskDelegationRecordDto,
  TaskExecutionDto,
  TaskTeamExecutionDto,
  TaskTeamMemberExecutionDto,
  TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts';
import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { memberAddressBasename, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import type {
  TeamExecutionNavigationRow,
  TeamTaskHistoryRow,
} from './teamExecutionViewModels';

export const agentRowKey = (agentRunId: string): string => `agent:${agentRunId}`;
export const teamRowKey = (teamRunId: string): string => `team:${teamRunId}`;

const taskLabel = (description: string): string => {
  const normalized = description.trim().replace(/\s+/g, ' ');
  const visible = normalized.length > 56 ? `${normalized.slice(0, 53)}…` : normalized;
  return `Task: ${visible}`;
};

export const collectConfiguredAgents = (
  tree: TeamRunExecutionTreeDto,
): readonly Extract<ConfiguredMemberExecutionDto, { kind: 'configured_agent' }>[] => {
  const agents: Extract<ConfiguredMemberExecutionDto, { kind: 'configured_agent' }>[] = [];
  const visit = (members: readonly ConfiguredMemberExecutionDto[]): void => {
    for (const member of members) {
      if (member.kind === 'configured_agent') agents.push(member);
      else visit(member.members);
    }
  };
  visit(tree.root_team.members);
  return Object.freeze(agents);
};

export const collectExecutionAgents = (tree: TeamRunExecutionTreeDto): readonly Readonly<{
  agentRunId: string;
  address: AgentTeamAddress;
  configured: boolean;
}>[] => {
  const output: Array<{ agentRunId: string; address: AgentTeamAddress; configured: boolean }> = [];
  const visitTasks = (tasks: readonly TaskExecutionDto[]): void => {
    for (const task of tasks) {
      if (task.kind === 'task_agent') output.push({ agentRunId: task.agent_run_id, address: task.address, configured: false });
      else {
        visitTaskMembers(task.members);
        visitTasks(task.task_executions);
      }
    }
  };
  const visitTaskMembers = (members: readonly TaskTeamMemberExecutionDto[]): void => {
    for (const member of members) {
      if (member.kind === 'task_team_agent') output.push({ agentRunId: member.agent_run_id, address: member.address, configured: false });
      else {
        visitTaskMembers(member.members);
        visitTasks(member.task_executions);
      }
    }
  };
  const visitConfigured = (members: readonly ConfiguredMemberExecutionDto[]): void => {
    for (const member of members) {
      if (member.kind === 'configured_agent') {
        output.push({ agentRunId: member.agent_run_id, address: member.address, configured: true });
      } else {
        visitConfigured(member.members);
        visitTasks(member.task_executions);
      }
    }
  };
  visitConfigured(tree.root_team.members);
  visitTasks(tree.root_team.task_executions);
  return Object.freeze(output);
};

export const collectLiveExecutionAgents = (tree: TeamRunExecutionTreeDto): ReturnType<typeof collectExecutionAgents> => {
  const output: Array<{ agentRunId: string; address: AgentTeamAddress; configured: boolean }> = [];
  const visitTasks = (tasks: readonly TaskExecutionDto[]): void => {
    for (const task of tasks) {
      if (task.settled_at) continue;
      if (task.kind === 'task_agent') output.push({ agentRunId: task.agent_run_id, address: task.address, configured: false });
      else {
        visitMembers(task.members);
        visitTasks(task.task_executions);
      }
    }
  };
  const visitMembers = (members: readonly TaskTeamMemberExecutionDto[]): void => {
    for (const member of members) {
      if (member.kind === 'task_team_agent') output.push({ agentRunId: member.agent_run_id, address: member.address, configured: false });
      else {
        visitMembers(member.members);
        visitTasks(member.task_executions);
      }
    }
  };
  const visitConfigured = (members: readonly ConfiguredMemberExecutionDto[]): void => {
    for (const member of members) {
      if (member.kind === 'configured_agent') output.push({ agentRunId: member.agent_run_id, address: member.address, configured: true });
      else {
        visitConfigured(member.members);
        visitTasks(member.task_executions);
      }
    }
  };
  visitConfigured(tree.root_team.members);
  visitTasks(tree.root_team.task_executions);
  return Object.freeze(output);
};

export const findConfiguredAgentByAddress = (
  tree: TeamRunExecutionTreeDto,
  address: AgentTeamAddress,
): Extract<ConfiguredMemberExecutionDto, { kind: 'configured_agent' }> | null =>
  collectConfiguredAgents(tree).find((agent) => agent.address === address) ?? null;

export const buildTaskHistoryRows = (
  tasks: readonly TaskDelegationRecordDto[],
): readonly TeamTaskHistoryRow[] => Object.freeze(tasks.map((task) => Object.freeze({
  task,
  label: taskLabel(task.description),
  targetKind: 'agent_run_id' in task.task_execution ? 'agent' as const : 'agent_team' as const,
  targetAgentRunId: 'agent_run_id' in task.task_execution ? task.task_execution.agent_run_id : null,
  targetTeamRunId: 'team_run_id' in task.task_execution ? task.task_execution.team_run_id : null,
  targetAddress: task.recipient_address,
  delegatorAgentRunId: task.delegator_agent_run_id,
})));

export const projectNavigationRows = (input: {
  tree: TeamRunExecutionTreeDto;
  tasks: readonly TaskDelegationRecordDto[];
  contexts: ReadonlyMap<string, AgentContext>;
}): readonly TeamExecutionNavigationRow[] => {
  const rows: TeamExecutionNavigationRow[] = [];
  const tasksByAgent = new Map<string, TaskDelegationRecordDto>();
  const tasksByTeam = new Map<string, TaskDelegationRecordDto>();
  for (const task of input.tasks) {
    if ('agent_run_id' in task.task_execution) tasksByAgent.set(task.task_execution.agent_run_id, task);
    else tasksByTeam.set(task.task_execution.team_run_id, task);
  }
  const status = (agentRunId: string): AgentStatus =>
    input.contexts.get(agentRunId)?.state.currentStatus ?? AgentStatus.Offline;
  const addAgent = (inputAgent: {
    kind: 'configured_agent' | 'task_agent' | 'task_team_agent';
    address: AgentTeamAddress;
    agentRunId: string;
    depth: number;
    parentKey: string | null;
    task?: TaskDelegationRecordDto | null;
    coordinatorAddress?: AgentTeamAddress | null;
  }): void => {
    const label = inputAgent.task ? taskLabel(inputAgent.task.description) : memberAddressBasename(inputAgent.address);
    rows.push(Object.freeze({
      key: agentRowKey(inputAgent.agentRunId), kind: inputAgent.kind, address: inputAgent.address,
      displayName: label, accessibleName: inputAgent.task ? `Task: ${inputAgent.task.description.trim().replace(/\s+/g, ' ')}` : label,
      depth: inputAgent.depth, parentKey: inputAgent.parentKey, agentRunId: inputAgent.agentRunId,
      teamRunId: null, taskId: inputAgent.task?.task_id ?? null,
      taskStatus: inputAgent.task?.status ?? null, currentStatus: status(inputAgent.agentRunId),
      focusable: true, expandable: false, coordinator: inputAgent.coordinatorAddress === inputAgent.address,
    }));
  };
  const addTask = (task: TaskExecutionDto, depth: number, parentKey: string): void => {
    if (task.settled_at) return;
    if (task.kind === 'task_agent') {
      const record = tasksByAgent.get(task.agent_run_id);
      if (record) addAgent({ kind: 'task_agent', address: task.address, agentRunId: task.agent_run_id, depth, parentKey, task: record });
      return;
    }
    const record = tasksByTeam.get(task.team_run_id);
    if (!record) return;
    addTaskTeam(task, record, depth, parentKey);
  };
  const addTaskMembers = (
    members: readonly TaskTeamMemberExecutionDto[],
    tasks: readonly TaskExecutionDto[],
    depth: number,
    parentKey: string,
    coordinatorAddress: AgentTeamAddress,
  ): void => {
    for (const member of members) {
      if (member.kind === 'task_team_agent') {
        addAgent({ kind: 'task_team_agent', address: member.address, agentRunId: member.agent_run_id, depth, parentKey, coordinatorAddress });
      } else {
        const key = teamRowKey(member.team_run_id);
        rows.push(Object.freeze({
          key, kind: 'task_team_member', address: member.address,
          displayName: memberAddressBasename(member.address), accessibleName: memberAddressBasename(member.address),
          depth, parentKey, agentRunId: null, teamRunId: member.team_run_id, taskId: null,
          taskStatus: null, currentStatus: null, focusable: false,
          expandable: member.members.length > 0 || member.task_executions.length > 0, coordinator: false,
        }));
        addTaskMembers(member.members, member.task_executions, depth + 1, key, coordinatorAddress);
      }
      tasks.filter((task) => task.address === member.address).forEach((task) => addTask(task, depth + 1, member.kind === 'task_team_agent' ? agentRowKey(member.agent_run_id) : teamRowKey(member.team_run_id)));
    }
    tasks.filter((task) => !members.some((member) => member.address === task.address))
      .forEach((task) => addTask(task, depth, parentKey));
  };
  const addTaskTeam = (
    team: TaskTeamExecutionDto,
    task: TaskDelegationRecordDto,
    depth: number,
    parentKey: string,
  ): void => {
    const key = teamRowKey(team.team_run_id);
    const coordinatorAddress = configuredTeamAtAddress(input.tree, team.address)?.coordinator_address ?? team.address;
    rows.push(Object.freeze({
      key, kind: 'task_team', address: team.address,
      displayName: taskLabel(task.description), accessibleName: `Task: ${task.description.trim().replace(/\s+/g, ' ')}`,
      depth, parentKey, agentRunId: null, teamRunId: team.team_run_id, taskId: task.task_id,
      taskStatus: task.status, currentStatus: null, focusable: false,
      expandable: team.members.length > 0 || team.task_executions.length > 0, coordinator: false,
    }));
    addTaskMembers(team.members, team.task_executions, depth + 1, key, coordinatorAddress);
  };
  const addConfiguredTeam = (
    team: ConfiguredTeamExecutionDto | TeamRunExecutionTreeDto['root_team'],
    depth: number,
    parentKey: string | null,
    isRoot: boolean,
  ): void => {
    const key = teamRowKey(team.team_run_id);
    rows.push(Object.freeze({
      key, kind: 'configured_team', address: isRoot ? '/' : (team as ConfiguredTeamExecutionDto).address,
      displayName: isRoot ? input.tree.root_team.team_definition_name : memberAddressBasename((team as ConfiguredTeamExecutionDto).address),
      accessibleName: isRoot ? input.tree.root_team.team_definition_name : memberAddressBasename((team as ConfiguredTeamExecutionDto).address),
      depth, parentKey, agentRunId: null, teamRunId: team.team_run_id, taskId: null,
      taskStatus: null, currentStatus: null, focusable: false,
      expandable: team.members.length > 0 || team.task_executions.length > 0, coordinator: false,
    }));
    for (const member of team.members) {
      if (member.kind === 'configured_agent') {
        addAgent({ kind: 'configured_agent', address: member.address, agentRunId: member.agent_run_id, depth: depth + 1, parentKey: key, coordinatorAddress: team.coordinator_address });
      } else addConfiguredTeam(member, depth + 1, key, false);
      const placementKey = member.kind === 'configured_agent' ? agentRowKey(member.agent_run_id) : teamRowKey(member.team_run_id);
      team.task_executions
        .filter((task) => task.address === member.address)
        .forEach((task) => addTask(task, depth + 2, placementKey));
    }
    team.task_executions
      .filter((task) => !team.members.some((member) => member.address === task.address))
      .forEach((task) => addTask(task, depth + 1, key));
  };
  addConfiguredTeam(input.tree.root_team, 0, null, true);
  return Object.freeze(rows);
};

const configuredTeamAtAddress = (
  tree: TeamRunExecutionTreeDto,
  address: AgentTeamAddress,
): ConfiguredTeamExecutionDto | null => {
  const visit = (members: readonly ConfiguredMemberExecutionDto[]): ConfiguredTeamExecutionDto | null => {
    for (const member of members) {
      if (member.kind !== 'configured_team') continue;
      if (member.address === address) return member;
      const nested = visit(member.members);
      if (nested) return nested;
    }
    return null;
  };
  return visit(tree.root_team.members);
};
