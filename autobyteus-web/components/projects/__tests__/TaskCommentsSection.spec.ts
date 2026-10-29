import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import type { ProjectTask, ProjectTaskComment } from '~/types/project'
import TaskCommentsSection from '../TaskCommentsSection.vue'

/** task-comments: the thread card on the Task page and in the tab (REQ-006, REQ-007, REQ-014; AC-003, AC-004, AC-012). */
const task = (comments: ProjectTaskComment[] = []): ProjectTask => ({
  taskId: 't1', projectId: 'p1', taskKey: 'autobyteus-1', description: 'Ship it', status: 'TODO', dependsOnTaskIds: [], partOfTaskId: null,
  comments, contextFiles: [], createdAt: '', updatedAt: '', root: null,
})
const thread: ProjectTaskComment[] = [
  { id: 1, createdAt: '2026-10-22T08:00:00.000Z', text: 'Dispatched with this direction.' },
  { id: 2, createdAt: '2026-10-22T09:00:00.000Z', text: 'User decided:\n- keep it small\n- ship on beta' },
  { id: 3, createdAt: '2026-10-22T09:30:00.000Z', text: 'Merged.' },
]

beforeEach(() => { setActivePinia(createPinia()); vi.useFakeTimers({ now: new Date('2026-10-22T10:00:00.000Z'), toFake: ['Date'] }) })
afterEach(async () => { vi.useRealTimers(); await localizationRuntime.setPreference('en') })

describe('TaskCommentsSection', () => {
  it('shows every comment oldest first with its number, time (full local time on hover) and full text; a labelled card', () => {
    const wrapper = mount(TaskCommentsSection, { props: { task: task(thread) } })
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe(wrapper.get('h2').attributes('id'))
    expect(wrapper.get('h2').text()).toBe('Comments')
    const items = wrapper.findAll('li')
    expect(items.map((item) => item.get('[data-testid="task-comment-meta"]').text().replace(/\s+/g, ' '))).toEqual(['#1 · 2 hr. ago', '#2 · 1 hr. ago', '#3 · 30 min. ago'])
    expect(items[1]!.get('time').attributes('datetime')).toBe('2026-10-22T09:00:00.000Z')
    expect(items[1]!.get('time').attributes('title')).toBe(new Date('2026-10-22T09:00:00.000Z').toLocaleString('en'))
    const text = items[1]!.get('[data-testid="task-comment-text"]')
    expect(text.element.textContent).toBe('User decided:\n- keep it small\n- ship on beta')
    expect(text.classes()).toEqual(expect.arrayContaining(['whitespace-pre-wrap', 'break-words']))
    expect(wrapper.find('[data-testid="task-comments-none"]').exists()).toBe(false)
  })

  it('without comments shows "No comments yet." and the add box', () => {
    const wrapper = mount(TaskCommentsSection, { props: { task: task() } })
    expect(wrapper.get('[data-testid="task-comments-none"]').text()).toBe('No comments yet.')
    expect(wrapper.get('[data-testid="task-comment-input"]').attributes('placeholder')).toBe('Add a comment')
    expect(wrapper.get('[data-testid="task-comment-add"]').text()).toBe('Add comment')
  })

  it('Add is disabled while the box is blank; posting sends the trimmed text, shows "Adding…", then clears the box and keeps focus', async () => {
    const store = useProjectTaskStore()
    let resolve!: () => void
    const addComment = vi.spyOn(store, 'addComment').mockImplementation(() => new Promise((r) => { resolve = () => r(task(thread)) }))
    const wrapper = mount(TaskCommentsSection, { props: { task: task() }, attachTo: document.body })
    const box = wrapper.get('[data-testid="task-comment-input"]'), add = wrapper.get('[data-testid="task-comment-add"]')
    expect(add.attributes('disabled')).toBeDefined()
    await box.setValue('   ')
    expect(add.attributes('disabled')).toBeDefined()
    await box.setValue('  Looks good\nship it  ')
    expect(add.attributes('disabled')).toBeUndefined()
    // Enter adds a line break; only the button posts.
    await box.trigger('keydown', { key: 'Enter' })
    expect(addComment).not.toHaveBeenCalled()
    await wrapper.get('form').trigger('submit')
    expect(addComment).toHaveBeenCalledWith('p1', 't1', 'Looks good\nship it', expect.any(Function))
    expect(add.text()).toBe('Adding…')
    expect(add.attributes('disabled')).toBeDefined()
    expect(box.attributes('disabled')).toBeDefined()
    resolve(); await flushPromises()
    expect((box.element as HTMLTextAreaElement).value).toBe('')
    expect(add.text()).toBe('Add comment')
    expect(document.activeElement).toBe(box.element)
    wrapper.unmount()
  })

  it('a refused add keeps the text and shows the error in an alert line tied to the box', async () => {
    vi.spyOn(useProjectTaskStore(), 'addComment').mockRejectedValue(new Error('Comment text is required.'))
    const wrapper = mount(TaskCommentsSection, { props: { task: task() } })
    await wrapper.get('[data-testid="task-comment-input"]').setValue('Keep me')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const error = wrapper.get('[data-testid="task-comment-error"]')
    expect(error.attributes('role')).toBe('alert')
    expect(error.text()).toBe('Comment text is required.')
    expect(wrapper.get('[data-testid="task-comment-input"]').attributes('aria-describedby')).toBe(error.attributes('id'))
    expect((wrapper.get('[data-testid="task-comment-input"]').element as HTMLTextAreaElement).value).toBe('Keep me')
  })

  it('updates live when the Task gains a comment; compact in the tab', async () => {
    const wrapper = mount(TaskCommentsSection, { props: { task: task(), compact: true } })
    expect(wrapper.get('section > div').classes()).toContain('p-4')
    await wrapper.setProps({ task: task(thread.slice(0, 1)) })
    expect(wrapper.findAll('li')).toHaveLength(1)
    expect(wrapper.find('[data-testid="task-comments-none"]').exists()).toBe(false)
  })

  it('uses the zh-CN strings', async () => {
    await localizationRuntime.setPreference('zh-CN')
    const wrapper = mount(TaskCommentsSection, { props: { task: task() } })
    expect(wrapper.get('h2').text()).toBe('评论')
    expect(wrapper.get('[data-testid="task-comments-none"]').text()).toBe('暂无评论。')
    expect(wrapper.get('[data-testid="task-comment-input"]').attributes('placeholder')).toBe('添加评论')
    expect(wrapper.get('[data-testid="task-comment-add"]').text()).toBe('添加评论')
  })
})
