import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { h, ref } from 'vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import type { ProjectTask, ProjectTaskStatus, TaskWithoutProject } from '~/types/project'
import TaskPartsSection from '../TaskPartsSection.vue'
import TaskPartsProgress from '../TaskPartsProgress.vue'
import TaskPartOfMarker from '../TaskPartOfMarker.vue'
import TaskPartOfPicker from '../TaskPartOfPicker.vue'
import ProjectTaskRow from '../ProjectTaskRow.vue'

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))

/** task-part-of UI/UX spec: Parts card, card pill and "Part of" line, Part of field (UXJ-001 to UXJ-004, UXJ-006). */
const task = (n: number, status: ProjectTaskStatus = 'TODO', partOfTaskId: string | null = null, extra: Partial<ProjectTask> = {}): ProjectTask => ({
  taskId: `t${n}`, projectId: 'p1', taskKey: `autobyteus-${n}`, title: `Task ${n} summary`, description: `Task ${n} summary\nmore`, status, dependsOnTaskIds: [], partOfTaskId,
  contextFiles: [], createdAt: '', updatedAt: '', root: null, ...extra,
})
const seed = (tasks: ProjectTask[]) => {
  const store = useProjectTaskStore()
  store.listsByProjectId = { ...store.listsByProjectId, p1: { status: 'ready', tasks, hasLoaded: true, initialPending: false, refreshPending: false, error: null } } as any
  store.fetchTasks = vi.fn(async () => tasks) as any
  return store
}
/** A parent with parts To Do, In Progress, Done ×2 and Cancelled (VIS-003). */
const family = (parentStatus: ProjectTaskStatus = 'IN_PROGRESS') => [task(25, parentStatus), task(22, 'DONE', 't25'), task(19, 'TODO', 't25'),
  task(23, 'CANCELLED', 't25'), task(20, 'IN_PROGRESS', 't25'), task(21, 'DONE', 't25'), task(30)]
const section = (target: ProjectTask, tasks: ProjectTask[], compact = false) =>
  mount(TaskPartsSection, { props: { task: target, tasks, compact }, global: { stubs: { NuxtLink: RouterLinkStub } } })

beforeEach(() => setActivePinia(createPinia()))
afterEach(async () => { await localizationRuntime.setPreference('en') })

