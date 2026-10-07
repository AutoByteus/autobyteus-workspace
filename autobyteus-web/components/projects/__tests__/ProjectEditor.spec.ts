import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { reactive } from 'vue'
import ProjectEditor from '../ProjectEditor.vue'
import VoiceInputButton from '~/components/voiceInput/VoiceInputButton.vue'

let voice: any, projects: any, node: any, workspaces: any, route: {query: Record<string, string>}
const push = vi.fn()
vi.mock('vue-router', async (original) => ({...await original<typeof import('vue-router')>(), useRoute: () => route, useRouter: () => ({push})}))
vi.mock('~/stores/voiceInputStore', () => ({useVoiceInputStore: () => voice}))
vi.mock('~/stores/projectStore', () => ({useProjectStore: () => projects}))
vi.mock('~/stores/windowNodeContextStore', () => ({useWindowNodeContextStore: () => node}))
vi.mock('~/stores/workspace', () => ({useWorkspaceStore: () => workspaces}))

async function editor(projectId?: string) {
  const wrapper = mount(ProjectEditor, {attachTo: document.body, props: {projectId}, global: {stubs: {NuxtLink: RouterLinkStub}}})
  await flushPromises()
  return wrapper
}
describe('ProjectEditor description voice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route = {query: {}}
    node = reactive({bindingRevision: 1})
    projects = {getProjectById: () => ({name: 'Existing', description: '', workspaces: []}), fetchProject: vi.fn(), createProject: vi.fn().mockResolvedValue({projectId: 'p1'}), updateProject: vi.fn().mockResolvedValue({projectId: 'p1'})}
    workspaces = {workspaceMetadataById: {}, fetchAllWorkspaces: vi.fn(), createWorkspace: vi.fn()}
    voice = reactive({isAvailable: true, transcriptTarget: null, isStarting: false, isRecording: false, isTranscribing: false, latestResult: null, initialize: vi.fn(), toggleRecording: vi.fn(), cancelOperationForTarget: vi.fn()})
  })
  it.each(['existing', 'new'])('submits a path directly from %s without registering it', async mode => {
    const root = '/work/space #? 文件夹'
    workspaces.workspaceMetadataById = {opaque: {workspaceId: 'opaque', workspaceRootPath: root, displayName: 'Source', kind: 'filesystem'}}
    const wrapper = await editor()
    await wrapper.get('[data-testid="project-name-input"]').setValue('Paths')
    await wrapper.get('[data-testid="project-add-workspace-inline"]').trigger('click')
    if (mode === 'new') {
      await wrapper.get('[data-testid="workspace-mode-new-0"]').trigger('click')
      expect(wrapper.get('[data-testid="workspace-mode-new-0"]').text()).toBe('Folder path')
      await wrapper.get('[data-testid="workspace-path-0"]').setValue(` ${root} `)
    } else {
      await wrapper.get('[data-testid="workspace-select-0"]').setValue(root)
    }
    await wrapper.get('[data-testid="workspace-description-0"]').setValue(' Source code ')
    await wrapper.get('form').trigger('submit')
    expect(projects.createProject).toHaveBeenCalledWith({name: 'Paths', description: '', workspaces: [{workspaceRootPath: root, description: 'Source code'}]}, expect.any(Function))
    expect(workspaces.createWorkspace).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('does not silently save a manual path after switching to an empty picker', async () => {
    const wrapper = await editor()
    await wrapper.get('[data-testid="project-name-input"]').setValue('Paths')
    await wrapper.get('[data-testid="project-add-workspace-inline"]').trigger('click')
    await wrapper.get('[data-testid="workspace-mode-new-0"]').trigger('click')
    await wrapper.get('[data-testid="workspace-path-0"]').setValue('/work/manual')
    await wrapper.get('[data-testid="workspace-mode-existing-0"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    expect(projects.createProject).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(wrapper.get('[data-testid="workspace-select-0"]').element)
    wrapper.unmount()
  })
  it('keeps an unregistered original path editable and excludes exact path duplicates from choices', async () => {
    const original = {workspaceRootPath: '/work/unregistered #? 文件夹', description: 'keep', displayName: 'Original', availability: 'UNREGISTERED'}
    projects.getProjectById = () => ({name: 'Existing', description: '', workspaces: [original]})
    workspaces.workspaceMetadataById = {
      one: {workspaceId: 'one', workspaceRootPath: '/work/pick', displayName: 'Pick'},
      duplicate: {workspaceId: 'duplicate', workspaceRootPath: '/work/pick', displayName: 'Duplicate'},
    }
    const wrapper = await editor('p1')
    expect((wrapper.get('[data-testid="workspace-select-0"]').element as HTMLSelectElement).value).toBe(original.workspaceRootPath)
    await wrapper.get('[data-testid="project-add-workspace-inline"]').trigger('click')
    expect(wrapper.get('[data-testid="workspace-select-1"]').findAll('option').map(o => o.attributes('value'))).toEqual(['', '/work/pick'])
    await wrapper.get('[data-testid="workspace-select-1"]').setValue('/work/pick')
    await wrapper.get('form').trigger('submit')
    expect(projects.updateProject).toHaveBeenCalledWith(expect.objectContaining({workspaces: [
      {workspaceRootPath: original.workspaceRootPath, description: 'keep'}, {workspaceRootPath: '/work/pick', description: ''},
    ]}), expect.any(Function))
    expect(workspaces.createWorkspace).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('presents the node absolute-path error without registering or clearing the draft', async () => {
    projects.createProject.mockRejectedValue({code: 'WORKSPACE_PATH_INVALID'})
    const wrapper = await editor()
    await wrapper.get('[data-testid="project-name-input"]').setValue('Paths')
    await wrapper.get('[data-testid="project-add-workspace-inline"]').trigger('click')
    await wrapper.get('[data-testid="workspace-mode-new-0"]').trigger('click')
    await wrapper.get('[data-testid="workspace-path-0"]').setValue('relative')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Enter an absolute folder path on the selected node.')
    expect(document.activeElement).toBe(wrapper.get('[role="alert"]').element)
    expect((wrapper.get('[data-testid="workspace-path-0"]').element as HTMLInputElement).value).toBe('relative')
    expect(workspaces.createWorkspace).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it.each([undefined, 'p1'])('appends to latest editable text and saves only explicitly (%s)', async (id) => {
    const wrapper = await editor(id)
    const button = wrapper.getComponent(VoiceInputButton)
    const target = button.props('target')!
    expect(target.isCurrent()).toBe(true)
    await wrapper.get('[data-testid="project-voice-button"]').trigger('click')
    expect(voice.toggleRecording).toHaveBeenCalledWith({source: 'project-description', target})
    const input = wrapper.get('[data-testid="project-description-input"]')
    await input.setValue('Typed during capture')
    target.appendTranscript('dictated text')
    await flushPromises()
    expect((input.element as HTMLTextAreaElement).value).toBe('Typed during capture dictated text')
    expect(projects.createProject).not.toHaveBeenCalled()
    expect(projects.updateProject).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="project-voice-status"]').exists()).toBe(false)
    await input.setValue('Reviewed text')
    await wrapper.get('[data-testid="project-name-input"]').setValue('Name')
    await wrapper.get('form').trigger('submit')
    expect(id ? projects.updateProject : projects.createProject).toHaveBeenCalledWith(expect.objectContaining({description: 'Reviewed text'}), expect.any(Function))
    wrapper.unmount()
  })
  it.each([undefined, 'p1'])('keeps blank description optional (%s)', async (id) => {
    const wrapper = await editor(id)
    expect(wrapper.get('label[for="project-editor-description"]').text()).toContain('optional')
    await wrapper.get('[data-testid="project-name-input"]').setValue('Name')
    await wrapper.get('[data-testid="project-description-input"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    expect(id ? projects.updateProject : projects.createProject).toHaveBeenCalledWith(expect.objectContaining({description: ''}), expect.any(Function))
    wrapper.unmount()
  })
  it.each(['isStarting', 'isRecording', 'isTranscribing'])('guards own pending Save, without disabling recording Stop (%s)', async (phase) => {
    const wrapper = await editor()
    const target = wrapper.getComponent(VoiceInputButton).props('target')!
    voice.transcriptTarget = target
    voice[phase] = true
    await flushPromises()
    expect(wrapper.get('[data-testid="project-form-submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(projects.createProject).not.toHaveBeenCalled()
    if (phase === 'isRecording') expect(wrapper.get('[data-testid="project-voice-button"]').attributes('disabled')).toBeUndefined()
    voice.transcriptTarget = {key: 'other'}
    await flushPromises()
    expect(wrapper.get('[data-testid="project-form-submit"]').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })
  it('rejects stale node/project/unmounted delivery and cancels only its own key', async () => {
    const wrapper = await editor('p1')
    const target = wrapper.getComponent(VoiceInputButton).props('target')!
    node.bindingRevision++
    target.appendTranscript('stale')
    expect(target.isCurrent()).toBe(false)
    node.bindingRevision--
    await wrapper.setProps({projectId: 'p2'})
    expect(target.isCurrent()).toBe(false)
    await wrapper.setProps({projectId: 'p1'})
    wrapper.unmount()
    expect(target.isCurrent()).toBe(false)
    expect(voice.cancelOperationForTarget).toHaveBeenCalledWith(target.key)
    expect(voice.cancelOperationForTarget.mock.calls.every(([key]: string[]) => key === target.key)).toBe(true)
  })
  it('leaves typing available when voice is unavailable', async () => {
    voice.isAvailable = false
    const wrapper = await editor()
    expect(wrapper.find('[data-testid="project-voice-button"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="project-description-input"]').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })
})
