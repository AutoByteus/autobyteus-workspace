import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { h, ref } from 'vue'
import ProjectTaskDraftEditor from '../ProjectTaskDraftEditor.vue'
import type { ProjectTask } from '~/types/project'

let draft: any
const push = vi.fn(), setSearch = vi.fn(), route = {query: {} as Record<string, unknown>}
const draftArgs = vi.fn()
vi.mock('vue-router', async (original) => ({...await original<typeof import('vue-router')>(), useRouter: () => ({push}), useRoute: () => route}))
vi.mock('~/composables/projects/useProjectTaskDraft', () => ({useProjectTaskDraft: (...args: unknown[]) => { draftArgs(...args); return draft }}))
vi.mock('~/stores/voiceInputStore', () => ({useVoiceInputStore: () => ({transcriptTarget: null, latestResult: null, isRecording: false})}))
vi.mock('~/stores/projectTaskStore', () => ({useProjectTaskStore: () => ({setSearch, getList: () => undefined, fetchTasks: vi.fn(async () => undefined), releaseRead: vi.fn()})}))

const task = {taskId: 't1', taskKey: 'p1-1', title: 'Saved title', description: 'Saved text', status: 'IN_PROGRESS', contextFiles: []} as unknown as ProjectTask
function editor(saved?: ProjectTask, title = saved?.title ?? 'New title') {
  draft.title.value = title
  draft.text.value = saved?.description ?? ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  // A single-root host keeps the multi-root editor's DOM anchors intact in happy-dom.
  const wrapper = mount({render: () => h('div', [h(ProjectTaskDraftEditor, {projectId: 'p1', projectName: 'My project', task: saved})])}, {
    attachTo: host,
    global: {stubs: {NuxtLink: RouterLinkStub, VoiceInputButton: true, TaskContextFiles: true}},
  })
  return wrapper
}
describe('ProjectTaskDraftEditor compact authoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = {}
    draft = {
      title: ref(''), text: ref(''), files: ref([]), dependsOn: ref([]), partOf: ref(null), client: {}, draftId: ref(), pending: ref(false),
      saving: ref(false), error: ref(''), blocked: ref(false),
      target: {key: 'draft', isCurrent: () => true, appendTranscript: vi.fn()},
      current: vi.fn(() => true), addFiles: vi.fn(), removeFile: vi.fn(),
      save: vi.fn().mockResolvedValue(task),
    }
  })

  it.each([undefined, task])('retains useful copy without redundant blocks (%s)', async (saved) => {
    const wrapper = editor(saved)
    expect(wrapper.get('h1').text()).toBe(saved ? 'Edit task' : 'New task')
    expect(document.activeElement).toBe(wrapper.get('h1').element)
    expect(wrapper.get('[data-testid="task-project-context"]').text()).toBe('My project')
    expect(wrapper.find('h2').exists()).toBe(false)
    expect(wrapper.find('#task-page-help').exists()).toBe(false)
    expect(wrapper.find('[aria-labelledby]').exists()).toBe(false)
    expect(wrapper.get('header').findAll('p')).toHaveLength(1)
    expect(wrapper.get('form > div').classes()).not.toContain('mt-5')
    // A required one-line Title input above the description, in the Project name input's style (DEC-013).
    expect(wrapper.get('label[for="task-page-title"]').text()).toBe('Title (required)')
    expect(wrapper.get('#task-page-title').attributes()).toMatchObject({ type: 'text', placeholder: 'Name the task in one line' })
    expect(wrapper.get('#task-page-title').attributes('maxlength')).toBeUndefined()
    expect((wrapper.get('#task-page-title').element as HTMLInputElement).value).toBe(saved ? 'Saved title' : 'New title')
    expect(wrapper.get('#task-page-title').element.compareDocumentPosition(wrapper.get('textarea').element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(wrapper.get('label[for="task-page-description"]').text()).toBe('Description (required)')
    expect(wrapper.get('textarea').attributes('placeholder')).toBe('Describe the task…')
    expect(wrapper.get('textarea').attributes('aria-describedby')).toBeUndefined()
    expect(wrapper.get('textarea').attributes('rows')).toBe('8')
    expect(wrapper.text()).toContain('Context Files (0)')
    expect(wrapper.text()).toContain('Drag, paste or upload')
    expect(wrapper.text()).toContain('Ctrl+Enter or ⌘+Enter to save')
    expect(wrapper.text()).not.toContain('Files are saved with this task')
    expect(wrapper.get('[data-testid="task-page-save"]').text()).toBe(saved ? 'Save changes' : 'Create task')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe(saved ? '/projects/p1/tasks/p1-1' : '/projects/p1')
    expect(draft.save).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it.each([undefined, task])('focuses blank description and associates only the error (%s)', async (saved) => {
    const wrapper = editor(saved)
    await wrapper.get('textarea').setValue('   ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(draft.save).not.toHaveBeenCalled()
    expect(wrapper.get('#task-page-error').attributes('role')).toBe('alert')
    expect(wrapper.get('textarea').attributes('aria-describedby')).toBe('task-page-error')
    expect(wrapper.get('textarea').attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(wrapper.get('textarea').element)
    await wrapper.get('textarea').setValue('Corrected')
    expect(wrapper.find('#task-page-error').exists()).toBe(false)
    expect(wrapper.get('textarea').attributes('aria-describedby')).toBeUndefined()
    wrapper.unmount()
  })

  it.each([undefined, task])('focuses a blank title first, refusing to save, and clears the error once it is typed (%s) (REQ-004)', async (saved) => {
    const wrapper = editor(saved, '  ')
    await wrapper.get('textarea').setValue('A description')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(draft.save).not.toHaveBeenCalled()
    expect(wrapper.get('#task-page-title-error').text()).toBe('Give the task a title.')
    expect(wrapper.get('#task-page-title-error').attributes('role')).toBe('alert')
    expect(wrapper.get('#task-page-title').attributes()).toMatchObject({ 'aria-invalid': 'true', 'aria-describedby': 'task-page-title-error' })
    expect(document.activeElement).toBe(wrapper.get('#task-page-title').element)
    await wrapper.get('#task-page-title').setValue('Named')
    expect(wrapper.find('#task-page-title-error').exists()).toBe(false)
    expect(wrapper.get('#task-page-title').attributes('aria-describedby')).toBeUndefined()
    wrapper.unmount()
  })

  it.each([undefined, task])('saves explicitly and navigates to the unchanged destination (%s)', async (saved) => {
    const wrapper = editor(saved)
    await wrapper.get('textarea').setValue('Reviewed\nMore context')
    expect(draft.save).not.toHaveBeenCalled()
    await wrapper.get('textarea').trigger('keydown', {key: 'Enter', ctrlKey: true})
    await flushPromises()
    expect(draft.save).toHaveBeenCalledOnce()
    expect(push).toHaveBeenCalledWith({path: saved ? '/projects/p1/tasks/p1-1' : '/projects/p1', query: {notice: saved ? 'saved' : 'task-created'}})
    expect(setSearch.mock.calls).toEqual(saved ? [] : [['p1', '']])
    wrapper.unmount()
  })

  it('retains failed-save text and actionable error without navigating', async () => {
    const wrapper = editor(task)
    draft.save.mockImplementation(async () => {draft.error.value = 'Task save failed.'; return null})
    await wrapper.get('textarea').setValue('Recoverable draft')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-testid="task-page-save-error"]').text()).toBe('Task save failed.')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Recoverable draft')
    expect(push).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('"New part" (?partOf=<task ID>) starts New task with that parent; Edit task never takes it from the URL (REQ-018)', () => {
    route.query = {partOf: 'parent-id'}
    editor().unmount()
    expect(draftArgs).toHaveBeenLastCalledWith('p1', undefined, 'parent-id')
    editor(task).unmount()
    expect(draftArgs).toHaveBeenLastCalledWith('p1', task, null)
    route.query = {}
    editor().unmount()
    expect(draftArgs).toHaveBeenLastCalledWith('p1', undefined, null)
  })

  it('keeps pending save blocked', async () => {
    const wrapper = editor(task)
    draft.blocked.value = true
    await flushPromises()
    expect(wrapper.get('[data-testid="task-page-save"]').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(draft.save).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