describe('TaskPartsSection (UXJ-002, UXJ-003; VIS-003–VIS-010)', () => {
  it('a parent lists every part in key order with status (Done ✓), "2 of 4 done · 1 cancelled", the close hint and New part (AC-009, AC-019, AC-020)', () => {
    const tasks = family()
    const wrapper = section(tasks[0]!, tasks)
    expect(wrapper.get('section').attributes('data-testid')).toBe('task-parts')
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe(wrapper.get('h2').attributes('id'))
    expect(wrapper.get('h2').text()).toBe('Parts')
    expect(wrapper.get('[data-testid="task-parts-summary"]').text().replace(/\s+/g, ' ')).toBe('2 of 4 done · 1 cancelled')
    expect(wrapper.findAll('[data-testid="task-key"]').map((k) => k.text())).toEqual(['autobyteus-19', 'autobyteus-20', 'autobyteus-21', 'autobyteus-22', 'autobyteus-23'])
    const statuses = wrapper.findAll('[data-testid="task-part-status"]')
    expect(statuses.map((s) => s.text())).toEqual(['To Do', 'In Progress', 'Done', 'Done', 'Cancelled'])
    expect(statuses[2]!.find('[data-icon="heroicons:check-20-solid"]').exists()).toBe(true)
    expect(statuses[0]!.find('[data-icon]').exists()).toBe(false)
    const links = wrapper.findAllComponents(RouterLinkStub).map((link: { props(name: string): unknown }) => link.props('to'))
    expect(links).toEqual(['/projects/p1/tasks/autobyteus-19', '/projects/p1/tasks/autobyteus-20', '/projects/p1/tasks/autobyteus-21',
      '/projects/p1/tasks/autobyteus-22', '/projects/p1/tasks/autobyteus-23', '/projects/p1/tasks/new?partOf=t25'])
    expect(wrapper.text()).toContain('Task 19 summary')
    expect(wrapper.text()).not.toContain('more')
    expect(wrapper.get('[data-testid="task-parts-close-hint"]').text()).toBe('Setting this Task to Done or Cancelled also sets its open parts the same way.')
    expect(wrapper.get('[data-testid="task-parts-new"]').text()).toBe('New part')
  })

  it('all counted parts Done: "3 of 3 done" and no hint; only Cancelled parts: just "1 cancelled"; none: "No parts yet." (VIS-004–VIS-006b)', () => {
    const allDone = [task(10, 'IN_PROGRESS'), task(11, 'DONE', 't10'), task(12, 'DONE', 't10'), task(13, 'DONE', 't10')]
    const done = section(allDone[0]!, allDone)
    expect(done.get('[data-testid="task-parts-summary"]').text()).toBe('3 of 3 done')
    expect(done.find('[data-testid="task-parts-close-hint"]').exists()).toBe(false)
    const onlyCancelled = [task(10), task(11, 'CANCELLED', 't10')]
    const cancelled = section(onlyCancelled[0]!, onlyCancelled)
    expect(cancelled.find('[data-testid="task-parts-progress-text"]').exists()).toBe(false)
    expect(cancelled.get('[data-testid="task-parts-summary"]').text()).toBe('1 cancelled')
    const none = section(task(10), [task(10)])
    expect(none.get('[data-testid="task-parts-none"]').text()).toBe('No parts yet.')
    expect(none.find('[data-testid="task-parts-summary"]').exists()).toBe(false)
    expect(none.get('[data-testid="task-parts-new"]').exists()).toBe(true)
  })

  it('a Done or Cancelled parent shows its progress but no close hint (VIS-006)', () => {
    for (const status of ['DONE', 'CANCELLED'] as const) {
      const tasks = family(status)
      const wrapper = section(tasks[0]!, tasks)
      expect(wrapper.get('[data-testid="task-parts-progress-text"]').text()).toBe('2 of 4 done')
      expect(wrapper.find('[data-testid="task-parts-close-hint"]').exists()).toBe(false)
    }
  })

  it('a part shows "Part of" with its parent\'s row (key · status · summary) opening it, no New part (AC-010, VIS-007a–c)', () => {
    for (const [status, label] of [['TODO', 'To Do'], ['DONE', 'Done'], ['CANCELLED', 'Cancelled']] as const) {
      const tasks = [task(25, status), task(22, 'TODO', 't25')]
      const wrapper = section(tasks[1]!, tasks)
      expect(wrapper.get('section').attributes('data-testid')).toBe('task-part-of')
      expect(wrapper.get('h2').text()).toBe('Part of')
      expect(wrapper.findAll('[data-testid="task-key"]').map((k) => k.text())).toEqual(['autobyteus-25'])
      expect(wrapper.get('[data-testid="task-part-status"]').text()).toBe(label)
      expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/projects/p1/tasks/autobyteus-25')
      expect(wrapper.find('[data-testid="task-parts-new"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="task-parts-summary"]').exists()).toBe(false)
    }
  })

  it('in the tab (compact) rows open inside the tab and there is no New part (VIS-009, VIS-010)', async () => {
    const tasks = family()
    const wrapper = section(tasks[0]!, tasks, true)
    expect(wrapper.find('[data-testid="task-parts-new"]').exists()).toBe(false)
    await wrapper.get('[data-testid="task-part-row-t19"]').trigger('click')
    expect(wrapper.emitted('open-task')).toEqual([['t19']])
    expect(wrapper.get('section > div').classes()).toContain('p-4')
  })
})

