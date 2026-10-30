import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { h, ref } from 'vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import type { ProjectTask, ProjectTaskStatus, TaskWithoutProject } from '~/types/project'
import TaskDependencyBadge from '../TaskDependencyBadge.vue'
import TaskDependenciesSection from '../TaskDependenciesSection.vue'
import TaskDependencyPicker from '../TaskDependencyPicker.vue'
import TaskKeyChip from '../TaskKeyChip.vue'
import TaskKey from '../TaskKey.vue'
import ProjectTaskRow from '../ProjectTaskRow.vue'

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))

const task = (n: number, status: ProjectTaskStatus = 'TODO', dependsOnTaskIds: string[] = [], description = `Task ${n} summary`): ProjectTask => ({
  taskId: `t${n}`, projectId: 'p1', taskKey: `autobyteus-${n}`, title: description.split('\n')[0]!, description, status, dependsOnTaskIds,
  contextFiles: [], createdAt: '', updatedAt: '', root: null,
})
/** The badge's visible parts (label, key, +N), which the layout spaces with its gap. */
const parts = (badge: { element: Element }) => [...badge.element.children].filter((part) => part.tagName === 'SPAN' && !part.hasAttribute('data-icon'))
  .map((part) => part.textContent?.trim())
const seed = (tasks: ProjectTask[]) => {
  const store = useProjectTaskStore()
  store.listsByProjectId = { ...store.listsByProjectId, p1: { status: 'ready', tasks, hasLoaded: true, initialPending: false, refreshPending: false, error: null } } as any
  store.fetchTasks = vi.fn(async () => tasks) as any
  return store
}

beforeEach(() => setActivePinia(createPinia()))
afterEach(async () => { vi.useRealTimers(); await localizationRuntime.setPreference('en') })

describe('TaskDependencyBadge (UXJ-001, VIS-002a–d)', () => {
  it('"Blocked by <lowest open key> +N" in amber with the hover list of every dependency and its status', () => {
    const tasks = [task(39, 'IN_PROGRESS'), task(38), task(28, 'DONE'), task(41, 'TODO', ['t39', 't38', 't28'])]
    const wrapper = mount(TaskDependencyBadge, { props: { task: tasks[3]!, tasks } })
    const badge = wrapper.get('[data-testid="task-dependency-badge-blocked"]')
    expect(parts(badge)).toEqual(['Blocked by', 'autobyteus-38', '+1'])
    expect(badge.classes()).toEqual(expect.arrayContaining(['bg-amber-50', 'text-amber-800', 'ring-amber-200', 'rounded-full']))
    expect(badge.get('[data-icon]').attributes('data-icon')).toBe('heroicons:link-20-solid')
    expect(badge.attributes('title')).toBe('Depends on: autobyteus-28 (Done), autobyteus-38 (To Do), autobyteus-39 (In Progress)')
  })

  it('"Dependency cancelled: <key>" in grey when nothing is open; nothing when all are Done', () => {
    const tasks = [task(31, 'CANCELLED'), task(28, 'DONE'), task(41, 'IN_PROGRESS', ['t31', 't28']), task(42, 'TODO', ['t28'])]
    const cancelled = mount(TaskDependencyBadge, { props: { task: tasks[2]!, tasks } }).get('[data-testid="task-dependency-badge-cancelled"]')
    expect(parts(cancelled)).toEqual(['Dependency cancelled:', 'autobyteus-31'])
    expect(cancelled.classes()).toEqual(expect.arrayContaining(['bg-white', 'text-slate-600', 'ring-slate-300']))
    expect(mount(TaskDependencyBadge, { props: { task: tasks[3]!, tasks } }).html()).not.toContain('task-dependency-badge')
  })

  it('uses the approved zh-CN wording', async () => {
    await localizationRuntime.setPreference('zh-CN')
    const tasks = [task(35), task(41, 'TODO', ['t35'])]
    expect(parts(mount(TaskDependencyBadge, { props: { task: tasks[1]!, tasks } }).get('[data-testid="task-dependency-badge-blocked"]'))).toEqual(['等待', 'autobyteus-35'])
  })
})

