import { describe, expect, it } from 'vitest';
import { isReactive } from 'vue';
import type { TeamRunExecutionTreeDto, TeamStreamServerMessage } from '@autobyteus/team-stream-contracts';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import { createTeamExecutionViewState } from '../teamExecutionViewState';
import { createTeamConfigurationView } from '../teamExecutionContextFactory';

const createdAt = '2026-08-14T12:00:00.000Z';
const launch = {
  runtime_kind: 'autobyteus' as const,
  llm_model_identifier: 'provider:model',
  llm_config: null,
  auto_execute_tools: false,
  workspace_root_path: null,
};

type EditableExecutionTree = Omit<TeamRunExecutionTreeDto, 'root_team'> & {
  root_team: { -readonly [K in keyof TeamRunExecutionTreeDto['root_team']]: TeamRunExecutionTreeDto['root_team'][K] }
};

/** A flat root Team of two members (the runs it delegated are its tree's rows, autobyteus-461 SR-084). */
const tree = (): EditableExecutionTree => ({
  created_at: createdAt, archived_at: null, application_binding: null, handoffs: [],
  root_team: {
    address: '/', team_definition_id: 'classroom-definition', team_definition_name: 'Classroom', team_run_id: 'root-team-1',
    coordinator_address: '/Teacher', default_launch_configuration: launch,
    members: [
      { kind: 'configured_agent', address: '/Teacher', agent_definition_id: 'teacher-definition', role: 'Teacher', description: null,
        agent_run_id: 'teacher-run', platform_agent_run_id: null, launch_configuration: { ...launch, workspace_root_path: '/configured' } },
      { kind: 'configured_agent', address: '/Student', agent_definition_id: 'student-definition', role: 'Student', description: null,
        agent_run_id: 'root-student-run', platform_agent_run_id: null, launch_configuration: launch },
    ],
  },
});

const context = (agentRunId: string, address: AgentTeamAddress): AgentContext => {
  const state = new AgentRunState(agentRunId, { id: agentRunId, messages: [], createdAt, updatedAt: createdAt,
    agentDefinitionId: `${address}-definition`, agentName: address.split('/').at(-1) ?? address, llmModelIdentifier: 'provider:model' });
  state.currentStatus = AgentStatus.Offline;
  return new AgentContext({ agentDefinitionId: `${address}-definition`, agentDefinitionName: address.split('/').at(-1) ?? address,
    llmModelIdentifier: 'provider:model', runtimeKind: 'autobyteus', workspaceId: null, workspaceMetadata: null, autoExecuteTools: false, isLocked: true }, state);
};

const createStateFixture = (input: { rootActive?: boolean; executionTree?: TeamRunExecutionTreeDto; displayName?: string | null } = {}) => {
  const initialTree = input.executionTree ?? tree();
  const initial = [['teacher-run', '/Teacher'], ['root-student-run', '/Student']] as const;
  const initialContexts = new Map(initial.map(([agentRunId, address]) => [agentRunId, context(agentRunId, address)]));
  const state = createTeamExecutionViewState({
    rootTeamRunId: 'root-team-1', rootActive: input.rootActive ?? true, executionTree: initialTree,
    configuration: createTeamConfigurationView({ tree: initialTree, workspaceMetadataByAddress: new Map() }),
    initialFocusedAgentRunId: 'teacher-run',
    agentContexts: initial.map(([agentRunId, memberAddress]) => ({ agentRunId, memberAddress, agentContext: initialContexts.get(agentRunId)! })),
    createAgentContext: (agentRunId, address) => context(agentRunId, address),
    displayName: input.displayName,
  });
  return { state, initialContexts };
};
const createState = () => createStateFixture().state;

const status = (agent_run_id: string, member_address: string, value: AgentStatus) =>
  ({ agent_run_id, member_address, status: value, background_tasks_running: 0, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null });
