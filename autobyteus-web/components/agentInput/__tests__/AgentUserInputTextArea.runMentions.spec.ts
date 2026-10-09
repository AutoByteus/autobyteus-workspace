import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, reactive, ref } from 'vue'
import AgentUserInputTextArea from '../AgentUserInputTextArea.vue'
import AgentUserInputForm from '../AgentUserInputForm.vue'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import { toCollaboratorMentionDtos } from '~/utils/collaborators/collaboratorMentionText'
import type { ComposerTarget } from '~/composables/agentInput/useComposerTarget'

const candidates = vi.hoisted(() => ({
  entry: vi.fn(),
  refresh: vi.fn(async () => undefined),
  invalidate: vi.fn(),
  reset: vi.fn(),
}))
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: candidates }))
vi.mock('~/stores/voiceInputStore', () => ({ useVoiceInputStore: () => reactive({
  isAvailable: false, isStarting: false, isRecording: false, isTranscribing: false,
  initialize: vi.fn(async () => undefined), cleanup: vi.fn(async () => undefined),
  cancelOperationForTarget: vi.fn(async () => undefined), toggleRecording: vi.fn(async () => undefined),
}) }))
vi.mock('~/stores/contextFileUploadStore', () => ({ useContextFileUploadStore: () => reactive({ isUploading: false }) }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => reactive({ isEmbeddedWindow: false }) }))
vi.mock('~/stores/workspace', () => ({ useWorkspaceStore: () => reactive({ activeWorkspace: null }) }))
const composerTarget = vi.hoisted(() => ({ value: null as unknown }))
vi.mock('~/composables/agentInput/useComposerTarget', () => ({ useComposerTarget: () => ref(composerTarget.value) }))
vi.mock('~/components/agentInput/ContextFilePathInputArea.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))

const context = () => reactive({
  requirement: '',
  contextFilePaths: [] as Array<{ kind: 'uploaded'; id: string; locator: string; storedFilename: string; displayName: string; phase: 'draft'; type: 'Text' }>,
  requestedSkillNames: [] as string[],
  requestedMentions: [] as Array<{ kind: 'agent' | 'agent_team'; definitionId: string; name: string }>,
  submissionPending: false,
  config: { agentDefinitionName: 'Research Assistant' },
  state: { runId: 'run-1', currentStatus: AgentStatus.Idle },
})

const target = (ctx: ReturnType<typeof context>, send = vi.fn(async () => undefined)): ComposerTarget => ({
  key: 'run-1', context: ctx as never, draftOwner: null, access: 'live',
  mentionScope: { rootKind: 'agent_team', rootRunId: 'team-run', focusedName: 'researcher' },
  send,
})

const ready = () => candidates.entry.mockReturnValue({
  status: 'ready', available: true,
  candidates: [
    { kind: 'agent', definitionId: 'code-reviewer', name: 'Code Reviewer', description: 'Reviews code' },
    { kind: 'agent_team', definitionId: 'product-team', name: 'Product Team', description: '', memberCount: 2, coordinatorName: 'product prototyper' },
  ],
})

const type = async (wrapper: ReturnType<typeof mount>, text: string) => {
  const textarea = wrapper.find('textarea')
  const element = textarea.element as HTMLTextAreaElement
  element.value = text
  element.setSelectionRange(text.length, text.length)
  await textarea.trigger('input')
  await nextTick()
  await nextTick()
}

describe('AgentUserInputTextArea @ mentions', () => {
  beforeEach(async () => { vi.clearAllMocks(); ready(); await localizationRuntime.setPreference('en') })

  it('opens the run menu above the composer with Agents then Teams, the relay footer and combobox semantics', async () => {
    const ctx = context()
    const wrapper = mount(AgentUserInputTextArea, { props: { target: target(ctx) }, attachTo: document.body })
    await type(wrapper, 'please ask @')
    const menu = wrapper.find('[data-test="run-mention-menu"]')
    expect(menu.exists()).toBe(true)
    expect(candidates.refresh).toHaveBeenCalledWith({ rootKind: 'agent_team', rootRunId: 'team-run', focusedName: 'researcher' })
    expect(menu.text()).toContain('Code Reviewer')
    expect(menu.text()).toContain('2 members · coordinator product prototyper')
    expect(wrapper.find('[data-test="run-mention-menu-footer"]').exists()).toBe(true)
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('role')).toBe('combobox')
    expect(textarea.attributes('aria-expanded')).toBe('true')
    expect(textarea.attributes('aria-activedescendant')).toMatch(/-option-0$/)
    wrapper.unmount()
  })

  it('chooses with the keyboard: the token becomes @Name and the mention is recorded', async () => {
    const ctx = context()
    const wrapper = mount(AgentUserInputTextArea, { props: { target: target(ctx) }, attachTo: document.body })
    await type(wrapper, 'ask @pro')
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(ctx.requirement).toBe('ask @Product Team ')
    expect(ctx.requestedMentions).toEqual([{ kind: 'agent_team', definitionId: 'product-team', name: 'Product Team' }])
    expect(wrapper.find('[data-test="run-mention-menu"]').exists()).toBe(false)
    expect(wrapper.find('.mention-highlight').text()).toBe('@Product Team')
    const element = wrapper.find('textarea').element as HTMLTextAreaElement
    expect(element.selectionStart).toBe(ctx.requirement.length)
    wrapper.unmount()
  })

  it('shows the empty state, swallows Enter with no match and closes on Escape keeping the text', async () => {
    const ctx = context()
    const send = vi.fn(async () => undefined)
    const wrapper = mount(AgentUserInputTextArea, { props: { target: target(ctx, send) }, attachTo: document.body })
    await type(wrapper, 'hi @zzz')
    expect(wrapper.find('[data-test="run-mention-menu-empty"]').findAll('span')).toHaveLength(2)
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })
    expect(send).not.toHaveBeenCalled()
    await wrapper.find('textarea').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[data-test="run-mention-menu"]').exists()).toBe(false)
    expect(ctx.requirement).toBe('hi @zzz')
    wrapper.unmount()
  })

  it('offers no menu without a live-run scope (launch drafts)', async () => {
    const ctx = context()
    const wrapper = mount(AgentUserInputTextArea, { props: { target: { ...target(ctx), mentionScope: null } }, attachTo: document.body })
    await type(wrapper, '@')
    expect(wrapper.find('[data-test="run-mention-menu"]').exists()).toBe(false)
    expect(wrapper.find('textarea').attributes('role')).toBeUndefined()
    wrapper.unmount()
  })
})

