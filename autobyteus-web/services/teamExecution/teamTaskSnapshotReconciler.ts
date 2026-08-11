import type { AgentContext } from '~/types/agent/AgentContext';
import type { TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import {
  executionAddressKey,
  removeConcreteExecutionSubtree,
  type PersistentAgentExecution,
  type TeamConcreteExecution,
} from './teamConcreteExecution';
import type { TeamTaskProjection, TeamTaskProjectionSnapshot } from './teamExecutionModels';
import {
  canDeferTaskAgentUntilExactTaskTeamAgentBinding,
  materializeTeamTaskExecution,
} from './teamTaskExecutionMaterializer';
import {
  assertTeamTaskProjectionIntegrity,
  cloneTeamTaskProjection,
  equivalentTeamTaskProjection,
  sameImmutableTeamTaskBase,
  taskUpdatesExtendExactly,
} from './teamTaskProjectionInvariant';
import type { TeamTopologySnapshot } from './teamTopologySnapshot';

export type TeamTaskSnapshotReconciliation =
  | Readonly<{ disposition: 'unchanged' }>
  | Readonly<{ disposition: 'rejected'; message: string }>
  | Readonly<{
      disposition: 'applied';
      executions: ReadonlyMap<string, TeamConcreteExecution>;
      parents: ReadonlyMap<string, string | null>;
      tasks: ReadonlyMap<string, TeamTaskProjection>;
      removedRoots: readonly TeamExecutionAddress[];
    }>;

const isDescendant = (parents: ReadonlyMap<string, string | null>, candidateKey: string, rootKey: string): boolean => {
  let current: string | null | undefined = candidateKey;
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    if (current === rootKey) return true;
    visited.add(current);
    current = parents.get(current);
  }
  return false;
};

const taskProjectionBelongsToTaskTeam = (candidate: TeamTaskProjection, root: TeamTaskProjection): boolean =>
  candidate.taskId !== root.taskId
  && root.executionAddress.taskAgentRunId === null
  && root.executionAddress.taskTeamRunIds.length > 0
  && candidate.executionAddress.rootTeamRunId === root.executionAddress.rootTeamRunId
  && candidate.executionAddress.taskTeamRunIds.length >= root.executionAddress.taskTeamRunIds.length
  && root.executionAddress.taskTeamRunIds.every((id, index) => candidate.executionAddress.taskTeamRunIds[index] === id)
  && (root.executionAddress.memberAddress === '/'
    ? candidate.executionAddress.memberAddress !== '/'
    : candidate.executionAddress.memberAddress.startsWith(`${root.executionAddress.memberAddress}/`));

