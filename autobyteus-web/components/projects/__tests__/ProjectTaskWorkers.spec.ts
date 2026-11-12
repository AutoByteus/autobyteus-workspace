import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const { open, history } = vi.hoisted(() => ({ open: vi.fn(), history: { workspaceGroups: [] as unknown[], agentOrgHistory: [] as unknown[] } }))
vi.mock('~/composables/projects/useTaskRootNavigation', () => ({ useTaskRootNavigation: () => ({ open }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => history }))

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))

import ProjectTaskWorkers from '../ProjectTaskWorkers.vue'
import TaskRootSection from '../TaskRootSection.vue'
import type { TaskRootView } from '~/types/project'

const root = (overrides: Partial<TaskRootView> = {}): TaskRootView => ({
  kind: 'agent', recipientAddress: '/release_writer', ingressAgentRunId: 'worker', teamRunId: null,
  hostRoot: { kind: 'agent', runId: 'manager-root' }, start: 'started', startError: null, closed: false, status: 'running', ...overrides,
})
const listHost = () => { history.workspaceGroups = [{ agentDefinitions: [{ runs: [{ runId: 'manager-root' }] }], teamDefinitions: [] }] }

describe('ProjectTaskWorkers (the Task root line)', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks(); history.workspaceGroups = []; history.agentOrgHistory = [] })

  // restore-team-group-icon AC-002/003: both densities and openability retain Team identity.
  it.each(['row', 'detail'] as const)('renders the group at the existing %s density in every worker state', (density) => {
    listHost()
    for (const overrides of [{}, { start: 'starting' }, { closed: true }, { start: 'failed', startError: { code: 'NO_MODEL', message: 'No model.' } }] as Partial<TaskRootView>[]) {
      const wrapper = mount(ProjectTaskWorkers, { props: { density, root: root({ kind: 'team', ...overrides }) } })
      const icon = wrapper.get('[data-icon="heroicons:user-group-20-solid"]')
      expect(icon.classes()).toEqual(density === 'detail' ? ['h-4', 'w-4'] : ['h-3.5', 'w-3.5'])
      expect(icon.element.parentElement?.classList.contains(density === 'detail' ? 'h-5' : 'h-4')).toBe(true)
      expect(wrapper.find('[data-icon="heroicons:bolt-20-solid"]').exists()).toBe(false)
      expect(wrapper.find('[data-icon="heroicons:chevron-right-20-solid"]').exists()).toBe(Object.keys(overrides).length === 0)
      expect(wrapper.find('[data-icon="heroicons:exclamation-circle-20-solid"]').exists()).toBe(overrides.start === 'failed')
    }
    const agent = mount(ProjectTaskWorkers, { props: { density, root: root() } })
    expect(agent.find('[data-icon="heroicons:user-group-20-solid"]').exists()).toBe(false)
    expect(agent.get('[aria-hidden="true"]').text()).toBe('RW')
  })

  it('an openable root is a labelled button with a chevron that opens the worker', async () => {
    listHost()
    const wrapper = mount(ProjectTaskWorkers, { props: { root: root() } })
    const line = wrapper.get('[data-testid="project-task-root-running"]')
    expect(line.element.tagName).toBe('BUTTON')
    expect(line.attributes('data-openable')).toBe('true')
    expect(line.attributes('aria-label')).toBe('Open release writer')
    expect(wrapper.get('[data-testid="project-task-root-name"]').text()).toBe('release writer')
    expect(wrapper.get('[data-testid="project-task-root-status"]').text()).toBe('Running')
    await line.trigger('click')
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ ingressAgentRunId: 'worker' }))
  })

  it.each([
    ['starting', root({ start: 'starting', status: 'initializing' }), true, 'initializing'],
    ['host deleted', root({ status: 'idle' }), false, 'idle'],
    ['closed', root({ closed: true }), true, 'offline'],
  ] as const)('a %s root is plain text: no chevron, not focusable, no action (AR-002)', async (_case, value, listed, state) => {
    if (listed) listHost()
    const wrapper = mount(ProjectTaskWorkers, { props: { root: value } })
    const line = wrapper.get(`[data-testid="project-task-root-${state}"]`)
    expect(line.element.tagName).toBe('DIV')
    expect(line.attributes('data-openable')).toBe('false')
    expect(line.attributes('aria-label')).toBeUndefined()
    expect(line.attributes('tabindex')).toBeUndefined()
    await line.trigger('click')
    expect(open).not.toHaveBeenCalled()
  })

  it('a team root without a recorded address shows its kind; a failed root shows Couldn\'t start with the error on the Task page', () => {
    listHost()
    const team = mount(ProjectTaskWorkers, { props: { root: root({ kind: 'team', recipientAddress: null, status: 'idle' }) } })
    expect(team.get('[data-testid="project-task-root-name"]').text()).toBe('Team')
    const failed = mount(TaskRootSection, { props: { root: root({ start: 'failed', status: 'offline', startError: { code: 'NO_MODEL', message: 'No model is set.' } }) } })
    expect(failed.get('[data-testid="project-task-root-failed"]').attributes('data-openable')).toBe('false')
    expect(failed.get('[data-testid="project-task-root-status"]').text()).toBe('Couldn\'t start')
    expect(failed.get('[data-testid="project-task-root-error"]').text()).toBe('No model is set.')
    expect(failed.find('[data-testid="task-page-root-help"]').exists()).toBe(false)
  })

  it('the Task page says Not assigned when there is no root, and shows the help line for a live root', () => {
    expect(mount(TaskRootSection, { props: { root: null } }).find('[data-testid="task-page-not-assigned"]').exists()).toBe(true)
    expect(mount(TaskRootSection, { props: { root: root() } }).find('[data-testid="task-page-root-help"]').exists()).toBe(true)
  })
})
