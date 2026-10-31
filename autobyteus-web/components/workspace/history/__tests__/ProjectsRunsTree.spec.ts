/**
 * ProjectsRunsTree and RunSectionSwitch (projects-left-navigation, UXJ-001, UXJ-002, UXJ-003, UXJ-008; REQ-001, REQ-002,
 * REQ-004, REQ-011, REQ-014, AC-001, AC-010, AC-011, AC-012): the switch and its keys, the Projects tree's states, a
 * Project row's three targets, "+" under a Project, Project-scoped "Archive all" and scoped delegated rows.
 */
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const runStart = vi.hoisted(() => ({ newChatInProject: vi.fn(async () => undefined) }))
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('~/composables/runSettings/useRunStart', () => ({ useRunStart: () => runStart }))
vi.mock('~/services/projects/projectChangeFeed', () => ({ getProjectChangeFeed: () => ({ retain: () => () => undefined }) }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn(() => ({ query: vi.fn(), mutate: vi.fn() })) }))

import ProjectsRunsTree from '../ProjectsRunsTree.vue'
import RunSectionSwitch from '../RunSectionSwitch.vue'
import { useProjectRunsStore } from '~/stores/projectRunsStore'
import { useProjectStore } from '~/stores/projectStore'
import { useProjectsPanelStore } from '~/stores/projectsPanelStore'
import { useRunSectionModeStore } from '~/stores/runSectionModeStore'
import type { ProjectRunsSnapshot } from '~/stores/projectRunsProjection'
import type { Project } from '~/types/project'
import { AgentStatus } from '~/types/agent/AgentStatus'

const project = (projectId: string, name: string): Project => ({ projectId, name, description: '', createdAt: '', updatedAt: '',
  workspaces: [], openTaskCount: 0, taskCount: 0 })
const snapshot = (projectId: string, runIds: string[]): ProjectRunsSnapshot => ({
  projectId,
  agentDefinitions: runIds.length ? [{ agentDefinitionId: 'pm', agentName: 'Project Task Manager', runs: runIds.map((runId) => ({
    runId, summary: runId, createdAt: '2026-10-31T00:00:00.000Z', archivedAt: null, terminatedAt: null, status: AgentStatus.Offline,
    isActive: false, shouldConnectStream: false, statusSource: 'TEST', hasCollaboration: false,
  })) }] : [],
  teamDefinitions: [], agentOrgRuns: [], scopes: {},
})

const t = (key: string, params?: Record<string, unknown>) => (params?.name ? `${key}:${params.name}` : key)

const mountTree = (actions: Record<string, unknown> = {}) => {
  const base = {
    selectedRunId: null, isTeamRunSelected: () => false, isRunTerminating: () => false, isTeamTerminating: () => false,
    isRunDeleting: () => false, isTeamDeleting: () => false, isRunArchiving: () => false, isTeamArchiving: () => false,
    isWorkspaceRemoving: () => false, isWorkspaceHistoryLoading: () => false, workspaceHistoryError: () => null,
    formatRelativeTime: () => 'now', isWorkspaceExpanded: () => false, toggleWorkspace: vi.fn(),
    isAgentExpanded: () => false, toggleAgent: vi.fn(), isTeamDefinitionExpanded: () => false, toggleTeamDefinition: vi.fn(),
    isTeamExpanded: () => false, isTeamMemberExpanded: () => false, toggleTeamMember: vi.fn(), isGroupArchiving: () => false,
  }
  const avatars = {
    showAgentAvatar: () => false, onAgentAvatarError: vi.fn(), getAgentInitials: () => 'P', showTeamAvatar: () => false,
    getTeamAvatarUrl: () => '', getOrgAvatarUrl: () => '', showOrgAvatar: () => false, onOrgAvatarError: vi.fn(),
    onTeamAvatarError: vi.fn(), showTeamMemberAvatar: () => false, getTeamMemberAvatarUrl: () => '', onTeamMemberAvatarError: vi.fn(),
    getTeamMemberDisplayName: () => '', getTeamMemberInitials: () => '',
  }
  return mount(ProjectsRunsTree, {
    props: { state: base as never, avatars: avatars as never, actions: { onCreateRun: vi.fn(), onSelectRun: vi.fn(), ...actions } as never },
    global: { mocks: { $t: t }, stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }, AgentRunTaskRows: true } },
  })
}

describe('RunSectionSwitch', () => {
  beforeEach(() => { setActivePinia(createPinia()); window.localStorage.clear() })

  it('is one tab stop; click, Left / Right / Home / End switch the mode (UXJ-001)', async () => {
    const wrapper = mount(RunSectionSwitch, { global: { mocks: { $t: t } } })
    const mode = useRunSectionModeStore()
    const tab = (name: string) => wrapper.get(`[data-test="run-section-tab-${name}"]`)
    expect(tab('workspaces').attributes()).toMatchObject({ 'aria-selected': 'true', tabindex: '0' })
    expect(tab('projects').attributes('tabindex')).toBe('-1')
    await tab('projects').trigger('click')
    expect(mode.mode).toBe('projects')
    await wrapper.get('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' })
    expect(mode.mode).toBe('workspaces')
    await wrapper.get('[role="tablist"]').trigger('keydown', { key: 'End' })
    expect(mode.mode).toBe('projects')
    await wrapper.get('[role="tablist"]').trigger('keydown', { key: 'Home' })
    expect(mode.mode).toBe('workspaces')
  })
})

