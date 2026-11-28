import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref, type Component } from 'vue';
import { useRunHistoryAvatarState } from '~/composables/useRunHistoryAvatarState';
import WorkspaceHistoryWorkspaceSection from '../WorkspaceHistoryWorkspaceSection.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildRunHistoryTeamExecutionRows } from '~/stores/runHistoryTeamExecutionRows';
import { useTaskWorkerTaskStore } from '~/stores/taskWorkerTaskStore';
import { useRunTreeStore } from '~/stores/runTreeStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { seedOrgRunTrees } from '~/test-support/runTreeFixtures';
import { useRunStatusStore } from '~/stores/runStatusStore';
import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts';
import type {
  AgentOrgHistoryDefinitionGroup,
  TeamMemberTreeRow,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';
import {
  buildTestTeamContext,
  testAgentNode,
} from '~/test-support/currentTeamTestFixtures';

vi.mock('@iconify/vue', () => ({ Icon: {props: ['icon'], template: '<span :data-icon="icon" />'} }));
// The definitions' picture addresses, as the definition avatar store reads them (autobyteus-669 W-3).
const pictures = vi.hoisted(() => ({ definitions: null as null | { value: {id: string; avatarUrl?: string | null}[] } }));
vi.mock('~/stores/definitionAvatarStore', () => ({ useDefinitionAvatarStore: () => ({
  avatarOf: (_kind: string, id: string | null | undefined) => pictures.definitions?.value.find((definition) => definition.id === id)?.avatarUrl?.trim() || null,
}) }));

const stableAgent = (
  memberAddress: string,
  overrides: Partial<TeamMemberTreeRow> = {},
): TeamMemberTreeRow => ({
  teamRunId: 'team-run-1',
  kind: 'agent',
  memberAddress,
  displayName: memberAddress.split('/').filter(Boolean).at(-1) ?? memberAddress,
  agentRunId: `${memberAddress.replace(/[^a-z0-9]+/gi, '-')}-run`,
  workspaceRootPath: '/ws/a',
  summary: 'Team task summary',
  lastActivityAt: '2026-06-30T00:00:00.000Z',
  currentStatus: AgentStatus.Idle,
  isActive: true,
  deleteLifecycle: 'READY',
  children: [],
  ...overrides,
});

const rootRow = (children: TeamMemberTreeRow[], teamRunId = 'team-run-1'): TeamMemberTreeRow => ({
  teamRunId,
  kind: 'agent_team',
  memberAddress: '/',
  displayName: 'Team Alpha',
  teamDefinitionId: 'team-def-1',
  teamRunIdForNode: teamRunId,
  coordinatorAddress: children[0]?.memberAddress ?? '/worker',
  workspaceRootPath: '/ws/a',
  summary: 'Team task summary',
  lastActivityAt: '2026-06-30T00:00:00.000Z',
  currentStatus: null,
  isActive: true,
  deleteLifecycle: 'READY',
  children,
});

const agentOrgDefinitionGroup = (): AgentOrgHistoryDefinitionGroup => {
  const launch = {
    runtimeKind: 'codex_app_server' as const,
    llmModelIdentifier: 'gpt-5.6-sol',
    llmConfig: null,
    autoExecuteTools: false,
    workspaceRootPath: '/ws/a',
  };
  return {
    stableKey: 'agent_org_definition:org-definition',
    definitionId: 'org-definition',
    name: 'Delivery Org',
    runs: [{
      stableKey: 'agent_org_run:org-run',
      rootSubjectKind: 'agent_org',
      rootRunId: 'org-run',
      createdAt: '2026-09-03T00:00:00.000Z', lastActivityAt: '2026-09-03T00:00:00.000Z',
      archivedAt: null,
      isActive: true,
      summary: 'Deliver current package',
      executionTree: {
        subjectKind: 'agent_org',
        createdAt: '2026-09-03T00:00:00.000Z',
        archivedAt: null,
        applicationBinding: null,
        handoffs: [],
        rootOrg: {
          address: '/', orgDefinitionId: 'org-definition', orgDefinitionName: 'Delivery Org', orgRunId: 'org-run',
          defaultLaunchConfiguration: launch,
          members: [{
            address: '/software', teamDefinitionId: 'software-team', role: null, description: null,
            teamRunId: 'mounted-team-run', coordinatorAddress: '/software/implementation',
            defaultLaunchConfiguration: launch,
            members: [{
              address: '/software/implementation', agentDefinitionId: 'implementation-agent', role: null,
              description: null, agentRunId: 'implementation-run', platformAgentRunId: null,
              launchConfiguration: launch,
            }],
          }],
        },
      },
    }],
  };
};

// The Team run's tree as the server builds it (autobyteus-461 SR-084): its own members, and under each the runs it delegated.
const teamRoot = (teamRunId = 'team-run-1'): RunTreeRowDto => ({ key: `team:${teamRunId}`, parentKey: null, depth: 0, kind: 'team', name: 'Team Alpha',
  address: null, openTarget: { runKind: 'agent_team', runId: teamRunId, agentRunId: 'worker-run' }, statusIds: [teamRunId] });
const memberRow = (agentRunId: string, address: string): RunTreeRowDto => ({ key: `team_member:team-run-1:${agentRunId}`, parentKey: 'team:team-run-1',
  depth: 1, kind: 'team_member', name: address.split('/').at(-1)!, address, openTarget: { runKind: 'agent_team', runId: 'team-run-1', agentRunId }, statusIds: [agentRunId] });
const delegatedAgent = (agentRunId: string, under: string, address: string): RunTreeRowDto => ({ key: `agent:${agentRunId}`, parentKey: `team_member:team-run-1:${under}`,
  depth: 2, kind: 'agent', name: address.split('/').at(-1)!, address, openTarget: { runKind: 'agent', runId: agentRunId, agentRunId }, statusIds: [agentRunId] });
const delegatedTeam = (teamRunId: string, under: string, address: string, members: readonly (readonly [string, string])[]): RunTreeRowDto[] => [
  { key: `team:${teamRunId}`, parentKey: `team_member:team-run-1:${under}`, depth: 2, kind: 'team', name: address.split('/').at(-1)!, address,
    openTarget: { runKind: 'agent_team', runId: teamRunId, agentRunId: members[0]![0] }, statusIds: [teamRunId] },
  ...members.map(([agentRunId, memberAddress]): RunTreeRowDto => ({ key: `team_member:${teamRunId}:${agentRunId}`, parentKey: `team:${teamRunId}`, depth: 3,
    kind: 'team_member', name: memberAddress.split('/').at(-1)!, address: memberAddress, openTarget: { runKind: 'agent_team', runId: teamRunId, agentRunId },
    statusIds: [agentRunId] })),
];
/** Each run's own state as its node answered it (SR-083, SR-086 G-A4): an agent's status, a team run's own. */
const answerStatuses = (runs: Record<string, string>, agents: Record<string, string> = {}) => useRunStatusStore().apply({ type: 'RUN_STATUS_SNAPSHOT', payload: {
  runs: Object.entries(runs).map(([runId, status]) => ({ kind: runId.includes('team') ? 'agent_team' : 'agent', runId, answer: 'ok', node: null,
    status: status as never, backgroundTasksRunning: 0, agents: Object.entries(agents).map(([agentRunId, agentStatus]) => ({ agentRunId, status: agentStatus as never, backgroundTasksRunning: 0 })) })) } });

const mountSubject = (options: {
  treeRows?: RunTreeRowDto[];
  stableChildren?: TeamMemberTreeRow[];
  liveContext?: ReturnType<typeof buildTestTeamContext>;
  workspaceTeams?: TeamTreeNode[];
  agentOrgDefinitions?: AgentOrgHistoryDefinitionGroup[];
  avatars?: ReturnType<typeof useRunHistoryAvatarState>;
  teamExpanded?: boolean;
  selectedTeamRunId?: string | null;
  selectedType?: 'agent' | 'team' | null;
  agents?: unknown[];
  stubs?: Record<string, Component | boolean>;
} = {}) => {
  const worker = stableAgent('/worker', { agentRunId: 'worker-run' });
  const stableChildren = options.stableChildren ?? [worker];
  const liveContext = options.liveContext ?? buildTestTeamContext({
    teamRunId: 'team-run-1',
    teamDefinitionId: 'team-def-1',
    teamDefinitionName: 'Team Alpha',
    rootChildren: [testAgentNode('/worker', { agentRunId: worker.agentRunId!, displayName: 'worker' })],
    coordinatorAddress: '/worker',
    focusedAgentRunId: worker.agentRunId!,
    workspaceRootPath: '/ws/a',
  });
  // The run its worker delegated is its own run: the Team's tree row, with its own status (autobyteus-461 rule 2).
  const team: TeamTreeNode = {
    teamRunId: 'team-run-1',
    teamDefinitionId: 'team-def-1',
    teamDefinitionName: 'Team Alpha',
    workspaceRootPath: '/ws/a',
    summary: 'Team task summary',
    lastActivityAt: '2026-06-30T00:00:00.000Z',
    isActive: true,
    deleteLifecycle: 'READY',
    focusedAgentRunId: liveContext.view.getFocusedAgentRunId(),
    rootTeam: rootRow(stableChildren),
    members: stableChildren,
    executionRows: [],
  };
  team.executionRows = buildRunHistoryTeamExecutionRows(team);
  useRunTreeStore().streamSnapshot({ kind: 'agent_team', runId: 'team-run-1' }, options.treeRows
    ?? [teamRoot(), memberRow('worker-run', '/worker'), delegatedAgent('task-agent-run-1', 'worker-run', '/worker')]);
  if (!options.treeRows) answerStatuses({ 'team-run-1': 'running', 'task-agent-run-1': 'running' }, { 'task-agent-run-1': 'running' });
  seedOrgRunTrees(useRunTreeStore(), (options.agentOrgDefinitions ?? []).flatMap((group) => group.runs));

  const actions = {
    onCreateRun: vi.fn(), onSelectRun: vi.fn(), onOpenAgentRun: vi.fn(),
    onTerminateRun: vi.fn(), onArchiveRun: vi.fn(), onDeleteRun: vi.fn(),
    onSelectTeam: vi.fn(), onTerminateTeam: vi.fn(), onArchiveTeam: vi.fn(),
    onDeleteTeam: vi.fn(), onSelectTeamMember: vi.fn(), onOpenTeamRun: vi.fn(),
    onOpenAgentOrgRun: vi.fn(), onSelectAgentOrgMember: vi.fn(), onTerminateAgentOrg: vi.fn(),
  };
  const expandedTeamMembers = reactive<Record<string, boolean>>({});
  const selectedTeamRunId = ref<string | null>(options.selectedTeamRunId ?? 'team-run-1');
  const selectedType = ref<'agent' | 'team' | null>(options.selectedType ?? 'team');
  const expansionKey = (workspaceId: string, teamRunId: string, rowKey: string) =>
    `${workspaceId}::${teamRunId}::${rowKey}`;
  const state = {
    selectedRunId: null,
    isTeamRunSelected: (teamRunId: string) => selectedType.value === 'team' && selectedTeamRunId.value === teamRunId,
    isRunTerminating: () => false, isTeamTerminating: () => false,
    isRunDeleting: () => false, isTeamDeleting: () => false,
    isRunArchiving: () => false, isTeamArchiving: () => false,
    isWorkspaceHistoryLoading: () => false,
    workspaceHistoryError: () => null, formatRelativeTime: () => 'now',
    isWorkspaceExpanded: () => true, toggleWorkspace: vi.fn(),
    isAgentExpanded: () => Boolean(options.agents?.length), toggleAgent: vi.fn(),
    isTeamDefinitionExpanded: () => true, toggleTeamDefinition: vi.fn(),
    isTeamExpanded: () => options.teamExpanded ?? true,
    isTeamMemberExpanded: vi.fn((workspaceId: string, teamRunId: string, rowKey: string) =>
      Boolean(expandedTeamMembers[expansionKey(workspaceId, teamRunId, rowKey)])),
    toggleTeamMember: vi.fn((workspaceId: string, teamRunId: string, rowKey: string) => {
      const key = expansionKey(workspaceId, teamRunId, rowKey);
      expandedTeamMembers[key] = !expandedTeamMembers[key];
    }),
    isAgentOrgDefinitionExpanded: () => true,
    toggleAgentOrgDefinition: vi.fn(),
    isAgentOrgRunExpanded: () => true,
    toggleAgentOrgRun: vi.fn(),
    isAgentOrgTeamExpanded: () => false,
    toggleAgentOrgTeam: vi.fn(),
    isAgentOrgRunSelected: () => false,
    isAgentOrgMemberSelected: () => false,
    isAgentOrgTerminating: () => false,
    agentOrgTerminationError: () => null,
    agentOrgContextFor: () => null,
  };

  const wrapper = mount(WorkspaceHistoryWorkspaceSection, {
    props: {
      workspaceNode: {
        workspaceId: 'workspace:/ws/a', workspaceRootPath: '/ws/a', workspaceName: 'Workspace A',
        workspaceKind: 'filesystem', agents: (options.agents ?? []) as any,
        stableKey: 'workspace:/ws/a', agentOrgDefinitions: options.agentOrgDefinitions ?? [],
      },
      workspaceTeams: options.workspaceTeams ?? [team], workspaceTeamHistoryGroups: [], state,
      avatars: options.avatars ?? {
        getAgentInitials: () => 'A', getTeamMemberDisplayName: (member: any) => member.displayName, getTeamMemberInitials: () => 'W',
      },
      actions,
    },
    global: {
      stubs: options.stubs ?? {},
      mocks: { $t: (key: string) => ({
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.temporary_execution_title': 'Temporary task execution',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_running': 'Team status: Running',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_error': 'Team status: Error',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_idle': 'Team status: Idle',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_offline': 'Team status: Offline',
        'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.delete_team_history_permanently': 'Localized delete team history permanently',
      }[key] ?? key) },
    },
  });

  return { wrapper, actions, state, liveContext, worker, team, selectedTeamRunId, selectedType };
};

describe('WorkspaceHistoryWorkspaceSection current execution rows', () => {
  // sidebar-stop-red-default BEH-001..003: the three real root templates, not a replacement Stop stub.
  it.each([
    { kind: 'Agent', selector: '[data-test="terminate-agent-run"]', action: 'onTerminateRun', target: 'agent-run-1' },
    { kind: 'Team', selector: 'button[title$="terminate_team"]', action: 'onTerminateTeam', target: 'team-run-1' },
    { kind: 'Org', selector: 'button[aria-label="Stop Agent Org"]', action: 'onTerminateAgentOrg', target: null },
  ] as const)('$kind root Stop is red when enabled, muted while disabled, and keeps its exact target', async (variant) => {
    const run = { runId: 'agent-run-1', summary: 'Manager run', currentStatus: AgentStatus.Running,
      lastActivityAt: '2026-06-30T00:00:00.000Z', isActive: true, hasCollaboration: false, source: 'history', isDraft: false };
    const agent = { agentDefinitionId: 'manager', agentName: 'Manager', runs: [run] };
    const group = agentOrgDefinitionGroup();
    const { wrapper, actions, state, team } = mountSubject({ agents: [agent], agentOrgDefinitions: [group], teamExpanded: false });
    const button = wrapper.get(variant.selector);
    expect(button.classes()).toEqual(expect.arrayContaining([
      'text-red-500', 'hover:bg-red-50', 'hover:text-red-600', 'disabled:text-gray-400',
      'disabled:hover:text-gray-400', 'disabled:hover:bg-transparent', 'disabled:cursor-not-allowed', 'disabled:opacity-50',
    ]));
    expect(button.classes()).not.toContain('text-gray-400');
    expect(button.classes()).not.toContain('focus:outline-none'); // keep the roots' native focus convention
    expect(button.attributes('type')).toBe('button');
    expect(button.attributes('aria-label')).toBe(button.attributes('title'));
    expect(button.attributes('disabled')).toBeUndefined();
    await button.trigger('click');
    expect(actions[variant.action]).toHaveBeenCalledExactlyOnceWith(variant.target ?? group.runs[0]);
    for (const action of ['onTerminateRun', 'onTerminateTeam', 'onTerminateAgentOrg'] as const) {
      if (action !== variant.action) expect(actions[action]).not.toHaveBeenCalled();
    }
    expect(actions.onSelectRun).not.toHaveBeenCalled();
    expect(actions.onSelectTeam).not.toHaveBeenCalled();
    expect(actions.onOpenAgentOrgRun).not.toHaveBeenCalled();
    expect(state.toggleAgentOrgRun).not.toHaveBeenCalled();
    // The alive Team run row shows the universal Team status (its worker is running), not a binary activity dot.
    expect(wrapper.get('[data-test="workspace-team-row-team-run-1"] [data-test="team-aggregate-status-dot"]').attributes('data-status')).toBe(AgentStatus.Running);
    expect(wrapper.find('[data-test="agent-org-run-open-org-run"] .bg-emerald-500').exists()).toBe(true);
    await wrapper.setProps({ state: { ...state, isRunTerminating: () => true, isTeamTerminating: () => true, isAgentOrgTerminating: () => true } });
    expect(button.attributes('disabled')).toBeDefined();
    await button.trigger('click');
    expect(actions[variant.action]).toHaveBeenCalledTimes(1);
    await wrapper.setProps({
      workspaceNode: { ...wrapper.props().workspaceNode, agents: [{ ...agent, runs: [{ ...run, isActive: false }] }] as any,
        agentOrgDefinitions: [{ ...group, runs: [{ ...group.runs[0], isActive: false }] }] },
      workspaceTeams: [{ ...team, isActive: false }],
    });
    expect(wrapper.find(variant.selector).exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps supplied Team images and uses the group glyph for missing or broken images', async () => {
    const definitions = ref<{id: string; avatarUrl?: string}[]>([]);
    pictures.definitions = definitions;
    const scope = effectScope();
    const avatars = scope.run(() => useRunHistoryAvatarState())!;
    const {wrapper} = mountSubject({avatars});
    const header = () => wrapper.get('[data-test^="workspace-team-definition-row-"]');
    expect(header().find('img').exists()).toBe(false);
    expect(header().find('[data-icon="heroicons:user-group-20-solid"]').exists()).toBe(true);
    definitions.value = [{id:'team-def-1', avatarUrl:'/team-old.png'}]; await nextTick();
    const old = header().get('img');
    definitions.value = [{id:'team-def-1', avatarUrl:'/team-new.png'}]; await nextTick();
    await old.trigger('error');
    expect(header().get('img').attributes('src')).toBe('/team-new.png');
    await header().get('img').trigger('error');
    expect(header().find('img').exists()).toBe(false);
    expect(header().find('[data-icon="heroicons:user-group-20-solid"]').exists()).toBe(true);
    wrapper.unmount(); scope.stop();
  });

  it('renders Orgs directly after standalone Teams and delegates exact root/member actions', async () => {
    const group = agentOrgDefinitionGroup()
    const { wrapper, actions, state } = mountSubject({ agentOrgDefinitions: [group] })
    const text = wrapper.text()
    expect(text.indexOf('Teams')).toBeGreaterThanOrEqual(0)
    expect(text.indexOf('Orgs')).toBeGreaterThan(text.indexOf('Teams'))
    expect(wrapper.findAll('[data-test="workspace-team-row-team-run-1"]')).toHaveLength(1)
    const collection = wrapper.get('[data-test="workspace-agent-orgs"]')
    const heading = collection.get('div.uppercase')
    expect(heading.text()).toBe('Orgs')
    const teamElement = wrapper.get('[data-test="workspace-team-row-team-run-1"]').element
    const orgElement = wrapper.get('[data-test="agent-org-team-row-mounted-team-run"]').element
    const oldProps = wrapper.props()
    await localizationRuntime.setPreference('zh-CN')
    await wrapper.vm.$nextTick()
    expect(heading.text()).toBe('组织')
    expect(wrapper.get('[data-test="workspace-team-row-team-run-1"]').element).toBe(teamElement)
    expect(wrapper.get('[data-test="agent-org-team-row-mounted-team-run"]').element).toBe(orgElement)
    expect(wrapper.props().state).toBe(oldProps.state)
    expect(state.toggleAgentOrgRun).not.toHaveBeenCalled()
    expect(state.toggleAgentOrgTeam).not.toHaveBeenCalled()
    await localizationRuntime.setPreference('en')
    await wrapper.vm.$nextTick()
    expect(heading.text()).toBe('Orgs')
    expect(wrapper.text()).not.toContain('Restore')

    await wrapper.get('[data-test="agent-org-team-row-mounted-team-run"]').trigger('click')
    expect(state.toggleAgentOrgTeam).toHaveBeenCalledWith('org-run', '/software')
    expect(actions.onSelectAgentOrgMember).toHaveBeenCalledWith(group.runs[0], '/software')

    const stop = wrapper.get(`button[aria-label="Stop Agent Org"]`)
    await stop.trigger('click')
    expect(actions.onTerminateAgentOrg).toHaveBeenCalledWith(group.runs[0])
  })

  // delegated-team-aggregate-status REQ-001..004/006/007, AC-002/007/008/010: TEAMS run and group rows.
  it('gives TEAMS run and group rows the universal Team status reactively, keeping Stop on alive runs', async () => {
    const teamRun = (
      teamRunId: string,
      isActive: boolean,
      statuses: AgentStatus[],
      lastActivityAt = '2026-06-29T00:00:00.000Z',
    ): TeamTreeNode => {
      const children = statuses.map((currentStatus, index) => stableAgent(`/member_${index}`, {
        teamRunId, agentRunId: `${teamRunId}-member-${index}`, currentStatus,
      }));
      const node: TeamTreeNode = {
        teamRunId, teamDefinitionId: 'team-def-1', teamDefinitionName: 'Team Alpha',
        workspaceRootPath: '/ws/a', summary: teamRunId, lastActivityAt,
        isActive, deleteLifecycle: 'READY', focusedAgentRunId: '', rootTeam: rootRow(children, teamRunId),
        members: children, executionRows: [],
      };
      return { ...node, executionRows: buildRunHistoryTeamExecutionRows(node) };
    };
    const idleRun = teamRun('team-run-idle', true, [AgentStatus.Idle, AgentStatus.Offline]);
    const busyRun = teamRun('team-run-busy', true, [AgentStatus.Offline, AgentStatus.Running], '2026-06-30T00:00:00.000Z');
    const stoppedRun = teamRun('team-run-stopped', false, [AgentStatus.Running]);
    const { wrapper } = mountSubject({ workspaceTeams: [stoppedRun, idleRun, busyRun], teamExpanded: false });
    // Each run's own status is its root's (SR-086 G-A4), as its node answers it; never folded from rows here.
    answerStatuses({ 'team-run-idle': 'idle', 'team-run-busy': 'running', 'team-run-stopped': 'offline' });
    await wrapper.vm.$nextTick();
    const groupDot = () => wrapper.get('[data-test="workspace-team-definition-row-team-def-1"] [data-test="team-aggregate-status-dot"]');
    const runDot = (teamRunId: string) => wrapper.get(`[data-test="workspace-team-row-${teamRunId}"] [data-test="team-aggregate-status-dot"]`);
    const stopButtons = () => wrapper.findAll('button[title$="terminate_team"]');

    expect(wrapper.get('[data-test="workspace-team-definition-row-team-def-1"]').findAll('[data-test="team-aggregate-status-dot"]')).toHaveLength(1);
    expect(groupDot().attributes()).toMatchObject({
      'data-status': AgentStatus.Running, 'aria-label': 'Team status: Running', title: 'Team status: Running',
    });
    // An alive run whose members are idle reads green, not blue.
    expect(runDot('team-run-idle').attributes()).toMatchObject({ 'data-status': AgentStatus.Idle, 'aria-label': 'Team status: Idle' });
    expect(runDot('team-run-idle').get('[aria-hidden="true"]').classes()).toContain('bg-green-500');
    expect(runDot('team-run-busy').attributes('data-status')).toBe(AgentStatus.Running);
    expect(runDot('team-run-stopped').attributes('data-status')).toBe(AgentStatus.Offline);
    expect(runDot('team-run-stopped').element.nextElementSibling?.textContent).toContain('team-run-stopped');
    expect(stopButtons()).toHaveLength(2);

    await wrapper.setProps({ workspaceTeams: [stoppedRun, idleRun, { ...busyRun, isActive: false }] });
    answerStatuses({ 'team-run-busy': 'offline' });
    await wrapper.vm.$nextTick();
    expect(groupDot().attributes('data-status')).toBe(AgentStatus.Idle);
    expect(runDot('team-run-busy').attributes('data-status')).toBe(AgentStatus.Offline);
    expect(stopButtons()).toHaveLength(1);

    await wrapper.setProps({ workspaceTeams: [stoppedRun, { ...idleRun, isActive: false }, { ...busyRun, isActive: false }] });
    answerStatuses({ 'team-run-idle': 'offline' });
    await wrapper.vm.$nextTick();
    expect(groupDot().attributes()).toMatchObject({ 'data-status': AgentStatus.Offline, 'aria-label': 'Team status: Offline' });
    expect(stopButtons()).toHaveLength(0);

    // An alive run with no started member reads gray while Stop stays (ASM-002).
    await wrapper.setProps({ workspaceTeams: [teamRun('team-run-restored', true, [AgentStatus.Offline])] });
    answerStatuses({ 'team-run-restored': 'offline' });
    await wrapper.vm.$nextTick();
    expect(runDot('team-run-restored').attributes('data-status')).toBe(AgentStatus.Offline);
    expect(stopButtons()).toHaveLength(1);
  });

  it('renders mutually exclusive active Stop and inactive Archive/Delete actions', async () => {
    const active = mountSubject();
    expect(active.wrapper.find('button[title$="terminate_team"]').exists()).toBe(true);
    expect(active.wrapper.find('button[aria-label="Localized delete team history permanently"]').exists()).toBe(false);
    expect(active.wrapper.find('button[title$="archive_team_history"]').exists()).toBe(false);
    active.wrapper.unmount();

    const inactiveTeam = {
      ...active.team,
      isActive: false,
      rootTeam: { ...active.team.rootTeam, isActive: false },
    };
    const inactive = mountSubject({ workspaceTeams: [inactiveTeam] });
    expect(inactive.wrapper.find('button[title$="terminate_team"]').exists()).toBe(false);
    expect(inactive.wrapper.find('button[title$="archive_team_history"]').exists()).toBe(true);
    const deleteButton = inactive.wrapper.get('button[aria-label="Localized delete team history permanently"]');
    expect(deleteButton.attributes('title')).toBe('Localized delete team history permanently');
  });

  it('renders and selects exact stable and task-Agent execution identities: a delegated run under the member that delegated it (SR-084)', async () => {
    const { wrapper, actions, state } = mountSubject();
    const stableRow = wrapper.get('[data-row-kind="stable_member"]');
    expect(stableRow.text()).toContain('worker');
    const visibleTask = wrapper.get('[data-test="workspace-team-transient-execution-row"]');
    expect(visibleTask.attributes('aria-level')).toBe('2');
    expect(stableRow.attributes('aria-level')).toBe('1');
    // A member that delegated runs shows them; its disclosure folds them, a click on it opens it only.
    expect(stableRow.find('[data-test="workspace-team-member-disclosure"]').exists()).toBe(true);
    await stableRow.trigger('click');
    expect(actions.onSelectTeamMember).toHaveBeenCalledWith({
      teamRunId: 'team-run-1', memberAddress: '/worker', agentRunId: 'worker-run',
    }, 'workspace:/ws/a');
    expect(state.toggleTeamMember).not.toHaveBeenCalled();

    actions.onSelectTeamMember.mockClear();
    // The selected delegated row is the Team's selected tree row (it opens as its own run, rule 2).
    const selected = useRunTreeStore().rowsOf({ kind: 'agent_team', runId: 'team-run-1' }).find((row) => row.openTarget?.agentRunId === 'task-agent-run-1')!;
    useAgentTeamContextsStore().$patch({ delegatedRows: { 'team-run-1': { key: selected.key, target: selected.openTarget!, address: selected.address } } });
    await nextTick();
    const taskRow = wrapper.get('[data-test="workspace-team-transient-execution-row"]');
    expect(taskRow.attributes('data-delegated-run-kind')).toBe('task_agent');
    expect(taskRow.attributes('data-member-address')).toBe('/worker');
    expect(taskRow.classes()).toContain('is-selected');
    expect(taskRow.attributes()).toMatchObject({ role: 'treeitem', 'aria-level': '2', 'aria-selected': 'true', title: 'Temporary task agent · worker · /worker' });
    await taskRow.trigger('keydown', { key: 'Enter' });
    expect(actions.onSelectTeamMember).toHaveBeenCalledWith({
      teamRunId: 'team-run-1', memberAddress: '/worker', agentRunId: 'task-agent-run-1',
    }, 'workspace:/ws/a');
  });

  it('keeps multiple sibling tasks independently selectable and obeys outer Team collapse', async () => {
    const { wrapper, actions, state } = mountSubject({ treeRows: [teamRoot(), memberRow('worker-run', '/worker'),
      delegatedAgent('first-run', 'worker-run', '/worker'), delegatedAgent('second-run', 'worker-run', '/worker')] });
    const taskRows = () => wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');
    expect(taskRows()).toHaveLength(2);
    for (const [index, id] of ['first', 'second'].entries()) {
      expect(taskRows()[index].attributes('aria-level')).toBe('2');
      await taskRows()[index].trigger(index === 0 ? 'click' : 'keydown', { key: ' ' });
      expect(actions.onSelectTeamMember).toHaveBeenLastCalledWith({
        teamRunId: 'team-run-1', memberAddress: '/worker', agentRunId: `${id}-run`,
      }, 'workspace:/ws/a');
    }
    expect(state.toggleTeamMember).not.toHaveBeenCalled();
    await wrapper.setProps({ state: { ...state, isTeamExpanded: () => false } });
    expect(taskRows()).toHaveLength(0);
    expect(wrapper.find('[data-row-kind="stable_member"]').exists()).toBe(false);
    await wrapper.setProps({ state });
    expect(taskRows()).toHaveLength(2);
  });

  it('marks only the selected TeamRun current when member addresses repeat', async () => {
    const buildTeam = (teamRunId: string, agentRunId: string): TeamTreeNode => {
      const member = stableAgent('/worker', { teamRunId, agentRunId });
      return {
        teamRunId, teamDefinitionId: 'team-def-1', teamDefinitionName: 'Team Alpha', workspaceRootPath: '/ws/a',
        summary: 'Team task summary', lastActivityAt: '2026-06-30T00:00:00.000Z', isActive: true,
        deleteLifecycle: 'READY', focusedAgentRunId: agentRunId, rootTeam: rootRow([member], teamRunId), members: [member],
        executionRows: [{
          kind: 'stable_member', rowKey: `agent:${agentRunId}`, teamRunId, memberAddress: '/worker', agentRunId,
          teamRunIdForNode: null, memberKind: 'agent', displayName: 'worker', depth: 0, hasChildren: false, row: member,
        }],
      };
    };
    const { wrapper, selectedTeamRunId, selectedType } = mountSubject({
      treeRows: [teamRoot(), memberRow('worker-run-1', '/worker')],
      workspaceTeams: [buildTeam('team-run-1', 'worker-run-1'), buildTeam('team-run-2', 'worker-run-2')],
      selectedTeamRunId: 'team-run-2',
    });
    const teamARow = () => wrapper.get('[data-test="workspace-team-member-team-run-1-/worker"]');
    const teamBRow = () => wrapper.get('[data-test="workspace-team-member-team-run-2-/worker"]');
    expect(teamARow().attributes('aria-current')).toBeUndefined();
    expect(teamBRow().attributes('aria-current')).toBe('true');
    selectedTeamRunId.value = null;
    await wrapper.vm.$nextTick();
    expect(teamBRow().attributes('aria-current')).toBeUndefined();
    selectedTeamRunId.value = 'team-run-1'; selectedType.value = 'agent';
    await wrapper.vm.$nextTick();
    expect(teamARow().attributes('aria-current')).toBeUndefined();
  });

  it('a task-Team row expands its subtree and opens its coordinator, as in every view (SR-083, FU-031); its member row opens itself', async () => {
    const worker = stableAgent('/worker', { agentRunId: 'worker-run' });
    const { wrapper, actions } = mountSubject({ stableChildren: [worker], treeRows: [teamRoot(), memberRow('worker-run', '/worker'),
      ...delegatedTeam('task-team-run-1', 'worker-run', '/study_group', [['reviewer-run', '/reviewer']])] });

    let taskRows = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');
    expect(taskRows).toHaveLength(1);
    expect(taskRows[0].attributes('data-delegated-run-kind')).toBe('task_team');
    await taskRows[0].trigger('click');
    await wrapper.vm.$nextTick();
    // The server's open target: the delegated Team's coordinator (F-56 was base's: it only expanded).
    expect(actions.onSelectTeamMember).toHaveBeenCalledWith({
      teamRunId: 'team-run-1', memberAddress: '/study_group', agentRunId: 'reviewer-run',
    }, 'workspace:/ws/a');
    actions.onSelectTeamMember.mockClear();
    taskRows = wrapper.findAll('[data-test="workspace-team-transient-execution-row"]');
    expect(taskRows).toHaveLength(2);
    expect(taskRows[1].attributes('data-delegated-run-kind')).toBe('task_team_child');
    await taskRows[1].trigger('click');
    expect(actions.onSelectTeamMember).toHaveBeenCalledWith({
      teamRunId: 'team-run-1', memberAddress: '/reviewer', agentRunId: 'reviewer-run',
    }, 'workspace:/ws/a');
    // REQ-009: the starter is not a visible line; it stays in the accessible label.
    expect(wrapper.text()).not.toContain('Started by worker');
    expect(taskRows[0].attributes('aria-label')).toContain('Started by worker');
  });

  // delegated-team-aggregate-status REQ-002/003/005, AC-005/007/009: delegated Teams under a Team run.
  it('gives a delegated Team row one Team status dot, collapsed included: its team run\'s own (SR-086 G-A4), whether or not its delegator runs', async () => {
    const worker = stableAgent('/worker', { agentRunId: 'worker-run' });
    const { wrapper, team } = mountSubject({ stableChildren: [worker], treeRows: [teamRoot(), memberRow('worker-run', '/worker'),
      ...delegatedTeam('task-team-run-1', 'worker-run', '/study_group', [['reviewer-run', '/reviewer']])] });
    answerStatuses({ 'task-team-run-1': 'running' });
    await wrapper.vm.$nextTick();

    const taskTeamRow = () => wrapper.get('[data-delegated-run-kind="task_team"]');
    expect(taskTeamRow().attributes('aria-expanded')).toBe('false');
    expect(taskTeamRow().findAll('[data-test="team-aggregate-status-dot"]')).toHaveLength(1);
    expect(taskTeamRow().get('[data-test="team-aggregate-status-dot"]').attributes('data-status')).toBe(AgentStatus.Running);
    expect(taskTeamRow().attributes('aria-label')).toContain('running');
    // Agent rows keep their own status dot and never get a Team dot (Teams are flat: stable rows are Agents).
    expect(wrapper.get('[data-test="workspace-team-member-team-run-1-/worker"]').find('[data-test="team-aggregate-status-dot"]').exists()).toBe(false);

    // Rule 2: a delegated run is its own run; its delegator's stop does not stop it, and its status stays its own.
    await wrapper.setProps({ workspaceTeams: [{ ...team, isActive: false }] });
    await wrapper.vm.$nextTick();
    expect(taskTeamRow().get('[data-test="team-aggregate-status-dot"]').attributes('data-status')).toBe(AgentStatus.Running);
    answerStatuses({ 'task-team-run-1': 'offline' });
    await wrapper.vm.$nextTick();
    expect(taskTeamRow().get('[data-test="team-aggregate-status-dot"]').attributes('data-status')).toBe(AgentStatus.Offline);
  });

  it('removes a delegated row when the tree\'s change removes it (SR-084)', async () => {
    const { wrapper } = mountSubject();
    expect(wrapper.find('[data-test="workspace-team-transient-execution-row"]').exists()).toBe(true);
    useRunTreeStore().streamChange({ kind: 'agent_team', runId: 'team-run-1' }, { added: [], removed: ['agent:task-agent-run-1'], updated: [] });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="workspace-team-transient-execution-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-row-kind="stable_member"]').exists()).toBe(true);
  });

  it('renders accessible printed-tree rails, node identities, and orthogonal selection', async () => {
    const coordinator = stableAgent('/coordinator', { displayName: 'Workspace Program Coordinator', agentRunId: 'coordinator-run' });
    const liveContext = buildTestTeamContext({
      teamRunId: 'team-run-1', rootChildren: [testAgentNode(coordinator.memberAddress, { agentRunId: coordinator.agentRunId! })],
      coordinatorAddress: coordinator.memberAddress, focusedAgentRunId: coordinator.agentRunId!,
    });
    const { wrapper } = mountSubject({ stableChildren: [coordinator], liveContext, treeRows: [teamRoot(), memberRow('coordinator-run', '/coordinator'),
      ...delegatedTeam('design-team-run', 'coordinator-run', '/design', [['researcher-run', '/researcher']])] });

    const tree = wrapper.get('[data-test="workspace-team-execution-tree"]');
    expect(tree.attributes('role')).toBe('tree');
    expect(tree.attributes('aria-label')).toContain('organization tree');

    const selectedCoordinator = wrapper.get('[data-test="workspace-team-member-team-run-1-/coordinator"]');
    expect(selectedCoordinator.classes()).toContain('is-selected');
    expect(selectedCoordinator.attributes()).toMatchObject({ role: 'treeitem', 'aria-level': '1', 'aria-selected': 'true', 'aria-current': 'true' });
    // The coordinator is the only own member: no sibling follows it; the Team it delegated is nested under it.
    expect(selectedCoordinator.get('[data-test="workspace-hierarchy-branches"] [data-has-following-sibling]').attributes('data-has-following-sibling'))
      .toBe('false');

    const designRow = wrapper.get('[data-row-kind="delegated_run"][data-member-address="/design"]');
    expect(designRow.attributes()).toMatchObject({ role: 'treeitem', 'aria-level': '2', 'aria-expanded': 'false', 'aria-selected': 'false',
      title: 'Temporary task team · design · /design' });
    expect(designRow.find('[data-team-icon="temporary-task-team"]').exists()).toBe(true);
    expect(designRow.get('[data-test="workspace-team-transient-disclosure"]').attributes('aria-label')).toBe('Expand design');

    await designRow.trigger('keydown', { key: 'Enter' });
    await wrapper.vm.$nextTick();
    const researcherRow = wrapper.get('[data-agent-run-id="researcher-run"]');
    expect(researcherRow.attributes('aria-level')).toBe('3');
    expect(researcherRow.get('[data-test="workspace-hierarchy-branches"] [data-has-following-sibling]').attributes('data-has-following-sibling'))
      .toBe('false');
  });

});

/** delegated-copy-task-locator REQ-012: a Task summary on a page without a right panel opens the row's run. */
describe('WorkspaceHistoryWorkspaceSection Task summary run opening', () => {
  it('opens the Team run (never collapsing it) when a Team host Task summary is located without a right panel', async () => {
    const workerTasks = useTaskWorkerTaskStore();
    vi.spyOn(workerTasks, 'retain').mockReturnValue(() => undefined);
    vi.spyOn(workerTasks, 'taskOf').mockImplementation((worker) => worker.kind === 'agent' && worker.agentRunId === 'task-agent-run-1'
      ? { taskId: 't1', projectId: null, title: null, description: 'Write the notes', status: 'TODO' } : null);
    const { wrapper, actions, team } = mountSubject();
    const summary = wrapper.get('[data-agent-run-id="task-agent-run-1"] [data-test="workspace-task-worker-task-summary"]');
    expect(summary.text()).toBe('Write the notes');
    await summary.trigger('click');
    expect(actions.onOpenTeamRun).toHaveBeenCalledWith(team, 'workspace:/ws/a');
    expect(actions.onSelectTeam).not.toHaveBeenCalled();
    expect(actions.onSelectTeamMember).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('opens the Agent run\'s own conversation (as its run row does) for an Agent host\'s open-run', async () => {
    const run = { runId: 'agent-run-1', summary: 'Manager run', currentStatus: AgentStatus.Idle, lastActivityAt: '2026-06-30T00:00:00.000Z',
      isActive: true, hasCollaboration: true, source: 'history', isDraft: false };
    const { wrapper, actions } = mountSubject({
      workspaceTeams: [],
      agents: [{ agentDefinitionId: 'manager', agentName: 'Manager', runs: [run] }],
      stubs: { AgentRunTaskRows: { emits: ['open-run', 'select-run'], template: '<button data-test="stub-open-run" @click="$emit(\'open-run\')" />' } },
    });
    await wrapper.get('[data-test="stub-open-run"]').trigger('click');
    // The run's own agent is the shared selection action's rule (`onOpenAgentRun`, autobyteus-277 AR-006).
    expect(actions.onOpenAgentRun).toHaveBeenCalledWith(run);
    wrapper.unmount();
  });
});
