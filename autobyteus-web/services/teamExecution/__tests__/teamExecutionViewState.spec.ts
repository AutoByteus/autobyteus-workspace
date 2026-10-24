import type { TaskExecutionReference } from '~/utils/collaboration/taskExecutionClosure';
import { describe, expect, it } from 'vitest';
import { computed, isReactive, toRaw } from 'vue';
import type {
  TaskExecutionDto,
  TeamRunExecutionTreeDto,
  TeamStreamServerMessage,
} from '@autobyteus/team-stream-contracts';
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

/** The recorded catalog source of a study-group Team copy (Teams are flat: its members are Agents). */
const studyGroupSource = {
  kind: 'agent_team' as const, team_definition_id: 'study-definition', coordinator_address: '/StudentStudyGroup/Coordinator',
  members: [
    { address: '/StudentStudyGroup/Coordinator', agent_definition_id: 'coordinator-definition', launch_configuration: launch, follows_team: true },
    { address: '/StudentStudyGroup/Student', agent_definition_id: 'student-definition', launch_configuration: launch, follows_team: true },
  ],
  handoffs: [], default_launch_configuration: launch,
};

/** The test tree, whose root Team's `task_executions` the cases replace (the DTO declares it read-only). */
type EditableExecutionTree = Omit<TeamRunExecutionTreeDto, 'root_team'> & {
  root_team: { -readonly [K in keyof TeamRunExecutionTreeDto['root_team']]: TeamRunExecutionTreeDto['root_team'][K] }
};

/** A flat root Team whose Teacher delegated a study-group Team copy (`study-team-persistent`). */
const tree = (): EditableExecutionTree => ({
  created_at: createdAt,
  archived_at: null,
  application_binding: null,
  handoffs: [],
  root_team: {
    address: '/',
    team_definition_id: 'classroom-definition',
    team_definition_name: 'Classroom',
    team_run_id: 'root-team-1',
    coordinator_address: '/Teacher',
    default_launch_configuration: launch,
    members: [
      {
        kind: 'configured_agent', address: '/Teacher', agent_definition_id: 'teacher-definition',
        role: 'Teacher', description: null, agent_run_id: 'teacher-run', platform_agent_run_id: null,
        launch_configuration: launch,
      },
      {
        kind: 'configured_agent', address: '/Student', agent_definition_id: 'student-definition',
        role: 'Student', description: null, agent_run_id: 'root-student-run', platform_agent_run_id: null,
        launch_configuration: launch,
      },
    ],
    task_executions: [{
      kind: 'task_team', address: '/StudentStudyGroup', team_run_id: 'study-team-persistent',
      delegator_agent_run_id: 'teacher-run', started_at: createdAt, task_executions: [], source: studyGroupSource,
      members: [
        { kind: 'task_team_agent', address: '/StudentStudyGroup/Coordinator', agent_run_id: 'coordinator-run', platform_agent_run_id: null },
        { kind: 'task_team_agent', address: '/StudentStudyGroup/Student', agent_run_id: 'student-run', platform_agent_run_id: null },
      ],
    }],
  },
});

const context = (agentRunId: string, address: AgentTeamAddress): AgentContext => {
  const conversation = {
    id: agentRunId,
    messages: [],
    createdAt,
    updatedAt: createdAt,
    agentDefinitionId: `${address}-definition`,
    agentName: address.split('/').at(-1) ?? address,
    llmModelIdentifier: 'provider:model',
  };
  const state = new AgentRunState(agentRunId, conversation);
  state.currentStatus = AgentStatus.Offline;
  return new AgentContext({
    agentDefinitionId: `${address}-definition`,
    agentDefinitionName: address.split('/').at(-1) ?? address,
    llmModelIdentifier: 'provider:model', runtimeKind: 'autobyteus', workspaceId: null,
    workspaceMetadata: null, autoExecuteTools: false, isLocked: true,
  }, state);
};

const config = (executionTree: TeamRunExecutionTreeDto) => createTeamConfigurationView({
  tree: executionTree,
  workspaceMetadataByAddress: new Map(),
});


