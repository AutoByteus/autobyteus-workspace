import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ProjectTaskDialog from '../ProjectTaskDialog.vue'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import { ProjectRequestError } from '~/utils/projects/projectRequestError'
import type { ProjectTask } from '~/types/project'

let store: ReturnType<typeof useProjectTaskStore>
let wrapper: VueWrapper | null = null

const existing: ProjectTask = {
  taskId: 't1',
  projectId: 'p1',
  description: 'Write release notes for 1.4.87\nInclude Projects and Tasks',
  status: 'TODO',
  createdAt: '2026-09-26T00:00:00.000Z',
  updatedAt: '2026-09-26T00:00:00.000Z',
}

const mountDialog = (task: ProjectTask | null = null) => {
  wrapper = mount(ProjectTaskDialog, {
    props: { projectId: 'p1', task },
    attachTo: document.body,
    global: { stubs: { teleport: true } },
  })
  return wrapper
}

const byTestId = (id: string) => wrapper!.get(`[data-testid="${id}"]`)

describe('ProjectTaskDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    store = useProjectTaskStore()
    store.createTask = vi.fn(async (_projectId: string, description: string) => ({ ...existing, taskId: 't_new', description })) as any
    store.updateTaskDescription = vi.fn(async (_projectId: string, _taskId: string, description: string) => ({ ...existing, description, updatedAt: '2026-09-26T01:00:00.000Z' })) as any
    store.deleteTask = vi.fn().mockResolvedValue(true) as any
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('creates a Task from a multi-line description only', async () => {
    mountDialog()
    await flushPromises()

    expect(byTestId('project-task-dialog').attributes('role')).toBe('dialog')
    expect(document.activeElement).toBe(byTestId('project-task-description-input').element)
    expect(wrapper!.findAll('input')).toHaveLength(0)
    await byTestId('project-task-description-input').setValue('  Write release notes for 1.4.87\nInclude Projects and Tasks  ')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    expect(store.createTask).toHaveBeenCalledWith('p1', 'Write release notes for 1.4.87\nInclude Projects and Tasks')
    expect(wrapper!.emitted('close')).toHaveLength(1)
  })

  it('rejects an empty description with an accessible field message and creates nothing', async () => {
    mountDialog()
    await byTestId('project-task-description-input').setValue('   \n ')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    const input = byTestId('project-task-description-input')
    const error = byTestId('project-task-description-error')
    expect(error.text()).toBe('Describe the task.')
    expect(error.attributes('role')).toBe('alert')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe(error.attributes('id'))
    expect(store.createTask).not.toHaveBeenCalled()
  })

  it('saves with Ctrl+Enter', async () => {
    mountDialog()
    await byTestId('project-task-description-input').setValue('Quick task')
    await byTestId('project-task-description-input').trigger('keydown', { key: 'Enter', ctrlKey: true })
    await flushPromises()

    expect(store.createTask).toHaveBeenCalledWith('p1', 'Quick task')
  })

  it('shows the full description and status when opened, with the summary as title', async () => {
    mountDialog(existing)
    await flushPromises()

    const dialog = byTestId('project-task-dialog')
    expect(wrapper!.get(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('Write release notes for 1.4.87')
    expect(byTestId('project-task-view-description').text()).toBe(existing.description)
    expect(byTestId('project-task-view-status').text()).toBe('To Do')
    expect(document.activeElement).toBe(byTestId('project-task-edit').element)
    expect(wrapper!.findAll('select')).toHaveLength(0)
  })

  it('edits the description, and Cancel discards changes', async () => {
    mountDialog(existing)
    await flushPromises()

    await byTestId('project-task-edit').trigger('click')
    await flushPromises()
    const input = byTestId('project-task-description-input')
    expect((input.element as HTMLTextAreaElement).value).toBe(existing.description)
    expect(document.activeElement).toBe(input.element)
    await input.setValue('Discarded change')
    await byTestId('project-task-cancel').trigger('click')
    await flushPromises()
    expect(byTestId('project-task-view-description').text()).toBe(existing.description)
    expect(store.updateTaskDescription).not.toHaveBeenCalled()

    await byTestId('project-task-edit').trigger('click')
    await byTestId('project-task-description-input').setValue('New summary\nmore')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    expect(store.updateTaskDescription).toHaveBeenCalledWith('p1', 't1', 'New summary\nmore')
    expect(byTestId('project-task-view-description').text()).toBe('New summary\nmore')
    const dialog = byTestId('project-task-dialog')
    expect(wrapper!.get(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('New summary')
  })

  it('shows a server error from saving', async () => {
    store.updateTaskDescription = vi.fn().mockRejectedValue(new ProjectRequestError('gone', 'TASK_NOT_FOUND')) as any
    mountDialog(existing)
    await byTestId('project-task-edit').trigger('click')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    expect(byTestId('project-task-error').attributes('role')).toBe('alert')
    expect(byTestId('project-task-error').text()).toBe('This task no longer exists.')
  })

  it('deletes only after confirmation; Cancel keeps the Task', async () => {
    mountDialog(existing)
    await flushPromises()

    await byTestId('project-task-delete').trigger('click')
    await flushPromises()
    expect(byTestId('project-task-delete-confirm').text()).toContain('Write release notes for 1.4.87')
    expect(document.activeElement).toBe(byTestId('project-task-delete-cancel').element)
    await byTestId('project-task-delete-cancel').trigger('click')
    await flushPromises()
    expect(store.deleteTask).not.toHaveBeenCalled()
    expect(wrapper!.find('[data-testid="project-task-view"]').exists()).toBe(true)

    await byTestId('project-task-delete').trigger('click')
    await byTestId('project-task-delete-confirm-button').trigger('click')
    await flushPromises()
    expect(store.deleteTask).toHaveBeenCalledWith('p1', 't1')
    expect(wrapper!.emitted('deleted')?.[0]).toEqual(['t1'])
    expect(wrapper!.emitted('close')).toHaveLength(1)
  })

  it('closes on Escape', async () => {
    mountDialog(existing)
    await byTestId('project-task-dialog').trigger('keydown', { key: 'Escape' })
    expect(wrapper!.emitted('close')).toHaveLength(1)
  })
})
