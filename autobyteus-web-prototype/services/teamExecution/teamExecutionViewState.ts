import { reactive, ref, shallowReactive, shallowRef, type Ref } from 'vue';
import {
  teamExecutionViewSnapshotPayloadSchema,
  type TaskDelegationRecordDto,
  type TeamCommunicationMessageDto,
  type TeamRunExecutionTreeDto,
  type TeamStreamServerMessage,
} from '@autobyteus/team-stream-contracts';
import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import { insertTaskExecution, settleTaskExecution } from './teamExecutionTreeMutations';
import {
  buildTaskHistoryRows,
  collectExecutionAgents,
  collectLiveExecutionAgents,
  projectNavigationRows,
} from './teamExecutionTreeSelectors';
import type {
  TeamAgentContextEntry,
  TeamAgentStreamMessage,
  TeamExecutionApplyResult,
  TeamExecutionEffect,
  TeamExecutionNavigationRow,
  TeamTaskHistoryRow,
} from './teamExecutionViewModels';

type MutationResult = Readonly<{ disposition: 'applied' | 'unchanged' }>
  | Readonly<{ disposition: 'rejected'; code: string; message: string }>;

export interface TeamExecutionViewState {
  getRootTeamRunId(): string;
  getTeamDefinitionName(): string;
  getExecutionTree(): TeamRunExecutionTreeDto;
  getConfigurationView(): Readonly<TeamRunConfig>;
  getChangeSequence(): number;
  needsStreamRecovery(): boolean;
  isRootTeamActive(): boolean;
  setRootTeamActive(active: boolean): MutationResult;
  getFocusedAgentRunId(): string;
  getFocusedMemberAddress(): AgentTeamAddress;
  getFocusedAgentContext(): AgentContext | null;
  getAgentContext(agentRunId: string): AgentContext | null;
  getMemberAddress(agentRunId: string): AgentTeamAddress | null;
  hasAgentRun(agentRunId: string): boolean;
  focusAgent(agentRunId: string): MutationResult;
  listAgentContextEntries(): readonly TeamAgentContextEntry[];
  listNavigationRows(): readonly TeamExecutionNavigationRow[];
  listTaskHistoryRows(): readonly TeamTaskHistoryRow[];
  listCommunicationMessages(): readonly TeamCommunicationMessageDto[];
  applySnapshot(message: Extract<TeamStreamServerMessage, { type: 'TEAM_EXECUTION_VIEW_SNAPSHOT' }>): TeamExecutionApplyResult;
  applyMessage(message: Exclude<TeamStreamServerMessage,
    { type: 'CONNECTED' | 'TEAM_RUN_LIFECYCLE' | 'TEAM_EXECUTION_VIEW_SNAPSHOT' | 'AGENT_COMMAND_ACK' }>): TeamExecutionApplyResult;
}

export interface CreateTeamExecutionViewStateInput {
  rootTeamRunId: string;
  rootActive: boolean;
  baseChangeSequence?: number;
  executionTree: TeamRunExecutionTreeDto;
  tasks?: readonly TaskDelegationRecordDto[];
  messages?: readonly TeamCommunicationMessageDto[];
  configuration: Readonly<TeamRunConfig>;
  initialFocusedAgentRunId: string;
  agentContexts: readonly TeamAgentContextEntry[];
  createAgentContext: (agentRunId: string, address: AgentTeamAddress, tree: TeamRunExecutionTreeDto) => AgentContext | null;
}

const requiredId = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};

const sequenceOf = (message: Exclude<TeamStreamServerMessage,
  { type: 'CONNECTED' | 'TEAM_RUN_LIFECYCLE' | 'TEAM_EXECUTION_VIEW_SNAPSHOT' | 'AGENT_COMMAND_ACK' }>): number | null => {
  const payload = message.payload;
  return 'change_sequence' in payload && typeof payload.change_sequence === 'number'
    ? payload.change_sequence
    : null;
};

const targetAgentRunId = (message: Exclude<TeamStreamServerMessage,
  { type: 'CONNECTED' | 'TEAM_RUN_LIFECYCLE' | 'TEAM_EXECUTION_VIEW_SNAPSHOT' | 'AGENT_COMMAND_ACK' | 'TASK_DELEGATION_EVENT' | 'TEAM_COMMUNICATION_MESSAGE' }>): string | null => {
  if (message.type === 'MEMBER_INPUT_MESSAGE') return message.payload.recipient_agent_run_id;
  if (message.type === 'ERROR') return message.payload.agent_run_id;
  return message.payload.agent_run_id;
};