const createStateFixture = (input: {
  rootActive?: boolean;
  executionTree?: TeamRunExecutionTreeDto;
  closedTaskExecutions?: readonly TaskExecutionReference[];
  initialFocusedAgentRunId?: string;
} = {}) => {
  const initialTree = input.executionTree ?? tree();
  const initial = [
    ['teacher-run', '/Teacher'],
    ['root-student-run', '/Student'],
    ['coordinator-run', '/StudentStudyGroup/Coordinator'],
    ['student-run', '/StudentStudyGroup/Student'],
  ] as const;
  const initialContexts = new Map(initial.map(([agentRunId, memberAddress]) => [
    agentRunId,
    context(agentRunId, memberAddress),
  ]));
  const dynamicallyCreatedContexts = new Map<string, AgentContext>();
  const state = createTeamExecutionViewState({
    rootTeamRunId: 'root-team-1', rootActive: input.rootActive ?? true, executionTree: initialTree, closedTaskExecutions: input.closedTaskExecutions ?? [],
    messages: [], configuration: config(initialTree),
    initialFocusedAgentRunId: input.initialFocusedAgentRunId ?? 'teacher-run',
    agentContexts: initial.map(([agentRunId, memberAddress]) => ({
      agentRunId, memberAddress, agentContext: initialContexts.get(agentRunId)!,
    })),
    createAgentContext: (agentRunId, address) => {
      const created = context(agentRunId, address);
      dynamicallyCreatedContexts.set(agentRunId, created);
      return created;
    },
  });
  return { state, initialContexts, dynamicallyCreatedContexts };
};

const createState = () => createStateFixture().state;

const taskAgent = (
  agentRunId: string,
  delegatorAgentRunId: string,
  address: AgentTeamAddress = '/Student',
): TaskExecutionDto => ({
  kind: 'task_agent', address, agent_run_id: agentRunId,
  platform_agent_run_id: null, delegator_agent_run_id: delegatorAgentRunId, started_at: createdAt,
  // A copy of the configured placement at `address`: its recorded snapshot of that placement.
  source: { kind: 'agent', agent_definition_id: 'student', launch_configuration: launch, launch_source: { origin: 'configured', fallbacks: [] } },
});

const started = (
  changeSequence: number,
  parentTeamRunId: string,
  execution: TaskExecutionDto,
): Extract<TeamStreamServerMessage, { type: 'TASK_EXECUTION_STARTED' }> => ({
  type: 'TASK_EXECUTION_STARTED',
  payload: { change_sequence: changeSequence, parent_team_run_id: parentTeamRunId, execution },
});

const expectApplied = (result: ReturnType<ReturnType<typeof createState>['applyMessage']>): void => {
  if (result.disposition === 'rejected') throw new Error(`${result.code}: ${result.message}`);
  expect(result.disposition).toBe('applied');
};

