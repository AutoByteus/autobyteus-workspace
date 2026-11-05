/**
 * ProjectsRunsTree (projects-left-navigation, UXJ-002, UXJ-003, UXJ-008; REQ-002, REQ-004, REQ-011, REQ-014, AC-010,
 * AC-011, AC-012; workspace-tree-vs-chooser REQ-009, REQ-010, REQ-011): the Projects tree's states and its two text-only
 * empty states, only Projects with a run, a Project row's three targets, "+" under a Project, Project-scoped "Archive all"
 * and scoped delegated rows. The view menu is RunSectionHeader's.
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
    runId, summary: runId, createdAt: '2026-10-31T00:00:00.000Z', lastActivityAt: '2026-10-31T00:00:00.000Z', archivedAt: null, terminatedAt: null, status: AgentStatus.Offline,
    isActive: false, shouldConnectStream: false, statusSource: 'TEST', hasCollaboration: false,
  })) }] : [],
  teamDefinitions: [],
})

const t = (key: string, params?: Record<string, unknown>) => (params?.name ? `${key}:${params.name}` : key)

const mountTree = (actions: Record<string, unknown> = {}) => {
  const base = {
    selectedRunId: null, isTeamRunSelected: () => false, isRunTerminating: () => false, isTeamTerminating: () => false,
    isRunDeleting: () => false, isTeamDeleting: () => false, isRunArchiving: () => false, isTeamArchiving: () => false,
    isWorkspaceHistoryLoading: () => false, workspaceHistoryError: () => null,
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

  it('shows the text-only empty state when the node has no Projects (workspace-tree-vs-chooser VIS-015)', async () => {
    useProjectStore().projects = []
    runs.firstRead = 'ready'
    const wrapper = mountTree()
    await flushPromises()
    const empty = wrapper.get('[data-test="projects-tree-empty"]')
    expect(empty.text()).toContain('No Projects yet')
    expect(empty.text()).toContain('Create a Project on the Projects page to run agents and teams for it and follow their work here.')
    expect(empty.findAll('a, button')).toHaveLength(0)
    expect(wrapper.find('[data-test="projects-tree-no-runs"]').exists()).toBe(false)
  })

  it('lists only Projects with a run; none with a run shows its own text-only state (REQ-009, VIS-016)', async () => {
    runs.snapshots = { P: snapshot('P', []), Q: snapshot('Q', []) }
    runs.firstRead = 'ready'
    const wrapper = mountTree()
    await flushPromises()
    expect(wrapper.findAll('[data-test="project-row"]')).toHaveLength(0)
    const none = wrapper.get('[data-test="projects-tree-no-runs"]')
    expect(none.text()).toContain('No Project has a run yet')
    expect(none.text()).toContain('A Project is listed here once it has a run. Your Projects are on the Projects page.')
    expect(none.findAll('a, button')).toHaveLength(0)
    expect(wrapper.find('[data-test="projects-tree-empty"]').exists()).toBe(false)

    runs.snapshots = { P: snapshot('P', []), Q: snapshot('Q', ['q-1']) }
    await flushPromises()
    expect(wrapper.findAll('[data-test="project-row"]').map((row) => row.text())).toEqual(['Prototype Launch'])
  })

  it('lists Projects; the chevron only opens, the name selects the board and opens, "+" starts under the Project (AC-010)', async () => {
    runs.snapshots = { P: snapshot('P', ['pm-1']), Q: snapshot('Q', ['q-1']) }
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
