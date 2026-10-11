import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('~/composables/projects/useProjectChangeFeed', () => ({ useProjectChangeFeed: vi.fn() }))
vi.mock('~/composables/projects/useTaskRootNavigation', () => ({ useTaskRootNavigation: () => ({ open: vi.fn() }) }))

import ProjectsPanel from '../ProjectsPanel.vue'
import { useProjectStore } from '~/stores/projectStore'
import { LIVE_HIGHLIGHT_MS, TEMP_TASKS_LIST_ID, useProjectTaskStore } from '~/stores/projectTaskStore'
import { TASK_LOCATE_EXPIRY_MS, useTaskLocatorStore } from '~/stores/taskLocatorStore'
import { useProjectsPanelStore } from '~/stores/projectsPanelStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type { Project, ProjectTask, ProjectTaskStatus, TaskWithoutProject, TaskWorkerTask } from '~/types/project'

const project = (projectId: string, updatedAt: string): Project => ({ projectId, name: projectId, description: '', createdAt: updatedAt, updatedAt,
  workspaces: [], openTaskCount: 1, taskCount: 1 })
const projectTask = (taskId: string, projectId: string, description: string, status: ProjectTaskStatus = 'TODO', minute = 0): ProjectTask => ({
  taskId, projectId, description, status, contextFiles: [], createdAt: '2026-10-07T00:00:00.000Z',
  updatedAt: `2026-10-07T00:${String(minute).padStart(2, '0')}:00.000Z`, root: null })
const tempTask = (taskId: string, description: string, status: ProjectTaskStatus = 'TODO', minute = 0): TaskWithoutProject => ({
  taskId, description, status, referenceFiles: [], createdAt: '2026-10-07T00:00:00.000Z',
  updatedAt: `2026-10-07T00:${String(minute).padStart(2, '0')}:00.000Z`, root: null })
const target = (task: ProjectTask | TaskWithoutProject): TaskWorkerTask =>
  ({ taskId: task.taskId, projectId: 'projectId' in task ? task.projectId : null, description: task.description, status: task.status })

/** Server lists by list id; a list set to `deferred` answers when `release(id)` is called. */
let server: Record<string, unknown[]>
const deferred = new Map<string, () => void>()
const hold = (id: string) => { deferred.set(id, () => undefined) }
const release = (id: string) => { deferred.get(id)?.(); deferred.delete(id) }
const answer = (id: string) => (id === TEMP_TASKS_LIST_ID ? { data: { tasksWithoutProject: server[id] ?? [] } } : { data: { projectTasks: server[id] ?? [] } })

const settle = async () => { for (let i = 0; i < 3; i++) { await flushPromises(); await new Promise((resolve) => setTimeout(resolve, 20)) } }
const scrollIntoView = vi.fn()
const reducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn((query: string) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as any
}
const mountPanel = async () => {
  const wrapper = mount(ProjectsPanel, { attachTo: document.body, global: { stubs: { NuxtLink: RouterLinkStub } } })
  wrappers.push(wrapper)
  await settle()
  return wrapper
}
const wrappers: ReturnType<typeof mount>[] = []
const row = (wrapper: Awaited<ReturnType<typeof mountPanel>>, taskId: string) => wrapper.get(`[data-testid="project-task-row-${taskId}"]`)
/** The summary click with the shell present: the shell's reveal step is the store call it makes. */
const locate = (task: TaskWorkerTask) => {
  const locator = useTaskLocatorStore()
  locator.locate(task, () => { throw new Error('openRun must not run while a shell is mounted') })
  locator.markRevealed(locator.request!.seq)
  return locator.request!.seq
}

