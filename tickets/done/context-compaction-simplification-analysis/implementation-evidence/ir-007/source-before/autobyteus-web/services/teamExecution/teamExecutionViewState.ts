import { handleAgentInputState } from '~/services/agentStreaming/handlers/agentInputStateHandler';
import { reactive, ref, shallowRef } from 'vue';
import {
  teamExecutionViewSnapshotPayloadSchema,
  type TeamCommunicationMessageDto,
  type TeamRunExecutionTreeDto,
  type TeamStreamServerMessage,
} from '@autobyteus/team-stream-contracts';
import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { TeamRunConfigurationView } from '~/types/agent/TeamRunConfig';
import { parseAgentTeamAddress, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import { insertTaskExecution } from './teamExecutionTreeMutations';
import {
  collectAgentExecutionLocations,
  projectNavigationRows,
} from './teamExecutionTreeSelectors';
import type {
  TeamAgentContextEntry,
  TeamAgentExecutionLocation,
  TeamAgentStreamMessage,
  TeamExecutionApplyResult,
  TeamExecutionEffect,
  TeamExecutionNavigationRow,
} from './teamExecutionViewModels';

type MutationResult = Readonly<{ disposition: 'applied' | 'unchanged' }>
  | Readonly<{ disposition: 'rejected'; code: string; message: string }>;

export interface TeamExecutionViewState {
  getRootTeamRunId(): string;
  getTeamDefinitionName(): string;
  getExecutionTree(): TeamRunExecutionTreeDto;
  getConfigurationView(): Readonly<TeamRunConfigurationView>;
  getChangeSequence(): number;
  needsStreamRecovery(): boolean;
  isRootTeamActive(): boolean;
  setRootTeamActive(active: boolean): MutationResult;
  getFocusedAgentRunId(): string;
  getFocusedMemberAddress(): AgentTeamAddress;
  getFocusedAgentContext(): AgentContext | null;
  getFocusedAgentAccess(): 'live' | 'read_only';
  getFocusedNavigationRow(): TeamExecutionNavigationRow | null;
  getAgentContext(agentRunId: string): AgentContext | null;
  getAgentExecutionLocation(agentRunId: string): TeamAgentExecutionLocation | null;
  getMemberAddress(agentRunId: string): AgentTeamAddress | null;
  hasAgentRun(agentRunId: string): boolean;
  focusAgent(agentRunId: string): MutationResult;
  focusAgentForInspection(agentRunId: string): MutationResult;
  listAgentContextEntries(): readonly TeamAgentContextEntry[];
  listLiveAgentContextEntries(): readonly TeamAgentContextEntry[];
  listNavigationRows(): readonly TeamExecutionNavigationRow[];
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
  messages?: readonly TeamCommunicationMessageDto[];
  configuration: Readonly<TeamRunConfigurationView>;
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
  { type: 'CONNECTED' | 'TEAM_RUN_LIFECYCLE' | 'TEAM_EXECUTION_VIEW_SNAPSHOT' | 'AGENT_COMMAND_ACK' | 'TASK_EXECUTION_STARTED' | 'TEAM_COMMUNICATION_MESSAGE' }>): string | null => {
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
  // Associations and their canonical tree/task placement are one publication.
  // Mounted consumers (including the shared composer) can read synchronously;
  // never expose a Map insertion before the rest of its validated view.
  const publication = shallowRef({
    tree: structuredClone(input.executionTree),
    messages: structuredClone(input.messages ?? []),
    changeSequence: input.baseChangeSequence ?? 0,
    contexts: new Map<string, AgentContext>() as ReadonlyMap<string, AgentContext>,
    locations: new Map<string, TeamAgentExecutionLocation>() as ReadonlyMap<string, TeamAgentExecutionLocation>,
  });
  const streamRecoveryRequired = ref(false);
  const rootActive = ref(input.rootActive);
  const focusedAgentRunId = ref(requiredId(input.initialFocusedAgentRunId, 'initialFocusedAgentRunId'));

  const validateAssociation = (entry: TeamAgentContextEntry): void => {
    const id = requiredId(entry.agentRunId, 'agentRunId');
    if (!entry.agentContext.state || typeof entry.agentContext.state !== 'object') throw new Error(`Agent context '${id}' has no state.`);
    if (entry.agentContext.state.runId !== id) throw new Error(`Agent context '${id}' has a mismatched run ID.`);
  };
  const associate = (entry: TeamAgentContextEntry, candidate: Map<string, AgentContext>): void => {
    validateAssociation(entry);
    const id = requiredId(entry.agentRunId, 'agentRunId');
    if (candidate.has(id)) throw new Error(`Duplicate AgentRun context '${id}'.`);
    entry.agentContext.state = reactive(entry.agentContext.state);
    const associatedContext = reactive(entry.agentContext);
    candidate.set(id, associatedContext);
  };

  const collectValidatedLocations = (
    nextTree: TeamRunExecutionTreeDto,
  ): ReadonlyMap<string, TeamAgentExecutionLocation> => {
    const nextLocations = new Map<string, TeamAgentExecutionLocation>();
    for (const rawLocation of collectAgentExecutionLocations(nextTree)) {
      const location = Object.freeze({
        agentRunId: requiredId(rawLocation.agentRunId, 'agentRunId'),
        memberAddress: parseAgentTeamAddress(rawLocation.memberAddress),
        containingTeamRunId: requiredId(rawLocation.containingTeamRunId, 'containingTeamRunId'),
      });
      if (nextLocations.has(location.agentRunId)) {
        throw new Error(`Duplicate AgentRun '${location.agentRunId}' in execution tree.`);
      }
      const existing = publication.value.locations.get(location.agentRunId);
      if (existing && (existing.memberAddress !== location.memberAddress
        || existing.containingTeamRunId !== location.containingTeamRunId)) {
        throw new Error(`AgentRun '${location.agentRunId}' changed logical placement.`);
      }
      nextLocations.set(location.agentRunId, location);
    }
    return nextLocations;
  };

  const planContextAssociations = (
    nextTree: TeamRunExecutionTreeDto,
    nextLocations: ReadonlyMap<string, TeamAgentExecutionLocation>,
  ): readonly TeamAgentContextEntry[] => {
    const unplacedContext = [...publication.value.contexts.keys()].find((agentRunId) => !nextLocations.has(agentRunId));
    if (unplacedContext) {
      throw new Error(`Agent context '${unplacedContext}' has no execution-tree location.`);
    }
    const planned: TeamAgentContextEntry[] = [];
    for (const location of nextLocations.values()) {
      if (!publication.value.contexts.has(location.agentRunId)) {
        const context = input.createAgentContext(location.agentRunId, location.memberAddress, nextTree);
        if (!context || context.state.runId !== location.agentRunId) {
          throw new Error(`No exact Agent context could be created for '${location.agentRunId}'.`);
        }
        const entry = Object.freeze({
          agentRunId: location.agentRunId,
          memberAddress: location.memberAddress,
          agentContext: context,
        });
        validateAssociation(entry);
        planned.push(entry);
      }
    }
    return Object.freeze(planned);
  };
  const prepareContextAssociations = (planned: readonly TeamAgentContextEntry[]): ReadonlyMap<string, AgentContext> => {
    const candidate = new Map(publication.value.contexts);
    for (const entry of planned) associate(entry, candidate);
    return candidate;
  };

  const initialLocations = collectValidatedLocations(publication.value.tree);
  const initialContextIds = new Set<string>();
  for (const entry of input.agentContexts) {
    validateAssociation(entry);
    const id = requiredId(entry.agentRunId, 'agentRunId');
    if (initialContextIds.has(id)) throw new Error(`Duplicate AgentRun context '${id}'.`);
    const location = initialLocations.get(id);
    if (!location || location.memberAddress !== parseAgentTeamAddress(entry.memberAddress)) {
      throw new Error(`Agent context '${id}' has no exact execution-tree location.`);
    }
    initialContextIds.add(id);
  }
  publication.value = { ...publication.value, contexts: prepareContextAssociations(input.agentContexts) };
  publication.value = { ...publication.value, locations: initialLocations,
    contexts: prepareContextAssociations(planContextAssociations(publication.value.tree, initialLocations)) };
  if (!publication.value.contexts.has(focusedAgentRunId.value)) throw new Error('Initial focused AgentRun is missing.');

  // Every placement in the tree (including shut-down delegated children) is
  // navigable; a message to a shut-down child restores it.
  const navigationRows = (): readonly TeamExecutionNavigationRow[] => projectNavigationRows({
    tree: publication.value.tree,
    contexts: publication.value.contexts,
  });
  const focusAgent = (agentRunId: string): MutationResult => {
    const id = agentRunId.trim();
    if (!publication.value.contexts.has(id)) return { disposition: 'rejected', code: 'TEAM_AGENT_RUN_NOT_FOUND', message: `AgentRun '${id}' is not part of this Team execution.` };
    if (!navigationRows().some((row) => row.agentRunId === id)) {
      return { disposition: 'rejected', code: 'TEAM_AGENT_RUN_NOT_VISIBLE', message: `AgentRun '${id}' is not available for this selection.` };
    }
    if (focusedAgentRunId.value === id) return { disposition: 'unchanged' };
    focusedAgentRunId.value = id;
    return { disposition: 'applied' };
  };
  const repairFocus = (): void => {
    const rows = navigationRows();
    if (rows.some((row) => row.agentRunId === focusedAgentRunId.value)) return;
    const coordinatorAddress = publication.value.tree.root_team.coordinator_address;
    const fallback = rows.find((row) => row.agentRunId && row.address === coordinatorAddress)
      ?? rows.find((row) => row.agentRunId);
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
      message: `Expected change sequence ${publication.value.changeSequence + 1}, received ${received}.`,
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
      const nextLocations = collectValidatedLocations(payload.execution_tree);
      const planned = planContextAssociations(payload.execution_tree, nextLocations);
      const plannedContexts = new Map(planned.map((entry) => [entry.agentRunId, entry.agentContext]));
      const statusIds = new Set<string>();
      const validatedStatuses: Array<{ context: AgentContext; status: AgentStatus; recoverableBlock: import("@autobyteus/agent-presentation-contracts").CompactionRecoveryBlockDto | null }> = [];
      for (const status of payload.agent_statuses) {
        const location = nextLocations.get(status.agent_run_id);
        if (statusIds.has(status.agent_run_id) || location?.memberAddress !== status.member_address) {
          throw new Error(`Invalid Agent status identity '${status.agent_run_id}'.`);
        }
        const context = publication.value.contexts.get(status.agent_run_id) ?? plannedContexts.get(status.agent_run_id);
        if (!context) throw new Error(`Agent status target '${status.agent_run_id}' is missing.`);
        statusIds.add(status.agent_run_id);
        validatedStatuses.push({ context, status: status.status as AgentStatus, recoverableBlock: status.recoverableBlock });
      }
      // Every tree placement reports a status; shut-down children report offline.
      if ([...nextLocations.keys()].some((agentRunId) => !statusIds.has(agentRunId))) {
        throw new Error('Snapshot omitted a canonical Agent status.');
      }
      const inputIds = new Set<string>();
      for (const entry of payload.agent_input_states) {
        if (!nextLocations.has(entry.agent_run_id) || inputIds.has(entry.agent_run_id)) throw new Error('Invalid input-state target.');
        inputIds.add(entry.agent_run_id);
      }
      publication.value = {
        tree: structuredClone(payload.execution_tree), locations: nextLocations,
        messages: structuredClone(payload.messages),
        contexts: prepareContextAssociations(planned), changeSequence: payload.base_change_sequence,
      };
      validatedStatuses.forEach(({ context, status, recoverableBlock }) => {
        context.state.currentStatus = status; context.state.recoverableBlock = recoverableBlock;
        if (!inputIds.has(context.state.runId)) {
          context.state.inputProjection = null;
          for (const message of context.conversation.messages) if (message.type === 'user') delete message.pendingInput;
        }
      });
      for (const entry of payload.agent_input_states) handleAgentInputState(entry.state, publication.value.contexts.get(entry.agent_run_id)!);
      streamRecoveryRequired.value = false;
      repairFocus();
      return Object.freeze({
        disposition: 'applied',
        effects: Object.freeze([
          { kind: 'invalidate_team_member_projections' as const },
          { kind: 'reconcile_team_navigation' as const },
          { kind: 'reconcile_focused_team_member_projection' as const },
        ]),
      });
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
    if (sequence !== null && sequence !== publication.value.changeSequence + 1) return rejectGap(sequence);
    const effects: TeamExecutionEffect[] = [];
    try {
      if (message.type === 'TASK_EXECUTION_STARTED') {
        const nextTree = insertTaskExecution({
          tree: publication.value.tree,
          parentTeamRunId: message.payload.parent_team_run_id,
          execution: message.payload.execution,
        });
        const nextLocations = collectValidatedLocations(nextTree);
        const planned = planContextAssociations(nextTree, nextLocations);
        publication.value = { ...publication.value, tree: nextTree, locations: nextLocations,
          contexts: prepareContextAssociations(planned), changeSequence: sequence ?? publication.value.changeSequence };
        repairFocus();
        if (planned.length > 0) {
          effects.push({
            kind: 'invalidate_team_member_projection',
            agentRunIds: Object.freeze(planned.map((entry) => entry.agentRunId)),
          });
        }
        effects.push({ kind: 'reconcile_team_navigation' });
      } else if (message.type === 'TEAM_COMMUNICATION_MESSAGE') {
        if (publication.value.messages.some((entry) => entry.message_id === message.payload.message.message_id)) {
          return Object.freeze({ disposition: 'rejected', code: 'TEAM_COMMUNICATION_DUPLICATE_MESSAGE', message: `Duplicate Team message '${message.payload.message.message_id}'.`, effects: Object.freeze([]) });
        }
        publication.value = { ...publication.value,
          messages: [...publication.value.messages, structuredClone(message.payload.message)],
          changeSequence: sequence ?? publication.value.changeSequence };
      } else {
        const agentRunId = targetAgentRunId(message);
        if (agentRunId === null) {
          if (message.type !== 'ERROR') throw new Error(`Message '${message.type}' has no AgentRun target.`);
        } else if (!publication.value.contexts.has(agentRunId)) {
          throw new Error(`Message '${message.type}' targets unknown AgentRun '${agentRunId}'.`);
        } else if (message.type === 'TOKEN_USAGE_UPDATED') {
          effects.push({ kind: 'record_team_token_usage', agentRunId, details: message.payload });
          effects.push({ kind: 'dispatch_agent', agentRunId, message: message as TeamAgentStreamMessage });
        } else {
          effects.push({ kind: 'dispatch_agent', agentRunId, message: message as TeamAgentStreamMessage });
        }
      }
      if (sequence !== null && sequence !== publication.value.changeSequence) {
        publication.value = { ...publication.value, changeSequence: sequence };
      }
      return Object.freeze({ disposition: 'applied', effects: Object.freeze(effects) });
    } catch (error) {
      return Object.freeze({ disposition: 'rejected', code: 'TEAM_EXECUTION_EVENT_INVALID', message: String(error), effects: Object.freeze([]) });
    }
  };

  return {
    getRootTeamRunId: () => rootTeamRunId,
    getTeamDefinitionName: () => publication.value.tree.root_team.team_definition_name,
    getExecutionTree: () => publication.value.tree,
    getConfigurationView: () => input.configuration,
    getChangeSequence: () => publication.value.changeSequence,
    needsStreamRecovery: () => streamRecoveryRequired.value,
    isRootTeamActive: () => rootActive.value,
    setRootTeamActive: (active) => {
      if (rootActive.value === active) return { disposition: 'unchanged' };
      rootActive.value = active;
      if (active) repairFocus();
      return { disposition: 'applied' };
    },
    getFocusedAgentRunId: () => focusedAgentRunId.value,
    getFocusedMemberAddress: () => publication.value.locations.get(focusedAgentRunId.value)!.memberAddress,
    getFocusedAgentContext: () => publication.value.contexts.get(focusedAgentRunId.value) ?? null,
    // A shut-down child stays addressable: operator input wakes it.
    getFocusedAgentAccess: () => 'live',
    getFocusedNavigationRow: () => navigationRows().find(
      (row) => row.agentRunId === focusedAgentRunId.value,
    ) ?? null,
    getAgentContext: (agentRunId) => publication.value.contexts.get(agentRunId.trim()) ?? null,
    getAgentExecutionLocation: (agentRunId) => publication.value.locations.get(agentRunId.trim()) ?? null,
    getMemberAddress: (agentRunId) => publication.value.locations.get(agentRunId.trim())?.memberAddress ?? null,
    hasAgentRun: (agentRunId) => publication.value.contexts.has(agentRunId.trim()),
    focusAgent: (agentRunId) => focusAgent(agentRunId),
    focusAgentForInspection: (agentRunId) => focusAgent(agentRunId),
    listAgentContextEntries: () => Object.freeze([...publication.value.contexts].map(([agentRunId, agentContext]) => Object.freeze({
      agentRunId, memberAddress: publication.value.locations.get(agentRunId)!.memberAddress, agentContext,
    }))),
    // The stream snapshot reports a status for every tree placement.
    listLiveAgentContextEntries: () => Object.freeze(collectAgentExecutionLocations(publication.value.tree)
      .map(({ agentRunId, memberAddress }) => Object.freeze({
        agentRunId, memberAddress, agentContext: publication.value.contexts.get(agentRunId)!,
      }))),
    listNavigationRows: navigationRows,
    listCommunicationMessages: () => Object.freeze([...publication.value.messages]),
    applySnapshot,
    applyMessage,
  };
};
