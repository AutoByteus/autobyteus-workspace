import {
  createTeamExecutionAddress,
  memberAddressBasename,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import type {
  TeamExecutionNavigationRow,
  TeamExecutionSummary,
} from './teamExecutionModels';
import type { TeamTopologySnapshot } from './teamTopologySnapshot';

const taskPrefixContains = (root: TeamExecutionAddress, candidate: TeamExecutionAddress): boolean =>
  root.rootTeamRunId === candidate.rootTeamRunId
  && candidate.taskTeamRunIds.length >= root.taskTeamRunIds.length
  && root.taskTeamRunIds.every((id, index) => candidate.taskTeamRunIds[index] === id)
  && (!root.taskAgentRunId || root.taskAgentRunId === candidate.taskAgentRunId);

export const projectTeamExecutionNavigationRows = (input: Readonly<{
  rootTeamRunId: string;
  topology: TeamTopologySnapshot;
  executions: readonly TeamExecutionSummary[];
}>): readonly TeamExecutionNavigationRow[] => {
  const byAddress = new Map(input.executions.map((execution) => [
    serializeTeamExecutionAddress(execution.executionAddress),
    execution,
  ] as const));
  const rows: TeamExecutionNavigationRow[] = [];
  const depthByAddress = new Map<string, number>();
  const visitTopology = (
    node: ReturnType<TeamTopologySnapshot['getNode']>,
    depth: number,
    parent: TeamExecutionAddress | null,
  ): void => {
    if (!node) return;
    depthByAddress.set(node.address, depth);
    const address = createTeamExecutionAddress({ rootTeamRunId: input.rootTeamRunId, memberAddress: node.address });
    const execution = byAddress.get(serializeTeamExecutionAddress(address));
    if (execution) rows.push(Object.freeze({
      ...execution,
      displayName: node.displayName || memberAddressBasename(node.address),
      depth,
      hasChildren: node.kind === 'agent_team' && node.children.length > 0,
      parentExecutionAddress: parent,
    }));
    if (node.kind === 'agent_team') node.children.forEach((child) => visitTopology(child, depth + 1, address));
  };
  visitTopology(input.topology.rootTeam, 0, null);

  const transient = input.executions
    .filter((execution) => execution.kind !== 'persistent_agent' && execution.kind !== 'persistent_team')
    .sort((left, right) => serializeTeamExecutionAddress(left.executionAddress)
      .localeCompare(serializeTeamExecutionAddress(right.executionAddress)));
  for (const execution of transient) {
    const topology = input.topology.getNode(execution.executionAddress.memberAddress);
    const parentChain = execution.executionAddress.taskTeamRunIds.slice(0, -1);
    const parentAddress = execution.kind === 'task_agent'
      ? createTeamExecutionAddress({ ...execution.executionAddress, taskAgentRunId: null })
      : execution.kind === 'task_team_agent'
        ? transient.find((candidate) => candidate.kind === 'task_team'
          && candidate.executionAddress.taskTeamRunIds.length === execution.executionAddress.taskTeamRunIds.length
          && execution.executionAddress.taskTeamRunIds.every((id, index) => candidate.executionAddress.taskTeamRunIds[index] === id))?.executionAddress ?? null
        : parentChain.length
        ? transient.find((candidate) => candidate.kind === 'task_team'
          && candidate.executionAddress.taskTeamRunIds.length === parentChain.length
          && parentChain.every((id, index) => candidate.executionAddress.taskTeamRunIds[index] === id))?.executionAddress ?? null
        : createTeamExecutionAddress({ rootTeamRunId: input.rootTeamRunId, memberAddress: execution.executionAddress.memberAddress });
    rows.push(Object.freeze({
      ...execution,
      displayName: topology?.displayName ?? memberAddressBasename(execution.executionAddress.memberAddress),
      depth: depthByAddress.get(execution.executionAddress.memberAddress) ?? 0,
      hasChildren: execution.kind === 'task_team'
        && transient.some((candidate) => candidate !== execution
          && taskPrefixContains(execution.executionAddress, candidate.executionAddress)),
      parentExecutionAddress: parentAddress ? createTeamExecutionAddress(parentAddress) : null,
    }));
  }
  return Object.freeze(rows);
};
