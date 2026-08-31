import { describe, expect, it } from 'vitest';
import { computed, isReactive, toRaw } from 'vue';
import type {
  TaskDelegationRecordDto,
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
  skill_access_mode: 'PRELOADED_ONLY',
  workspace_root_path: null,
};

const tree = (): TeamRunExecutionTreeDto => ({
  schema_version: 2,
  created_at: createdAt,
  archived_at: null,
  application_binding: null,
  handoffs: [{ from: '/Teacher', to: '/StudentStudyGroup', rules: ['Delegate study work.'] }],
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
        kind: 'configured_team', address: '/StudentStudyGroup', team_definition_id: 'study-definition',
        role: 'Study group', description: null, team_run_id: 'study-team-persistent',
        coordinator_address: '/StudentStudyGroup/Coordinator', task_executions: [],
        default_launch_configuration: launch,
        members: [
          {
            kind: 'configured_agent', address: '/StudentStudyGroup/Coordinator', agent_definition_id: 'coordinator-definition',
            role: 'Coordinator', description: null, agent_run_id: 'coordinator-run', platform_agent_run_id: null,
            launch_configuration: launch,
          },
          {
            kind: 'configured_agent', address: '/StudentStudyGroup/Student', agent_definition_id: 'student-definition',
            role: 'Student', description: null, agent_run_id: 'student-run', platform_agent_run_id: null,
            launch_configuration: launch,
          },
        ],
      },
    ],
    task_executions: [],
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
    workspaceMetadata: null, autoExecuteTools: false, skillAccessMode: 'PRELOADED_ONLY', isLocked: true,
  }, state);
};

const config = (executionTree: TeamRunExecutionTreeDto) => createTeamConfigurationView({
  tree: executionTree,
  workspaceMetadataByAddress: new Map(),
});

const task = (input: {
  taskId: string;
  delegatorAgentRunId: string;
  recipientAddress: AgentTeamAddress;
  execution: TaskDelegationRecordDto['task_execution'];
  status?: TaskDelegationRecordDto['status'];
}): TaskDelegationRecordDto => ({
  task_id: input.taskId,
  delegator_agent_run_id: input.delegatorAgentRunId,
  recipient_address: input.recipientAddress,
  task_execution: input.execution,
  description: `Complete ${input.taskId}`,
  reference_files: [],
  status: input.status ?? 'active',
  updates: [],
  created_at: createdAt,
});

