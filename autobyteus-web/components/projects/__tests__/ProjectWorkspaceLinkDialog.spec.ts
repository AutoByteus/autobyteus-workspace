import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ProjectWorkspaceLinkDialog from '../ProjectWorkspaceLinkDialog.vue'
import { ProjectRequestError } from '~/stores/projectStore'
import type { Project } from '~/types/project'

const { projectStoreMock, workspaceStoreMock } = vi.hoisted(() => ({
  projectStoreMock: {
    addWorkspace: vi.fn(),
    updateWorkspace: vi.fn(),
  },
  workspaceStoreMock: {
    allWorkspaces: [] as any[],
    createWorkspace: vi.fn(),
    fetchAllWorkspaces: vi.fn(),
  },
}))

vi.mock('~/stores/projectStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/stores/projectStore')>()),
  useProjectStore: () => projectStoreMock,
}))

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => workspaceStoreMock,
}))

const WorkspaceSelectorStub = {
  name: 'WorkspaceSelector',
  props: ['model', 'autoSelectDefault', 'candidateWorkspaceIds', 'disabled'],
  emits: ['update:modelValue'],
  template: '<div data-testid="workspace-selector-stub"></div>',
}

const project: Project = {
  projectId: 'p1',
  name: 'autobyteus',
  description: '',
  createdAt: '',
  updatedAt: '',
  workspaces: [{
    workspaceId: 'agent_ws_a1',
    workspaceRootPath: '/work/superrepo',
    displayName: 'superrepo',
    description: 'Main',
    addedAt: '',
    availability: 'AVAILABLE',
  }],
}

const mountDialog = (props: Record<string, unknown> = {}) => mount(ProjectWorkspaceLinkDialog, {
  props: { project, ...props },
  attachTo: document.body,
  global: { stubs: { teleport: true, WorkspaceSelector: WorkspaceSelectorStub } },
})

const select = async (wrapper: ReturnType<typeof mountDialog>, selection: Record<string, unknown>) => {
  wrapper.findComponent(WorkspaceSelectorStub).vm.$emit('update:modelValue', selection)
  await flushPromises()
}

describe('ProjectWorkspaceLinkDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'agent_ws_a1', kind: 'filesystem', isTemp: false },
      { workspaceId: 'temp_ws_default', kind: 'temp', isTemp: true },
      { workspaceId: 'agent_ws_b2', kind: 'filesystem', isTemp: false },
      { workspaceId: 'skill_ws_foo', kind: 'skill', isTemp: false },
      { workspaceId: 'agent_ws_c3', kind: 'filesystem', isTemp: false },
    ]
    workspaceStoreMock.fetchAllWorkspaces.mockResolvedValue(undefined)
  })

  it('offers only linkable registered workspaces, without auto-selection', () => {
    const wrapper = mountDialog()
    const selector = wrapper.findComponent(WorkspaceSelectorStub)

    expect(selector.props('candidateWorkspaceIds')).toEqual(['agent_ws_b2', 'agent_ws_c3'])
    expect(selector.props('autoSelectDefault')).toBe(false)
    expect(wrapper.get('[data-testid="project-link-submit"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('links the chosen existing workspace with its description', async () => {
    projectStoreMock.addWorkspace.mockResolvedValue(project)
    const wrapper = mountDialog()
    await select(wrapper, { mode: 'existing', existingWorkspaceId: 'agent_ws_b2', newWorkspacePath: '' })
    await wrapper.get('[data-testid="project-link-description-input"]').setValue(' UI prototype workspace ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(workspaceStoreMock.createWorkspace).not.toHaveBeenCalled()
    expect(projectStoreMock.addWorkspace).toHaveBeenCalledWith('p1', 'agent_ws_b2', 'UI prototype workspace')
    expect(wrapper.emitted('saved')).toHaveLength(1)
    wrapper.unmount()
  })

  it('registers a new root through the workspace store and then links its id', async () => {
    workspaceStoreMock.createWorkspace.mockResolvedValue('agent_ws_new')
    projectStoreMock.addWorkspace.mockResolvedValue(project)
    const wrapper = mountDialog()
    await select(wrapper, { mode: 'new', existingWorkspaceId: null, newWorkspacePath: ' /work/marketing ' })
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(workspaceStoreMock.createWorkspace).toHaveBeenCalledWith({ root_path: '/work/marketing' })
    expect(projectStoreMock.addWorkspace).toHaveBeenCalledWith('p1', 'agent_ws_new', '')
    wrapper.unmount()
  })

  it('links nothing when registering the new root fails', async () => {
    workspaceStoreMock.createWorkspace.mockRejectedValue(new Error('Path does not exist'))
    const wrapper = mountDialog()
    await select(wrapper, { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/missing' })
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(projectStoreMock.addWorkspace).not.toHaveBeenCalled()
    const alert = wrapper.get('[data-testid="project-link-error"]')
    expect(alert.attributes('role')).toBe('alert')
    expect(alert.text()).toContain('Path does not exist')
    expect(wrapper.emitted('saved')).toBeUndefined()
    wrapper.unmount()
  })

  it('announces a stale-candidate WORKSPACE_NOT_REGISTERED error and reloads the workspace list', async () => {
    projectStoreMock.addWorkspace.mockRejectedValue(new ProjectRequestError('not registered', 'WORKSPACE_NOT_REGISTERED'))
    const wrapper = mountDialog()
    await select(wrapper, { mode: 'existing', existingWorkspaceId: 'agent_ws_b2', newWorkspacePath: '' })
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const alert = wrapper.get('[data-testid="project-link-error"]')
    expect(alert.attributes('role')).toBe('alert')
    expect(alert.text()).toContain('no longer registered')
    expect(workspaceStoreMock.fetchAllWorkspaces).toHaveBeenCalledWith(true)
    expect(wrapper.findComponent(WorkspaceSelectorStub).props('model').selection.existingWorkspaceId).toBeNull()
    wrapper.unmount()
  })

  it('edits only the description of an existing link', async () => {
    projectStoreMock.updateWorkspace.mockResolvedValue(project)
    const wrapper = mountDialog({ link: project.workspaces[0] })

    expect(wrapper.findComponent(WorkspaceSelectorStub).exists()).toBe(false)
    expect(wrapper.get('[data-testid="project-link-workspace-readonly"]').text()).toContain('/work/superrepo')
    await wrapper.get('[data-testid="project-link-description-input"]').setValue('Main monorepo')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(projectStoreMock.updateWorkspace).toHaveBeenCalledWith('p1', 'agent_ws_a1', 'Main monorepo')
    wrapper.unmount()
  })
})
