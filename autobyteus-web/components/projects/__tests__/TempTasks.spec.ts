import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('~/composables/projects/useProjectChangeFeed', () => ({ useProjectChangeFeed: vi.fn() }))
vi.mock('~/composables/projects/useTaskRootNavigation', () => ({ useTaskRootNavigation: () => ({ open: vi.fn() }) }))

import TempTaskBoard from '../TempTaskBoard.vue'
import TempTaskDetail from '../TempTaskDetail.vue'
import TempTasksLink from '../TempTasksLink.vue'
import { useProjectChangeFeed } from '~/composables/projects/useProjectChangeFeed'
import { TEMP_TASKS_LIST_ID, useProjectTaskStore } from '~/stores/projectTaskStore'
import type { TaskWithoutProject } from '~/types/project'

let store: ReturnType<typeof useProjectTaskStore>
const temp = (taskId: string, minute: number, status: TaskWithoutProject['status'] = 'TODO', description = `Temp ${taskId}`): TaskWithoutProject => ({
  taskId, description, status, referenceFiles: [], createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: `2026-10-01T00:${String(minute).padStart(2, '0')}:00.000Z`, root: null,
})
// The store keeps the list newest-updated first; seed it that way.
const seed = (tasks: TaskWithoutProject[]) => {
  const sorted = [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  store.fetchTasks = vi.fn(async () => {
    store.listsByProjectId = { ...store.listsByProjectId, [TEMP_TASKS_LIST_ID]: { status: 'ready', tasks: sorted, hasLoaded: true, initialPending: false, refreshPending: false, error: null } }
    return sorted
  }) as any
}
const global = { stubs: { NuxtLink: RouterLinkStub } }
const laneIds = (wrapper: ReturnType<typeof mount>, lane: string) =>
  wrapper.get(`[data-testid="temp-task-lane-${lane}"]`).findAll('div[data-testid^="project-task-row-"]').map((row) => row.attributes('data-testid')!.replace('project-task-row-', ''))

describe('Temp tasks (Tasks with no Project)', () => {
  beforeEach(() => { setActivePinia(createPinia()); store = useProjectTaskStore(); vi.clearAllMocks() })

  it('the board has Open and Done lanes; Done shows its 10 latest until Show all; the feed is retained', async () => {
    const done = Array.from({ length: 12 }, (_, i) => temp(`d${i}`, i + 1, 'DONE'))
    seed([temp('o1', 30, 'IN_PROGRESS'), temp('o2', 40), ...done])
    const wrapper = mount(TempTaskBoard, { global })
    await flushPromises()
    expect(useProjectChangeFeed).toHaveBeenCalled()
    expect(laneIds(wrapper, 'open')).toEqual(['o2', 'o1'])
    expect(laneIds(wrapper, 'done')).toEqual(['d11', 'd10', 'd9', 'd8', 'd7', 'd6', 'd5', 'd4', 'd3', 'd2'])
    const toggle = wrapper.get('[data-testid="temp-task-lane-show-all"]')
    expect(toggle.text()).toContain('12')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(laneIds(wrapper, 'done')).toHaveLength(12)
    await toggle.trigger('click')
    expect(laneIds(wrapper, 'done')).toHaveLength(10)
    // Rows open the read-only Temp task page.
    expect(wrapper.get('[data-testid="project-task-row-o2"]').findComponent(RouterLinkStub).props('to')).toBe('/projects/temp-tasks/tasks/o2')
  })

  it('search shows every match in both lanes (no cap), or a no-match state', async () => {
    const done = Array.from({ length: 12 }, (_, i) => temp(`d${i}`, i + 1, 'DONE', `Release note ${i}`))
    seed([temp('o1', 30, 'TODO', 'Release plan'), temp('o2', 40, 'TODO', 'Other'), ...done])
    const wrapper = mount(TempTaskBoard, { global })
    await flushPromises()
    await wrapper.get('[data-testid="temp-tasks-search-input"]').setValue('release')
    expect(laneIds(wrapper, 'open')).toEqual(['o1'])
    expect(laneIds(wrapper, 'done')).toHaveLength(12)
    expect(wrapper.find('[data-testid="temp-task-lane-show-all"]').exists()).toBe(false)
    await wrapper.get('[data-testid="temp-tasks-search-input"]').setValue('nothing like it')
    expect(wrapper.find('[data-testid="temp-tasks-no-match"]').exists()).toBe(true)
  })

  it('the Temp task page is read only: description, reference files and Assigned to; no edit controls', async () => {
    seed([{ ...temp('t1', 1), description: 'Review the plan\nCarefully', referenceFiles: ['/work/plan.md'] }])
    const wrapper = mount(TempTaskDetail, { props: { taskId: 't1' }, global })
    await flushPromises()
    expect(wrapper.get('[data-testid="temp-task-description"]').text()).toBe('Review the plan\nCarefully')
    expect(wrapper.get('[data-testid="temp-task-reference-files"]').text()).toContain('/work/plan.md')
    expect(wrapper.get('[data-testid="temp-task-status"]').text()).toBe('Open')
    expect(wrapper.find('[data-testid="task-page-not-assigned"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="temp-task-read-only"]').exists()).toBe(true)
    expect(wrapper.findAll('textarea, input, select')).toHaveLength(0)
  })

  it('a Temp task that is gone shows not found', async () => {
    seed([temp('t1', 1)])
    const wrapper = mount(TempTaskDetail, { props: { taskId: 'gone' }, global })
    await flushPromises()
    expect(wrapper.find('[data-testid="temp-task-not-found"]').exists()).toBe(true)
  })

  it('the header button counts Temp tasks that are not Done, hidden at 0, and follows the list', async () => {
    seed([temp('a', 1), temp('b', 2, 'IN_PROGRESS'), temp('c', 3, 'DONE')])
    const wrapper = mount(TempTasksLink, { global })
    await flushPromises()
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/projects/temp-tasks')
    expect(wrapper.get('[data-testid="temp-tasks-link-count"]').text()).toBe('2 open')
    store.applyChange({ type: 'task_upserted', scope: { kind: 'no_project' }, task: temp('a', 4, 'DONE') })
    store.applyChange({ type: 'task_upserted', scope: { kind: 'no_project' }, task: temp('b', 5, 'DONE') })
    await flushPromises()
    expect(wrapper.find('[data-testid="temp-tasks-link-count"]').exists()).toBe(false)
  })

  it('a Cancelled Temp task is neither Open nor Done: hidden until "Cancelled (N)" shows it as the last column (AC-009, SR-005)', async () => {
    seed([temp('o1', 10), temp('d1', 20, 'DONE'), temp('c1', 30, 'CANCELLED'), temp('c2', 40, 'CANCELLED')])
    const wrapper = mount(TempTaskBoard, { global })
    await flushPromises()
    const lanes = () => wrapper.findAll('section').map((section) => section.attributes('data-testid'))
    expect(lanes()).toEqual(['temp-task-lane-open', 'temp-task-lane-done'])
    expect(laneIds(wrapper, 'open')).toEqual(['o1'])
    expect(laneIds(wrapper, 'done')).toEqual(['d1'])
    const toggle = wrapper.get('[data-testid="temp-tasks-cancelled-toggle"]')
    expect(toggle.text()).toBe('Cancelled (2)')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(toggle.element.nextElementSibling).toBe(wrapper.get('[data-testid="temp-tasks-refresh"]').element)
    await toggle.trigger('click')
    expect(lanes()).toEqual(['temp-task-lane-open', 'temp-task-lane-done', 'temp-task-lane-cancelled'])
    expect(wrapper.get('[data-testid="temp-task-lanes"]').classes()).toContain('temp-board__lanes--with-cancelled')
    expect(wrapper.get('[data-testid="temp-task-lane-cancelled"] h2').text()).toBe('Cancelled2')
    expect(laneIds(wrapper, 'cancelled')).toEqual(['c2', 'c1'])
    await toggle.trigger('click')
    expect(wrapper.find('[data-testid="temp-task-lane-cancelled"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="temp-task-lanes"]').classes()).not.toContain('temp-board__lanes--with-cancelled')
  })

  it('without Cancelled Temp tasks there is no toggle; the page labels a Cancelled one "Cancelled"; the header count excludes it (AC-009)', async () => {
    seed([temp('o1', 10)])
    const board = mount(TempTaskBoard, { global })
    await flushPromises()
    expect(board.find('[data-testid="temp-tasks-cancelled-toggle"]').exists()).toBe(false)
    board.unmount()

    seed([temp('o1', 10), temp('c1', 30, 'CANCELLED')])
    const page = mount(TempTaskDetail, { props: { taskId: 'c1' }, global })
    await flushPromises()
    const pill = page.get('[data-testid="temp-task-status"]')
    expect(pill.text()).toBe('Cancelled')
    expect(pill.classes()).toEqual(expect.arrayContaining(['text-slate-500']))
    expect(pill.classes()).not.toContain('bg-emerald-50')
    const link = mount(TempTasksLink, { global })
    await flushPromises()
    expect(link.get('[data-testid="temp-tasks-link-count"]').text()).toBe('1 open')
    store.applyChange({ type: 'task_upserted', scope: { kind: 'no_project' }, task: temp('o1', 50, 'CANCELLED') })
    await flushPromises()
    expect(link.find('[data-testid="temp-tasks-link-count"]').exists()).toBe(false)
  })
})