export const reconcileTeamTaskSnapshot = (input: {
  snapshot: TeamTaskProjectionSnapshot;
  rootTeamRunId: string;
  topology: TeamTopologySnapshot;
  currentExecutions: ReadonlyMap<string, TeamConcreteExecution>;
  currentParents: ReadonlyMap<string, string | null>;
  currentTasks: ReadonlyMap<string, TeamTaskProjection>;
  sourceAgentExecution: (address: TeamExecutionAddress) => PersistentAgentExecution | null;
  buildTaskAgentContext: (address: TeamExecutionAddress, runId: string) => AgentContext | null;
}): TeamTaskSnapshotReconciliation => {
  if (input.snapshot.kind !== 'complete_root_task_snapshot') {
    return { disposition: 'rejected', message: 'Complete root task snapshot required.' };
  }
  const candidateTasks = new Map(input.currentTasks);
  const candidateExecutions = new Map(input.currentExecutions);
  const candidateParents = new Map(input.currentParents);
  const currentResponseTasks = new Map<string, TeamTaskProjection>();
  const taskIds = new Set<string>();
  const executionKeys = new Set<string>();
  let changed = false;
  try {
    for (const task of input.snapshot.tasks) {
      assertTeamTaskProjectionIntegrity({ task, rootTeamRunId: input.rootTeamRunId, topology: input.topology });
      const executionKey = executionAddressKey(task.executionAddress);
      if (taskIds.has(task.taskId) || executionKeys.has(executionKey)) {
        throw new Error(`Task snapshot identity is invalid for '${task.taskId}'.`);
      }
      taskIds.add(task.taskId);
      executionKeys.add(executionKey);
      const previous = candidateTasks.get(task.taskId);
      if (previous) {
        if (!sameImmutableTeamTaskBase(previous, task)) throw new Error(`Task '${task.taskId}' changed immutable base facts.`);
        const nextUpdatedAt = Date.parse(task.updatedAt);
        const previousUpdatedAt = Date.parse(previous.updatedAt);
        if (nextUpdatedAt < previousUpdatedAt) continue;
        if (nextUpdatedAt === previousUpdatedAt) {
          if (!equivalentTeamTaskProjection(previous, task)) throw new Error(`Task '${task.taskId}' conflicts at the same update time.`);
          currentResponseTasks.set(task.taskId, previous);
          continue;
        }
        if (!taskUpdatesExtendExactly(previous, task)) throw new Error(`Task '${task.taskId}' rewrites its append-only update timeline.`);
      }
      const projected = cloneTeamTaskProjection(task);
      candidateTasks.set(task.taskId, projected);
      currentResponseTasks.set(task.taskId, projected);
      changed = true;
    }

    const taskByExecution = new Map<string, string>();
    const taskByTeamRunChain = new Map<string, string>();
    for (const task of candidateTasks.values()) {
      const executionKey = executionAddressKey(task.executionAddress);
      const owner = taskByExecution.get(executionKey);
      if (owner && owner !== task.taskId) throw new Error(`Tasks '${owner}' and '${task.taskId}' share one concrete execution.`);
      taskByExecution.set(executionKey, task.taskId);
      if (!task.executionAddress.taskAgentRunId && task.executionAddress.taskTeamRunIds.length > 0) {
        const chainKey = JSON.stringify(task.executionAddress.taskTeamRunIds);
        const chainOwner = taskByTeamRunChain.get(chainKey);
        if (chainOwner && chainOwner !== task.taskId) {
          throw new Error(`Tasks '${chainOwner}' and '${task.taskId}' share one task Team run chain.`);
        }
        taskByTeamRunChain.set(chainKey, task.taskId);
      }
    }

    const activeTasks = [...candidateTasks.values()].filter((task) => task.status !== 'accepted').sort((left, right) =>
      left.executionAddress.taskTeamRunIds.length - right.executionAddress.taskTeamRunIds.length
      || Number(Boolean(left.executionAddress.taskAgentRunId)) - Number(Boolean(right.executionAddress.taskAgentRunId))
      || left.createdAt.localeCompare(right.createdAt)
      || left.taskId.localeCompare(right.taskId));
    for (const task of activeTasks) {
      if (canDeferTaskAgentUntilExactTaskTeamAgentBinding({
        topology: input.topology,
        executions: candidateExecutions,
        task,
      })) continue;
      changed = materializeTeamTaskExecution({
        rootTeamRunId: input.rootTeamRunId,
        topology: input.topology,
        executions: candidateExecutions,
        parents: candidateParents,
        task,
        sourceAgentExecution: input.sourceAgentExecution,
        buildTaskAgentContext: input.buildTaskAgentContext,
      }) || changed;
    }

    const acceptedRoots = [...currentResponseTasks.values()].filter((task) => task.status === 'accepted');
    for (const task of acceptedRoots) {
      const rootKey = executionAddressKey(task.executionAddress);
      const descendants = [...candidateExecutions.entries()].filter(([candidateKey, execution]) =>
        execution.kind !== 'persistent_agent' && execution.kind !== 'persistent_team'
        && isDescendant(candidateParents, candidateKey, rootKey));
      for (const [, execution] of descendants) {
        if (execution.kind !== 'task_agent' && execution.kind !== 'task_team') continue;
        const sameResponseCandidate = currentResponseTasks.get(execution.taskId);
        if (!sameResponseCandidate || sameResponseCandidate.status !== 'accepted') {
          throw new Error(`Terminal task '${task.taskId}' has an absent, stale, or nonterminal descendant candidate.`);
        }
      }
      const nonterminalProjectedDescendant = [...candidateTasks.values()].find((candidate) =>
        candidate.status !== 'accepted' && taskProjectionBelongsToTaskTeam(candidate, task));
      if (nonterminalProjectedDescendant) {
        throw new Error(`Terminal task '${task.taskId}' has an absent, stale, or nonterminal descendant candidate.`);
      }
    }
    for (const task of acceptedRoots) {
      changed = removeConcreteExecutionSubtree({
        executions: candidateExecutions,
        parents: candidateParents,
        rootAddress: task.executionAddress,
      }) || changed;
    }

    return changed ? Object.freeze({
      disposition: 'applied' as const,
      executions: candidateExecutions,
      parents: candidateParents,
      tasks: candidateTasks,
      removedRoots: Object.freeze(acceptedRoots.map((task) => task.executionAddress)),
    }) : { disposition: 'unchanged' };
  } catch (error) {
    return { disposition: 'rejected', message: error instanceof Error ? error.message : String(error) };
  }
};
