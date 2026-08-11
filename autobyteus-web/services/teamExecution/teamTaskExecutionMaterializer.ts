import type { AgentContext } from '~/types/agent/AgentContext';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { rebindApplicationExecutionContext } from './applicationExecutionContextMapper';
import {
  executionAddressKey,
  logicalMemberBelongsToTeam,
  sameTaskTeamChain,
  type PersistentAgentExecution,
  type TeamConcreteExecution,
} from './teamConcreteExecution';
import type { TeamTaskProjection } from './teamExecutionModels';
import type { TeamTopologySnapshot } from './teamTopologySnapshot';

export const materializeTeamTaskExecution = (input: {
  rootTeamRunId: string;
  topology: TeamTopologySnapshot;
  executions: Map<string, TeamConcreteExecution>;
  parents: Map<string, string | null>;
  task: TeamTaskProjection;
  sourceAgentExecution: (address: TeamTaskProjection['executionAddress']) => PersistentAgentExecution | null;
  buildTaskAgentContext: (address: TeamTaskProjection['executionAddress'], runId: string) => AgentContext | null;
}): boolean => {
  const address = input.task.executionAddress;
  const key = executionAddressKey(address);
  const existing = input.executions.get(key);
  if (address.taskAgentRunId) {
    if (existing) {
      if (existing.kind !== 'task_agent' || existing.taskId !== input.task.taskId) {
        throw new Error(`Task Agent '${input.task.taskId}' collides with another concrete execution.`);
      }
      return false;
    }
    const sourceAddress = createTeamExecutionAddress({
      rootTeamRunId: input.rootTeamRunId,
      taskTeamRunIds: address.taskTeamRunIds,
      memberAddress: address.memberAddress,
      taskAgentRunId: null,
    });
    const parent = input.executions.get(executionAddressKey(sourceAddress));
    if (!parent || (address.taskTeamRunIds.length === 0
      ? parent.kind !== 'persistent_agent'
      : parent.kind !== 'task_team_agent')) {
      throw new Error(`Task Agent '${input.task.taskId}' has no exact source execution parent.`);
    }
    const agentContext = input.buildTaskAgentContext(address, address.taskAgentRunId);
    const source = input.sourceAgentExecution(address);
    if (!agentContext || !source) throw new Error(`Task Agent '${input.task.taskId}' cannot be materialized.`);
    input.executions.set(key, Object.freeze({
      kind: 'task_agent', executionAddress: createTeamExecutionAddress(address), taskId: input.task.taskId,
      platformAgentRunId: null,
      applicationExecutionContext: rebindApplicationExecutionContext(source.applicationExecutionContext, address),
      agentContext,
    }));
    input.parents.set(key, executionAddressKey(parent.executionAddress));
    return true;
  }

  if (address.taskTeamRunIds.length === 0) throw new Error(`Task '${input.task.taskId}' has no concrete task identity.`);
  const topologyNode = input.topology.getNode(address.memberAddress);
  if (!topologyNode || topologyNode.kind !== 'agent_team') {
    throw new Error(`Task Team '${input.task.taskId}' has no matching topology.`);
  }
  if (existing) {
    if (existing.kind !== 'task_team' || existing.taskId !== input.task.taskId) {
      throw new Error(`Task AgentTeam '${input.task.taskId}' collides with another concrete execution.`);
    }
    return false;
  }
  const sameRunChain = [...input.executions.values()].find((execution) => execution.kind === 'task_team'
    && sameTaskTeamChain(execution.executionAddress.taskTeamRunIds, address.taskTeamRunIds));
  if (sameRunChain) {
    throw new Error(`Task AgentTeam '${input.task.taskId}' reuses another concrete task Team run chain.`);
  }
  const parent = address.taskTeamRunIds.length === 1
    ? input.executions.get(executionAddressKey(createTeamExecutionAddress({
        rootTeamRunId: input.rootTeamRunId,
        memberAddress: address.memberAddress,
      })))
    : [...input.executions.values()].find((execution) => execution.kind === 'task_team'
        && sameTaskTeamChain(execution.executionAddress.taskTeamRunIds, address.taskTeamRunIds.slice(0, -1)));
  if (!parent || (address.taskTeamRunIds.length === 1
    ? parent.kind !== 'persistent_team'
    : parent.kind !== 'task_team' || !logicalMemberBelongsToTeam(address.memberAddress, parent.executionAddress.memberAddress))) {
    throw new Error(`Task AgentTeam '${input.task.taskId}' has no exact containing execution parent.`);
  }
  input.executions.set(key, Object.freeze({
    kind: 'task_team', executionAddress: createTeamExecutionAddress(address), taskId: input.task.taskId,
  }));
  input.parents.set(key, executionAddressKey(parent.executionAddress));
  return true;
};