describe('ProjectTaskRow: no key line, badge kept (task-keys-declutter REQ-001; DEC-009)', () => {
  const mountRow = (row: ProjectTask | TaskWithoutProject) => mount(ProjectTaskRow, { props: { task: row }, global: { stubs: { NuxtLink: RouterLinkStub } } })

  it('a Project Task card starts with its summary, shows no key of its own, and keeps its badge from the Project list', () => {
    const tasks = [task(35), task(41, 'TODO', ['t35'])]
    seed(tasks)
    const wrapper = mountRow(tasks[1]!)
    expect(wrapper.find('[data-testid="project-task-row-key"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="project-task-row-link"]').element.firstElementChild?.getAttribute('data-testid')).toBe('project-task-row-text')
    expect(wrapper.text()).not.toContain('autobyteus-41')
    const badge = wrapper.get('[data-testid="project-task-row-dependency"]')
    expect(badge.text()).toContain('Blocked by')
    expect(badge.get('[data-testid="task-key"]').attributes('data-key')).toBe('autobyteus-35')
  })

  it('a Temp task card has no key and no badge', () => {
    const temp: TaskWithoutProject = { taskId: 'x1', description: 'Temp', status: 'TODO', referenceFiles: [], createdAt: '', updatedAt: '', root: null }
    const wrapper = mountRow(temp)
    expect(wrapper.find('[data-testid="project-task-row-key"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="project-task-row-dependency"]').exists()).toBe(false)
  })
})

describe('TaskKey (UXJ-005, VIS-013/014)', () => {
  it('shows the whole key when it fits and middle-shortens only the Project part when it does not, keeping the number and the full key', async () => {
    const fits = mount(TaskKey, { props: { taskKey: 'customer-onboarding-experience-redesign-12' } })
    await flushPromises()
    expect(fits.get('[data-testid="task-key"]').attributes('title')).toBe('customer-onboarding-experience-redesign-12')
    expect(fits.findAll('[data-testid="task-key"] > span').map((part) => part.text())).toEqual(['customer-onboarding-experience-redesign-12'])
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(400)
    const client = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(120)
    const tight = mount(TaskKey, { props: { taskKey: 'customer-onboarding-experience-redesign-12' } })
    await flushPromises()
    const parts = tight.findAll('[data-testid="task-key"] > span')
    expect(parts.map((part) => part.text())).toEqual(['customer-onboarding-experience-redesign', '-12'])
    expect(parts[0]!.classes()).toContain('truncate')
    expect(parts[1]!.classes()).toContain('flex-shrink-0')
    expect(tight.get('[data-testid="task-key"]').attributes('data-key')).toBe('customer-onboarding-experience-redesign-12')
    scroll.mockRestore(); client.mockRestore()
  })
})

describe('TaskKeyChip (UXJ-002, VIS-006)', () => {
  it('copies the key, shows "Copied" as a status for 1.5 s, and names the button with the key', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const wrapper = mount(TaskKeyChip, { props: { taskKey: 'autobyteus-42' } })
    const button = wrapper.get('[data-testid="task-key-copy"]')
    expect(button.attributes('aria-label')).toBe('Copy Task key autobyteus-42')
    expect(button.attributes('title')).toBe('Copy key')
    await button.trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('autobyteus-42')
    expect(wrapper.get('[data-testid="task-key-copied"]').attributes('role')).toBe('status')
    expect(wrapper.get('[data-testid="task-key-copied"]').text()).toBe('Copied')
    vi.advanceTimersByTime(1499); await flushPromises()
    expect(wrapper.find('[data-testid="task-key-copied"]').exists()).toBe(true)
    vi.advanceTimersByTime(1); await flushPromises()
    expect(wrapper.find('[data-testid="task-key-copied"]').exists()).toBe(false)
  })

  it('a failed clipboard write is reported like the other copy buttons; the key stays visible', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async () => { throw new Error('denied') }) }, configurable: true })
    const wrapper = mount(TaskKeyChip, { props: { taskKey: 'autobyteus-42' } })
    await wrapper.get('[data-testid="task-key-copy"]').trigger('click')
    await flushPromises()
    expect(error).toHaveBeenCalledWith('Failed to copy text: ', expect.any(Error))
    expect(wrapper.get('[data-testid="task-key"]').text()).toBe('autobyteus-42')
  })
})