describe('AgentUserInputForm inline mentions', () => {
  beforeEach(async () => { vi.clearAllMocks(); ready(); await localizationRuntime.setPreference('en') })
  afterEach(() => { composerTarget.value = null })

  it('shows only a decorative inline highlight with no separate chip row or remove button', async () => {
    const ctx = context()
    ctx.requirement = 'ask @Code Reviewer to look'
    ctx.requestedMentions = [{ kind: 'agent', definitionId: 'code-reviewer', name: 'Code Reviewer' }]
    composerTarget.value = target(ctx)
    const wrapper = mount(AgentUserInputForm)
    expect(wrapper.find('[data-test="agent-input-mention-chips"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label^="Remove mention"]').exists()).toBe(false)
    expect(wrapper.find('.mention-highlight').text()).toBe('@Code Reviewer')
    const mirror = wrapper.find('[data-test="composer-mention-mirror"]')
    expect(mirror.attributes('aria-hidden')).toBe('true')
    expect(mirror.text()).toBe(ctx.requirement)
    expect(wrapper.find('textarea').attributes('aria-label')).toBe('Message')
    wrapper.unmount()
  })

  it('projects native deletion, name editing and exact restoration without losing identity or attachments', async () => {
    const ctx = context()
    const selected = { kind: 'agent' as const, definitionId: 'code-reviewer', name: 'Code Reviewer' }
    ctx.requirement = 'ask @Code Reviewer to look'
    ctx.requestedMentions = [selected]
    ctx.contextFilePaths = [{ kind: 'uploaded', id: 'completed', locator: '/test-owned/completed.txt', storedFilename: 'completed.txt', displayName: 'completed.txt', phase: 'draft', type: 'Text' }]
    composerTarget.value = target(ctx)
    const wrapper = mount(AgentUserInputForm)
    for (const text of ['ask Code Reviewer to look', 'ask @Code Reviewers to look', 'ask to look']) {
      await type(wrapper, text)
      expect(wrapper.find('.mention-highlight').exists()).toBe(false)
      expect(toCollaboratorMentionDtos(ctx.requirement, ctx.requestedMentions)).toBeUndefined()
      expect(ctx.requestedMentions).toEqual([selected])
      expect(ctx.contextFilePaths).toHaveLength(1)
    }
    await type(wrapper, 'ask @Code Reviewer to look again')
    expect(wrapper.find('.mention-highlight').text()).toBe('@Code Reviewer')
    expect(toCollaboratorMentionDtos(ctx.requirement, ctx.requestedMentions)).toEqual([
      { kind: 'agent', definition_id: 'code-reviewer' },
    ])
    wrapper.unmount()
  })
})

