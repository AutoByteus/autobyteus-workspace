import { handleAgentInputState } from '~/services/agentStreaming/handlers/agentInputStateHandler';
import { advanceSequencedStream } from '~/services/agentStreaming/sequencedStreamRange';
import { reactive, ref, shallowRef } from 'vue';
import {
  teamExecutionViewSnapshotPayloadSchema,
  type TeamRunExecutionTreeDto,
  type TeamStreamServerMessage,
} from '@autobyteus/team-stream-contracts';
import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { TeamRunConfigurationView } from '~/types/agent/TeamRunConfig';
import { parseAgentTeamAddress, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import { collectAgentExecutionLocations, projectNavigationRows } from './teamExecutionTreeSelectors';
import type {
  TeamAgentContextEntry,
  TeamAgentExecutionLocation,
  TeamAgentStreamMessage,
  TeamExecutionApplyResult,
  TeamExecutionEffect,
  TeamExecutionNavigationRow,
} from './teamExecutionViewModels';
import { rebuildOfView } from '~/services/collaborationMessages/collaborationParticipantMessages';
import { sameJsonValue } from '~/utils/sameJsonValue';

type MutationResult = Readonly<{ disposition: 'applied' | 'unchanged' }>
  | Readonly<{ disposition: 'rejected'; code: string; message: string }>;

export interface TeamExecutionViewState {
  getRootTeamRunId(): string;
  /** The Team's name (autobyteus-461 SR-091): a delegated team run's slot, from the server; else its definition's. */
  getDisplayName(): string;
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
  getAgentWorkspaceRootPath(agentRunId: string): string | null;
  getAgentExecutionLocation(agentRunId: string): TeamAgentExecutionLocation | null;
  getMemberAddress(agentRunId: string): AgentTeamAddress | null;
  hasAgentRun(agentRunId: string): boolean;
  focusAgent(agentRunId: string): MutationResult;
  focusAgentForInspection(agentRunId: string): MutationResult;
  listAgentContextEntries(): readonly TeamAgentContextEntry[];
  listNavigationRows(): readonly TeamExecutionNavigationRow[];
  applySnapshot(message: Extract<TeamStreamServerMessage, { type: 'TEAM_EXECUTION_VIEW_SNAPSHOT' }>): TeamExecutionApplyResult;
  applyMessage(message: Exclude<TeamStreamServerMessage,
    { type: 'CONNECTED' | 'TEAM_RUN_LIFECYCLE' | 'TEAM_EXECUTION_VIEW_SNAPSHOT' | 'AGENT_COMMAND_ACK' | 'RUN_TREE_SNAPSHOT' }>): TeamExecutionApplyResult;
}

export interface CreateTeamExecutionViewStateInput {
  rootTeamRunId: string;
  rootActive: boolean;
  baseChangeSequence?: number;
  executionTree: TeamRunExecutionTreeDto;
  configuration: Readonly<TeamRunConfigurationView>;
  initialFocusedAgentRunId: string;
  agentContexts: readonly TeamAgentContextEntry[];
  createAgentContext: (agentRunId: string, address: AgentTeamAddress, tree: TeamRunExecutionTreeDto) => AgentContext | null;
  /** The server's name for the run (SR-091): a delegated team run's slot; null or absent for one the user started. */
  displayName?: string | null;
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
  { type: 'CONNECTED' | 'TEAM_RUN_LIFECYCLE' | 'TEAM_EXECUTION_VIEW_SNAPSHOT' | 'AGENT_COMMAND_ACK' | 'SEGMENT_CONTENT_BATCH' | 'TEAM_COMMUNICATION_MESSAGE'
    | 'RUN_TREE_SNAPSHOT' | 'RUN_TREE_CHANGED' }>): string | null => {
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

  const collectValidatedLocations = (nextTree: TeamRunExecutionTreeDto): ReadonlyMap<string, TeamAgentExecutionLocation> => {
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
    // A member no longer in the tree (it left the team, DS-007) loses its context with the tree that drops it.
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
  const prepareContextAssociations = (
    planned: readonly TeamAgentContextEntry[],
    placed: ReadonlyMap<string, TeamAgentExecutionLocation> | null = null,
  ): ReadonlyMap<string, AgentContext> => {
    const candidate = new Map([...publication.value.contexts].filter(([agentRunId]) => !placed || placed.has(agentRunId)));
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

  // The Team's own rows (its delegated runs are its tree's rows, SR-084).
  const navigationRows = (): readonly TeamExecutionNavigationRow[] =>
    projectNavigationRows({ tree: publication.value.tree, contexts: publication.value.contexts });
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
      const validatedStatuses: Array<{ context: AgentContext; status: AgentStatus; backgroundTasksRunning: number; recoverableBlock: import("@autobyteus/agent-presentation-contracts").CompactionRecoveryBlockDto | null }> = [];
      for (const status of payload.agent_statuses) {
        const location = nextLocations.get(status.agent_run_id);
        if (statusIds.has(status.agent_run_id) || location?.memberAddress !== status.member_address) {
          throw new Error(`Invalid Agent status identity '${status.agent_run_id}'.`);
        }
        const context = publication.value.contexts.get(status.agent_run_id) ?? plannedContexts.get(status.agent_run_id);
        if (!context) throw new Error(`Agent status target '${status.agent_run_id}' is missing.`);
        statusIds.add(status.agent_run_id);
        validatedStatuses.push({ context, status: status.status as AgentStatus, backgroundTasksRunning: status.background_tasks_running, recoverableBlock: status.recoverableBlock });
      }
      // Every own member reports a status.
      const ownIds = new Set(payload.execution_tree.root_team.members.map((member) => member.agent_run_id))
      if ([...ownIds].some((agentRunId) => !statusIds.has(agentRunId))) {
        throw new Error('Snapshot omitted a canonical Agent status.');
      }
      const inputIds = new Set<string>();
      for (const entry of payload.agent_input_states) {
        if (!nextLocations.has(entry.agent_run_id) || inputIds.has(entry.agent_run_id)) throw new Error('Invalid input-state target.');
        inputIds.add(entry.agent_run_id);
      }
      // The view the open read, unchanged (CR-461-082, F-64): its rows, and its base, or (read stored, base 0) a Team still
      // stopped, whose own members are offline: a message to it would have started it.
      const sameBase = payload.base_change_sequence === publication.value.changeSequence || (publication.value.changeSequence === 0 && !rootActive.value
        && payload.agent_statuses.every((status) => !ownIds.has(status.agent_run_id) || status.status === 'offline'))
      const unchanged = sameBase && sameJsonValue(payload.execution_tree, publication.value.tree)
      publication.value = {
        tree: structuredClone(payload.execution_tree), locations: nextLocations,
        contexts: prepareContextAssociations(planned, nextLocations), changeSequence: payload.base_change_sequence,
      };
      validatedStatuses.forEach(({ context, status, backgroundTasksRunning, recoverableBlock }) => {
        context.state.currentStatus = status; context.state.recoverableBlock = recoverableBlock;
        context.state.backgroundTasksRunning = backgroundTasksRunning;
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
        // Unchanged: the loaded members and the Team tab's lists hold; they follow this live sequence from here.
        effects: Object.freeze(unchanged ? [{ kind: 'adopt_collaboration_messages' as const, rebuild: rebuildOfView(payload) },
          { kind: 'reconcile_team_navigation' as const }] : [
          { kind: 'invalidate_team_member_projections' as const },
          // A rebuilt view: the Team tab's lists load again when a message could have been missed (autobyteus-358).
          { kind: 'reload_collaboration_messages' as const, rebuild: rebuildOfView(payload) },
          { kind: 'reconcile_team_navigation' as const },
          { kind: 'reconcile_focused_team_member_projection' as const },
        ]),
      });
    } catch (error) {
      return Object.freeze({ disposition: 'rejected', code: 'TEAM_EXECUTION_SNAPSHOT_INVALID', message: String(error), effects: Object.freeze([]) });
    }
  };

  const applyMessage = (message: Exclude<TeamStreamServerMessage,
    { type: 'CONNECTED' | 'TEAM_RUN_LIFECYCLE' | 'TEAM_EXECUTION_VIEW_SNAPSHOT' | 'AGENT_COMMAND_ACK' | 'RUN_TREE_SNAPSHOT' }>): TeamExecutionApplyResult => {
    if (streamRecoveryRequired.value) {
      return Object.freeze({
        disposition: 'rejected', code: 'TEAM_EXECUTION_STREAM_RECOVERY_REQUIRED',
        message: 'The Team execution stream is waiting for explicit recovery.',
        effects: Object.freeze([]),
      });
    }
    const sequence = sequenceOf(message);
    const through = message.type === 'SEGMENT_CONTENT_BATCH' ? message.payload.change_sequence_through : sequence;
    if (sequence !== null && advanceSequencedStream(publication.value.changeSequence + 1, { first: sequence, through: through! }) === null) {
      return rejectGap(sequence);
    }
    const effects: TeamExecutionEffect[] = [];
    try {
      if (message.type === 'SEGMENT_CONTENT_BATCH') {
        const unknown = message.payload.items.find((item) => !publication.value.contexts.has(item.agent_run_id));
        if (unknown) throw new Error(`Message 'SEGMENT_CONTENT_BATCH' targets unknown AgentRun '${unknown.agent_run_id}'.`);
        for (const { agent_run_id: agentRunId, ...content } of message.payload.items) {
          // Each item is that member's SEGMENT_CONTENT; the batch's first sequence stands in for its own.
          effects.push({ kind: 'dispatch_agent', agentRunId, message: {
            type: 'SEGMENT_CONTENT', payload: { change_sequence: message.payload.change_sequence, agent_run_id: agentRunId, ...content },
          } });
        }
      } else if (message.type === 'RUN_TREE_CHANGED') { effects.push({ kind: 'apply_run_tree_change', change: message.payload }); // SR-084
      } else if (message.type === 'TEAM_COMMUNICATION_MESSAGE') {
        // The Team tab's lists own the messages (autobyteus-358); the view holds none.
        const live = message.payload.message;
        effects.push({ kind: 'append_collaboration_message', message: Object.freeze({
          messageId: live.message_id, senderAgentRunId: live.sender_agent_run_id, receiverAgentRunId: live.receiver_agent_run_id,
          content: live.content, messageType: live.message_type, referenceFiles: live.reference_files.map((file) => file.path),
          createdAt: live.created_at,
        }) });
        publication.value = { ...publication.value, changeSequence: sequence ?? publication.value.changeSequence };
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
      if (through !== null && through !== publication.value.changeSequence) {
        publication.value = { ...publication.value, changeSequence: through };
      }
      return Object.freeze({ disposition: 'applied', effects: Object.freeze(effects) });
    } catch (error) {
      return Object.freeze({ disposition: 'rejected', code: 'TEAM_EXECUTION_EVENT_INVALID', message: String(error), effects: Object.freeze([]) });
    }
  };

  return {
    getRootTeamRunId: () => rootTeamRunId,
    getDisplayName: () => input.displayName || publication.value.tree.root_team.team_definition_name,
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
    getAgentWorkspaceRootPath: (agentRunId) => publication.value.tree.root_team.members
      .find((member) => member.agent_run_id === agentRunId.trim())?.launch_configuration.workspace_root_path ?? null,
    getAgentExecutionLocation: (agentRunId) => publication.value.locations.get(agentRunId.trim()) ?? null,
    getMemberAddress: (agentRunId) => publication.value.locations.get(agentRunId.trim())?.memberAddress ?? null,
    hasAgentRun: (agentRunId) => publication.value.contexts.has(agentRunId.trim()),
    focusAgent: (agentRunId) => focusAgent(agentRunId),
    focusAgentForInspection: (agentRunId) => focusAgent(agentRunId),
    listAgentContextEntries: () => Object.freeze([...publication.value.contexts].map(([agentRunId, agentContext]) => Object.freeze({
      agentRunId, memberAddress: publication.value.locations.get(agentRunId)!.memberAddress, agentContext,
    }))),
    listNavigationRows: navigationRows,
    applySnapshot,
    applyMessage,
  };
};