describe('TaskDependenciesSection (UXJ-002, VIS-003–005, VIS-011)', () => {
  it('lists every dependency in key order with Done ✓, the informs note while blocked, Required by, and "None"', () => {
    const tasks = [task(39, 'IN_PROGRESS'), task(28, 'DONE'), task(41, 'TODO', ['t39', 't28', 'deleted'])]
    const wrapper = mount(TaskDependenciesSection, { props: { task: tasks[2]!, tasks }, global: { stubs: { NuxtLink: RouterLinkStub } } })
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe(wrapper.get('h2').attributes('id'))
    expect(wrapper.get('h2').text()).toBe('Dependencies')
    const dependsOn = wrapper.get('[data-testid="task-dependencies-depends-on"]')
    expect(dependsOn.get('h3').text()).toBe('Depends on')
    expect(dependsOn.findAll('[data-testid="task-key"]').map((k) => k.text())).toEqual(['autobyteus-28', 'autobyteus-39'])
    expect(dependsOn.findAll('[data-testid="task-dependency-status"]').map((s) => s.text())).toEqual(['Done', 'In Progress'])
    expect(dependsOn.findAll('[data-testid="task-dependency-status"]')[0]!.find('[data-icon="heroicons:check-20-solid"]').exists()).toBe(true)
    expect(dependsOn.findAllComponents(RouterLinkStub).map((link: { props(name: string): unknown }) => link.props('to'))).toEqual(['/projects/p1/tasks/autobyteus-28', '/projects/p1/tasks/autobyteus-39'])
    expect(wrapper.get('[data-testid="task-dependencies-informs"]').text()).toBe('Only informs: work on this Task can start at any time.')
    const requiredBy = wrapper.get('[data-testid="task-dependencies-required-by"]')
    expect(requiredBy.get('h3').text()).toBe('Required by')
    expect(requiredBy.get('[data-testid="task-dependencies-none"]').text()).toBe('None')
  })

  it('a follow-up keeps its Done dependency without the informs note; the tab opens rows in place', async () => {
    const tasks = [task(28, 'DONE'), task(41, 'TODO', ['t28'])]
    const wrapper = mount(TaskDependenciesSection, { props: { task: tasks[1]!, tasks, compact: true } })
    expect(wrapper.find('[data-testid="task-dependencies-informs"]').exists()).toBe(false)
    await wrapper.get('[data-testid="task-dependency-t28"]').trigger('click')
    expect(wrapper.emitted('open-task')).toEqual([['t28']])
    const required = mount(TaskDependenciesSection, { props: { task: tasks[0]!, tasks, compact: true } })
    expect(required.get('[data-testid="task-dependencies-depends-on"]').text()).toContain('None')
    expect(required.get('[data-testid="task-dependencies-required-by"]').text()).toContain('autobyteus-41')
  })
})