describe('TeamExecutionViewState', () => {
  it('projects one immutable configured or delegated execution location with the exact containing TeamRun', () => {
    const state = createState();

    expect(state.getAgentExecutionLocation('teacher-run')).toEqual({
      agentRunId: 'teacher-run',
      memberAddress: '/Teacher',
      containingTeamRunId: 'root-team-1',
    });
    expect(state.getAgentExecutionLocation('student-run')).toEqual({
      agentRunId: 'student-run',
      memberAddress: '/StudentStudyGroup/Student',
      containingTeamRunId: 'study-team-persistent',
    });
    expect(Object.isFrozen(state.getAgentExecutionLocation('student-run'))).toBe(true);
    expect(state.getAgentExecutionLocation('unknown-run')).toBeNull();
  });

  it('stores one canonical reactive context proxy for initial and dynamically associated members', () => {
    const { state, initialContexts, dynamicallyCreatedContexts } = createStateFixture();
    const teacher = state.getAgentContext('teacher-run')!;
    const teacherRequirement = computed(() => teacher.requirement);
    const teacherStatus = computed(() => teacher.state.currentStatus);

    expect(teacherRequirement.value).toBe('');
    expect(teacherStatus.value).toBe(AgentStatus.Offline);
    teacher.requirement = 'Initial member draft';
    expect(teacherRequirement.value).toBe('Initial member draft');
    teacher.state.currentStatus = AgentStatus.Running;
    expect(teacherStatus.value).toBe(AgentStatus.Running);
    expect(isReactive(teacher)).toBe(true);
    expect(toRaw(teacher)).toBe(initialContexts.get('teacher-run'));
    expect(state.getFocusedAgentContext()).toBe(teacher);

    expectApplied(state.applyMessage(started(1, 'study-team-persistent', taskAgent('dynamic-student-run', 'coordinator-run', '/StudentStudyGroup/Student'))));

    const dynamic = state.getAgentContext('dynamic-student-run')!;
    const dynamicStatus = computed(() => dynamic.state.currentStatus);
    expect(dynamicStatus.value).toBe(AgentStatus.Offline);
    dynamic.state.currentStatus = AgentStatus.Idle;
    expect(dynamicStatus.value).toBe(AgentStatus.Idle);
    expect(isReactive(dynamic)).toBe(true);
    expect(toRaw(dynamic)).toBe(dynamicallyCreatedContexts.get('dynamic-student-run'));
    expect(state.getAgentExecutionLocation('dynamic-student-run')).toEqual({
      agentRunId: 'dynamic-student-run',
      memberAddress: '/StudentStudyGroup/Student',
      containingTeamRunId: 'study-team-persistent',
    });
    expect(state.focusAgent('dynamic-student-run').disposition).toBe('applied');
    expect(state.getFocusedAgentContext()).toBe(dynamic);
  });

  it('materializes started task-Team and nested task-Agent rows with the standard status and their delegator', () => {
    const state = createState();
    const taskTeamExecution: TaskExecutionDto = {
      kind: 'task_team', address: '/StudentStudyGroup', team_run_id: 'study-team-task-1',
      delegator_agent_run_id: 'teacher-run', started_at: createdAt, task_executions: [], source: studyGroupSource,
      members: [
        { kind: 'task_team_agent', address: '/StudentStudyGroup/Coordinator', agent_run_id: 'task-coordinator-run', platform_agent_run_id: null },
        { kind: 'task_team_agent', address: '/StudentStudyGroup/Student', agent_run_id: 'task-student-run', platform_agent_run_id: null },
      ],
    };
    const taskTeamResult = state.applyMessage(started(1, 'root-team-1', taskTeamExecution));
    expectApplied(taskTeamResult);
    expect(taskTeamResult.effects).toEqual([
      { kind: 'invalidate_team_member_projection', agentRunIds: ['task-coordinator-run', 'task-student-run'] },
      { kind: 'reconcile_team_navigation' },
    ]);
    expect(state.getAgentExecutionLocation('task-coordinator-run')).toEqual({
      agentRunId: 'task-coordinator-run',
      memberAddress: '/StudentStudyGroup/Coordinator',
      containingTeamRunId: 'study-team-task-1',
    });
    expect(state.listNavigationRows().find((row) => row.teamRunId === 'study-team-task-1')).toMatchObject({
      kind: 'task_team', displayName: 'StudentStudyGroup', delegatedBy: 'Teacher', focusable: false,
    });
    expect(state.listNavigationRows().find((row) => row.agentRunId === 'task-student-run')).toMatchObject({
      kind: 'task_team_agent', displayName: 'Student', delegatedBy: null, currentStatus: AgentStatus.Offline,
    });

    const activationResult = state.applyMessage(started(2, 'study-team-task-1', taskAgent('nested-student-run', 'task-coordinator-run', '/StudentStudyGroup/Student')));
    expectApplied(activationResult);
    expect(activationResult.effects).toEqual([
      { kind: 'invalidate_team_member_projection', agentRunIds: ['nested-student-run'] },
      { kind: 'reconcile_team_navigation' },
    ]);
    expect(state.listNavigationRows().find((row) => row.agentRunId === 'nested-student-run')).toMatchObject({
      kind: 'task_agent', displayName: 'Student', delegatedBy: 'Coordinator', focusable: true,
    });
    expect(state.getAgentExecutionLocation('nested-student-run')?.containingTeamRunId).toBe('study-team-task-1');
  });

  it('shows no starter for a child recorded before the delegator was stored (R-14)', () => {
    const executionTree = tree();
    executionTree.root_team.task_executions = [...executionTree.root_team.task_executions, { ...taskAgent('old-student-run', 'teacher-run'), delegator_agent_run_id: null }];
    const { state } = createStateFixture({ rootActive: false, executionTree });
    expect(state.listNavigationRows().find((row) => row.agentRunId === 'old-student-run')).toMatchObject({
      kind: 'task_agent', displayName: 'Student', delegatedBy: null, focusable: true,
    });
  });

  it('keeps shut-down delegated children navigable and live-addressable', () => {
    const executionTree = tree();
    executionTree.root_team.task_executions = [...executionTree.root_team.task_executions, taskAgent('dormant-student-run', 'teacher-run')];
    const inactive = createStateFixture({ rootActive: false, executionTree }).state;
    expect(inactive.focusAgent('dormant-student-run')).toMatchObject({ disposition: 'applied' });
    expect(inactive.getFocusedNavigationRow()).toMatchObject({ agentRunId: 'dormant-student-run', delegatedBy: 'Teacher' });

    const active = createStateFixture({ executionTree }).state;
    expect(active.focusAgent('dormant-student-run')).toMatchObject({ disposition: 'applied' });
    expect(active.getFocusedAgentAccess()).toBe('live');
    expect(active.listLiveAgentContextEntries().map((entry) => entry.agentRunId)).toContain('dormant-student-run');
    expect(active.focusAgent('missing-run')).toMatchObject({ disposition: 'rejected', code: 'TEAM_AGENT_RUN_NOT_FOUND' });
  });

  it('requires a snapshot status for every tree placement, including shut-down children', () => {
    const executionTree = tree();
    executionTree.root_team.task_executions = [...executionTree.root_team.task_executions, taskAgent('dormant-student-run', 'teacher-run')];
    const state = createStateFixture({ executionTree }).state;
    const status = (agent_run_id: string, member_address: string, value: AgentStatus) => ({
      agent_run_id, member_address, status: value, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null,
    });
    const configuredStatuses = [
      status('teacher-run', '/Teacher', AgentStatus.Idle),
      status('root-student-run', '/Student', AgentStatus.Idle),
      status('coordinator-run', '/StudentStudyGroup/Coordinator', AgentStatus.Idle),
      status('student-run', '/StudentStudyGroup/Student', AgentStatus.Idle),
    ];
    expect(state.applySnapshot({ type: 'TEAM_EXECUTION_VIEW_SNAPSHOT', payload: {
      root_team_run_id: 'root-team-1', base_change_sequence: 3, closed_task_executions: [], execution_tree: executionTree,
      messages: [], agent_input_states: [], remote_task_executions: [], agent_statuses: configuredStatuses,
    } })).toMatchObject({ disposition: 'rejected', code: 'TEAM_EXECUTION_SNAPSHOT_INVALID' });
    expect(state.applySnapshot({ type: 'TEAM_EXECUTION_VIEW_SNAPSHOT', payload: {
      root_team_run_id: 'root-team-1', base_change_sequence: 3, closed_task_executions: [], execution_tree: executionTree,
      messages: [], agent_input_states: [], remote_task_executions: [], agent_statuses: [...configuredStatuses, status('dormant-student-run', '/Student', AgentStatus.Offline)],
    } })).toMatchObject({ disposition: 'applied' });
    expect(state.getAgentContext('dormant-student-run')?.state.currentStatus).toBe(AgentStatus.Offline);
  });

  it('rejects sequence gaps and invalid snapshots without partially replacing authoritative state', () => {
    const state = createState();
    const beforeTree = state.getExecutionTree();
    const gap = state.applyMessage(started(2, 'root-team-1', taskAgent('unseen-run', 'teacher-run')));
    expect(gap).toMatchObject({
      disposition: 'rejected',
      code: 'TEAM_EXECUTION_CHANGE_SEQUENCE_GAP',
      effects: [{ kind: 'team_stream_recovery_required' }],
    });
    expect(state.needsStreamRecovery()).toBe(true);

    const later = state.applyMessage(started(1, 'root-team-1', taskAgent('later-run', 'teacher-run')));
    expect(later).toMatchObject({
      disposition: 'rejected',
      code: 'TEAM_EXECUTION_STREAM_RECOVERY_REQUIRED',
      effects: [],
    });
    expect(state.hasAgentRun('later-run')).toBe(false);

    const invalidSnapshot = {
      type: 'TEAM_EXECUTION_VIEW_SNAPSHOT' as const,
      payload: {
        root_team_run_id: 'foreign-root', base_change_sequence: 9, closed_task_executions: [], execution_tree: beforeTree,
        messages: [], agent_input_states: [], remote_task_executions: [], agent_statuses: [],
      },
    };
    expect(state.applySnapshot(invalidSnapshot)).toMatchObject({
      disposition: 'rejected', code: 'TEAM_EXECUTION_ROOT_MISMATCH',
    });
    expect(state.getExecutionTree()).toEqual(beforeTree);
    expect(state.getChangeSequence()).toBe(0);
  });


  it('invalidates projection authority and reconciles navigation/focus after a valid snapshot', () => {
    const state = createState();
    const snapshot = state.applySnapshot({
      type: 'TEAM_EXECUTION_VIEW_SNAPSHOT',
      payload: {
        root_team_run_id: 'root-team-1', base_change_sequence: 4, closed_task_executions: [], execution_tree: tree(),
        messages: [],
        agent_input_states: [], remote_task_executions: [], agent_statuses: [
          { agent_run_id: 'teacher-run', member_address: '/Teacher', status: AgentStatus.Idle, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null },
          { agent_run_id: 'root-student-run', member_address: '/Student', status: AgentStatus.Idle, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null },
          { agent_run_id: 'coordinator-run', member_address: '/StudentStudyGroup/Coordinator', status: AgentStatus.Idle, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null },
          { agent_run_id: 'student-run', member_address: '/StudentStudyGroup/Student', status: AgentStatus.Idle, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null },
        ],
      },
    });

    expect(snapshot).toMatchObject({
      disposition: 'applied',
      effects: [
        { kind: 'invalidate_team_member_projections' },
        { kind: 'reconcile_team_navigation' },
        { kind: 'reconcile_focused_team_member_projection' },
      ],
    });
  });

  it('rejects a containing-Team placement change before committing snapshot state', () => {
    const state = createState();
    const beforeTree = state.getExecutionTree();
    const beforeLocation = state.getAgentExecutionLocation('student-run');
    // `student-run` moves out of its delegated study-group TeamRun into a second Team copy.
    const changedTree = tree();
    const studyTeam = changedTree.root_team.task_executions[0];
    if (!studyTeam || studyTeam.kind !== 'task_team') throw new Error('Expected the study-group Team copy.');
    const student = studyTeam.members.find((member) => member.agent_run_id === 'student-run')!;
    const relocatedTree: TeamRunExecutionTreeDto = {
      ...changedTree,
      root_team: {
        ...changedTree.root_team,
        task_executions: [
          { ...studyTeam, members: studyTeam.members.filter((member) => member !== student) },
          { ...studyTeam, team_run_id: 'study-team-other', members: [student] },
        ],
      },
    };

    const result = state.applySnapshot({
      type: 'TEAM_EXECUTION_VIEW_SNAPSHOT',
      payload: {
        root_team_run_id: 'root-team-1',
        base_change_sequence: 7,
        closed_task_executions: [], execution_tree: relocatedTree,
        messages: [],
        agent_input_states: [], remote_task_executions: [], agent_statuses: [
          {
            agent_run_id: 'teacher-run', member_address: '/Teacher', status: AgentStatus.Offline,
            trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null,
          },
          {
            agent_run_id: 'root-student-run', member_address: '/Student', status: AgentStatus.Offline,
            trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null,
          },
          {
            agent_run_id: 'coordinator-run', member_address: '/StudentStudyGroup/Coordinator', status: AgentStatus.Offline,
            trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null,
          },
          {
            agent_run_id: 'student-run', member_address: '/StudentStudyGroup/Student', status: AgentStatus.Offline,
            trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null,
          },
        ],
      },
    });

    expect(result).toMatchObject({
      disposition: 'rejected',
      code: 'TEAM_EXECUTION_SNAPSHOT_INVALID',
      message: expect.stringContaining("AgentRun 'student-run' changed logical placement."),
    });
    expect(state.getExecutionTree()).toBe(beforeTree);
    expect(state.getAgentExecutionLocation('student-run')).toBe(beforeLocation);
    expect(state.getChangeSequence()).toBe(0);
  });
});


