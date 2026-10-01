import type {
  CollaboratorEntryDto,
  ConfiguredMemberExecutionDto,
  ConfiguredTeamExecutionDto,
  TaskExecutionDto,
  TaskTeamExecutionDto,
  TaskTeamMemberExecutionDto,
  TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts';
import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { memberAddressBasename, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName';
import type {
  TeamAgentExecutionLocation,
  TeamExecutionNavigationRow,
} from './teamExecutionViewModels';

export const agentRowKey = (agentRunId: string): string => `agent:${agentRunId}`;
export const teamRowKey = (teamRunId: string): string => `team:${teamRunId}`;

/**
 * A collaborator shown with the product's task rows (approved look): an Agent as a task Agent
 * at the root, a Team as a task Team with its members and its own delegations. It started when
 * the user's send added it (`added_via_agent_run_id` is the starter).
 */
const collaboratorExecution = (entry: CollaboratorEntryDto): TaskExecutionDto => entry.kind === 'agent'
  ? {
      kind: 'task_agent', address: entry.address, agent_run_id: entry.agent_run_id,
      platform_agent_run_id: entry.platform_agent_run_id,
      delegator_agent_run_id: entry.added_via_agent_run_id, started_at: entry.added_at,
    }
  : {
      kind: 'task_team', address: entry.address, team_run_id: entry.team_run_id,
      members: entry.members.map((member) => ({
        kind: 'task_team_agent' as const, address: member.address,
        agent_run_id: member.agent_run_id, platform_agent_run_id: member.platform_agent_run_id,
      })),
      task_executions: entry.task_executions,
      delegator_agent_run_id: entry.added_via_agent_run_id, started_at: entry.added_at,
    };

/**
 * The tree as the views present it: collaborators first among the root's delegated children.
 * Never persisted or sent; selectors read placements, rows and identities from it.
 */
export const withCollaboratorExecutions = (tree: TeamRunExecutionTreeDto): TeamRunExecutionTreeDto => {
  const collaborators = tree.root_team.collaborators ?? [];
  if (collaborators.length === 0) return tree;
  return {
    ...tree,
    root_team: {
      ...tree.root_team,
      task_executions: [...collaborators.map(collaboratorExecution), ...tree.root_team.task_executions],
    },
  };
};

/** Whether an address is (or is inside) a collaborator of the run. */
export const isCollaboratorAddress = (tree: TeamRunExecutionTreeDto, address: string): boolean => {
  const segment = address.split('/').filter(Boolean)[0];
  return (tree.root_team.collaborators ?? []).some((entry) => entry.address.split('/').filter(Boolean)[0] === segment);
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

export const collectConfiguredTeams = (
  tree: TeamRunExecutionTreeDto,
): readonly (ConfiguredTeamExecutionDto | TeamRunExecutionTreeDto['root_team'])[] => {
  const teams: Array<ConfiguredTeamExecutionDto | TeamRunExecutionTreeDto['root_team']> = [tree.root_team];
  const visit = (members: readonly ConfiguredMemberExecutionDto[]): void => {
    for (const member of members) {
      if (member.kind === 'configured_team') { teams.push(member); visit(member.members); }
    }
  };
  visit(tree.root_team.members);
  return Object.freeze(teams);
};

export const findConfiguredTeamByAddress = (
  tree: TeamRunExecutionTreeDto,
  address: AgentTeamAddress,
): ConfiguredTeamExecutionDto | TeamRunExecutionTreeDto['root_team'] | null =>
  collectConfiguredTeams(tree).find((team) => (team === tree.root_team ? '/' : team.address) === address) ?? null;

export const collectAgentExecutionLocations = (
  storedTree: TeamRunExecutionTreeDto,
): readonly TeamAgentExecutionLocation[] => {
  const tree = withCollaboratorExecutions(storedTree);
  const output: TeamAgentExecutionLocation[] = [];
  const addLocation = (
    agentRunId: string,
    memberAddress: AgentTeamAddress,
    containingTeamRunId: string,
  ): void => {
    output.push(Object.freeze({ agentRunId, memberAddress, containingTeamRunId }));
  };
  const visitTasks = (tasks: readonly TaskExecutionDto[], containingTeamRunId: string): void => {
    for (const task of tasks) {
      if (task.kind === 'task_agent') addLocation(task.agent_run_id, task.address, containingTeamRunId);
      else {
        visitTaskMembers(task.members, task.team_run_id);
        visitTasks(task.task_executions, task.team_run_id);
      }
    }
  };
  const visitTaskMembers = (
    members: readonly TaskTeamMemberExecutionDto[],
    containingTeamRunId: string,
  ): void => {
    for (const member of members) {
      if (member.kind === 'task_team_agent') {
        addLocation(member.agent_run_id, member.address, containingTeamRunId);
      }
      else {
        visitTaskMembers(member.members, member.team_run_id);
        visitTasks(member.task_executions, member.team_run_id);
      }
    }
  };
  const visitConfigured = (
    members: readonly ConfiguredMemberExecutionDto[],
    containingTeamRunId: string,
  ): void => {
    for (const member of members) {
      if (member.kind === 'configured_agent') {
        addLocation(member.agent_run_id, member.address, containingTeamRunId);
      } else {
        visitConfigured(member.members, member.team_run_id);
        visitTasks(member.task_executions, member.team_run_id);
      }
    }
  };
  visitConfigured(tree.root_team.members, tree.root_team.team_run_id);
  visitTasks(tree.root_team.task_executions, tree.root_team.team_run_id);
  return Object.freeze(output);
};

/** Run ID of the innermost delegated child (task Agent or task Team) containing the agent, if any. */
export const findContainingTaskExecutionRunId = (
  storedTree: TeamRunExecutionTreeDto,
  agentRunId: string,
): string | null => {
  const tree = withCollaboratorExecutions(storedTree);
  type Member = ConfiguredMemberExecutionDto | TaskTeamMemberExecutionDto;
  const search = (
    tasks: readonly TaskExecutionDto[],
    members: readonly Member[],
    owningTaskRunId: string | null,
  ): string | null => {
    for (const task of tasks) {
      if (task.kind === 'task_agent') {
        if (task.agent_run_id === agentRunId) return task.agent_run_id;
        continue;
      }
      const found = search(task.task_executions, task.members, task.team_run_id);
      if (found) return found;
    }
    for (const member of members) {
      if (member.kind === 'configured_agent' || member.kind === 'task_team_agent') {
        if (member.agent_run_id === agentRunId) return owningTaskRunId;
        continue;
      }
      const found = search(member.task_executions, member.members, owningTaskRunId);
      if (found) return found;
    }
    return null;
  };
  return search(tree.root_team.task_executions, tree.root_team.members, null);
};

export const findConfiguredAgentByAddress = (
  tree: TeamRunExecutionTreeDto,
  address: AgentTeamAddress,
): Extract<ConfiguredMemberExecutionDto, { kind: 'configured_agent' }> | null =>
  collectConfiguredAgents(tree).find((agent) => agent.address === address) ?? null;

export const projectNavigationRows = (inputTree: {
  tree: TeamRunExecutionTreeDto;
  contexts: ReadonlyMap<string, AgentContext>;
}): readonly TeamExecutionNavigationRow[] => {
  const input = { ...inputTree, tree: withCollaboratorExecutions(inputTree.tree) };
  // F-03: collaborator rows (and their members and copies) read as spaced names.
  const nameOf = (address: AgentTeamAddress): string => isCollaboratorAddress(input.tree, address)
    ? memberDisplayName(address)
    : memberAddressBasename(address);
  const rows: TeamExecutionNavigationRow[] = [];
  const addressesByAgentRunId = new Map(collectAgentExecutionLocations(input.tree)
    .map((location) => [location.agentRunId, location.memberAddress]));
  // Children recorded before the delegator was stored carry none and show no starter.
  const delegatorName = (delegatorAgentRunId: string | null): string | null => {
    if (delegatorAgentRunId === null) return null;
    const address = addressesByAgentRunId.get(delegatorAgentRunId);
    return address ? memberAddressBasename(address) : delegatorAgentRunId;
  };
  const status = (agentRunId: string): AgentStatus =>
    input.contexts.get(agentRunId)?.state.currentStatus ?? AgentStatus.Offline;
  const addAgent = (inputAgent: {
    kind: 'configured_agent' | 'task_agent' | 'task_team_agent';
    address: AgentTeamAddress;
    agentRunId: string;
    depth: number;
    parentKey: string | null;
    delegatedBy?: string | null;
    coordinatorAddress?: AgentTeamAddress | null;
  }): void => {
    const label = nameOf(inputAgent.address);
    rows.push(Object.freeze({
      key: agentRowKey(inputAgent.agentRunId), kind: inputAgent.kind, address: inputAgent.address,
      displayName: label, accessibleName: label,
      depth: inputAgent.depth, parentKey: inputAgent.parentKey, agentRunId: inputAgent.agentRunId,
      teamRunId: null, delegatedBy: inputAgent.delegatedBy ?? null, currentStatus: status(inputAgent.agentRunId),
      focusable: true, expandable: false, coordinator: inputAgent.coordinatorAddress === inputAgent.address,
    }));
  };
  const addTask = (task: TaskExecutionDto, depth: number, parentKey: string): void => {
    if (task.kind === 'task_agent') {
      addAgent({
        kind: 'task_agent', address: task.address, agentRunId: task.agent_run_id,
        depth, parentKey, delegatedBy: delegatorName(task.delegator_agent_run_id),
      });
      return;
    }
    addTaskTeam(task, depth, parentKey);
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
        addAgent({
          kind: 'task_team_agent', address: member.address, agentRunId: member.agent_run_id,
          depth, parentKey, coordinatorAddress,
        });
      } else {
        const key = teamRowKey(member.team_run_id);
        rows.push(Object.freeze({
          key, kind: 'task_team_member', address: member.address,
          displayName: nameOf(member.address), accessibleName: nameOf(member.address),
          depth, parentKey, agentRunId: null, teamRunId: member.team_run_id, delegatedBy: null,
          currentStatus: null, focusable: false,
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
    depth: number,
    parentKey: string,
  ): void => {
    const key = teamRowKey(team.team_run_id);
    const coordinatorAddress = team.source?.coordinator_address
      ?? configuredTeamAtAddress(input.tree, team.address)?.coordinator_address
      ?? collaboratorTeamAt(input.tree, team.address)?.coordinator_address
      ?? team.address;
    const label = nameOf(team.address);
    rows.push(Object.freeze({
      key, kind: 'task_team', address: team.address,
      displayName: label, accessibleName: label,
      depth, parentKey, agentRunId: null, teamRunId: team.team_run_id,
      delegatedBy: delegatorName(team.delegator_agent_run_id),
      currentStatus: null, focusable: false,
      expandable: team.members.length > 0 || team.task_executions.length > 0, coordinator: false,
      ...(collaboratorTeamAt(input.tree, team.address)?.team_run_id === team.team_run_id ? { opensOnAppear: true } : {}),
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
      depth, parentKey, agentRunId: null, teamRunId: team.team_run_id, delegatedBy: null,
      currentStatus: null, focusable: false,
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

const collaboratorTeamAt = (tree: TeamRunExecutionTreeDto, address: AgentTeamAddress) => {
  const entry = (tree.root_team.collaborators ?? []).find((candidate) => candidate.address === address);
  return entry?.kind === 'agent_team' ? entry : null;
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
