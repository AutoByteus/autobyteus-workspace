import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ProjectTaskBoard from '../ProjectTaskBoard.vue'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import type { ProjectTask } from '~/types/project'

let store: ReturnType<typeof useProjectTaskStore>

const task = (taskId: string, description: string, updatedAt: string, status: ProjectTask['status'] = 'TODO'): ProjectTask => ({
  taskId,
  projectId: 'p1',
  description,
  status,
  contextFiles: [],
  createdAt: updatedAt,
  updatedAt,
})

// The store keeps lists newest-updated first; seed them that way.
const seed = (tasks: ProjectTask[]) => {
  store.fetchTasks = vi.fn(async (projectId: string) => {
    store.listsByProjectId = { ...store.listsByProjectId, [projectId]: {status: 'ready', tasks, hasLoaded: true, initialPending: false, refreshPending: false, error: null} }
    return tasks
  }) as any
}

const mountBoard = () => mount(ProjectTaskBoard, {
  props: { projectId: 'p1' },
  global: {
    stubs: {
      NuxtLink: RouterLinkStub,
    },
  },
})

const column = (wrapper: ReturnType<typeof mountBoard>, status: string) => wrapper.get(`[data-testid="project-task-column-${status}"]`)
const cardIds = (wrapper: ReturnType<typeof mountBoard>, status: string) =>
  column(wrapper, status).findAll('a[data-testid^="project-task-row-"]').map((card) => card.attributes('data-testid')!.replace('project-task-row-', ''))
const heading = (wrapper: ReturnType<typeof mountBoard>, status: string) =>
  column(wrapper, status).get('h2').text().replace(/(\D)(\d+)$/, '$1 $2')

describe('ProjectTaskBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    store = useProjectTaskStore()
  })

  it('loads the Project\'s Tasks into three columns in order with counts, newest first', async () => {
    seed([
      task('t4', 'Newest to do', '2026-09-27T04:00:00.000Z', 'TODO'),
      task('t3', 'Doing it', '2026-09-27T03:00:00.000Z', 'IN_PROGRESS'),
      task('t2', 'Older to do', '2026-09-27T02:00:00.000Z', 'TODO'),
      task('t1', 'Finished', '2026-09-27T01:00:00.000Z', 'DONE'),
    ])
    const wrapper = mountBoard()
    await flushPromises()

    expect(store.fetchTasks).toHaveBeenCalledWith('p1', true)
    const order = wrapper.findAll('section').map((section) => section.attributes('data-testid'))
    expect(order).toEqual(['project-task-column-TODO', 'project-task-column-IN_PROGRESS', 'project-task-column-DONE'])
    expect(heading(wrapper, 'TODO')).toBe('To Do 2')
    expect(heading(wrapper, 'IN_PROGRESS')).toBe('In Progress 1')
    expect(heading(wrapper, 'DONE')).toBe('Done 1')
    expect(cardIds(wrapper, 'TODO')).toEqual(['t4', 't2'])
  })

  it('shows an empty board with muted "No tasks" columns and New task for a Project without Tasks', async () => {
    seed([])
    const wrapper = mountBoard()
    await flushPromises()

    for (const status of ['TODO', 'IN_PROGRESS', 'DONE']) {
      expect(heading(wrapper, status)).toMatch(/ 0$/)
      expect(column(wrapper, status).get('[data-testid="project-task-column-empty"]').text()).toBe('No tasks')
    }
    expect(wrapper.findAllComponents(RouterLinkStub).find((link) => link.attributes('data-testid') === 'project-tasks-new-button')?.props('to')).toBe('/projects/p1/tasks/new')
  })

  it('searches across columns, updates counts and recovers from no matches', async () => {
    seed([
      task('t3', 'Prepare release checklist', '2026-09-27T03:00:00.000Z', 'TODO'),
      task('t2', 'Write docs\nthen RELEASE them', '2026-09-27T02:00:00.000Z', 'IN_PROGRESS'),
      task('t1', 'Fix tests', '2026-09-27T01:00:00.000Z', 'TODO'),
    ])
    const wrapper = mountBoard()
    await flushPromises()

    await wrapper.get('[data-testid="project-tasks-search-input"]').setValue('release')
    expect(cardIds(wrapper, 'TODO')).toEqual(['t3'])
    expect(cardIds(wrapper, 'IN_PROGRESS')).toEqual(['t2'])
    expect(heading(wrapper, 'TODO')).toBe('To Do 1')
    expect(heading(wrapper, 'DONE')).toBe('Done 0')

    await wrapper.get('[data-testid="project-tasks-search-input"]').setValue('nothing matches')
    expect(wrapper.find('[data-testid="project-task-columns"]').exists()).toBe(false)
    const noMatch = wrapper.get('[data-testid="project-tasks-no-match"]')
    expect(noMatch.attributes('role')).toBe('status')
    await wrapper.get('[data-testid="project-tasks-clear-search"]').trigger('click')
    expect(cardIds(wrapper, 'TODO')).toEqual(['t3', 't1'])
  })

  it('links a contiguous row to the Task detail page', async () => {
    seed([task('t1', 'a', '2026-09-27T01:00:00.000Z')])
    const wrapper = mountBoard()
    await flushPromises()

    expect(wrapper.findAllComponents(RouterLinkStub).find((link) => link.attributes('data-testid') === 'project-task-row-t1')?.props('to')).toBe('/projects/p1/tasks/t1')
  })

  it('offers no drag, move or status controls (REQ-003)', async () => {
    seed([task('t1', 'a', '2026-09-27T01:00:00.000Z')])
    const wrapper = mountBoard()
    await flushPromises()

    expect(wrapper.findAll('[draggable="true"], select')).toHaveLength(0)
    expect(column(wrapper, 'TODO').findAll('button')).toHaveLength(0)
  })

  it('uses a board-width container query, not viewport breakpoints, for the three-column switch', async () => {
    seed([])
    const wrapper = mountBoard()
    await flushPromises()

    const columns = wrapper.get('[data-testid="project-task-columns"]')
    expect(columns.classes()).toContain('project-task-board__columns')
    expect(columns.classes().filter((name) => /(^|:)grid-cols-/.test(name))).toEqual([])
    expect(wrapper.get('[data-testid="project-task-board"]').classes()).toContain('project-task-board')
  })

  it('filters 150 Tasks quickly (REQ-014, QR-002)', async () => {
    const many = Array.from({ length: 150 }, (_, index) => task(
      `t${index}`,
      index % 10 === 0 ? `Prepare release ${index}` : `Routine work ${index}`,
      new Date(Date.UTC(2026, 8, 27, 0, 0, 150 - index)).toISOString(),
    ))
    seed(many)
    const wrapper = mountBoard()
    await flushPromises()
    expect(cardIds(wrapper, 'TODO')).toHaveLength(150)

    const started = performance.now()
    await wrapper.get('[data-testid="project-tasks-search-input"]').setValue('release')
    expect(performance.now() - started).toBeLessThan(500)
    expect(cardIds(wrapper, 'TODO')).toHaveLength(15)
  })

  it('shows a retryable load error', async () => {
    store.fetchTasks = vi.fn(async (projectId: string) => {
      store.listsByProjectId = { [projectId]: { status: 'error', hasLoaded: false, initialPending: false, refreshPending: false, tasks: [], error: new Error('offline') as any } }
      throw new Error('offline')
    }) as any
    const wrapper = mountBoard()
    await flushPromises()

    expect(wrapper.get('[data-testid="project-tasks-error"]').attributes('role')).toBe('alert')
  })
})
