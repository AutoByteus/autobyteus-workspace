import type {
  AgentTeamContext,
  AgentTeamMemberNode,
  SubTeamMemberNode,
  TeamMemberNode,
} from '~/types/agent/AgentTeamContext';
import {
  createTeamExecutionAddress,
  sameTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';

const stableAddress = (team: AgentTeamContext, memberAddress: string): TeamExecutionAddress =>
  createTeamExecutionAddress({ rootTeamRunId: team.teamRunId, memberAddress });

export const executionAddressForTeamNode = (
  team: AgentTeamContext,
  node: TeamMemberNode,
): TeamExecutionAddress => node.executionAddress ?? stableAddress(team, node.address);

interface TeamExecutionNodeLocation {
  node: TeamMemberNode;
  siblings: TeamMemberNode[];
  index: number;
}

const findLocation = (
  team: AgentTeamContext,
  address: TeamExecutionAddress,
  nodes: TeamMemberNode[] = team.rootTeam.children,
): TeamExecutionNodeLocation | null => {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!;
    if (sameTeamExecutionAddress(executionAddressForTeamNode(team, node), address)) {
      return { node, siblings: nodes, index };
    }
    if (node.kind === 'agent_team') {
      const nested = findLocation(team, address, node.children);
      if (nested) return nested;
    }
  }
  return null;
};

export const findTeamExecutionNode = (
  team: AgentTeamContext,
  address: TeamExecutionAddress,
): TeamMemberNode | null => findLocation(team, address)?.node ?? null;

const withoutProjectionFields = <T extends TeamMemberNode>(node: T): T => {
  const copy = { ...node };
  delete copy.executionAddress;
  delete copy.taskId;
  delete copy.taskExecutionStatus;
  delete copy.taskTimeline;
  delete copy.taskLabel;
  delete copy.taskDescription;
  delete copy.taskReferenceFiles;
  delete copy.taskArguments;
  delete copy.taskTargetKind;
  delete copy.taskTargetAddress;
  delete copy.taskSenderAddress;
  delete copy.isTaskExecution;
  return copy;
};

const cloneTaskTeamSubtree = (
  source: TeamMemberNode,
  rootTeamRunId: string,
  taskTeamRunIds: readonly string[],
  isRoot: boolean,
): TeamMemberNode => {
  const executionAddress = createTeamExecutionAddress({
    rootTeamRunId,
    taskTeamRunIds,
    memberAddress: source.address,
    taskAgentRunId: null,
  });
  const common = {
    ...withoutProjectionFields(source),
    executionAddress,
    isTaskExecution: true,
  };
  if (source.kind === 'agent') {
    return {
      ...common,
      kind: 'agent',
      agentDefinitionId: source.agentDefinitionId,
      agentRunId: '',
    } satisfies AgentTeamMemberNode;
  }
  return {
    ...common,
    kind: 'agent_team',
    teamDefinitionId: source.teamDefinitionId,
    teamRunId: isRoot ? taskTeamRunIds.at(-1)! : '',
    coordinatorAddress: source.coordinatorAddress,
    children: source.children.map((child) => cloneTaskTeamSubtree(child, rootTeamRunId, taskTeamRunIds, false)),
  } satisfies SubTeamMemberNode;
};

const sourceAddressForTaskExecution = (address: TeamExecutionAddress): TeamExecutionAddress =>
  createTeamExecutionAddress({
    rootTeamRunId: address.rootTeamRunId,
    taskTeamRunIds: address.taskTeamRunIds.slice(0, -1),
    memberAddress: address.memberAddress,
    taskAgentRunId: null,
  });

export const materializeTaskTeamProjectionRoot = (
  team: AgentTeamContext,
  address: TeamExecutionAddress,
): SubTeamMemberNode | null => {
  if (address.rootTeamRunId !== team.teamRunId || address.taskAgentRunId || address.taskTeamRunIds.length === 0) return null;
  const existing = findTeamExecutionNode(team, address);
  if (existing) return existing.kind === 'agent_team' && existing.isTaskExecution ? existing : null;
  const source = findLocation(team, sourceAddressForTaskExecution(address));
  if (!source || source.node.kind !== 'agent_team' || source.node.isTaskExecution && address.taskTeamRunIds.length === 1) return null;
  const projection = cloneTaskTeamSubtree(
    source.node,
    address.rootTeamRunId,
    address.taskTeamRunIds,
    true,
  ) as SubTeamMemberNode;
  source.siblings.splice(source.index + 1, 0, projection);
  return projection;
};

export const materializeTaskAgentProjectionNode = (
  team: AgentTeamContext,
  address: TeamExecutionAddress,
): AgentTeamMemberNode | null => {
  if (address.rootTeamRunId !== team.teamRunId || !address.taskAgentRunId) return null;
  const existing = findTeamExecutionNode(team, address);
  if (existing) return existing.kind === 'agent' && existing.isTaskExecution ? existing : null;
  const sourceAddress = createTeamExecutionAddress({ ...address, taskAgentRunId: null });
  const source = findLocation(team, sourceAddress);
  if (!source || source.node.kind !== 'agent') return null;
  const base = withoutProjectionFields(source.node);
  const projection: AgentTeamMemberNode = {
    ...base,
    kind: 'agent',
    agentDefinitionId: source.node.agentDefinitionId,
    agentRunId: address.taskAgentRunId,
    executionAddress: createTeamExecutionAddress(address),
    isTaskExecution: true,
  };
  source.siblings.splice(source.index + 1, 0, projection);
  return projection;
};

const addressIsInsideProjection = (candidate: TeamExecutionAddress, root: TeamExecutionAddress): boolean =>
  candidate.rootTeamRunId === root.rootTeamRunId
  && candidate.taskTeamRunIds.length >= root.taskTeamRunIds.length
  && root.taskTeamRunIds.every((id, index) => candidate.taskTeamRunIds[index] === id)
  && (root.taskAgentRunId === null || candidate.taskAgentRunId === root.taskAgentRunId);

export const removeTaskExecutionProjection = (
  team: AgentTeamContext,
  address: TeamExecutionAddress,
): void => {
  const location = findLocation(team, address);
  if (location?.node.isTaskExecution) location.siblings.splice(location.index, 1);
  const next = new Map(team.agentExecutionsByKey);
  for (const key of next.keys()) {
    try {
      if (addressIsInsideProjection(JSON.parse(key) as TeamExecutionAddress, address)) next.delete(key);
    } catch { /* only exact serialized execution-address keys participate */ }
  }
  team.agentExecutionsByKey = next;
  if (addressIsInsideProjection(team.focusedExecutionAddress, address)) {
    const stable = team.memberNodesByAddress.has(team.focusedExecutionAddress.memberAddress)
      ? stableAddress(team, team.focusedExecutionAddress.memberAddress)
      : stableAddress(team, team.rootTeam.coordinatorAddress);
    team.focusedExecutionAddress = stable;
  }
};

export const nodeExecutionKey = (team: AgentTeamContext, node: TeamMemberNode): string =>
  serializeTeamExecutionAddress(executionAddressForTeamNode(team, node));