describe('Projects tab: locating a Task (delegated-copy-task-locator DS-002)', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); window.localStorage.clear(); vi.clearAllMocks(); deferred.clear()
    server = {}
    io.query.mockImplementation(({ variables }: { variables: { projectId?: string } }) => {
      const id = variables.projectId ?? TEMP_TASKS_LIST_ID
      if (!deferred.has(id)) return Promise.resolve(answer(id))
      return new Promise((resolve) => deferred.set(id, () => resolve(answer(id))))
    })
    vi.spyOn(useWindowNodeContextStore(), 'waitForBoundBackendReady').mockResolvedValue(true)
    const projectStore = useProjectStore()
    const projects = [project('p1', '2026-10-05T00:00:00.000Z'), project('p2', '2026-10-01T00:00:00.000Z')]
    projectStore.fetchProjects = vi.fn(async () => { projectStore.projects = projects; projectStore.hasFetched = true; return projects }) as any
    useTaskLocatorStore().registerShell()
    Element.prototype.scrollIntoView = scrollIntoView
    reducedMotion(false)
  })
  afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); vi.useRealTimers() })

  it('switches to the Task\'s Project, centres, focuses and highlights its card for 2.4 s (AC-005, AC-006)', async () => {
    server = { p1: [projectTask('a1', 'p1', 'Other work')], p2: [projectTask('b1', 'p2', 'Ship the summary line')] }
    const wrapper = await mountPanel()
    expect(useProjectsPanelStore().choice).toEqual({ kind: 'project', projectId: 'p1' })

    locate(target(server.p2![0] as ProjectTask))
    await settle()

    expect(useProjectsPanelStore().choice).toEqual({ kind: 'project', projectId: 'p2' })
    expect(JSON.parse(window.localStorage.getItem(`autobyteus.projectsPanel.choice.${useWindowNodeContextStore().nodeId}`)!)).toEqual({ kind: 'project', projectId: 'p2' })
    const card = row(wrapper, 'b1')
    expect(card.classes()).toContain('is-located')
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' })
    expect(document.activeElement).toBe(card.get('[data-testid="project-task-row-link"]').element)
    expect(useTaskLocatorStore().request).toBeNull()
  })

  it('a just-mounted board waits for its own mount read and never decides on the cached snapshot (AR-004)', async () => {
    server = { p1: [projectTask('a1', 'p1', 'Other work')] }
    // A stale cached p2 list (the Task still open there) from an earlier visit.
    const taskStore = useProjectTaskStore()
    taskStore.listsByProjectId = { ...taskStore.listsByProjectId,
      p2: { status: 'ready', tasks: [projectTask('b1', 'p2', 'Dropped work', 'TODO')], hasLoaded: true, initialPending: false, refreshPending: false, error: null } }
    const wrapper = await mountPanel()
    server.p2 = [projectTask('b1', 'p2', 'Dropped work', 'CANCELLED')]
    hold('p2')

    const seq = locate({ taskId: 'b1', projectId: 'p2', description: 'Dropped work', status: 'CANCELLED' })
    await settle()
    expect(useTaskLocatorStore().request).toMatchObject({ seq, step: 'revealed' })
    expect(row(wrapper, 'b1').classes()).not.toContain('is-located')

    release('p2')
    await settle()
    // The fresh list says Cancelled: the Cancelled lane is shown and the card located there (AC-010).
    expect(wrapper.get('[data-testid="project-tasks-cancelled-toggle"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="project-task-column-CANCELLED"]').find('[data-testid="project-task-row-b1"]').classes()).toContain('is-located')
  })

  it('clears a search that hides the Task and keeps one that still shows it (AC-009)', async () => {
    server = { p1: [projectTask('a1', 'p1', 'Release notes'), projectTask('a2', 'p1', 'Design review', 'IN_PROGRESS', 1)] }
    const wrapper = await mountPanel()
    const search = wrapper.get('[data-testid="project-tasks-search-input"]')

    await search.setValue('release')
    locate(target(server.p1![0] as ProjectTask))
    await settle()
    expect((search.element as HTMLInputElement).value).toBe('release')
    expect(row(wrapper, 'a1').classes()).toContain('is-located')

    locate(target(server.p1![1] as ProjectTask))
    await settle()
    expect((search.element as HTMLInputElement).value).toBe('')
    expect(row(wrapper, 'a2').classes()).toContain('is-located')
    // Only the latest located card is highlighted (AC-013).
    expect(row(wrapper, 'a1').classes()).not.toContain('is-located')
  })

  it('returns from an open Task to the board, and leaves a Task absent from the list alone until the request expires (AC-007)', async () => {
    server = { p1: [projectTask('a1', 'p1', 'Release notes'), projectTask('a2', 'p1', 'Design review')] }
    const wrapper = await mountPanel()
    await row(wrapper, 'a1').get('[data-testid="project-task-row-link"]').trigger('click')
    expect(wrapper.get('[data-testid="projects-panel-board"]').attributes('style')).toContain('display: none')

    locate(target(server.p1![1] as ProjectTask))
    await settle()
    expect(wrapper.get('[data-testid="projects-panel-board"]').attributes('style') ?? '').not.toContain('display: none')
    expect(row(wrapper, 'a2').classes()).toContain('is-located')

    vi.useFakeTimers()
    const seq = locate({ taskId: 'gone', projectId: 'p1', description: 'Deleted', status: 'TODO' })
    await vi.advanceTimersByTimeAsync(100)
    expect(useTaskLocatorStore().request).toMatchObject({ seq, step: 'revealed' })
    await vi.advanceTimersByTimeAsync(TASK_LOCATE_EXPIRY_MS)
    expect(useTaskLocatorStore().request).toBeNull()
  })

  it('Temp tasks: a Done Task past the first ten turns on Show all; a Cancelled one turns on its lane (AC-011, DEC-008)', async () => {
    const done = Array.from({ length: 12 }, (_, i) => tempTask(`d${i}`, `Done ${i}`, 'DONE', i + 1))
    server = { p1: [], [TEMP_TASKS_LIST_ID]: [...done, tempTask('c1', 'Dropped', 'CANCELLED', 30)] }
    const wrapper = await mountPanel()

    locate(target(done[0]!))
    await settle()
    expect(useProjectsPanelStore().choice).toEqual({ kind: 'temp' })
    expect(wrapper.get('[data-testid="temp-task-lane-show-all"]').attributes('aria-expanded')).toBe('true')
    expect(row(wrapper, 'd0').classes()).toContain('is-located')

    locate(target(server[TEMP_TASKS_LIST_ID]!.at(-1) as TaskWithoutProject))
    await settle()
    expect(wrapper.get('[data-testid="temp-tasks-cancelled-toggle"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="temp-task-lane-cancelled"]').find('[data-testid="project-task-row-c1"]').classes()).toContain('is-located')
  })

  it('scrolls instantly with reduced motion; the highlight ends after 2.4 s', async () => {
    reducedMotion(true)
    server = { p1: [projectTask('a1', 'p1', 'Release notes')] }
    const wrapper = await mountPanel()
    vi.useFakeTimers()
    locate(target(server.p1![0] as ProjectTask))
    await vi.advanceTimersByTimeAsync(100)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' })
    expect(row(wrapper, 'a1').attributes('data-located')).toBe('true')
    await vi.advanceTimersByTimeAsync(LIVE_HIGHLIGHT_MS - 101)
    expect(row(wrapper, 'a1').classes()).toContain('is-located')
    await vi.advanceTimersByTimeAsync(100)
    expect(row(wrapper, 'a1').classes()).not.toContain('is-located')
  })
})