const snapshot = (input: { base?: number; root?: string; statuses?: ReturnType<typeof status>[] } = {}) => ({
  type: 'TEAM_EXECUTION_VIEW_SNAPSHOT' as const,
  payload: { root_team_run_id: input.root ?? 'root-team-1', base_change_sequence: input.base ?? 4, live_sequence_id: 'live-1',
    last_message_change_sequence: 0, execution_tree: tree(), agent_input_states: [],
    agent_statuses: input.statuses ?? [status('teacher-run', '/Teacher', AgentStatus.Idle), status('root-student-run', '/Student', AgentStatus.Idle)] },
});
const communication = (change_sequence: number): Extract<TeamStreamServerMessage, { type: 'TEAM_COMMUNICATION_MESSAGE' }> => ({
  type: 'TEAM_COMMUNICATION_MESSAGE', payload: { change_sequence, message: { message_id: `m-${change_sequence}`, sender_agent_run_id: 'teacher-run',
    receiver_agent_run_id: 'delegated-run', content: 'hi', message_type: 'direct_message', reference_files: [], created_at: createdAt } },
});

const expectApplied = (result: ReturnType<ReturnType<typeof createState>['applyMessage']>): void => {
  if (result.disposition === 'rejected') throw new Error(`${result.code}: ${result.message}`);
  expect(result.disposition).toBe('applied');
};

