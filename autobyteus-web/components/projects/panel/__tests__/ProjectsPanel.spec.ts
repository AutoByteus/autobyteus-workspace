import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('~/composables/projects/useProjectChangeFeed', () => ({ useProjectChangeFeed: vi.fn() }))
vi.mock('~/composables/projects/useTaskRootNavigation', () => ({ useTaskRootNavigation: () => ({ open: vi.fn() }) }))

import ProjectsPanel from '../ProjectsPanel.vue'
import { useProjectChangeFeed } from '~/composables/projects/useProjectChangeFeed'
import { useProjectStore } from '~/stores/projectStore'
import { TEMP_TASKS_LIST_ID, useProjectTaskStore } from '~/stores/projectTaskStore'
import { useProjectsPanelStore } from '~/stores/projectsPanelStore'
import type { Project, ProjectTask, TaskWithoutProject } from '~/types/project'

const project = (projectId: string, name: string, updatedAt: string): Project => ({ projectId, name, description: '', createdAt: updatedAt, updatedAt,
  workspaces: [], openTaskCount: 1, taskCount: 1 })
const projectTask = (taskId: string, description: string, status: ProjectTask['status'] = 'TODO'): ProjectTask => ({ taskId, projectId: 'p1', description, status,
  contextFiles: [], createdAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T00:00:00.000Z', root: null })
const tempTask = (taskId: string, description: string): TaskWithoutProject => ({ taskId, description, status: 'TODO', referenceFiles: ['/work/brief.md'],
  createdAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T00:00:00.000Z', root: null })
const ready = <T>(tasks: T[]) => ({ status: 'ready' as const, tasks, hasLoaded: true, initialPending: false, refreshPending: false, error: null })

let lists: Record<string, ReturnType<typeof ready>>
const seed = (projects: Project[], byList: Record<string, unknown[]>) => {
  const projectStore = useProjectStore()
  projectStore.fetchProjects = vi.fn(async () => { projectStore.projects = projects; projectStore.hasFetched = true; return projects }) as any
  lists = Object.fromEntries(Object.entries(byList).map(([id, tasks]) => [id, ready(tasks)]))
  const taskStore = useProjectTaskStore()
  taskStore.fetchTasks = vi.fn(async (id: string) => {
    taskStore.listsByProjectId = { ...taskStore.listsByProjectId, [id]: (lists[id] ?? ready([])) as any }
    return (lists[id]?.tasks ?? []) as any
  }) as any
}
const mountPanel = async () => {
  const wrapper = mount(ProjectsPanel, { global: { stubs: { NuxtLink: RouterLinkStub } } })
  await flushPromises()
  return wrapper
}
const card = (wrapper: Awaited<ReturnType<typeof mountPanel>>, taskId: string) => wrapper.get(`[data-testid="project-task-row-${taskId}"] [data-testid="project-task-row-link"]`)

describe('ProjectsPanel (projects-always-on SR-003)', () => {
  beforeEach(() => { setActivePinia(createPinia()); window.localStorage.clear(); vi.clearAllMocks() })

  it('shows the latest Project as a compact board (no New task) and switches to Temp tasks from the picker', async () => {
    seed([project('p0', 'Older', '2026-10-01T00:00:00.000Z'), project('p1', 'Launch', '2026-10-05T00:00:00.000Z')],
      { p1: [projectTask('t1', 'Write the notes')], [TEMP_TASKS_LIST_ID]: [tempTask('x1', 'Check links')] })
    const wrapper = await mountPanel()
    expect(useProjectChangeFeed).toHaveBeenCalled()
    const select = wrapper.get('[data-testid="projects-panel-picker-select"]')
    expect((select.element as HTMLSelectElement).value).toBe('project:p1')
    expect(select.findAll('option').map((option) => option.text())).toEqual(['Older', 'Launch', 'Temp tasks'])
    // No visible label; the select keeps an accessible name for screen readers.
    const label = wrapper.get(`label[for="${select.attributes('id')}"]`)
    expect(label.classes()).toContain('sr-only')
    expect(label.text()).toBe('Choose a Project or Temp tasks')
    expect(wrapper.find('[data-testid="project-task-row-t1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="project-tasks-new-button"]').exists()).toBe(false)

    await select.setValue('temp')
    await flushPromises()
    expect(useProjectsPanelStore().choice).toEqual({ kind: 'temp' })
    expect(wrapper.find('[data-testid="project-task-row-x1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="temp-task-board-back"]').exists()).toBe(false)
  })

  it('opens a card inside the tab, returns to the board with its search kept, and links to the full Task page', async () => {
    seed([project('p1', 'Launch', '2026-10-05T00:00:00.000Z')], { p1: [projectTask('t1', 'Write the notes\nAll of them'), projectTask('t2', 'Other')] })
    const wrapper = await mountPanel()
    await wrapper.get('[data-testid="project-tasks-search-input"]').setValue('notes')
    expect(card(wrapper, 't1').element.tagName).toBe('BUTTON')
    await card(wrapper, 't1').trigger('click')

    expect(wrapper.get('[data-testid="projects-panel-task-description"]').text()).toBe('Write the notes\nAll of them')
    expect(wrapper.get('[data-testid="projects-panel-task-status"]').text()).toBe('To Do')
    expect(wrapper.get('[data-testid="projects-panel-task-open-page"]').findComponent(RouterLinkStub).props('to')).toBe('/projects/p1/tasks/t1')
    expect(wrapper.find('[data-testid="task-page-not-assigned"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="projects-panel-board"]').attributes('style')).toContain('display: none') // kept mounted, hidden

    // Live: the Task changes while it is open.
    useProjectTaskStore().applyChange({ type: 'task_upserted', scope: { kind: 'project', projectId: 'p1' }, task: projectTask('t1', 'Write the notes\nAll of them', 'IN_PROGRESS') })
    await flushPromises()
    expect(wrapper.get('[data-testid="projects-panel-task-status"]').text()).toBe('In Progress')

    await wrapper.get('[data-testid="projects-panel-task-back"]').trigger('click')
    expect(wrapper.find('[data-testid="projects-panel-task"]').exists()).toBe(false)
    expect((wrapper.get('[data-testid="project-tasks-search-input"]').element as HTMLInputElement).value).toBe('notes')
  })

  it('shows a Temp task with its reference files and links to the Temp task page', async () => {
    seed([], { [TEMP_TASKS_LIST_ID]: [tempTask('x1', 'Check links')] })
    const wrapper = await mountPanel()
    await card(wrapper, 'x1').trigger('click')
    expect(wrapper.get('[data-testid="projects-panel-task-reference-files"]').text()).toContain('/work/brief.md')
    expect(wrapper.get('[data-testid="projects-panel-task-status"]').text()).toBe('Open')
    expect(wrapper.get('[data-testid="projects-panel-task-open-page"]').findComponent(RouterLinkStub).props('to')).toBe('/projects/temp-tasks/tasks/x1')
  })

  it('says when an open Task is gone', async () => {
    seed([project('p1', 'Launch', '2026-10-05T00:00:00.000Z')], { p1: [projectTask('t1', 'Write')] })
    const wrapper = await mountPanel()
    await card(wrapper, 't1').trigger('click')
    useProjectTaskStore().applyChange({ type: 'task_removed', scope: { kind: 'project', projectId: 'p1' }, taskId: 't1' })
    await flushPromises()
    expect(wrapper.find('[data-testid="projects-panel-task-missing"]').exists()).toBe(true)
  })

  it('shows an empty state linking to the Projects page when there are no Projects and no Temp tasks', async () => {
    seed([], { [TEMP_TASKS_LIST_ID]: [] })
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-testid="projects-panel-empty"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="projects-panel-open-projects"]').findComponent(RouterLinkStub).props('to')).toBe('/projects')
  })
})