describe('Card relation line: TaskPartsProgress and TaskPartOfMarker (UXJ-001; VIS-002a–f)', () => {
  it('the parent pill: slate while open, emerald when every counted part is Done, hidden with no counted part; hover adds the cancelled count', () => {
    const tasks = family()
    const pill = mount(TaskPartsProgress, { props: { task: tasks[0]!, tasks } }).get('[data-testid="task-parts-progress"]')
    expect(pill.text()).toBe('2 of 4 done')
    expect(pill.attributes('title')).toBe('2 of 4 done · 1 cancelled')
    expect(pill.classes()).toEqual(expect.arrayContaining(['bg-slate-50', 'text-slate-600', 'ring-slate-200', 'rounded-full']))
    expect(pill.get('[data-icon]').attributes('data-icon')).toBe('heroicons:squares-2x2-20-solid')
    const complete = [task(10), task(11, 'DONE', 't10'), task(12, 'CANCELLED', 't10')]
    const green = mount(TaskPartsProgress, { props: { task: complete[0]!, tasks: complete } }).get('[data-testid="task-parts-progress"]')
    expect(green.text()).toBe('1 of 1 done')
    expect(green.classes()).toEqual(expect.arrayContaining(['bg-emerald-50', 'text-emerald-700', 'ring-emerald-200']))
    expect(green.get('[data-icon]').attributes('data-icon')).toBe('heroicons:check-circle-20-solid')
    const none = [task(10), task(11, 'TODO', 't10'), task(12, 'TODO', 't10')]
    expect(mount(TaskPartsProgress, { props: { task: none[0]!, tasks: none } }).text()).toBe('0 of 2 done')
    const onlyCancelled = [task(10), task(11, 'CANCELLED', 't10')]
    expect(mount(TaskPartsProgress, { props: { task: onlyCancelled[0]!, tasks: onlyCancelled } }).find('[data-testid="task-parts-progress"]').exists()).toBe(false)
  })

  it('the part line: "↳ Part of <key>" with the parent\'s summary and status on hover; nothing for a dangling parent', () => {
    const tasks = [task(25), task(22, 'TODO', 't25'), task(23, 'TODO', 'deleted')]
    const line = mount(TaskPartOfMarker, { props: { task: tasks[1]!, tasks } }).get('[data-testid="task-part-of-marker"]')
    // Label and key are separate pieces spaced by the line's 4 px gap.
    expect([...line.element.children].filter((piece) => !piece.hasAttribute('data-icon')).map((piece) => piece.textContent?.trim())).toEqual(['Part of', 'autobyteus-25'])
    expect(line.attributes('title')).toBe('Part of autobyteus-25: Task 25 summary (To Do)')
    expect(line.get('[data-icon]').attributes('data-icon')).toBe('heroicons:arrow-turn-down-right-20-solid')
    expect(line.classes()).toEqual(expect.arrayContaining(['text-xs', 'text-slate-500']))
    expect(line.classes().some((c) => c.startsWith('bg-') || c.startsWith('ring-'))).toBe(false)
    expect(mount(TaskPartOfMarker, { props: { task: tasks[2]!, tasks } }).find('[data-testid="task-part-of-marker"]').exists()).toBe(false)
  })

  it('ProjectTaskRow puts the Blocked badge, the pill and the line on one wrapping line, in that order; none for other cards (AC-011)', () => {
    const tasks = [task(25), task(22, 'TODO', 't25', { dependsOnTaskIds: ['t30'] }), task(30), task(19, 'TODO', 't25')]
    seed(tasks)
    const row = (target: ProjectTask | TaskWithoutProject) => mount(ProjectTaskRow, { props: { task: target }, global: { stubs: { NuxtLink: RouterLinkStub } } })
    const part = row(tasks[1]!).get('[data-testid="project-task-row-relations"]')
    expect(part.classes()).toEqual(expect.arrayContaining(['flex-wrap', 'gap-x-3', 'gap-y-1.5', 'mt-2']))
    expect([...part.element.children].map((child) => child.getAttribute('data-testid'))).toEqual(['project-task-row-dependency', 'task-part-of-marker'])
    const parent = row(tasks[0]!).get('[data-testid="project-task-row-relations"]')
    expect(parent.get('[data-testid="task-parts-progress"]').text()).toBe('0 of 2 done')
    expect(row(tasks[2]!).find('[data-testid="project-task-row-relations"]').exists()).toBe(false)
    const temp: TaskWithoutProject = { taskId: 'x1', description: 'Temp', status: 'TODO', referenceFiles: [], createdAt: '', updatedAt: '', root: null }
    expect(row(temp).find('[data-testid="project-task-row-relations"]').exists()).toBe(false)
  })
})

