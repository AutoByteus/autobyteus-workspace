import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ProjectTasksPanel from '../ProjectTasksPanel.vue'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import type { ProjectTask } from '~/types/project'

let store: ReturnType<typeof useProjectTaskStore>

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

const task = (taskId: string, description: string, updatedAt: string, status: ProjectTask['status'] = 'TODO'): ProjectTask => ({
  taskId,
  projectId: 'p1',
  description,
  status,
  createdAt: updatedAt,
  updatedAt,
})

const seed = (tasks: ProjectTask[]) => {
  store.fetchTasks = vi.fn(async (projectId: string) => {
    store.listsByProjectId = { ...store.listsByProjectId, [projectId]: { status: 'ready', tasks, error: null } }
    return tasks
  }) as any
}

const mountPanel = () => mount(ProjectTasksPanel, {
  props: { projectId: 'p1' },
  global: {
    stubs: {
      ProjectTaskDialog: { props: ['projectId', 'task'], template: '<div data-testid="project-task-dialog-stub">{{ task ? task.taskId : "new" }}</div>' },
    },
  },
})

const rowIds = (wrapper: ReturnType<typeof mountPanel>) =>
  wrapper.findAll('[data-testid^="project-task-row-"]').map((row) => row.attributes('data-testid')!.replace('project-task-row-', ''))

describe('ProjectTasksPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    store = useProjectTaskStore()
  })

  it('loads the Project\'s Tasks and shows rows with status text, summary and relative time', async () => {
    seed([
      task('t2', 'Write release notes for 1.4.87\nInclude Projects and Tasks', minutesAgo(5)),
      task('t1', 'Older task', minutesAgo(180)),
    ])
    const wrapper = mountPanel()
    await flushPromises()

    expect(store.fetchTasks).toHaveBeenCalledWith('p1', true)
    expect(rowIds(wrapper)).toEqual(['t2', 't1'])
    const row = wrapper.get('[data-testid="project-task-row-t2"]')
    expect(row.get('[data-testid="project-task-status"]').text()).toBe('To Do')
    expect(row.get('[data-testid="project-task-summary"]').text()).toBe('Write release notes for 1.4.87')
    expect(row.get('[data-testid="project-task-updated"]').text()).toBe('5m ago')
    expect(row.get('[data-testid="project-task-open"]').attributes('aria-label')).toBe('Open task: Write release notes for 1.4.87 (To Do)')
  })

  it('offers no control to change a Task\'s status (REQ-003)', async () => {
    seed([task('t1', 'a', minutesAgo(1))])
    const wrapper = mountPanel()
    await flushPromises()

    const row = wrapper.get('[data-testid="project-task-row-t1"]')
    expect(row.findAll('button')).toHaveLength(1)
    expect(row.findAll('select, input')).toHaveLength(0)
  })

  it('shows a calm empty state with New task available', async () => {
    seed([])
    const wrapper = mountPanel()
    await flushPromises()

    expect(wrapper.find('[data-testid="project-tasks-empty"]').exists()).toBe(true)
    await wrapper.get('[data-testid="project-tasks-new-button"]').trigger('click')
    expect(wrapper.get('[data-testid="project-task-dialog-stub"]').text()).toBe('new')
  })

  it('searches the full description case-insensitively and recovers from no matches', async () => {
    seed([
      task('t1', 'Deploy server\nthen update the RELEASE checklist', minutesAgo(1)),
      task('t2', 'Write docs', minutesAgo(2)),
    ])
    const wrapper = mountPanel()
    await flushPromises()

    await wrapper.get('[data-testid="project-tasks-search-input"]').setValue('release')
    expect(rowIds(wrapper)).toEqual(['t1'])

    await wrapper.get('[data-testid="project-tasks-search-input"]').setValue('nothing')
    expect(wrapper.find('[data-testid="project-tasks-no-match"]').exists()).toBe(true)
    await wrapper.get('[data-testid="project-tasks-clear-filters"]').trigger('click')
    expect(rowIds(wrapper)).toEqual(['t1', 't2'])
  })

  it('filters by status (default All)', async () => {
    seed([
      task('t1', 'a', minutesAgo(1), 'TODO'),
      task('t2', 'b', minutesAgo(2), 'IN_PROGRESS'),
      task('t3', 'c', minutesAgo(3), 'DONE'),
    ])
    const wrapper = mountPanel()
    await flushPromises()

    const filter = wrapper.get('[data-testid="project-tasks-status-filter"]')
    expect((filter.element as HTMLSelectElement).value).toBe('ALL')
    expect(filter.findAll('option').map((option) => option.text())).toEqual(['All statuses', 'To Do', 'In Progress', 'Done'])
    await filter.setValue('IN_PROGRESS')
    expect(rowIds(wrapper)).toEqual(['t2'])
    expect(wrapper.get('[data-testid="project-task-row-t2"] [data-testid="project-task-status"]').text()).toBe('In Progress')
  })

  it('filters 150 Tasks quickly (REQ-014, QR-002)', async () => {
    const many = Array.from({ length: 150 }, (_, index) => task(
      `t${index}`,
      index % 10 === 0 ? `Prepare release ${index}\ndetails` : `Routine work ${index}`,
      minutesAgo(index + 1),
    ))
    seed(many)
    const wrapper = mountPanel()
    await flushPromises()
    expect(rowIds(wrapper)).toHaveLength(150)

    const started = performance.now()
    await wrapper.get('[data-testid="project-tasks-search-input"]').setValue('release')
    const elapsed = performance.now() - started

    expect(rowIds(wrapper)).toHaveLength(15)
    expect(elapsed).toBeLessThan(500)
  })

  it('opens a Task in the dialog', async () => {
    seed([task('t1', 'a', minutesAgo(1))])
    const wrapper = mountPanel()
    await flushPromises()

    await wrapper.get('[data-testid="project-task-open"]').trigger('click')
    expect(wrapper.get('[data-testid="project-task-dialog-stub"]').text()).toBe('t1')
  })

  it('shows a retryable load error', async () => {
    store.fetchTasks = vi.fn(async (projectId: string) => {
      store.listsByProjectId = { [projectId]: { status: 'error', tasks: [], error: new Error('offline') as any } }
      throw new Error('offline')
    }) as any
    const wrapper = mountPanel()
    await flushPromises()

    expect(wrapper.get('[data-testid="project-tasks-error"]').attributes('role')).toBe('alert')
    expect(wrapper.get('[data-testid="project-tasks-error"]').text()).toContain('offline')
  })

  it('reloads and resets search when switching to another Project', async () => {
    seed([task('t1', 'a', minutesAgo(1))])
    const wrapper = mountPanel()
    await flushPromises()
    await wrapper.get('[data-testid="project-tasks-search-input"]').setValue('zzz')

    await wrapper.setProps({ projectId: 'p2' })
    await flushPromises()

    expect(store.fetchTasks).toHaveBeenLastCalledWith('p2', true)
    expect((wrapper.get('[data-testid="project-tasks-search-input"]').element as HTMLInputElement).value).toBe('')
  })
})
