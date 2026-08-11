import { ref, shallowReactive } from 'vue';
import type { ApplicationExecutionContext } from '@autobyteus/application-sdk-contracts';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  createTeamExecutionAddress,
  fromTeamExecutionAddressDto,
  sameTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import type { TeamRunMetadataMember, TeamRunMetadataPayload } from '~/stores/runHistoryTypes';
import type {
  TeamAgentContextEntry,
  TeamExecutionApplyResult,
  TeamExecutionNavigationRow,
  TeamExecutionProjectionMessage,
  TeamExecutionSummary,
  TeamTaskHistoryRow,
  TeamTaskProjection,
  TeamTaskProjectionSnapshot,
} from './teamExecutionModels';
import type { TeamTopologySnapshot } from './teamTopologySnapshot';
import { parseApplicationExecutionContext, rebindApplicationExecutionContext } from './applicationExecutionContextMapper';
import { projectTeamExecutionNavigationRows } from './teamExecutionNavigationProjector';

type TeamExecutionMutationResult =
  | Readonly<{ disposition: 'applied' | 'unchanged' }>
  | Readonly<{ disposition: 'rejected'; code: string; message: string }>;

interface PersistentTeamExecution {
  readonly kind: 'persistent_team';
  readonly executionAddress: TeamExecutionAddress;
  readonly childTeamRunId: string | null;
}
interface AgentExecutionBase {
  readonly executionAddress: TeamExecutionAddress;
  readonly platformAgentRunId: string | null;
  readonly applicationExecutionContext: ApplicationExecutionContext | null;
  readonly agentContext: AgentContext;
}
interface PersistentAgentExecution extends AgentExecutionBase { readonly kind: 'persistent_agent' }
interface TaskAgentExecution extends AgentExecutionBase { readonly kind: 'task_agent'; readonly taskId: string }
interface TaskTeamExecution { readonly kind: 'task_team'; readonly executionAddress: TeamExecutionAddress; readonly taskId: string }
interface TaskTeamAgentExecution extends AgentExecutionBase { readonly kind: 'task_team_agent' }
type TeamConcreteExecution = PersistentTeamExecution | PersistentAgentExecution | TaskAgentExecution | TaskTeamExecution | TaskTeamAgentExecution;

export interface TeamExecutionState {
  getRootTeamRunId(): string;
  isRootTeamActive(): boolean;
  setRootTeamActive(active: boolean): TeamExecutionMutationResult;
  getAgentContext(address: TeamExecutionAddress): AgentContext | null;
  getAgentContextByRunId(agentRunId: string): AgentContext | null;
  hasExecution(address: TeamExecutionAddress): boolean;
  getFocusedAddress(): TeamExecutionAddress;
  getFocusedAgentContext(): AgentContext | null;
  getExecutionSummary(address: TeamExecutionAddress): TeamExecutionSummary | null;
  listAgentContextEntries(): readonly TeamAgentContextEntry[];
  listNavigationRows(): readonly TeamExecutionNavigationRow[];
  listTaskHistoryRows(): readonly TeamTaskHistoryRow[];
  focus(address: TeamExecutionAddress): TeamExecutionMutationResult;
  reconcileTaskSnapshot(snapshot: TeamTaskProjectionSnapshot): TeamExecutionMutationResult;
  ensureTaskTeamAgent(input: Readonly<{ executionAddress: TeamExecutionAddress; agentRunId: string }>): AgentContext | null;
  removeExecutionSubtree(address: TeamExecutionAddress): TeamExecutionMutationResult;
  applyExecutionMessage(message: TeamExecutionProjectionMessage): TeamExecutionApplyResult;
}

interface CreateTeamExecutionStateInput {
  rootTeamRunId: string;
  rootActive: boolean;
  initialFocusedAddress: TeamExecutionAddress;
  topology: TeamTopologySnapshot;
  metadata: TeamRunMetadataPayload;
  persistentAgentContexts: readonly TeamAgentContextEntry[];
}

