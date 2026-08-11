import { isReactive, reactive, ref, shallowReactive } from 'vue';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  createTeamExecutionAddress,
  fromTeamExecutionAddressDto,
  sameTeamExecutionAddress,
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
import {
  cloneExecutionAddress,
  executionAddressKey,
  logicalMemberBelongsToTeam,
  sameTaskTeamChain,
  taskExecutionContains,
  type PersistentAgentExecution,
  type TeamConcreteExecution,
} from './teamConcreteExecution';
import { materializeTeamTaskExecution } from './teamTaskExecutionMaterializer';
import {
  assertTeamTaskProjectionIntegrity,
  equivalentTeamTaskProjection,
} from './teamTaskProjectionInvariant';
import { reconcileTeamTaskSnapshot } from './teamTaskSnapshotReconciler';

type TeamExecutionMutationResult =
  | Readonly<{ disposition: 'applied' | 'unchanged' }>
  | Readonly<{ disposition: 'rejected'; code: string; message: string }>;

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

const cloneAddress = cloneExecutionAddress;
const keyOf = executionAddressKey;
const taskPrefixContains = taskExecutionContains;
const memberBelongsToTeam = logicalMemberBelongsToTeam;
const sameChain = sameTaskTeamChain;

const deriveTaskLabel = (task: TeamTaskProjection): string => {
  const summary = task.content.trim().replace(/\s+/g, ' ');
  return summary.length > 56 ? `${summary.slice(0, 53)}…` : summary || task.taskId;
};

const referenceType = (value: string): TeamTaskProjection['referenceFiles'][number]['type'] => {
  if (value === 'file' || value === 'image' || value === 'audio' || value === 'video'
    || value === 'pdf' || value === 'csv' || value === 'excel' || value === 'other') return value;
  throw new Error(`Unsupported Team task reference type '${value}'.`);
};

export const createTeamExecutionState = (input: CreateTeamExecutionStateInput): TeamExecutionState => {
  if (!input.rootTeamRunId.trim()) throw new Error('A real root TeamRun ID is required.');
  if (input.initialFocusedAddress.rootTeamRunId !== input.rootTeamRunId) throw new Error('Initial focus belongs to another TeamRun.');
  const executions = shallowReactive(new Map<string, TeamConcreteExecution>());
  const executionParents = shallowReactive(new Map<string, string | null>());
  const tasks = shallowReactive(new Map<string, TeamTaskProjection>());
  const focusedAddress = ref(cloneAddress(input.initialFocusedAddress));
  const rootActive = ref(input.rootActive);
  const associateAgentContext = (context: AgentContext): AgentContext => {
    if (!isReactive(context.state)) context.state = reactive(context.state) as AgentRunState;
    return context;
  };
  const contextsByMember = new Map(input.persistentAgentContexts.map((entry) => [
    entry.executionAddress.memberAddress,
    associateAgentContext(entry.agentContext),
  ] as const));

  const addPersistent = (member: TeamRunMetadataMember, parentKey: string | null = null): void => {
    const address = createTeamExecutionAddress({ rootTeamRunId: input.rootTeamRunId, memberAddress: member.address });
    const executionKey = keyOf(address);
    if (member.kind === 'agent_team') {
      executions.set(executionKey, Object.freeze({
        kind: 'persistent_team', executionAddress: address,
        childTeamRunId: member.address === '/' ? null : member.teamRunId,
      }));
      executionParents.set(executionKey, parentKey);
      member.children.forEach((child) => addPersistent(child, executionKey));
      return;
    }
    const agentContext = contextsByMember.get(member.address);
    if (!agentContext || agentContext.state.runId !== member.agentRunId) {
      throw new Error(`Persistent Agent seed mismatch at '${member.address}'.`);
    }
    executions.set(executionKey, Object.freeze({
      kind: 'persistent_agent', executionAddress: address,
      platformAgentRunId: member.platformAgentRunId ?? null,
      applicationExecutionContext: parseApplicationExecutionContext(member.applicationExecutionContext, address),
      agentContext,
    }));
    executionParents.set(executionKey, parentKey);
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
    return associateAgentContext(new AgentContext(
      { ...source.agentContext.config, isLocked: true },
      new AgentRunState(runId, conversation),
    ));
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

  const reconcileTaskSnapshot = (snapshot: TeamTaskProjectionSnapshot): TeamExecutionMutationResult => {
    const result = reconcileTeamTaskSnapshot({
      snapshot,
      rootTeamRunId: input.rootTeamRunId,
      topology: input.topology,
      currentExecutions: executions,
      currentParents: executionParents,
      currentTasks: tasks,
      sourceAgentExecution,
      buildTaskAgentContext,
    });
    if (result.disposition === 'rejected') {
      return { disposition: 'rejected', code: 'TEAM_EXECUTION_IDENTITY_MISMATCH', message: result.message };
    }
    if (result.disposition === 'unchanged') return result;
    executions.clear();
    result.executions.forEach((execution, key) => executions.set(key, execution));
    executionParents.clear();
    result.parents.forEach((parent, key) => executionParents.set(key, parent));
    tasks.clear();
    result.tasks.forEach((task, id) => tasks.set(id, task));
    result.removedRoots.forEach(repairFocusAfterRemoval);
    return { disposition: 'applied' };
  };

  const listNavigationRows = (): readonly TeamExecutionNavigationRow[] =>
    projectTeamExecutionNavigationRows({
      rootTeamRunId: input.rootTeamRunId,
      topology: input.topology,
      executions: [...executions.values()].map(summaryOf),
    });

  const attachCorrelatedTaskTeamAgent = (
    executionAddress: TeamExecutionAddress,
    agentRunId: string,
  ): Readonly<{ context: AgentContext; created: boolean }> | null => {
    if (executionAddress.rootTeamRunId !== input.rootTeamRunId
      || executionAddress.taskTeamRunIds.length === 0
      || executionAddress.taskAgentRunId
      || !agentRunId.trim()) return null;
    const containingTeams = [...executions.values()].filter((execution) => execution.kind === 'task_team'
      && execution.executionAddress.taskTeamRunIds.length === executionAddress.taskTeamRunIds.length
      && executionAddress.taskTeamRunIds.every((id, index) => execution.executionAddress.taskTeamRunIds[index] === id));
    const containingTeam = containingTeams.length === 1 ? containingTeams[0] : null;
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
    executionParents.set(key, keyOf(containingTeam.executionAddress));
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
        return equivalentTeamTaskProjection(existing, task)
          ? { disposition: 'unchanged', effects: [] }
          : { disposition: 'rejected', code: 'TEAM_EXECUTION_IDENTITY_MISMATCH', message: `Task '${payload.task_id}' activation conflicts with current state.`, effects: [] };
      }
      const candidateExecutions = new Map(executions);
      const candidateParents = new Map(executionParents);
      assertTeamTaskProjectionIntegrity({ task, rootTeamRunId: input.rootTeamRunId, topology: input.topology });
      materializeTeamTaskExecution({
          rootTeamRunId: input.rootTeamRunId,
          topology: input.topology,
          executions: candidateExecutions,
          parents: candidateParents,
          task,
          sourceAgentExecution,
          buildTaskAgentContext,
        });
      executions.clear();
      candidateExecutions.forEach((execution, key) => executions.set(key, execution));
      executionParents.clear();
      candidateParents.forEach((parent, key) => executionParents.set(key, parent));
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
        const materialized = attachCorrelatedTaskTeamAgent(executionAddress, binding.agent_run_id);
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
    applyExecutionMessage,
  };
  return Object.freeze(state);
};