describe('ProjectsRunsTree', () => {
  let runs: ReturnType<typeof useProjectRunsStore>
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    runStart.newChatInProject.mockClear()
    runs = useProjectRunsStore()
    vi.spyOn(runs, 'show').mockImplementation(() => () => undefined)
    useProjectStore().projects = [project('P', 'AutoByteus'), project('Q', 'Prototype Launch')]
    useProjectStore().hasFetched = true
  })

  it('shows loading, then the first-read error with Retry (UXJ-008, AC-011)', async () => {
    runs.firstRead = 'loading'
    const wrapper = mountTree()
    expect(wrapper.get('[data-test="projects-tree-loading"]').text()).toBe('Loading Projects…')
    runs.firstRead = 'error'
    const retry = vi.spyOn(runs, 'retry').mockResolvedValue()
    await flushPromises()
    await wrapper.get('[data-test="projects-tree-retry"]').trigger('click')
    expect(retry).toHaveBeenCalled()
  })

  it('shows the empty state with New Project when the node has no Projects (VIS-005)', async () => {
    useProjectStore().projects = []
    runs.firstRead = 'ready'
    const wrapper = mountTree()
    await flushPromises()
    expect(wrapper.get('[data-test="projects-tree-empty"]').text()).toContain('No Projects yet')
    expect(wrapper.get('[data-test="projects-tree-empty-new"]').attributes('href')).toBe('/projects/new')
  })

  it('lists Projects; the chevron only opens, the name selects the board and opens, "+" starts under the Project (AC-010)', async () => {
    runs.snapshots = { P: snapshot('P', ['pm-1']), Q: snapshot('Q', []) }
    runs.firstRead = 'ready'
    const wrapper = mountTree()
    await flushPromises()
    const rows = wrapper.findAll('[data-test="project-row"]')
    expect(rows.map((row) => row.text())).toEqual(['AutoByteus', 'Prototype Launch'])
    const panel = useProjectsPanelStore()
    panel.choose({ kind: 'project', projectId: 'Q' })

    await rows[0]!.get('[data-test="project-row-disclosure"]').trigger('click')
    expect(rows[0]!.get('[data-test="project-row-disclosure"]').attributes('aria-expanded')).toBe('true')
    expect(panel.choice).toEqual({ kind: 'project', projectId: 'Q' })

    await rows[1]!.get('[data-test="project-row-select"]').trigger('click')
    expect(panel.choice).toEqual({ kind: 'project', projectId: 'Q' })
    expect(rows[1]!.get('[data-test="project-row-select"]').attributes('aria-current')).toBe('true')
    expect(wrapper.get('[data-test="project-no-runs"]').text()).toBe('No runs yet. Use + to run an agent or team for this Project.')

    await rows[0]!.get('[data-test="project-run-add"]').trigger('click')
    await flushPromises()
    expect(runStart.newChatInProject).toHaveBeenCalledWith({ projectId: 'P', target: null })
    expect(panel.choice).toEqual({ kind: 'project', projectId: 'P' })
  })

  it('keeps the last tree with the refresh banner when a later read failed (VIS-008)', async () => {
    runs.snapshots = { P: snapshot('P', ['pm-1']) }
    runs.firstRead = 'ready'
    vi.spyOn(runs, 'refreshFailed', 'get').mockReturnValue(true)
    const wrapper = mountTree()
    await flushPromises()
    expect(wrapper.get('[data-test="projects-tree-stale-error"]').text()).toContain('Couldn’t refresh Projects.')
    expect(wrapper.findAll('[data-test="project-row"]')).toHaveLength(1)
  })

  it('"Archive all runs" of a Project\'s agent group archives only its listed runs (REQ-014)', async () => {
    runs.snapshots = { P: snapshot('P', ['pm-1', 'pm-2']) }
    runs.firstRead = 'ready'
    const onArchiveListedAgentGroup = vi.fn()
    const onArchiveAgentGroup = vi.fn()
    const wrapper = mountTree({ onArchiveListedAgentGroup, onArchiveAgentGroup })
    await flushPromises()
    await wrapper.get('[data-test="project-row-disclosure"]').trigger('click')
    await wrapper.get('[data-test="workspace-agent-group-archive-pm"]').trigger('click')
    expect(onArchiveAgentGroup).not.toHaveBeenCalled()
    expect(onArchiveListedAgentGroup).toHaveBeenCalledWith(expect.objectContaining({ stableKey: 'project:P' }),
      expect.objectContaining({ agentDefinitionId: 'pm', runs: expect.arrayContaining([expect.objectContaining({ runId: 'pm-1' })]) }))
  })
})