/** autobyteus-461 SR-084: a Team run's view holds its own members only; the runs it delegated are its tree's rows. */
describe('TeamExecutionViewState', () => {
  // autobyteus-461 SR-091: a delegated team run's header names its slot, as its row does, from the server; else its definition.
  it('is named by the server\'s name for a delegated team run, and by its definition otherwise', () => {
    expect(createStateFixture({ displayName: 'review squad' }).state.getDisplayName()).toBe('review squad')
    expect(createStateFixture().state.getDisplayName()).toBe(tree().root_team.team_definition_name)
  })

  it('places each own member in the Team run and keeps one reactive context per member', () => {
    const { state, initialContexts } = createStateFixture();
    expect(state.getAgentExecutionLocation('root-student-run')).toEqual({ agentRunId: 'root-student-run', memberAddress: '/Student', containingTeamRunId: 'root-team-1' });
    expect(state.getAgentExecutionLocation('delegated-run')).toBeNull();
    expect(state.hasAgentRun('delegated-run')).toBe(false);
    const teacher = state.getAgentContext('teacher-run')!;
    expect(isReactive(teacher)).toBe(true);
    expect(teacher.state.runId).toBe(initialContexts.get('teacher-run')!.state.runId);
    expect(state.listAgentContextEntries().map((entry) => entry.agentRunId)).toEqual(['teacher-run', 'root-student-run']);
  });

  it('lists the Team and its members as its own rows; a member is focusable, a run it delegated is not its to focus', () => {
    const state = createState();
    expect(state.listNavigationRows().map((row) => [row.key, row.kind, row.depth, row.coordinator])).toEqual([
      ['team:root-team-1', 'configured_team', 0, false],
      ['agent:teacher-run', 'configured_agent', 1, true],
      ['agent:root-student-run', 'configured_agent', 1, false],
    ]);
    expect(state.focusAgent('root-student-run')).toEqual({ disposition: 'applied' });
    expect(state.getFocusedMemberAddress()).toBe('/Student');
    expect(state.focusAgent('delegated-run')).toMatchObject({ disposition: 'rejected', code: 'TEAM_AGENT_RUN_NOT_FOUND' });
  });

  it('reads each own member\'s workspace root from its own launch, never its Team\'s default', () => {
    const executionTree = tree();
    executionTree.root_team.default_launch_configuration = { ...launch, workspace_root_path: '/parent' };
    const { state } = createStateFixture({ executionTree });
    expect(state.getAgentWorkspaceRootPath('teacher-run')).toBe('/configured');
    expect(state.getAgentWorkspaceRootPath('root-student-run')).toBeNull();
    expect(state.getAgentWorkspaceRootPath('unknown')).toBeNull();
  });

  it('a snapshot reports every own member\'s status; one that omits an own member is refused', () => {
    const state = createState();
    expect(state.applySnapshot(snapshot())).toMatchObject({ disposition: 'applied' });
    expect(state.getAgentContext('teacher-run')!.state.currentStatus).toBe(AgentStatus.Idle);
    expect(state.applySnapshot(snapshot({ statuses: [status('teacher-run', '/Teacher', AgentStatus.Idle)] })))
      .toMatchObject({ disposition: 'rejected', code: 'TEAM_EXECUTION_SNAPSHOT_INVALID' });
  });

  it('rejects sequence gaps and invalid snapshots without partially replacing authoritative state', () => {
    const state = createState();
    const beforeTree = state.getExecutionTree();
    expect(state.applyMessage(communication(2))).toMatchObject({
      disposition: 'rejected', code: 'TEAM_EXECUTION_CHANGE_SEQUENCE_GAP', effects: [{ kind: 'team_stream_recovery_required' }],
    });
    expect(state.needsStreamRecovery()).toBe(true);
    expect(state.applyMessage(communication(1))).toMatchObject({ disposition: 'rejected', code: 'TEAM_EXECUTION_STREAM_RECOVERY_REQUIRED', effects: [] });
    expect(state.applySnapshot(snapshot({ root: 'foreign-root', base: 9 }))).toMatchObject({ disposition: 'rejected', code: 'TEAM_EXECUTION_ROOT_MISMATCH' });
    expect(state.getExecutionTree()).toEqual(beforeTree);
    expect(state.getChangeSequence()).toBe(0);
  });

  it('invalidates projection authority and reconciles navigation and focus after a valid snapshot', () => {
    expect(createState().applySnapshot(snapshot())).toMatchObject({
      disposition: 'applied',
      effects: [
        { kind: 'invalidate_team_member_projections' },
        { kind: 'reload_collaboration_messages' },
        { kind: 'reconcile_team_navigation' },
        { kind: 'reconcile_focused_team_member_projection' },
      ],
    });
  });

  it('CR-461-082 (F-64): a stopped Team\'s stream sends the view its open read: the loaded member and lists hold; a member running again rebuilds', () => {
    const offline = [status('teacher-run', '/Teacher', AgentStatus.Offline), status('root-student-run', '/Student', AgentStatus.Offline)];
    // Read stored at open (no base), the Team stopped, its own members offline: nothing could have changed.
    expect(createStateFixture({ rootActive: false }).state.applySnapshot(snapshot({ base: 205, statuses: offline })).effects.map((effect) => effect.kind))
      .toEqual(['adopt_collaboration_messages', 'reconcile_team_navigation']);
    // One of its own members runs: the Team started since the read; the view rebuilds as before.
    expect(createStateFixture({ rootActive: false }).state.applySnapshot(snapshot({ base: 205,
      statuses: [status('teacher-run', '/Teacher', AgentStatus.Idle), offline[1]!] })).effects.map((effect) => effect.kind))
      .toEqual(['invalidate_team_member_projections', 'reload_collaboration_messages', 'reconcile_team_navigation', 'reconcile_focused_team_member_projection']);
  });

  it('a membership snapshot adds a new member\'s row and context, keeps a leaving member\'s context, then drops it', () => {
    const { state } = createStateFixture();
    const studentContext = state.getAgentContext('root-student-run');
    const reviewer = { kind: 'configured_agent' as const, address: '/Reviewer', agent_definition_id: 'reviewer-definition', role: null, description: null,
      agent_run_id: 'reviewer-run', platform_agent_run_id: null, launch_configuration: launch };
    const changed = tree();
    changed.root_team.members = [changed.root_team.members[0]!, reviewer, { ...changed.root_team.members[1]!, leaving: true }];
    const at = (base: number, executionTree: TeamRunExecutionTreeDto, statuses: ReturnType<typeof status>[]) => ({
      ...snapshot({ base }), payload: { ...snapshot({ base }).payload, execution_tree: executionTree, agent_statuses: statuses } });
    expect(state.applySnapshot(at(5, changed, [status('teacher-run', '/Teacher', AgentStatus.Idle), status('reviewer-run', '/Reviewer', AgentStatus.Offline),
      status('root-student-run', '/Student', AgentStatus.Running)]))).toMatchObject({ disposition: 'applied' });
    expect(state.listNavigationRows().map((row) => row.key)).toEqual([
      'team:root-team-1', 'agent:teacher-run', 'agent:reviewer-run', 'agent:root-student-run']);
    expect(state.getAgentContext('reviewer-run')).not.toBeNull();
    expect(state.getAgentContext('root-student-run')).toBe(studentContext);

    const released = tree();
    released.root_team.members = [released.root_team.members[0]!, reviewer];
    expect(state.applySnapshot(at(6, released, [status('teacher-run', '/Teacher', AgentStatus.Idle), status('reviewer-run', '/Reviewer', AgentStatus.Idle)])))
      .toMatchObject({ disposition: 'applied' });
    expect(state.listNavigationRows().map((row) => row.key)).toEqual(['team:root-team-1', 'agent:teacher-run', 'agent:reviewer-run']);
    expect(state.getAgentContext('root-student-run')).toBeNull();
  });

  it('SR-084: the tree\'s change is numbered in the view\'s sequence and handed to the tree; a message to a delegated agent goes to the Team tab', () => {
    const state = createState();
    const change = { change_sequence: 1, added: [], removed: ['agent:gone'], updated: [] };
    const treeChange = state.applyMessage({ type: 'RUN_TREE_CHANGED', payload: change });
    expectApplied(treeChange);
    expect(treeChange.effects).toEqual([{ kind: 'apply_run_tree_change', change }]);
    const message = state.applyMessage(communication(2));
    expectApplied(message);
    expect(message.effects).toEqual([expect.objectContaining({ kind: 'append_collaboration_message', message: expect.objectContaining({ receiverAgentRunId: 'delegated-run' }) })]);
    expect(state.getChangeSequence()).toBe(2);
  });
});

