import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computed, ref } from 'vue'
import type { ProjectTask, ProjectTaskStatus } from '~/types/project'

const task = (n: number, status: ProjectTaskStatus = 'TODO', partOfTaskId: string | null = null): ProjectTask => ({
  taskId: `t${n}`, projectId: 'p1', taskKey: `autobyteus-${n}`, description: `Task ${n}`, status, dependsOnTaskIds: [], partOfTaskId, comments: [],
  contextFiles: [], createdAt: '', updatedAt: '', root: null,
})
const { page } = vi.hoisted(() => ({ page: { task: null as ProjectTask | null } }))
vi.mock('vue-router', async (original) => ({ ...await original<typeof import('vue-router')>(), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useRoute: () => ({ path: '/projects/p1/tasks/x', query: {} }) }))
vi.mock('~/composables/projects/useProjectChangeFeed', () => ({ useProjectChangeFeed: () => undefined }))
vi.mock('~/services/projects/projectTaskContextClient', () => ({ createProjectTaskContextClient: () => ({}) }))
vi.mock('~/composables/projects/useProjectTaskPage', () => ({
  useProjectTaskPage: () => ({ project: computed(() => ({ projectId: 'p1', name: 'AutoByteus' })), task: ref(page.task), taskId: computed(() => page.task?.taskId ?? null),
    loading: ref(false), error: ref(''), heading: ref(null), current: () => true, load: vi.fn() }),
}))

import ProjectTaskDetail from '../ProjectTaskDetail.vue'
import { useProjectTaskStore } from '~/stores/projectTaskStore'

/** task-part-of on the Task page: the Part of / Parts card between Description and Dependencies, and the delete note (UXJ-005, VIS-013). */
describe('ProjectTaskDetail with parts', () => {
  beforeEach(() => { vi.clearAllMocks(); setActivePinia(createPinia()) })
  const open = async (target: ProjectTask, tasks: ProjectTask[]) => {
    page.task = target
    const store = useProjectTaskStore()
    store.listsByProjectId = { p1: { status: 'ready', tasks, hasLoaded: true, initialPending: false, refreshPending: false, error: null } } as any
    const wrapper = mount(ProjectTaskDetail, { props: { projectId: 'p1', taskReference: target.taskKey },
      global: { stubs: { NuxtLink: RouterLinkStub, TaskRootSection: true, TaskContextFiles: true } } })
    await flushPromises()
    return wrapper
  }
  const confirmDelete = async (wrapper: Awaited<ReturnType<typeof open>>) => {
    await wrapper.get('[data-testid="task-page-delete"]').trigger('click')
    await flushPromises()
    return wrapper.get('[data-testid="task-page-delete-confirmation"]')
  }

  it('places the card after Comments, before Dependencies (task-comments puts Comments right after Description)', async () => {
    const tasks = [task(1), task(2, 'TODO', 't1')]
    const wrapper = await open(tasks[0]!, tasks)
    const order = [...wrapper.get('[data-testid="task-page-reading-surface"]').element.parentElement!.children].map((el) => el.getAttribute('data-testid')).filter(Boolean)
    expect(order.indexOf('task-comments')).toBe(order.indexOf('task-page-reading-surface') + 1)
    expect(order.indexOf('task-parts')).toBe(order.indexOf('task-comments') + 1)
    expect(order.indexOf('task-dependencies')).toBe(order.indexOf('task-parts') + 1)
  })

  it('a parent\'s delete confirmation says its parts stay, with the count; one part, a part or a Task without parts get no or the single note (AC-020)', async () => {
    const five = [task(1), ...[2, 3, 4, 5, 6].map((n) => task(n, n === 6 ? 'CANCELLED' : 'TODO', 't1'))]
    expect((await confirmDelete(await open(five[0]!, five))).get('[data-testid="task-page-delete-parts-note"]').text()).toBe('Its 5 parts stay as separate Tasks.')
    const one = [task(1), task(2, 'DONE', 't1')]
    expect((await confirmDelete(await open(one[0]!, one))).get('[data-testid="task-page-delete-parts-note"]').text()).toBe('Its part stays as a separate Task.')
    expect((await confirmDelete(await open(one[1]!, one))).find('[data-testid="task-page-delete-parts-note"]').exists()).toBe(false)
    expect((await confirmDelete(await open(task(9), [task(9)]))).find('[data-testid="task-page-delete-parts-note"]').exists()).toBe(false)
  })
})