const createStateFixture = (input: {
  rootActive?: boolean;
  executionTree?: TeamRunExecutionTreeDto;
  tasks?: readonly TaskDelegationRecordDto[];
  initialFocusedAgentRunId?: string;
} = {}) => {
  const initialTree = input.executionTree ?? tree();
  const initial = [
    ['teacher-run', '/Teacher'],
    ['coordinator-run', '/StudentStudyGroup/Coordinator'],
    ['student-run', '/StudentStudyGroup/Student'],
  ] as const;
  const initialContexts = new Map(initial.map(([agentRunId, memberAddress]) => [
    agentRunId,
    context(agentRunId, memberAddress),
  ]));
  const dynamicallyCreatedContexts = new Map<string, AgentContext>();
  const state = createTeamExecutionViewState({
    rootTeamRunId: 'root-team-1', rootActive: input.rootActive ?? true, executionTree: initialTree,
    tasks: input.tasks ?? [], messages: [], configuration: config(initialTree),
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

const settledHistoricalExecutions = () => {
  const settledAt = '2026-08-14T12:05:00.000Z';
  const directTask = task({
    taskId: 'settled-direct-task', delegatorAgentRunId: 'teacher-run',
    recipientAddress: '/StudentStudyGroup/Student', execution: { agent_run_id: 'settled-direct-run' },
    status: 'interrupted',
  });
  const teamTask = task({
    taskId: 'settled-team-task', delegatorAgentRunId: 'teacher-run',
    recipientAddress: '/StudentStudyGroup', execution: { team_run_id: 'settled-team-run' },
    status: 'interrupted',
  });
  const nestedTask = task({
    taskId: 'settled-nested-task', delegatorAgentRunId: 'settled-team-coordinator-run',
    recipientAddress: '/StudentStudyGroup/Student', execution: { agent_run_id: 'settled-nested-run' },
    status: 'interrupted',
  });
  const executionTree = tree();
  executionTree.root_team.task_executions = [
    {
      kind: 'task_agent', address: '/StudentStudyGroup/Student', agent_run_id: 'settled-direct-run',
      platform_agent_run_id: null, started_at: createdAt, settled_at: settledAt,
    },
    {
      kind: 'task_team', address: '/StudentStudyGroup', team_run_id: 'settled-team-run',
      started_at: createdAt, settled_at: settledAt,
      members: [
        {
          kind: 'task_team_agent', address: '/StudentStudyGroup/Coordinator',
          agent_run_id: 'settled-team-coordinator-run', platform_agent_run_id: null,
        },
        {
          kind: 'task_team_member', address: '/StudentStudyGroup/StudyPod', team_run_id: 'settled-pod-run',
          members: [{
            kind: 'task_team_agent', address: '/StudentStudyGroup/Student',
            agent_run_id: 'settled-pod-student-run', platform_agent_run_id: null,
          }],
          task_executions: [{
            kind: 'task_agent', address: '/StudentStudyGroup/Student', agent_run_id: 'settled-nested-run',
            platform_agent_run_id: null, started_at: createdAt, settled_at: settledAt,
          }],
        },
      ],
      task_executions: [],
    },
  ];
  return { executionTree, tasks: [directTask, teamTask, nestedTask] };
};

const taskEvent = (payload: Extract<TeamStreamServerMessage, { type: 'TASK_DELEGATION_EVENT' }>['payload']):
Extract<TeamStreamServerMessage, { type: 'TASK_DELEGATION_EVENT' }> => ({
  type: 'TASK_DELEGATION_EVENT', payload,
});

const expectApplied = (result: ReturnType<ReturnType<typeof createState>['applyMessage']>): void => {
  if (result.disposition === 'rejected') throw new Error(`${result.code}: ${result.message}`);
  expect(result.disposition).toBe('applied');
};

describe('TeamExecutionViewState', () => {
  it('projects one immutable configured execution location with the exact containing TeamRun', () => {
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
    const teacherAttachmentIds = computed(() => teacher.contextFilePaths.map((attachment) => attachment.id));
    const teacherSubmissionPending = computed(() => teacher.submissionPending);
    const teacherStatus = computed(() => teacher.state.currentStatus);

    expect(teacherRequirement.value).toBe('');
    expect(teacherAttachmentIds.value).toEqual([]);
    expect(teacherSubmissionPending.value).toBe(false);
    expect(teacherStatus.value).toBe(AgentStatus.Offline);
    teacher.requirement = 'Initial member draft';
    teacher.contextFilePaths = [{
      kind: 'workspace_path', id: 'initial-file', locator: '/tmp/initial.txt',
      displayName: 'initial.txt', type: 'Text',
    }];
    teacher.submissionPending = true;

    expect(teacherRequirement.value).toBe('Initial member draft');
    expect(teacherAttachmentIds.value).toEqual(['initial-file']);
    expect(teacherSubmissionPending.value).toBe(true);
    teacher.state.currentStatus = AgentStatus.Running;
    expect(teacherStatus.value).toBe(AgentStatus.Running);
    expect(isReactive(teacher)).toBe(true);
    expect(isReactive(teacher.state)).toBe(true);
    expect(toRaw(teacher)).toBe(initialContexts.get('teacher-run'));
    expect(isReactive(initialContexts.get('teacher-run')!.state)).toBe(true);
    expect(teacher.state).toBe(initialContexts.get('teacher-run')!.state);
    expect(state.getFocusedAgentContext()).toBe(teacher);
    expect(state.listAgentContextEntries().find((entry) => entry.agentRunId === 'teacher-run')?.agentContext)
      .toBe(teacher);

    const activation = state.applyMessage(taskEvent({
      event_type: 'TASK_AGENT_ACTIVATED', change_sequence: 1,
      parent_team_run_id: 'study-team-persistent',
      execution: {
        kind: 'task_agent', address: '/StudentStudyGroup/Student',
        agent_run_id: 'dynamic-student-run', platform_agent_run_id: null,
        started_at: createdAt, settled_at: null,
      },
      task: task({
        taskId: 'dynamic-student-task', delegatorAgentRunId: 'coordinator-run',
        recipientAddress: '/StudentStudyGroup/Student',
        execution: { agent_run_id: 'dynamic-student-run' },
      }),
    }));
    expectApplied(activation);

    const dynamic = state.getAgentContext('dynamic-student-run')!;
    const dynamicRequirement = computed(() => dynamic.requirement);
    const dynamicAttachmentCount = computed(() => dynamic.contextFilePaths.length);
    const dynamicSubmissionPending = computed(() => dynamic.submissionPending);
    const dynamicStatus = computed(() => dynamic.state.currentStatus);
    expect(dynamicRequirement.value).toBe('');
    expect(dynamicAttachmentCount.value).toBe(0);
    expect(dynamicSubmissionPending.value).toBe(false);
    expect(dynamicStatus.value).toBe(AgentStatus.Offline);
    dynamic.requirement = 'Dynamic member transcript';
    dynamic.contextFilePaths = [{
      kind: 'workspace_path', id: 'dynamic-file', locator: '/tmp/dynamic.txt',
      displayName: 'dynamic.txt', type: 'Text',
    }];
    dynamic.submissionPending = true;

    expect(dynamicRequirement.value).toBe('Dynamic member transcript');
    expect(dynamicAttachmentCount.value).toBe(1);
    expect(dynamicSubmissionPending.value).toBe(true);
    dynamic.state.currentStatus = AgentStatus.Idle;
    expect(dynamicStatus.value).toBe(AgentStatus.Idle);
    expect(isReactive(dynamic)).toBe(true);
    expect(isReactive(dynamic.state)).toBe(true);
    expect(toRaw(dynamic)).toBe(dynamicallyCreatedContexts.get('dynamic-student-run'));
    expect(isReactive(dynamicallyCreatedContexts.get('dynamic-student-run')!.state)).toBe(true);
    expect(dynamic.state).toBe(dynamicallyCreatedContexts.get('dynamic-student-run')!.state);
    expect(state.listAgentContextEntries()
      .find((entry) => entry.agentRunId === 'dynamic-student-run')?.agentContext).toBe(dynamic);
    expect(state.getAgentExecutionLocation('dynamic-student-run')).toEqual({
      agentRunId: 'dynamic-student-run',
      memberAddress: '/StudentStudyGroup/Student',
      containingTeamRunId: 'study-team-persistent',
    });
    expect(state.focusAgent('dynamic-student-run').disposition).toBe('applied');
    expect(state.getFocusedAgentContext()).toBe(dynamic);
  });

  it('materializes fresh task-Team and nested task-Agent identities without replacing configured placement', () => {
    const state = createState();
    const taskTeamExecution: TaskExecutionDto = {
      kind: 'task_team', address: '/StudentStudyGroup', team_run_id: 'study-team-task-1',
      started_at: createdAt, settled_at: null, task_executions: [],
      members: [
        { kind: 'task_team_agent', address: '/StudentStudyGroup/Coordinator', agent_run_id: 'task-coordinator-run', platform_agent_run_id: null },
        { kind: 'task_team_agent', address: '/StudentStudyGroup/Student', agent_run_id: 'task-student-run', platform_agent_run_id: null },
      ],
    };
    const taskTeamResult = state.applyMessage(taskEvent({
      event_type: 'TASK_TEAM_ACTIVATED', change_sequence: 1, parent_team_run_id: 'root-team-1',
      execution: taskTeamExecution, task: task({
        taskId: 'task-team-1', delegatorAgentRunId: 'teacher-run', recipientAddress: '/StudentStudyGroup',
        execution: { team_run_id: 'study-team-task-1' },
      }),
    }));
    expectApplied(taskTeamResult);
    expect(taskTeamResult.effects).toEqual([
      { kind: 'invalidate_team_member_projection', agentRunIds: ['task-coordinator-run', 'task-student-run'] },
      { kind: 'reconcile_team_navigation' },
    ]);

    expect(state.hasAgentRun('coordinator-run')).toBe(true);
    expect(state.hasAgentRun('task-coordinator-run')).toBe(true);
    expect(state.getMemberAddress('task-coordinator-run')).toBe('/StudentStudyGroup/Coordinator');
    expect(state.getAgentExecutionLocation('task-coordinator-run')).toEqual({
      agentRunId: 'task-coordinator-run',
      memberAddress: '/StudentStudyGroup/Coordinator',
      containingTeamRunId: 'study-team-task-1',
    });
    expect(state.listNavigationRows().find((row) => row.teamRunId === 'study-team-task-1')).toMatchObject({
      displayName: 'Task: Complete task-team-1', focusable: false,
      task: { taskId: 'task-team-1', description: 'Complete task-team-1', displayStatus: 'in_progress' },
    });

    const nestedTask = task({
      taskId: 'nested-agent-task', delegatorAgentRunId: 'task-coordinator-run',
      recipientAddress: '/StudentStudyGroup/Student', execution: { agent_run_id: 'nested-student-run' },
    });
    const activationResult = state.applyMessage(taskEvent({
      event_type: 'TASK_AGENT_ACTIVATED', change_sequence: 2, parent_team_run_id: 'study-team-task-1',
      execution: {
        kind: 'task_agent', address: '/StudentStudyGroup/Student', agent_run_id: 'nested-student-run',
        platform_agent_run_id: null, started_at: createdAt, settled_at: null,
      },
      task: nestedTask,
    }));
    expect(activationResult).toMatchObject({ disposition: 'applied' });
    expect(activationResult.effects).toEqual([
      { kind: 'invalidate_team_member_projection', agentRunIds: ['nested-student-run'] },
      { kind: 'reconcile_team_navigation' },
    ]);
    expect(state.listNavigationRows().find((row) => row.agentRunId === 'nested-student-run')?.task)
      .toEqual({ taskId: 'nested-agent-task', description: 'Complete nested-agent-task', displayStatus: 'in_progress' });
    expect(state.getAgentContext('nested-student-run')?.state.runId).toBe('nested-student-run');
    expect(state.getAgentExecutionLocation('nested-student-run')).toEqual({
      agentRunId: 'nested-student-run',
      memberAddress: '/StudentStudyGroup/Student',
      containingTeamRunId: 'study-team-task-1',
    });
    expect(state.listTaskHistoryRows().map((row) => row.task.task_id)).toEqual(['task-team-1', 'nested-agent-task']);
  });

  it('keeps accepted history visible until the exact execution settlement and then repairs focus', () => {
    const state = createState();
    const active = task({
      taskId: 'task-agent-1', delegatorAgentRunId: 'teacher-run', recipientAddress: '/StudentStudyGroup/Student',
      execution: { agent_run_id: 'task-student-run' },
    });
    const activationResult = state.applyMessage(taskEvent({
      event_type: 'TASK_AGENT_ACTIVATED', change_sequence: 1, parent_team_run_id: 'study-team-persistent',
      execution: {
        kind: 'task_agent', address: '/StudentStudyGroup/Student', agent_run_id: 'task-student-run',
        platform_agent_run_id: null, started_at: createdAt, settled_at: null,
      }, task: active,
    }));
    expectApplied(activationResult);
    expect(state.focusAgent('task-student-run').disposition).toBe('applied');

    const accepted = { ...active, status: 'accepted' as const };
    const changed = state.applyMessage(taskEvent({
      event_type: 'TASK_CHANGED', change_sequence: 2, task: accepted,
    }));
    expect(changed).toMatchObject({ disposition: 'applied', effects: [{ kind: 'reconcile_team_navigation' }] });
    expect(state.listNavigationRows().some((row) => row.agentRunId === 'task-student-run')).toBe(true);

    expect(state.applyMessage(taskEvent({
      event_type: 'TASK_EXECUTION_SETTLED', change_sequence: 3,
      execution: { agent_run_id: 'task-student-run' }, task: accepted, settled_at: '2026-08-14T12:05:00.000Z',
    })).disposition).toBe('applied');
    expect(state.listNavigationRows().some((row) => row.agentRunId === 'task-student-run')).toBe(false);
    expect(state.getFocusedAgentRunId()).toBe('teacher-run');
    expect(state.listTaskHistoryRows()[0]?.task.status).toBe('accepted');
  });

  it('projects settled task subtrees only for historical inspection and repairs focus when live eligibility returns', () => {
    const historical = settledHistoricalExecutions();
    const state = createStateFixture({
      rootActive: false,
      executionTree: historical.executionTree,
      tasks: historical.tasks,
    }).state;

    expect(state.listNavigationRows().map((row) => row.key)).toEqual(expect.arrayContaining([
      'agent:settled-direct-run',
      'team:settled-team-run',
      'agent:settled-team-coordinator-run',
      'team:settled-pod-run',
      'agent:settled-pod-student-run',
      'agent:settled-nested-run',
    ]));
    expect(state.getAgentExecutionLocation('settled-direct-run')?.containingTeamRunId).toBe('root-team-1');
    expect(state.getAgentExecutionLocation('settled-team-coordinator-run')?.containingTeamRunId).toBe('settled-team-run');
    expect(state.getAgentExecutionLocation('settled-pod-student-run')?.containingTeamRunId).toBe('settled-pod-run');
    expect(state.getAgentExecutionLocation('settled-nested-run')?.containingTeamRunId).toBe('settled-pod-run');
    expect(state.focusAgent('settled-direct-run')).toMatchObject({ disposition: 'applied' });
    expect(state.focusAgent('settled-nested-run')).toMatchObject({ disposition: 'applied' });
    expect(state.getFocusedAgentRunId()).toBe('settled-nested-run');

    expect(state.setRootTeamActive(true)).toEqual({ disposition: 'applied' });
    expect(state.listNavigationRows().some((row) => row.key === 'team:settled-team-run')).toBe(false);
    expect(state.listNavigationRows().some((row) => row.key === 'agent:settled-direct-run')).toBe(false);
    expect(state.getFocusedAgentRunId()).toBe('teacher-run');
    expect(state.focusAgent('settled-nested-run')).toMatchObject({
      disposition: 'rejected',
      code: 'TEAM_AGENT_RUN_NOT_VISIBLE',
    });

    expect(state.setRootTeamActive(false)).toEqual({ disposition: 'applied' });
    expect(state.focusAgent('settled-nested-run')).toMatchObject({ disposition: 'applied' });
    expect(state.focusAgent('missing-historical-run')).toMatchObject({
      disposition: 'rejected',
      code: 'TEAM_AGENT_RUN_NOT_FOUND',
    });
  });

  it('rejects sequence gaps and invalid snapshots without partially replacing authoritative state', () => {
    const state = createState();
    const beforeTree = state.getExecutionTree();
    const gap = state.applyMessage(taskEvent({
      event_type: 'TASK_CHANGED', change_sequence: 2,
      task: task({
        taskId: 'unseen', delegatorAgentRunId: 'teacher-run', recipientAddress: '/StudentStudyGroup/Student',
        execution: { agent_run_id: 'unseen-run' },
      }),
    }));
    expect(gap).toMatchObject({
      disposition: 'rejected',
      code: 'TEAM_EXECUTION_CHANGE_SEQUENCE_GAP',
      effects: [{ kind: 'team_stream_recovery_required' }],
    });
    expect(state.needsStreamRecovery()).toBe(true);

    const later = state.applyMessage(taskEvent({
      event_type: 'TASK_CHANGED', change_sequence: 1,
      task: task({
        taskId: 'later', delegatorAgentRunId: 'teacher-run', recipientAddress: '/StudentStudyGroup/Student',
        execution: { agent_run_id: 'later-run' },
      }),
    }));
    expect(later).toMatchObject({
      disposition: 'rejected',
      code: 'TEAM_EXECUTION_STREAM_RECOVERY_REQUIRED',
      effects: [],
    });
    expect(state.listTaskHistoryRows()).toEqual([]);

    const invalidSnapshot = {
      type: 'TEAM_EXECUTION_VIEW_SNAPSHOT' as const,
      payload: {
        root_team_run_id: 'foreign-root', base_change_sequence: 9, execution_tree: beforeTree,
        tasks: [], messages: [], agent_statuses: [],
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
        root_team_run_id: 'root-team-1', base_change_sequence: 4, execution_tree: tree(),
        tasks: [], messages: [],
        agent_statuses: [
          { agent_run_id: 'teacher-run', member_address: '/Teacher', status: AgentStatus.Idle, trigger: null, tool_name: null, error_message: null, error_details: null },
          { agent_run_id: 'coordinator-run', member_address: '/StudentStudyGroup/Coordinator', status: AgentStatus.Idle, trigger: null, tool_name: null, error_message: null, error_details: null },
          { agent_run_id: 'student-run', member_address: '/StudentStudyGroup/Student', status: AgentStatus.Idle, trigger: null, tool_name: null, error_message: null, error_details: null },
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
    const changedTree = tree();
    const studyTeam = changedTree.root_team.members.find((member) => member.kind === 'configured_team');
    if (!studyTeam || studyTeam.kind !== 'configured_team') throw new Error('Expected configured study Team.');
    const student = studyTeam.members.find((member) => member.kind === 'configured_agent'
      && member.agent_run_id === 'student-run');
    if (!student || student.kind !== 'configured_agent') throw new Error('Expected configured student Agent.');
    const relocatedTree: TeamRunExecutionTreeDto = {
      ...changedTree,
      root_team: {
        ...changedTree.root_team,
        members: [
          ...changedTree.root_team.members.map((member) => member === studyTeam
            ? { ...studyTeam, members: studyTeam.members.filter((nestedMember) => nestedMember !== student) }
            : member),
          student,
        ],
      },
    };

    const result = state.applySnapshot({
      type: 'TEAM_EXECUTION_VIEW_SNAPSHOT',
      payload: {
        root_team_run_id: 'root-team-1',
        base_change_sequence: 7,
        execution_tree: relocatedTree,
        tasks: [],
        messages: [],
        agent_statuses: [
          {
            agent_run_id: 'teacher-run', member_address: '/Teacher', status: AgentStatus.Offline,
            trigger: null, tool_name: null, error_message: null, error_details: null,
          },
          {
            agent_run_id: 'coordinator-run', member_address: '/StudentStudyGroup/Coordinator', status: AgentStatus.Offline,
            trigger: null, tool_name: null, error_message: null, error_details: null,
          },
          {
            agent_run_id: 'student-run', member_address: '/StudentStudyGroup/Student', status: AgentStatus.Offline,
            trigger: null, tool_name: null, error_message: null, error_details: null,
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