describe('TaskDependencyPicker (UXJ-003, VIS-007–009, QR-004)', () => {
  const mountPicker = (taskId: string | undefined, chosen: string[] = []) => {
    const model = ref(chosen)
    const wrapper = mount({ render: () => h(TaskDependencyPicker, { projectId: 'p1', projectName: 'AutoByteus', taskId, modelValue: model.value,
      'onUpdate:modelValue': (value: string[]) => { model.value = value } }) }, { attachTo: document.body })
    return { wrapper, model }
  }
  const input = (wrapper: ReturnType<typeof mountPicker>['wrapper']) => wrapper.get('[data-testid="task-dependency-input"]')
  const optionIds = (wrapper: ReturnType<typeof mountPicker>['wrapper']) =>
    wrapper.findAll('[role="option"]').map((o) => o.attributes('data-testid')!.replace('task-dependency-option-', ''))

  it('shows the label, help and combobox; opens up to 8 options of this Project, newest key first, never itself or chosen', async () => {
    seed(Array.from({ length: 12 }, (_, i) => task(i + 1)))
    const { wrapper } = mountPicker('t12', ['t11'])
    expect(wrapper.get('label').text().replace(/\s+/g, ' ')).toBe('Depends on (optional)')
    expect(wrapper.text()).toContain('Tasks in AutoByteus that come first, including a Task this one follows up. It never stops work on this Task.')
    const box = input(wrapper)
    expect(box.attributes()).toMatchObject({ role: 'combobox', 'aria-expanded': 'false', placeholder: 'Add a Task · Search by key or text' })
    await box.trigger('click')
    expect(box.attributes('aria-expanded')).toBe('true')
    expect(box.attributes('aria-controls')).toBe(wrapper.get('[role="listbox"]').attributes('id'))
    expect(optionIds(wrapper)).toEqual(['t10', 't9', 't8', 't7', 't6', 't5', 't4', 't3'])
    expect(wrapper.get('[data-testid="task-dependency-selected-t11"]').text()).toContain('autobyteus-11')
  })

  it('filters by key or text and says when nothing matches', async () => {
    seed([task(1, 'TODO', [], 'Write the docs'), task(2, 'DONE', [], 'Fix the build'), task(3)])
    const { wrapper } = mountPicker('t3')
    await input(wrapper).setValue('autobyteus-2')
    expect(optionIds(wrapper)).toEqual(['t2'])
    await input(wrapper).setValue('DOCS')
    expect(optionIds(wrapper)).toEqual(['t1'])
    await input(wrapper).setValue('nothing like this')
    expect(wrapper.get('[role="listbox"]').text()).toBe('No other Tasks in this Project match.')
  })

  it('greys a loop option ("Depends on this Task"), skips it with the arrows, adds with Enter, closes after a choice and keeps focus', async () => {
    seed([task(1), task(2, 'TODO', ['t1']), task(3, 'TODO', ['t2']), task(4)])
    const { wrapper, model } = mountPicker('t1')
    await input(wrapper).trigger('click')
    expect(optionIds(wrapper)).toEqual(['t4', 't3', 't2'])
    const loop = wrapper.get('[data-testid="task-dependency-option-t3"]')
    expect(loop.attributes('aria-disabled')).toBe('true')
    expect(loop.text()).toContain('Depends on this Task')
    expect(loop.classes()).toEqual(expect.arrayContaining(['cursor-not-allowed', 'text-slate-400']))
    expect(input(wrapper).attributes('aria-activedescendant')).toBe(wrapper.findAll('[role="option"]')[0]!.attributes('id'))
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    expect(input(wrapper).attributes('aria-activedescendant')).toBe(wrapper.findAll('[role="option"]')[0]!.attributes('id'))
    await loop.trigger('mousedown')
    expect(model.value).toEqual([])
    await input(wrapper).trigger('keydown', { key: 'Enter' })
    expect(model.value).toEqual(['t4'])
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    expect(document.activeElement).toBe(input(wrapper).element)
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true)
    await input(wrapper).trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('with the options already loaded and the newest a loop, Enter chooses the first choosable Task (autobyteus-320, AC-010)', async () => {
    // Editing t2: t4 and t3 depend on it (loops), t1 is choosable; nothing changes the options after mount.
    seed([task(1), task(2), task(3, 'TODO', ['t2']), task(4, 'TODO', ['t3'])])
    const { wrapper, model } = mountPicker('t2')
    await input(wrapper).trigger('click')
    expect(optionIds(wrapper)).toEqual(['t4', 't3', 't1'])
    expect(input(wrapper).attributes('aria-activedescendant')).toBe(wrapper.findAll('[role="option"]')[2]!.attributes('id'))
    await input(wrapper).trigger('keydown', { key: 'Enter' })
    expect(model.value).toEqual(['t1'])
    wrapper.unmount()
  })

  it('with only loop options, Enter chooses nothing', async () => {
    seed([task(2), task(3, 'TODO', ['t2'])])
    const { wrapper, model } = mountPicker('t2')
    await input(wrapper).trigger('click')
    await input(wrapper).trigger('keydown', { key: 'Enter' })
    expect(model.value).toEqual([])
    wrapper.unmount()
  })

  it('removes a chosen Task with its labelled ×, returning focus to the search', async () => {
    seed([task(1), task(2)])
    const { wrapper, model } = mountPicker('t2', ['t1'])
    const remove = wrapper.get('[data-testid="task-dependency-remove"]')
    expect(remove.attributes('aria-label')).toBe('Remove autobyteus-1')
    await remove.trigger('click')
    expect(model.value).toEqual([])
    expect(document.activeElement).toBe(input(wrapper).element)
    wrapper.unmount()
  })
})
