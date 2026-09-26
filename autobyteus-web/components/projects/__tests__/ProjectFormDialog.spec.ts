import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ProjectFormDialog from '../ProjectFormDialog.vue'
import { ProjectRequestError } from '~/stores/projectStore'

const { projectStoreMock } = vi.hoisted(() => ({
  projectStoreMock: {
    createProject: vi.fn(),
    updateProject: vi.fn(),
  },
}))

vi.mock('~/stores/projectStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/stores/projectStore')>()),
  useProjectStore: () => projectStoreMock,
}))

const mountDialog = (props: Record<string, unknown> = {}) => mount(ProjectFormDialog, {
  props,
  attachTo: document.body,
  global: { stubs: { teleport: true } },
})

describe('ProjectFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an accessible dialog with the name field focused', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.get(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('New project')
    expect(document.activeElement).toBe(wrapper.get('[data-testid="project-name-input"]').element)
    wrapper.unmount()
  })

  it('rejects an empty name with a field-level error and does not call the store', async () => {
    const wrapper = mountDialog()
    await wrapper.get('[data-testid="project-name-input"]').setValue('   ')
    await wrapper.get('form').trigger('submit')

    const input = wrapper.get('[data-testid="project-name-input"]')
    const error = wrapper.get('[data-testid="project-name-error"]')
    expect(error.text()).toBe('Enter a project name.')
    expect(error.attributes('role')).toBe('alert')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe(error.attributes('id'))
    expect(projectStoreMock.createProject).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows a duplicate-name server error on the name field', async () => {
    projectStoreMock.createProject.mockRejectedValue(new ProjectRequestError('taken', 'PROJECT_NAME_TAKEN'))
    const wrapper = mountDialog()
    await wrapper.get('[data-testid="project-name-input"]').setValue('autobyteus')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="project-name-error"]').text()).toContain('already exists')
    expect(wrapper.emitted('saved')).toBeUndefined()
    wrapper.unmount()
  })

  it('creates a project with trimmed values and emits saved', async () => {
    const created = { projectId: 'p1', name: 'autobyteus' }
    projectStoreMock.createProject.mockResolvedValue(created)
    const wrapper = mountDialog()
    await wrapper.get('[data-testid="project-name-input"]').setValue('  autobyteus ')
    await wrapper.get('[data-testid="project-description-input"]').setValue(' AutoByteus product ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(projectStoreMock.createProject).toHaveBeenCalledWith({ name: 'autobyteus', description: 'AutoByteus product' })
    expect(wrapper.emitted('saved')?.[0]).toEqual([created])
    wrapper.unmount()
  })

  it('edits an existing project', async () => {
    projectStoreMock.updateProject.mockResolvedValue({ projectId: 'p1' })
    const wrapper = mountDialog({
      project: { projectId: 'p1', name: 'old', description: 'desc', createdAt: '', updatedAt: '', workspaces: [] },
    })
    expect((wrapper.get('[data-testid="project-name-input"]').element as HTMLInputElement).value).toBe('old')
    await wrapper.get('[data-testid="project-name-input"]').setValue('new')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(projectStoreMock.updateProject).toHaveBeenCalledWith({ projectId: 'p1', name: 'new', description: 'desc' })
    wrapper.unmount()
  })

  it('closes on Escape', async () => {
    const wrapper = mountDialog()
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('keeps Tab focus inside the dialog', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    const submit = wrapper.get('[data-testid="project-form-submit"]').element as HTMLElement
    submit.focus()

    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Tab' })
    expect(document.activeElement).toBe(wrapper.get('[data-testid="project-name-input"]').element)

    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(submit)
    wrapper.unmount()
  })
})