const cloneAddress = (address: TeamExecutionAddress): TeamExecutionAddress => createTeamExecutionAddress(address);
const keyOf = (address: TeamExecutionAddress): string => serializeTeamExecutionAddress(address);
const taskPrefixContains = (root: TeamExecutionAddress, candidate: TeamExecutionAddress): boolean =>
  root.rootTeamRunId === candidate.rootTeamRunId
  && candidate.taskTeamRunIds.length >= root.taskTeamRunIds.length
  && root.taskTeamRunIds.every((id, index) => candidate.taskTeamRunIds[index] === id)
  && (!root.taskAgentRunId || root.taskAgentRunId === candidate.taskAgentRunId);

const memberBelongsToTeam = (memberAddress: string, teamAddress: string): boolean =>
  teamAddress === '/'
    ? memberAddress !== '/'
    : memberAddress.startsWith(`${teamAddress}/`);

const deriveTaskLabel = (task: TeamTaskProjection): string => {
  const summary = task.content.trim().replace(/\s+/g, ' ');
  return summary.length > 56 ? `${summary.slice(0, 53)}…` : summary || task.taskId;
};

const equivalentTask = (left: TeamTaskProjection, right: TeamTaskProjection): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const cloneTaskProjection = (task: TeamTaskProjection): TeamTaskProjection => Object.freeze({
  ...task,
  executionAddress: cloneAddress(task.executionAddress),
  senderAddress: cloneAddress(task.senderAddress),
  referenceFiles: Object.freeze(task.referenceFiles.map((reference) => Object.freeze({ ...reference }))),
  updates: Object.freeze(task.updates.map((update) => Object.freeze({
    ...update,
    senderAddress: cloneAddress(update.senderAddress),
    receiverAddress: cloneAddress(update.receiverAddress),
    referenceFiles: Object.freeze(update.referenceFiles.map((reference) => Object.freeze({ ...reference }))),
  }))),
});

const referenceType = (value: string): TeamTaskProjection['referenceFiles'][number]['type'] => {
  if (value === 'file' || value === 'image' || value === 'audio' || value === 'video'
    || value === 'pdf' || value === 'csv' || value === 'excel' || value === 'other') return value;
  throw new Error(`Unsupported Team task reference type '${value}'.`);
};

