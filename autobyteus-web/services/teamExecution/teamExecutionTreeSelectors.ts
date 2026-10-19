import type {
  ConfiguredAgentExecutionDto,
  TaskExecutionDto,
  TaskTeamExecutionDto,
  TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts';
import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { memberAddressBasename, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName';
import { agentRunKey, teamRunKey, type TaskExecutionTreeWalk } from '~/utils/collaboration/taskExecutionClosure';
import type {
  TeamAgentExecutionLocation,
  TeamExecutionNavigationRow,
} from './teamExecutionViewModels';

export const agentRowKey = (agentRunId: string): string => `agent:${agentRunId}`;
export const teamRowKey = (teamRunId: string): string => `team:${teamRunId}`;

const firstSegment = (address: string): string | undefined => address.split('/').filter(Boolean)[0];

/**
 * F-03 / CR-002 (D-7): a catalog copy (and its members and copies) is not at a configured member of the
 * root Team, so it reads as a spaced name (`product team`) in rows and contexts. A configured member,
 * and every copy started from it, keeps its address basename; the root never reads as a display name.
 */
export const readsAsDisplayName = (tree: TeamRunExecutionTreeDto, address: string): boolean => {
  const segment = firstSegment(address);
  return segment !== undefined && !tree.root_team.members.some((member) => firstSegment(member.address) === segment);
};

/** Teams are flat: the root Team's configured members are its Agents. */
export const collectConfiguredAgents = (
  tree: TeamRunExecutionTreeDto,
): readonly ConfiguredAgentExecutionDto[] => Object.freeze([...tree.root_team.members]);

export const collectAgentExecutionLocations = (
  tree: TeamRunExecutionTreeDto,
): readonly TeamAgentExecutionLocation[] => {
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
        task.members.forEach((member) => addLocation(member.agent_run_id, member.address, task.team_run_id));
        visitTasks(task.task_executions, task.team_run_id);
      }
    }
  };
  tree.root_team.members.forEach((member) => addLocation(member.agent_run_id, member.address, tree.root_team.team_run_id));
  visitTasks(tree.root_team.task_executions, tree.root_team.team_run_id);
  return Object.freeze(output);
};

/** Run ID of the innermost delegated child (task Agent or task Team) containing the agent, if any. */
export const findContainingTaskExecutionRunId = (
  tree: TeamRunExecutionTreeDto,
  agentRunId: string,
): string | null => {
  const search = (
    tasks: readonly TaskExecutionDto[],
    members: readonly { agent_run_id: string }[],
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
    return members.some((member) => member.agent_run_id === agentRunId) ? owningTaskRunId : null;
  };
  return search(tree.root_team.task_executions, tree.root_team.members, null);
};

export const findConfiguredAgentByAddress = (
  tree: TeamRunExecutionTreeDto,
  address: AgentTeamAddress,
): ConfiguredAgentExecutionDto | null =>
  collectConfiguredAgents(tree).find((agent) => agent.address === address) ?? null;

export const projectNavigationRows = (inputTree: {
  tree: TeamRunExecutionTreeDto;
  contexts: ReadonlyMap<string, AgentContext>;
}): readonly TeamExecutionNavigationRow[] => {
  const input = inputTree;
  // F-03 / CR-002: catalog-copy rows (and their members) read as spaced names.
  const nameOf = (address: AgentTeamAddress): string => readsAsDisplayName(input.tree, address)
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
    team: TaskTeamExecutionDto,
    depth: number,
    parentKey: string,
    coordinatorAddress: AgentTeamAddress,
  ): void => {
    for (const member of team.members) {
      addAgent({
        kind: 'task_team_agent', address: member.address, agentRunId: member.agent_run_id,
        depth, parentKey, coordinatorAddress,
      });
      team.task_executions.filter((task) => task.address === member.address)
        .forEach((task) => addTask(task, depth + 1, agentRowKey(member.agent_run_id)));
    }
    team.task_executions.filter((task) => !team.members.some((member) => member.address === task.address))
      .forEach((task) => addTask(task, depth, parentKey));
  };
  const addTaskTeam = (
    team: TaskTeamExecutionDto,
    depth: number,
    parentKey: string,
  ): void => {
    const key = teamRowKey(team.team_run_id);
    const coordinatorAddress = team.source.coordinator_address;
    const label = nameOf(team.address);
    rows.push(Object.freeze({
      key, kind: 'task_team', address: team.address,
      displayName: label, accessibleName: label,
      depth, parentKey, agentRunId: null, teamRunId: team.team_run_id,
      delegatedBy: delegatorName(team.delegator_agent_run_id),
      currentStatus: null, focusable: false,
      expandable: team.members.length > 0 || team.task_executions.length > 0, coordinator: false,
    }));
    addTaskMembers(team, depth + 1, key, coordinatorAddress);
  };
  const root = input.tree.root_team;
  const rootKey = teamRowKey(root.team_run_id);
  rows.push(Object.freeze({
    key: rootKey, kind: 'configured_team', address: '/',
    displayName: root.team_definition_name, accessibleName: root.team_definition_name,
    depth: 0, parentKey: null, agentRunId: null, teamRunId: root.team_run_id, delegatedBy: null,
    currentStatus: null, focusable: false,
    expandable: root.members.length > 0 || root.task_executions.length > 0, coordinator: false,
  }));
  for (const member of root.members) {
    addAgent({ kind: 'configured_agent', address: member.address, agentRunId: member.agent_run_id, depth: 1, parentKey: rootKey, coordinatorAddress: root.coordinator_address });
    root.task_executions
      .filter((task) => task.address === member.address)
      .forEach((task) => addTask(task, 2, agentRowKey(member.agent_run_id)));
  }
  root.task_executions
    .filter((task) => !root.members.some((member) => member.address === task.address))
    .forEach((task) => addTask(task, 1, rootKey));
  return Object.freeze(rows);
};

/** A node of the Team tree: Agents, and Teams with Agent members (Teams are flat) and task executions. */
export type TeamTreeNode = Readonly<{ agent_run_id: string }> | Readonly<{
  team_run_id: string; members?: readonly unknown[]; task_executions?: readonly unknown[];
  delegator_agent_run_id?: string | null;
}>;
export const teamTreeWalk: TaskExecutionTreeWalk<TeamTreeNode> = {
  keyOf: (node) => 'agent_run_id' in node ? agentRunKey(node.agent_run_id) : teamRunKey(node.team_run_id),
  childrenOf: (node) => 'agent_run_id' in node ? []
    : [...(node.members ?? []), ...(node.task_executions ?? [])] as readonly TeamTreeNode[],
};

export const teamTreeRunKeys = (root: TeamTreeNode): ReadonlySet<string> => {
  const keys = new Set<string>();
  const visit = (node: TeamTreeNode): void => {
    keys.add(teamTreeWalk.keyOf(node));
    teamTreeWalk.childrenOf(node).forEach(visit);
  };
  visit(root);
  return keys;
};