export const createTeamExecutionViewState = (
  input: CreateTeamExecutionViewStateInput,
): TeamExecutionViewState => {
  const rootTeamRunId = requiredId(input.rootTeamRunId, 'rootTeamRunId');
  if (input.executionTree.root_team.team_run_id !== rootTeamRunId) {
    throw new Error('Team execution tree root identity mismatch.');
  }
  const tree = shallowRef(structuredClone(input.executionTree)) as Ref<TeamRunExecutionTreeDto>;
  const tasks = shallowRef(structuredClone(input.tasks ?? [])) as Ref<TaskDelegationRecordDto[]>;
  const messages = shallowRef(structuredClone(input.messages ?? [])) as Ref<TeamCommunicationMessageDto[]>;
  const changeSequence = ref(input.baseChangeSequence ?? 0);
  const streamRecoveryRequired = ref(false);
  const rootActive = ref(input.rootActive);
  const focusedAgentRunId = ref(requiredId(input.initialFocusedAgentRunId, 'initialFocusedAgentRunId'));
  const contexts = shallowReactive(new Map<string, AgentContext>());
  const addresses = shallowReactive(new Map<string, AgentTeamAddress>());

  const validateAssociation = (entry: TeamAgentContextEntry): void => {
    const id = requiredId(entry.agentRunId, 'agentRunId');
    if (entry.agentContext.state.runId !== id) throw new Error(`Agent context '${id}' has a mismatched run ID.`);
    if (!entry.agentContext.state || typeof entry.agentContext.state !== 'object') throw new Error(`Agent context '${id}' has no state.`);
  };
  const associate = (entry: TeamAgentContextEntry): void => {
    validateAssociation(entry);
    const id = requiredId(entry.agentRunId, 'agentRunId');
    if (contexts.has(id)) throw new Error(`Duplicate AgentRun context '${id}'.`);
    entry.agentContext.state = reactive(entry.agentContext.state);
    const associatedContext = reactive(entry.agentContext);
    contexts.set(id, associatedContext);
    addresses.set(id, entry.memberAddress);
  };
  input.agentContexts.forEach(associate);

  const planContextAssociations = (nextTree: TeamRunExecutionTreeDto): readonly TeamAgentContextEntry[] => {
    const agents = collectExecutionAgents(nextTree);
    const seen = new Set<string>();
    const planned: TeamAgentContextEntry[] = [];
    for (const agent of agents) {
      if (seen.has(agent.agentRunId)) throw new Error(`Duplicate AgentRun '${agent.agentRunId}' in execution tree.`);
      seen.add(agent.agentRunId);
      const existingAddress = addresses.get(agent.agentRunId);
      if (existingAddress && existingAddress !== agent.address) {
        throw new Error(`AgentRun '${agent.agentRunId}' changed logical placement.`);
      }
      if (!contexts.has(agent.agentRunId)) {
        const context = input.createAgentContext(agent.agentRunId, agent.address, nextTree);
        if (!context || context.state.runId !== agent.agentRunId) {
          throw new Error(`No exact Agent context could be created for '${agent.agentRunId}'.`);
        }
        const entry = Object.freeze({
          agentRunId: agent.agentRunId,
          memberAddress: agent.address,
          agentContext: context,
        });
        validateAssociation(entry);
        planned.push(entry);
      }
    }
    return Object.freeze(planned);
  };
  const commitContextAssociations = (planned: readonly TeamAgentContextEntry[]): void => {
    for (const entry of planned) associate(entry);
  };
  commitContextAssociations(planContextAssociations(tree.value));
  if (!contexts.has(focusedAgentRunId.value)) throw new Error('Initial focused AgentRun is missing.');

  const repairFocus = (): void => {
    const liveRows = projectNavigationRows({ tree: tree.value, tasks: tasks.value, contexts });
    if (liveRows.some((row) => row.agentRunId === focusedAgentRunId.value)) return;
    const coordinatorAddress = tree.value.root_team.coordinator_address;
    const fallback = liveRows.find((row) => row.agentRunId && row.address === coordinatorAddress)
      ?? liveRows.find((row) => row.agentRunId);
    if (fallback?.agentRunId) focusedAgentRunId.value = fallback.agentRunId;
  };

  const rejectGap = (received: number): TeamExecutionApplyResult => {
    if (streamRecoveryRequired.value) {
      return Object.freeze({
        disposition: 'rejected', code: 'TEAM_EXECUTION_STREAM_RECOVERY_REQUIRED',
        message: 'The Team execution stream is waiting for explicit recovery.',
        effects: Object.freeze([]),
      });
    }
    streamRecoveryRequired.value = true;
    return Object.freeze({
      disposition: 'rejected', code: 'TEAM_EXECUTION_CHANGE_SEQUENCE_GAP',
      message: `Expected change sequence ${changeSequence.value + 1}, received ${received}.`,
      effects: Object.freeze([{ kind: 'team_stream_recovery_required' as const }]),
    });
  };

  const applySnapshot = (
    message: Extract<TeamStreamServerMessage, { type: 'TEAM_EXECUTION_VIEW_SNAPSHOT' }>,
  ): TeamExecutionApplyResult => {
    try {
      const payload = teamExecutionViewSnapshotPayloadSchema.parse(message.payload);
      if (payload.root_team_run_id !== rootTeamRunId
        || payload.execution_tree.root_team.team_run_id !== rootTeamRunId) {
        return Object.freeze({ disposition: 'rejected', code: 'TEAM_EXECUTION_ROOT_MISMATCH', message: 'Snapshot belongs to another root TeamRun.', effects: Object.freeze([]) });
      }
      const planned = planContextAssociations(payload.execution_tree);
      const plannedContexts = new Map(planned.map((entry) => [entry.agentRunId, entry.agentContext]));
      const plannedAddresses = new Map(planned.map((entry) => [entry.agentRunId, entry.memberAddress]));
      const statusIds = new Set<string>();
      const validatedStatuses: Array<{ context: AgentContext; status: AgentStatus }> = [];
      for (const status of payload.agent_statuses) {
        const memberAddress = addresses.get(status.agent_run_id) ?? plannedAddresses.get(status.agent_run_id);
        if (statusIds.has(status.agent_run_id) || memberAddress !== status.member_address) {
          throw new Error(`Invalid Agent status identity '${status.agent_run_id}'.`);
        }
        const context = contexts.get(status.agent_run_id) ?? plannedContexts.get(status.agent_run_id);
        if (!context) throw new Error(`Agent status target '${status.agent_run_id}' is missing.`);
        statusIds.add(status.agent_run_id);
        validatedStatuses.push({ context, status: status.status as AgentStatus });
      }
      const expected = collectLiveExecutionAgents(payload.execution_tree).map((agent) => agent.agentRunId);
      if (expected.some((agentRunId) => !statusIds.has(agentRunId))) {
        throw new Error('Snapshot omitted a canonical Agent status.');
      }
      if ([...statusIds].some((agentRunId) => !expected.includes(agentRunId))) {
        throw new Error('Snapshot contains a non-live Agent status.');
      }
      commitContextAssociations(planned);
      validatedStatuses.forEach(({ context, status }) => { context.state.currentStatus = status; });
      tree.value = structuredClone(payload.execution_tree);
      tasks.value = structuredClone(payload.tasks);
      messages.value = structuredClone(payload.messages);
      changeSequence.value = payload.base_change_sequence;
      streamRecoveryRequired.value = false;
      repairFocus();
      return Object.freeze({ disposition: 'applied', effects: Object.freeze([]) });
    } catch (error) {
      return Object.freeze({ disposition: 'rejected', code: 'TEAM_EXECUTION_SNAPSHOT_INVALID', message: String(error), effects: Object.freeze([]) });
    }
  };

  const applyMessage = (message: Exclude<TeamStreamServerMessage,
    { type: 'CONNECTED' | 'TEAM_RUN_LIFECYCLE' | 'TEAM_EXECUTION_VIEW_SNAPSHOT' | 'AGENT_COMMAND_ACK' }>): TeamExecutionApplyResult => {
    if (streamRecoveryRequired.value) {
      return Object.freeze({
        disposition: 'rejected', code: 'TEAM_EXECUTION_STREAM_RECOVERY_REQUIRED',
        message: 'The Team execution stream is waiting for explicit recovery.',
        effects: Object.freeze([]),
      });
    }
    const sequence = sequenceOf(message);
    if (sequence !== null && sequence !== changeSequence.value + 1) return rejectGap(sequence);
    const effects: TeamExecutionEffect[] = [];
    try {
      if (message.type === 'TASK_DELEGATION_EVENT') {
        const index = tasks.value.findIndex((task) => task.task_id === message.payload.task.task_id);
        const nextTasks = [...tasks.value];
        if (index < 0) nextTasks.push(structuredClone(message.payload.task));
        else nextTasks.splice(index, 1, structuredClone(message.payload.task));
        let nextTree = tree.value;
        let planned: readonly TeamAgentContextEntry[] = Object.freeze([]);
        if (message.payload.event_type === 'TASK_AGENT_ACTIVATED'
          || message.payload.event_type === 'TASK_TEAM_ACTIVATED') {
          nextTree = insertTaskExecution({
            tree: tree.value,
            parentTeamRunId: message.payload.parent_team_run_id,
            execution: message.payload.execution,
          });
          planned = planContextAssociations(nextTree);
        } else if (message.payload.event_type === 'TASK_EXECUTION_SETTLED') {
          nextTree = settleTaskExecution({
            tree: tree.value,
            execution: message.payload.execution,
            settledAt: message.payload.settled_at,
          });
        }
        commitContextAssociations(planned);
        tree.value = nextTree;
        tasks.value = nextTasks;
        repairFocus();
      } else if (message.type === 'TEAM_COMMUNICATION_MESSAGE') {
        if (messages.value.some((entry) => entry.message_id === message.payload.message.message_id)) {
          return Object.freeze({ disposition: 'rejected', code: 'TEAM_COMMUNICATION_DUPLICATE_MESSAGE', message: `Duplicate Team message '${message.payload.message.message_id}'.`, effects: Object.freeze([]) });
        }
        messages.value = [...messages.value, structuredClone(message.payload.message)];
      } else {
        const agentRunId = targetAgentRunId(message);
        if (agentRunId === null) {
          if (message.type !== 'ERROR') throw new Error(`Message '${message.type}' has no AgentRun target.`);
        } else if (!contexts.has(agentRunId)) {
          throw new Error(`Message '${message.type}' targets unknown AgentRun '${agentRunId}'.`);
        } else if (message.type === 'TOKEN_USAGE_UPDATED') {
          effects.push({ kind: 'record_team_token_usage', agentRunId, details: message.payload });
          effects.push({ kind: 'dispatch_agent', agentRunId, message: message as TeamAgentStreamMessage });
        } else {
          effects.push({ kind: 'dispatch_agent', agentRunId, message: message as TeamAgentStreamMessage });
        }
      }
      if (sequence !== null) changeSequence.value = sequence;
      return Object.freeze({ disposition: 'applied', effects: Object.freeze(effects) });
    } catch (error) {
      return Object.freeze({ disposition: 'rejected', code: 'TEAM_EXECUTION_EVENT_INVALID', message: String(error), effects: Object.freeze([]) });
    }
  };

  return {
    getRootTeamRunId: () => rootTeamRunId,
    getTeamDefinitionName: () => tree.value.root_team.team_definition_name,
    getExecutionTree: () => tree.value,
    getConfigurationView: () => input.configuration,
    getChangeSequence: () => changeSequence.value,
    needsStreamRecovery: () => streamRecoveryRequired.value,
    isRootTeamActive: () => rootActive.value,
    setRootTeamActive: (active) => {
      if (rootActive.value === active) return { disposition: 'unchanged' };
      rootActive.value = active;
      return { disposition: 'applied' };
    },
    getFocusedAgentRunId: () => focusedAgentRunId.value,
    getFocusedMemberAddress: () => addresses.get(focusedAgentRunId.value)!,
    getFocusedAgentContext: () => contexts.get(focusedAgentRunId.value) ?? null,
    getAgentContext: (agentRunId) => contexts.get(agentRunId.trim()) ?? null,
    getMemberAddress: (agentRunId) => addresses.get(agentRunId.trim()) ?? null,
    hasAgentRun: (agentRunId) => contexts.has(agentRunId.trim()),
    focusAgent: (agentRunId) => {
      const id = agentRunId.trim();
      if (!contexts.has(id)) return { disposition: 'rejected', code: 'TEAM_AGENT_RUN_NOT_FOUND', message: `AgentRun '${id}' is not part of this Team execution.` };
      if (!projectNavigationRows({ tree: tree.value, tasks: tasks.value, contexts }).some((row) => row.agentRunId === id)) {
        return { disposition: 'rejected', code: 'TEAM_AGENT_RUN_NOT_VISIBLE', message: `AgentRun '${id}' is not live.` };
      }
      if (focusedAgentRunId.value === id) return { disposition: 'unchanged' };
      focusedAgentRunId.value = id;
      return { disposition: 'applied' };
    },
    listAgentContextEntries: () => Object.freeze([...contexts].map(([agentRunId, agentContext]) => Object.freeze({
      agentRunId, memberAddress: addresses.get(agentRunId)!, agentContext,
    }))),
    listNavigationRows: () => projectNavigationRows({ tree: tree.value, tasks: tasks.value, contexts }),
    listTaskHistoryRows: () => buildTaskHistoryRows(tasks.value),
    listCommunicationMessages: () => Object.freeze([...messages.value]),
    applySnapshot,
    applyMessage,
  };
};