describe('selected source workspace root', () => {
  it('resolves configured and catalog roots by exact AgentRun placement', () => {
    const executionTree = tree();
    const root = executionTree.root_team as any;
    root.default_launch_configuration = { ...launch, workspace_root_path: '/parent' };
    root.members[0].launch_configuration = { ...launch, workspace_root_path: '/configured' };
    root.task_executions = [...root.task_executions, { kind: 'task_agent', address: '/Guest', agent_run_id: 'guest-run', platform_agent_run_id: null,
      delegator_agent_run_id: 'teacher-run', started_at: createdAt,
      source: { kind: 'agent', agent_definition_id: 'guest', launch_configuration: { ...launch, workspace_root_path: '/guest' } } },
    { kind: 'task_agent', address: '/Copy', agent_run_id: 'copy-run', platform_agent_run_id: null,
      delegator_agent_run_id: 'teacher-run', started_at: createdAt,
      source: { kind: 'agent', agent_definition_id: 'copy', launch_configuration: { ...launch, workspace_root_path: '/copy' } } }];
    const { state } = createStateFixture({ executionTree });
    expect(state.getAgentWorkspaceRootPath('teacher-run')).toBe('/configured');
    expect(state.getAgentWorkspaceRootPath('guest-run')).toBe('/guest');
    expect(state.getAgentWorkspaceRootPath('copy-run')).toBe('/copy');
    expect(state.getAgentWorkspaceRootPath('student-run')).toBeNull(); // Never parent fallback.
    expect(state.getAgentWorkspaceRootPath('unknown')).toBeNull();
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
    const result = state.applyMessage(batch(1, 6, item('teacher-run', 'xy'), item('student-run', '12')));
    expectApplied(result);
    expect(result.effects).toEqual([
      { kind: 'dispatch_agent', agentRunId: 'teacher-run', message: { type: 'SEGMENT_CONTENT', payload: {
        change_sequence: 1, agent_run_id: 'teacher-run', segment_id: 'segment-teacher-run', turn_id: 'turn-1', segment_type: 'text', delta: 'xy',
      } } },
      { kind: 'dispatch_agent', agentRunId: 'student-run', message: { type: 'SEGMENT_CONTENT', payload: {
        change_sequence: 1, agent_run_id: 'student-run', segment_id: 'segment-student-run', turn_id: 'turn-1', segment_type: 'text', delta: '12',
      } } },
    ]);
    expect(state.getChangeSequence()).toBe(6);
    expectApplied(state.applyMessage(started(7, 'root-team-1', taskAgent('after-batch-run', 'teacher-run'))));
    expect(state.getChangeSequence()).toBe(7);
  });

  it('rejects a batch that does not start at the next sequence as a gap', () => {
    const state = createState();
    expect(state.applyMessage(batch(2, 4, item('teacher-run', 'x')))).toMatchObject({
      disposition: 'rejected', code: 'TEAM_EXECUTION_CHANGE_SEQUENCE_GAP', effects: [{ kind: 'team_stream_recovery_required' }],
    });
    expect(state.getChangeSequence()).toBe(0);
  });

  it('rejects a batch naming an unknown AgentRun without dispatching any item', () => {
    const state = createState();
    expect(state.applyMessage(batch(1, 2, item('teacher-run', 'x'), item('unknown-run', 'y')))).toMatchObject({
      disposition: 'rejected', code: 'TEAM_EXECUTION_EVENT_INVALID', effects: [],
    });
    expect(state.getChangeSequence()).toBe(0);
  });
});