export const createTeamExecutionState = (input: CreateTeamExecutionStateInput): TeamExecutionState => {
  if (!input.rootTeamRunId.trim()) throw new Error('A real root TeamRun ID is required.');
  if (input.initialFocusedAddress.rootTeamRunId !== input.rootTeamRunId) throw new Error('Initial focus belongs to another TeamRun.');
  const executions = shallowReactive(new Map<string, TeamConcreteExecution>());
  const tasks = shallowReactive(new Map<string, TeamTaskProjection>());
  const focusedAddress = ref(cloneAddress(input.initialFocusedAddress));
  const rootActive = ref(input.rootActive);
  const contextsByMember = new Map(input.persistentAgentContexts.map((entry) => [entry.executionAddress.memberAddress, entry.agentContext] as const));

  const addPersistent = (member: TeamRunMetadataMember): void => {
    const address = createTeamExecutionAddress({ rootTeamRunId: input.rootTeamRunId, memberAddress: member.address });
    if (member.kind === 'agent_team') {
      executions.set(keyOf(address), Object.freeze({
        kind: 'persistent_team', executionAddress: address,
        childTeamRunId: member.address === '/' ? null : member.teamRunId,
      }));
      member.children.forEach(addPersistent);
      return;
    }
    const agentContext = contextsByMember.get(member.address);
    if (!agentContext || agentContext.state.runId !== member.agentRunId) {
      throw new Error(`Persistent Agent seed mismatch at '${member.address}'.`);
    }
    executions.set(keyOf(address), Object.freeze({
      kind: 'persistent_agent', executionAddress: address,
      platformAgentRunId: member.platformAgentRunId ?? null,
      applicationExecutionContext: parseApplicationExecutionContext(member.applicationExecutionContext, address),
      agentContext,
    }));
  };
  addPersistent(input.metadata.rootTeam);
  if (contextsByMember.size !== input.persistentAgentContexts.length) throw new Error('Duplicate persistent Agent seed address.');
  const initialExecution = executions.get(keyOf(input.initialFocusedAddress));
  if (initialExecution?.kind !== 'persistent_agent' || input.topology.getNode(input.initialFocusedAddress.memberAddress)?.kind !== 'agent') {
    throw new Error('Initial focused Agent execution is missing.');
  }

  const summaryOf = (execution: TeamConcreteExecution): TeamExecutionSummary => {
    const taskId = execution.kind === 'task_agent' || execution.kind === 'task_team' ? execution.taskId : null;
    const agentContext = execution.kind === 'persistent_agent' || execution.kind === 'task_agent' || execution.kind === 'task_team_agent'
      ? execution.agentContext : null;
    return Object.freeze({
      kind: execution.kind,
      executionAddress: cloneAddress(execution.executionAddress),
      focusable: Boolean(agentContext),
      taskId,
      currentStatus: agentContext?.state.currentStatus ?? null,
      isActive: execution.kind === 'persistent_team' && execution.executionAddress.memberAddress === '/' ? rootActive.value : null,
    });
  };

  const sourceAgentExecution = (address: TeamExecutionAddress): PersistentAgentExecution | null => {
    const stable = createTeamExecutionAddress({ rootTeamRunId: input.rootTeamRunId, memberAddress: address.memberAddress });
    const record = executions.get(keyOf(stable));
    return record?.kind === 'persistent_agent' ? record : null;
  };

  const buildTaskAgentContext = (address: TeamExecutionAddress, runId: string): AgentContext | null => {
    const source = sourceAgentExecution(address);
    if (!source || !runId.trim()) return null;
    const now = new Date().toISOString();
    const conversation = {
      id: runId, messages: [], createdAt: now, updatedAt: now,
      agentDefinitionId: source.agentContext.config.agentDefinitionId,
      agentName: source.agentContext.config.agentDefinitionName,
      llmModelIdentifier: source.agentContext.config.llmModelIdentifier,
    };
    return new AgentContext(
      { ...source.agentContext.config, isLocked: true },
      new AgentRunState(runId, conversation),
    );
  };

  const removeSubtreeFrom = (
    source: Map<string, TeamConcreteExecution>,
    address: TeamExecutionAddress,
  ): boolean => {
    const keys = [...source.entries()]
      .filter(([, execution]) => execution.kind !== 'persistent_agent' && execution.kind !== 'persistent_team'
        && taskPrefixContains(address, execution.executionAddress))
      .map(([key]) => key);
    keys.forEach((key) => source.delete(key));
    return keys.length > 0;
  };

  const repairFocusAfterRemoval = (address: TeamExecutionAddress): void => {
    if (taskPrefixContains(address, focusedAddress.value)) {
      const stable = createTeamExecutionAddress({ rootTeamRunId: input.rootTeamRunId, memberAddress: focusedAddress.value.memberAddress });
      const fallback = executions.get(keyOf(stable))?.kind === 'persistent_agent'
        ? stable
        : createTeamExecutionAddress({ rootTeamRunId: input.rootTeamRunId, memberAddress: input.topology.rootTeam.coordinatorAddress });
      focusedAddress.value = fallback;
    }
  };

  const materializeTaskInto = (
    targetExecutions: Map<string, TeamConcreteExecution>,
    task: TeamTaskProjection,
  ): boolean => {
    const address = task.executionAddress;
    const key = keyOf(address);
    const existing = targetExecutions.get(key);
    if (address.taskAgentRunId) {
      if (existing) {
        if (existing.kind !== 'task_agent' || existing.taskId !== task.taskId) {
          throw new Error(`Task Agent '${task.taskId}' collides with another concrete execution.`);
        }
        return false;
      }
      const agentContext = buildTaskAgentContext(address, address.taskAgentRunId);
      if (!agentContext) throw new Error(`Task Agent '${task.taskId}' cannot be materialized.`);
      const source = sourceAgentExecution(address)!;
      targetExecutions.set(key, Object.freeze({
        kind: 'task_agent', executionAddress: cloneAddress(address), taskId: task.taskId,
        platformAgentRunId: null,
        applicationExecutionContext: rebindApplicationExecutionContext(source.applicationExecutionContext, address),
        agentContext,
      }));
      return true;
    }
    if (address.taskTeamRunIds.length === 0) throw new Error(`Task '${task.taskId}' has no concrete task identity.`);
    const topologyNode = input.topology.getNode(address.memberAddress);
    if (!topologyNode || topologyNode.kind !== 'agent_team') throw new Error(`Task Team '${task.taskId}' has no matching topology.`);
    if (existing) {
      if (existing.kind !== 'task_team' || existing.taskId !== task.taskId) {
        throw new Error(`Task AgentTeam '${task.taskId}' collides with another concrete execution.`);
      }
      return false;
    }
    targetExecutions.set(key, Object.freeze({ kind: 'task_team', executionAddress: cloneAddress(address), taskId: task.taskId }));
    return true;
  };

  const reconcileTaskSnapshot = (snapshot: TeamTaskProjectionSnapshot): TeamExecutionMutationResult => {
    if (snapshot.kind !== 'complete_root_task_snapshot') return { disposition: 'rejected', code: 'TEAM_EXECUTION_TRANSITION_INVALID', message: 'Complete root task snapshot required.' };
    const candidate = new Map(tasks);
    const candidateExecutions = new Map(executions);
    const ids = new Set<string>();
    const addresses = new Set<string>();
    try {
      for (const task of snapshot.tasks) {
        if (task.executionAddress.rootTeamRunId !== input.rootTeamRunId || ids.has(task.taskId) || addresses.has(keyOf(task.executionAddress))) {
          throw new Error(`Task snapshot identity is invalid for '${task.taskId}'.`);
        }
        ids.add(task.taskId); addresses.add(keyOf(task.executionAddress));
        const previous = candidate.get(task.taskId);
        if (previous) {
          if (!sameTeamExecutionAddress(previous.executionAddress, task.executionAddress)
            || previous.createdAt !== task.createdAt || previous.startedAt !== task.startedAt) {
            throw new Error(`Task '${task.taskId}' changed immutable identity.`);
          }
          if (task.updatedAt < previous.updatedAt) continue;
          if (task.updatedAt === previous.updatedAt && !equivalentTask(previous, task)) throw new Error(`Task '${task.taskId}' conflicts at the same update time.`);
        }
        candidate.set(task.taskId, cloneTaskProjection(task));
      }
      for (const task of candidate.values()) materializeTaskInto(candidateExecutions, task);
      let cleaned = false;
      for (const task of snapshot.tasks) {
        if (task.status !== 'accepted') continue;
        const descendants = [...candidateExecutions.values()].filter((execution) =>
          execution.kind !== 'persistent_agent' && execution.kind !== 'persistent_team'
          && taskPrefixContains(task.executionAddress, execution.executionAddress));
        const unsafe = descendants.some((execution) => {
          if (execution.kind !== 'task_agent' && execution.kind !== 'task_team') return false;
          const child = candidate.get(execution.taskId);
          return !child || child.status !== 'accepted';
        });
        if (unsafe) throw new Error(`Terminal task '${task.taskId}' has a nonterminal materialized descendant.`);
        cleaned = removeSubtreeFrom(candidateExecutions, task.executionAddress) || cleaned;
      }
      executions.clear();
      candidateExecutions.forEach((execution, key) => executions.set(key, execution));
      tasks.clear();
      candidate.forEach((task, id) => tasks.set(id, task));
      for (const task of snapshot.tasks) {
        if (task.status === 'accepted') repairFocusAfterRemoval(task.executionAddress);
      }
      return { disposition: snapshot.tasks.length || cleaned ? 'applied' : 'unchanged' };
    } catch (error) {
      return { disposition: 'rejected', code: 'TEAM_EXECUTION_IDENTITY_MISMATCH', message: error instanceof Error ? error.message : String(error) };
    }
  };

  const listNavigationRows = (): readonly TeamExecutionNavigationRow[] =>
    projectTeamExecutionNavigationRows({
      rootTeamRunId: input.rootTeamRunId,
      topology: input.topology,
      executions: [...executions.values()].map(summaryOf),
    });

  const ensureTaskTeamAgentContext = (
    executionAddress: TeamExecutionAddress,
    agentRunId: string,
  ): Readonly<{ context: AgentContext; created: boolean }> | null => {
    if (executionAddress.rootTeamRunId !== input.rootTeamRunId
      || executionAddress.taskTeamRunIds.length === 0
      || executionAddress.taskAgentRunId
      || !agentRunId.trim()) return null;
    const containingTeam = [...executions.values()].find((execution) => execution.kind === 'task_team'
      && execution.executionAddress.taskTeamRunIds.length === executionAddress.taskTeamRunIds.length
      && executionAddress.taskTeamRunIds.every((id, index) => execution.executionAddress.taskTeamRunIds[index] === id));
    const topologyNode = input.topology.getNode(executionAddress.memberAddress);
    if (!containingTeam || !topologyNode || topologyNode.kind !== 'agent'
      || !memberBelongsToTeam(executionAddress.memberAddress, containingTeam.executionAddress.memberAddress)) return null;
    const key = keyOf(executionAddress);
    const existing = executions.get(key);
    if (existing) {
      return existing.kind === 'task_team_agent' && existing.agentContext.state.runId === agentRunId
        ? { context: existing.agentContext, created: false }
        : null;
    }
    const context = buildTaskAgentContext(executionAddress, agentRunId);
    const source = sourceAgentExecution(executionAddress);
    if (!context || !source) return null;
    executions.set(key, Object.freeze({
      kind: 'task_team_agent', executionAddress: cloneAddress(executionAddress), platformAgentRunId: null,
      applicationExecutionContext: rebindApplicationExecutionContext(source.applicationExecutionContext, executionAddress), agentContext: context,
    }));
    return { context, created: true };
  };

  const applyTaskActivation = (
    message: Extract<TeamExecutionProjectionMessage, { type: 'TASK_DELEGATION_EVENT' }>,
  ): TeamExecutionApplyResult => {
    const payload = message.payload;
    const executionAddress = fromTeamExecutionAddressDto(payload.execution_address);
    if (executionAddress.rootTeamRunId !== input.rootTeamRunId) {
      return { disposition: 'rejected', code: 'TEAM_EXECUTION_IDENTITY_MISMATCH', message: 'Task event belongs to another TeamRun.', effects: [] };
    }
    const existing = tasks.get(payload.task_id);
    if (existing && !sameTeamExecutionAddress(existing.executionAddress, executionAddress)) {
      return { disposition: 'rejected', code: 'TEAM_EXECUTION_IDENTITY_MISMATCH', message: 'Task event changed its execution identity.', effects: [] };
    }
    if (payload.event_type !== 'TASK_DELEGATION_ACTIVATED') {
      return { disposition: 'unchanged', effects: [{ kind: 'refresh_task_records' }] };
    }
    try {
      const task: TeamTaskProjection = Object.freeze({
        taskId: payload.task_id,
        executionAddress,
        status: 'active',
        senderAddress: fromTeamExecutionAddressDto(payload.sender_address),
        content: payload.content,
        referenceFiles: Object.freeze(payload.reference_files.map((reference) => Object.freeze({
          referenceId: reference.reference_id,
          path: reference.path,
          type: referenceType(reference.type),
          createdAt: reference.created_at,
          updatedAt: reference.updated_at,
        }))),
        createdAt: payload.created_at,
        startedAt: payload.started_at,
        updatedAt: payload.started_at,
        updates: Object.freeze([]),
      });
      if (task.senderAddress.rootTeamRunId !== input.rootTeamRunId) {
        throw new Error('Task sender belongs to another TeamRun.');
      }
      const sender = executions.get(keyOf(task.senderAddress));
      if (!sender || sender.kind === 'persistent_team' || sender.kind === 'task_team') {
        throw new Error('Task sender is not an exact materialized Agent execution.');
      }
      if (existing) {
        return equivalentTask(existing, task)
          ? { disposition: 'unchanged', effects: [] }
          : { disposition: 'rejected', code: 'TEAM_EXECUTION_IDENTITY_MISMATCH', message: `Task '${payload.task_id}' activation conflicts with current state.`, effects: [] };
      }
      const candidateExecutions = new Map(executions);
      materializeTaskInto(candidateExecutions, task);
      executions.clear();
      candidateExecutions.forEach((execution, key) => executions.set(key, execution));
      tasks.set(task.taskId, task);
      return { disposition: 'applied', effects: [] };
    } catch (error) {
      return {
        disposition: 'rejected',
        code: 'TEAM_EXECUTION_IDENTITY_MISMATCH',
        message: error instanceof Error ? error.message : String(error),
        effects: [],
      };
    }
  };

  const applyExecutionMessage = (message: TeamExecutionProjectionMessage): TeamExecutionApplyResult => {
    if (message.type === 'TASK_DELEGATION_EVENT') return applyTaskActivation(message);

    const payload = message.payload;
    const executionAddress = 'agent_execution' in payload && payload.agent_execution
      ? fromTeamExecutionAddressDto(payload.agent_execution.execution_address)
      : 'execution_address' in payload
        ? fromTeamExecutionAddressDto(payload.execution_address)
        : null;
    if (!executionAddress || executionAddress.rootTeamRunId !== input.rootTeamRunId) {
      return { disposition: 'rejected', code: 'TEAM_EXECUTION_IDENTITY_MISMATCH', message: 'Team message has no exact local execution identity.', effects: [] };
    }

    let context: AgentContext | null = null;
    let created = false;
    if ('agent_execution' in payload && payload.agent_execution) {
      const binding = payload.agent_execution;
      if (binding.kind === 'task_team_agent') {
        const materialized = ensureTaskTeamAgentContext(executionAddress, binding.agent_run_id);
        context = materialized?.context ?? null;
        created = materialized?.created ?? false;
      } else {
        const execution = executions.get(keyOf(executionAddress));
        const expectedKind = binding.kind === 'persistent_agent' ? 'persistent_agent' : 'task_agent';
        if (execution?.kind === expectedKind) context = execution.agentContext;
        if (binding.kind === 'task_agent' && context?.state.runId !== executionAddress.taskAgentRunId) context = null;
      }
    } else {
      const execution = executions.get(keyOf(executionAddress));
      context = execution?.kind === 'persistent_agent' || execution?.kind === 'task_agent' || execution?.kind === 'task_team_agent'
        ? execution.agentContext
        : null;
    }
    if (!context) {
      return { disposition: 'rejected', code: 'TEAM_EXECUTION_NOT_FOUND', message: 'Exact Team Agent execution was not found.', effects: [] };
    }

    if (message.type === 'TOKEN_USAGE_UPDATED') {
      const { agent_execution: ignored, ...details } = message.payload;
      void ignored;
      return {
        disposition: created ? 'applied' : 'unchanged',
        effects: [{ kind: 'record_team_token_usage', executionAddress, details }],
      };
    }
    return {
      disposition: created ? 'applied' : 'unchanged',
      effects: [{ kind: 'dispatch_agent', executionAddress, message }],
    };
  };

  const state: TeamExecutionState = {
    getRootTeamRunId: () => input.rootTeamRunId,
    isRootTeamActive: () => rootActive.value,
    setRootTeamActive: (active: boolean) => {
      if (rootActive.value === active) return { disposition: 'unchanged' };
      rootActive.value = active; return { disposition: 'applied' };
    },
    getAgentContext: (address: TeamExecutionAddress) => {
      const execution = executions.get(keyOf(address));
      return execution?.kind === 'persistent_agent' || execution?.kind === 'task_agent' || execution?.kind === 'task_team_agent'
        ? execution.agentContext : null;
    },
    getAgentContextByRunId: (agentRunId: string) => {
      const normalized = agentRunId.trim();
      if (!normalized) return null;
      const execution = [...executions.values()].find((candidate) =>
        (candidate.kind === 'persistent_agent' || candidate.kind === 'task_agent' || candidate.kind === 'task_team_agent')
        && candidate.agentContext.state.runId === normalized,
      );
      return execution?.kind === 'persistent_agent' || execution?.kind === 'task_agent' || execution?.kind === 'task_team_agent'
        ? execution.agentContext
        : null;
    },
    hasExecution: (address: TeamExecutionAddress) => executions.has(keyOf(address)),
    getFocusedAddress: () => cloneAddress(focusedAddress.value),
    getFocusedAgentContext: () => {
      const execution = executions.get(keyOf(focusedAddress.value));
      return execution?.kind === 'persistent_agent' || execution?.kind === 'task_agent' || execution?.kind === 'task_team_agent'
        ? execution.agentContext : null;
    },
    getExecutionSummary: (address: TeamExecutionAddress) => {
      const execution = executions.get(keyOf(address)); return execution ? summaryOf(execution) : null;
    },
    listAgentContextEntries: () => Object.freeze([...executions.values()].flatMap((execution) =>
      execution.kind === 'persistent_agent' || execution.kind === 'task_agent' || execution.kind === 'task_team_agent'
        ? [Object.freeze({ executionAddress: cloneAddress(execution.executionAddress), agentContext: execution.agentContext })]
        : [])),
    listNavigationRows,
    listTaskHistoryRows: () => Object.freeze([...tasks.values()]
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.taskId.localeCompare(right.taskId))
      .map((task) => Object.freeze({ ...task, label: deriveTaskLabel(task) }))),
    focus: (address: TeamExecutionAddress) => {
      const execution = executions.get(keyOf(address));
      if (!execution) return { disposition: 'rejected', code: 'TEAM_EXECUTION_NOT_FOUND', message: 'Team execution was not found.' };
      if (execution.kind === 'persistent_team' || execution.kind === 'task_team') return { disposition: 'rejected', code: 'TEAM_EXECUTION_NOT_FOCUSABLE', message: 'AgentTeam groups are not focusable.' };
      if (sameTeamExecutionAddress(focusedAddress.value, address)) return { disposition: 'unchanged' };
      focusedAddress.value = cloneAddress(address); return { disposition: 'applied' };
    },
    reconcileTaskSnapshot,
    ensureTaskTeamAgent: ({ executionAddress, agentRunId }: Readonly<{ executionAddress: TeamExecutionAddress; agentRunId: string }>) => {
      return ensureTaskTeamAgentContext(executionAddress, agentRunId)?.context ?? null;
    },
    removeExecutionSubtree: (address: TeamExecutionAddress) => {
      const removed = removeSubtreeFrom(executions, address);
      if (removed) repairFocusAfterRemoval(address);
      return { disposition: removed ? 'applied' : 'unchanged' };
    },
    applyExecutionMessage,
  };
  return Object.freeze(state);
};
