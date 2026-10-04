import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { reactive } from 'vue'
import ProjectEditor from '../ProjectEditor.vue'
import VoiceInputButton from '~/components/voiceInput/VoiceInputButton.vue'

let voice: any, projects: any, node: any, workspaces: any
const push = vi.fn()
vi.mock('vue-router', async (original) => ({...await original<typeof import('vue-router')>(), useRoute: () => ({query: {}}), useRouter: () => ({push})}))
vi.mock('~/stores/voiceInputStore', () => ({useVoiceInputStore: () => voice}))
vi.mock('~/stores/projectStore', () => ({useProjectStore: () => projects}))
vi.mock('~/stores/windowNodeContextStore', () => ({useWindowNodeContextStore: () => node}))
vi.mock('~/stores/workspace', () => ({useWorkspaceStore: () => workspaces}))

async function editor(projectId?: string) {
  const wrapper = mount(ProjectEditor, {props: {projectId}, global: {stubs: {NuxtLink: RouterLinkStub}}})
  await flushPromises()
  return wrapper
}
describe('ProjectEditor description voice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    node = reactive({bindingRevision: 1})
    projects = {getProjectById: () => ({name: 'Existing', description: '', workspaces: []}), fetchProject: vi.fn(), createProject: vi.fn().mockResolvedValue({projectId: 'p1'}), updateProject: vi.fn().mockResolvedValue({projectId: 'p1'})}
    workspaces = {workspaceMetadataById: {}, fetchAllWorkspaces: vi.fn()}
    voice = reactive({isAvailable: true, transcriptTarget: null, isStarting: false, isRecording: false, isTranscribing: false, latestResult: null, initialize: vi.fn(), toggleRecording: vi.fn(), cancelOperationForTarget: vi.fn()})
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