describe('TaskPartOfPicker (UXJ-004; VIS-011a–e, QR-004)', () => {
  const mountPicker = (taskId: string | undefined, chosen: string | null = null) => {
    const model = ref<string | null>(chosen)
    const wrapper = mount({ render: () => h(TaskPartOfPicker, { projectId: 'p1', projectName: 'AutoByteus', taskId, modelValue: model.value,
      'onUpdate:modelValue': (value: string | null) => { model.value = value } }) }, { attachTo: document.body })
    return { wrapper, model }
  }
  const input = (wrapper: ReturnType<typeof mountPicker>['wrapper']) => wrapper.get('[data-testid="task-part-of-input"]')
  const optionIds = (wrapper: ReturnType<typeof mountPicker>['wrapper']) =>
    wrapper.findAll('[role="option"]').map((o) => o.attributes('data-testid')!.replace('task-part-of-option-', ''))

  it('shows label, help and combobox; up to 8 options of this Project, newest key first, never itself or the chosen parent (VIS-011a)', async () => {
    seed(Array.from({ length: 12 }, (_, i) => task(i + 1)))
    const { wrapper } = mountPicker('t12', 't11')
    expect(wrapper.get('label').text().replace(/\s+/g, ' ')).toBe('Part of (optional)')
    expect(wrapper.text()).toContain("The bigger Task in AutoByteus that this Task is part of. One level only: a part can't have parts of its own.")
    const box = input(wrapper)
    expect(box.attributes()).toMatchObject({ role: 'combobox', 'aria-expanded': 'false', placeholder: 'Choose another Task · Search by key or text' })
    expect(box.attributes('aria-describedby')).toBe(wrapper.get('p').attributes('id'))
    await box.trigger('click')
    expect(box.attributes('aria-controls')).toBe(wrapper.get('[role="listbox"]').attributes('id'))
    expect(optionIds(wrapper)).toEqual(['t10', 't9', 't8', 't7', 't6', 't5', 't4', 't3'])
    expect(wrapper.get('[data-testid="task-part-of-selected"]').text()).toContain('autobyteus-11')
    wrapper.unmount()
  })

  it('an empty field says "Choose a Task"; filters by key or text; says when nothing matches (VIS-011d)', async () => {
    seed([task(1, 'TODO', null, { description: 'Write the docs' }), task(2, 'DONE', null, { description: 'Fix the build' }), task(3)])
    const { wrapper } = mountPicker('t3')
    expect(input(wrapper).attributes('placeholder')).toBe('Choose a Task · Search by key or text')
    await input(wrapper).setValue('autobyteus-2')
    expect(optionIds(wrapper)).toEqual(['t2'])
    await input(wrapper).setValue('DOCS')
    expect(optionIds(wrapper)).toEqual(['t1'])
    await input(wrapper).setValue('nothing like this')
    expect(wrapper.get('[role="listbox"]').text()).toBe('No other Tasks in this Project match.')
    wrapper.unmount()
  })

  it('greys Tasks that are parts ("Already part of a Task"), skips them with the arrows, chooses with Enter replacing the parent (VIS-011b, TR-005, TR-006)', async () => {
    seed([task(1), task(2, 'TODO', 't1'), task(3), task(4)])
    const { wrapper, model } = mountPicker('t4', 't1')
    await input(wrapper).trigger('click')
    expect(optionIds(wrapper)).toEqual(['t3', 't2'])
    const part = wrapper.get('[data-testid="task-part-of-option-t2"]')
    expect(part.attributes('aria-disabled')).toBe('true')
    expect(part.text()).toContain('Already part of a Task')
    expect(part.classes()).toEqual(expect.arrayContaining(['cursor-not-allowed', 'text-slate-400']))
    await part.trigger('mousedown')
    expect(model.value).toBe('t1')
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    expect(input(wrapper).attributes('aria-activedescendant')).toBe(wrapper.findAll('[role="option"]')[0]!.attributes('id'))
    await input(wrapper).trigger('keydown', { key: 'Enter' })
    expect(model.value).toBe('t3')
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    expect(document.activeElement).toBe(input(wrapper).element)
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    await input(wrapper).trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('when the newest Task is a part, the first active option is still a choosable one: Enter right away chooses it (QR-004)', async () => {
    seed([task(1), task(2), task(3, 'TODO', 't1')])
    const { wrapper, model } = mountPicker(undefined)
    await input(wrapper).trigger('click')
    expect(optionIds(wrapper)).toEqual(['t3', 't2', 't1'])
    expect(input(wrapper).attributes('aria-activedescendant')).toBe(wrapper.findAll('[role="option"]')[1]!.attributes('id'))
    await input(wrapper).trigger('keydown', { key: 'Enter' })
    expect(model.value).toBe('t2')
    wrapper.unmount()
  })

  it('removes the parent with its labelled ×, returning focus to the search (TR-007)', async () => {
    seed([task(1), task(2)])
    const { wrapper, model } = mountPicker('t2', 't1')
    const remove = wrapper.get('[data-testid="task-part-of-remove"]')
    expect(remove.attributes('aria-label')).toBe('Remove autobyteus-1')
    await remove.trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(model.value).toBeNull()
    expect(document.activeElement).toBe(input(wrapper).element)
    wrapper.unmount()
  })

  it('a Task that has parts gets the explanation instead of a search (VIS-011e)', () => {
    seed([task(1), task(2, 'TODO', 't1')])
    const { wrapper } = mountPicker('t1')
    expect(wrapper.get('[data-testid="task-part-of-has-parts"]').text()).toBe("This Task has parts, so it can't be part of another Task.")
    expect(wrapper.find('[data-testid="task-part-of-input"]').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('zh-CN (AC-013, VIS-016a–d)', () => {
  it('uses the approved strings', async () => {
    await localizationRuntime.setPreference('zh-CN')
    const tasks = family()
    const wrapper = section(tasks[0]!, tasks)
    expect(wrapper.get('h2').text()).toBe('子任务')
    expect(wrapper.get('[data-testid="task-parts-summary"]').text().replace(/\s+/g, ' ')).toBe('4 个中已完成 2 个 · 1 个已取消')
    expect(wrapper.get('[data-testid="task-parts-new"]').text()).toBe('新建子任务')
    expect(section(tasks[1]!, tasks).get('h2').text()).toBe('所属任务')
    expect(mount(TaskPartOfMarker, { props: { task: tasks[1]!, tasks } }).get('[data-testid="task-part-of-marker"]').attributes('title'))
      .toBe('所属任务 autobyteus-25：Task 25 summary（进行中）')
  })
})