describe('SEGMENT_CONTENT_BATCH (autobyteus-139)', () => {
  const item = (agentRunId: string, delta: string) => ({
    agent_run_id: agentRunId, segment_id: `segment-${agentRunId}`, turn_id: 'turn-1', segment_type: 'text' as const, delta,
  });
  const batch = (first: number, through: number, ...items: ReturnType<typeof item>[]): Extract<TeamStreamServerMessage, { type: 'SEGMENT_CONTENT_BATCH' }> => ({
    type: 'SEGMENT_CONTENT_BATCH', payload: { change_sequence: first, change_sequence_through: through, items },
  });

  it('dispatches one SEGMENT_CONTENT per item in item order and advances past the whole range', () => {
    const state = createState();
    const result = state.applyMessage(batch(1, 6, item('teacher-run', 'xy'), item('root-student-run', '12')));
    expectApplied(result);
    expect(result.effects).toEqual([
      { kind: 'dispatch_agent', agentRunId: 'teacher-run', message: { type: 'SEGMENT_CONTENT', payload: {
        change_sequence: 1, agent_run_id: 'teacher-run', segment_id: 'segment-teacher-run', turn_id: 'turn-1', segment_type: 'text', delta: 'xy',
      } } },
      { kind: 'dispatch_agent', agentRunId: 'root-student-run', message: { type: 'SEGMENT_CONTENT', payload: {
        change_sequence: 1, agent_run_id: 'root-student-run', segment_id: 'segment-root-student-run', turn_id: 'turn-1', segment_type: 'text', delta: '12',
      } } },
    ]);
    expect(state.getChangeSequence()).toBe(6);
    expectApplied(state.applyMessage(communication(7)));
    expect(state.getChangeSequence()).toBe(7);
  });

  it('rejects a batch that does not start at the next sequence as a gap', () => {
    const state = createState();
    expect(state.applyMessage(batch(2, 4, item('teacher-run', 'x')))).toMatchObject({
      disposition: 'rejected', code: 'TEAM_EXECUTION_CHANGE_SEQUENCE_GAP', effects: [{ kind: 'team_stream_recovery_required' }],
    });
    expect(state.getChangeSequence()).toBe(0);
  });

  it('rejects a batch naming an AgentRun that is not an own member without dispatching any item', () => {
    const state = createState();
    expect(state.applyMessage(batch(1, 2, item('teacher-run', 'x'), item('delegated-run', 'y')))).toMatchObject({
      disposition: 'rejected', code: 'TEAM_EXECUTION_EVENT_INVALID', effects: [],
    });
    expect(state.getChangeSequence()).toBe(0);
  });
});
