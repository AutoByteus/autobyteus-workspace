import type { ApplicationExecutionContext } from '@autobyteus/application-sdk-contracts';
import type { AgentContext } from '~/types/agent/AgentContext';
import {
  createTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';

export interface PersistentTeamExecution {
  readonly kind: 'persistent_team';
  readonly executionAddress: TeamExecutionAddress;
  readonly childTeamRunId: string | null;
}
export interface AgentExecutionBase {
  readonly executionAddress: TeamExecutionAddress;
  readonly platformAgentRunId: string | null;
  readonly applicationExecutionContext: ApplicationExecutionContext | null;
  readonly agentContext: AgentContext;
}
export interface PersistentAgentExecution extends AgentExecutionBase { readonly kind: 'persistent_agent' }
export interface TaskAgentExecution extends AgentExecutionBase { readonly kind: 'task_agent'; readonly taskId: string }
export interface TaskTeamExecution { readonly kind: 'task_team'; readonly executionAddress: TeamExecutionAddress; readonly taskId: string }
export interface TaskTeamAgentExecution extends AgentExecutionBase { readonly kind: 'task_team_agent' }
export type TeamConcreteExecution =
  | PersistentTeamExecution
  | PersistentAgentExecution
  | TaskAgentExecution
  | TaskTeamExecution
  | TaskTeamAgentExecution;

export const cloneExecutionAddress = (address: TeamExecutionAddress): TeamExecutionAddress =>
  createTeamExecutionAddress(address);
export const executionAddressKey = (address: TeamExecutionAddress): string =>
  serializeTeamExecutionAddress(address);
export const sameTaskTeamChain = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index]);
export const logicalMemberBelongsToTeam = (memberAddress: string, teamAddress: string): boolean =>
  teamAddress === '/' ? memberAddress !== '/' : memberAddress.startsWith(`${teamAddress}/`);
export const taskExecutionContains = (root: TeamExecutionAddress, candidate: TeamExecutionAddress): boolean =>
  root.rootTeamRunId === candidate.rootTeamRunId
  && candidate.taskTeamRunIds.length >= root.taskTeamRunIds.length
  && root.taskTeamRunIds.every((id, index) => candidate.taskTeamRunIds[index] === id)
  && (!root.taskAgentRunId || root.taskAgentRunId === candidate.taskAgentRunId);

export const removeConcreteExecutionSubtree = (input: {
  executions: Map<string, TeamConcreteExecution>;
  parents: Map<string, string | null>;
  rootAddress: TeamExecutionAddress;
}): boolean => {
  const rootKey = executionAddressKey(input.rootAddress);
  const belongsToSubtree = (candidateKey: string): boolean => {
    let current: string | null | undefined = candidateKey;
    const visited = new Set<string>();
    while (current && !visited.has(current)) {
      if (current === rootKey) return true;
      visited.add(current);
      current = input.parents.get(current);
    }
    return false;
  };
  const keys = [...input.executions.entries()].filter(([candidateKey, execution]) =>
    execution.kind !== 'persistent_agent' && execution.kind !== 'persistent_team'
    && belongsToSubtree(candidateKey)).map(([candidateKey]) => candidateKey);
  keys.forEach((candidateKey) => {
    input.executions.delete(candidateKey);
    input.parents.delete(candidateKey);
  });
  return keys.length > 0;
};