describe('composer discovery and mirror projection', () => {
  beforeEach(async () => { vi.clearAllMocks(); ready(); await localizationRuntime.setPreference('en') })
  afterEach(async () => { await localizationRuntime.setPreference('en') })

  it('prioritizes the exact mention cue over skill and custom copy without writing draft text', async () => {
    const ctx = context()
    const wrapper = mount(AgentUserInputTextArea, { props: {
      target: target(ctx), placeholder: 'Custom message',
      skillTagging: { placeholder: 'Use / skills', skills: [], allInstalled: true },
    } })
    expect(wrapper.find('textarea').attributes('placeholder')).toBe('Ask anything · @ for an agent or team')
    expect(ctx.requirement).toBe('')
    await type(wrapper, 'ask @Unknown')
    expect(wrapper.find('.mention-highlight').exists()).toBe(false)
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('ask @Unknown')
    await localizationRuntime.setPreference('zh-CN')
    expect(wrapper.find('textarea').attributes('placeholder')).toBe('随便问 · @ 选择智能体或团队')
    expect(wrapper.find('textarea').attributes('aria-label')).toBe('消息')
    wrapper.unmount()
  })

  it('preserves no-scope skill/custom placeholders and does not advertise mentions with no target', async () => {
    const ctx = context()
    const wrapper = mount(AgentUserInputTextArea, { props: { target: { ...target(ctx), mentionScope: null }, placeholder: 'Custom message' } })
    expect(wrapper.find('textarea').attributes('placeholder')).toBe('Custom message')
    await wrapper.setProps({ skillTagging: { placeholder: 'Use / skills', skills: [], allInstalled: true } })
    expect(wrapper.find('textarea').attributes('placeholder')).toBe('Use / skills')
    await wrapper.setProps({ target: null, skillTagging: null, placeholder: null })
    expect(wrapper.find('textarea').attributes('placeholder')).not.toContain('@')
    expect(wrapper.find('textarea').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('reconstructs exact escaped multiline text and synchronizes client viewport and both scroll axes', async () => {
    const ctx = context()
    ctx.requirement = '<script>\n\t@Product Team and @Product Team\n'
    ctx.requestedMentions = [{ kind: 'agent_team', definitionId: 'product-team', name: 'Product Team' }]
    const wrapper = mount(AgentUserInputTextArea, { props: { target: target(ctx) } })
    const element = wrapper.find('textarea').element as HTMLTextAreaElement
    Object.defineProperties(element, { clientWidth: { value: 400 }, clientHeight: { value: 220 } })
    element.scrollTop = 48
    element.scrollLeft = 6
    await wrapper.find('textarea').trigger('scroll')
    const mirror = wrapper.find('[data-test="composer-mention-mirror"]')
    expect(mirror.attributes('style')).toContain('width: 400px')
    expect(mirror.attributes('style')).toContain('height: 220px')
    expect(mirror.find('.mention-mirror').attributes('style')).toContain('translate(-6px, -48px)')
    expect(mirror.element.textContent).toBe(ctx.requirement)
    expect(mirror.find('script').exists()).toBe(false)
    expect(mirror.findAll('.mention-highlight')).toHaveLength(2)
    const other = context()
    other.requirement = 'another @Product Team without choosing'
    await wrapper.setProps({ target: target(other) })
    expect(wrapper.find('[data-test="composer-mention-mirror"]').exists()).toBe(false)
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(other.requirement)
    expect(ctx.requestedMentions).toHaveLength(1)
    wrapper.unmount()
  })

  it('retains draft, identity and completed attachment on rejection; acceptance clears the projection', async () => {
    const ctx = context()
    ctx.requirement = 'ask @Product Team'
    ctx.requestedMentions = [{ kind: 'agent_team', definitionId: 'product-team', name: 'Product Team' }]
    ctx.contextFilePaths = [{ kind: 'uploaded', id: 'completed', locator: '/test-owned/completed.txt', storedFilename: 'completed.txt', displayName: 'completed.txt', phase: 'draft', type: 'Text' }]
    const attachment = ctx.contextFilePaths[0]
    const send = vi.fn(async (): Promise<void> => { throw new Error('Rejected collaborator') })
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const wrapper = mount(AgentUserInputTextArea, { props: { target: target(ctx, send) } })
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(send).toHaveBeenCalledOnce()
    expect(ctx.requirement).toBe('ask @Product Team')
    expect(ctx.contextFilePaths).toEqual([attachment])
    expect(wrapper.find('.mention-highlight').text()).toBe('@Product Team')
    send.mockImplementation(async () => {
      ctx.requirement = ''
      ctx.requestedMentions = []
      ctx.contextFilePaths = []
    })
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
    expect(wrapper.find('.mention-highlight').exists()).toBe(false)
    expect(ctx.contextFilePaths).toEqual([])
    wrapper.unmount()
    error.mockRestore()
  })

  it('observes only the native editor and disconnects its metric observer on unmount', async () => {
    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal('ResizeObserver', class { observe = observe; disconnect = disconnect })
    try {
      const wrapper = mount(AgentUserInputTextArea, { props: { target: target(context()) } })
      await nextTick()
      expect(observe).toHaveBeenCalledOnce()
      expect(observe).toHaveBeenCalledWith(wrapper.find('textarea').element)
      wrapper.unmount()
      expect(disconnect).toHaveBeenCalledOnce()
    } finally {
      vi.unstubAllGlobals()
    }
  })

})
