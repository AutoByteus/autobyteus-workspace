import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import AgentUserInputTextArea from '../AgentUserInputTextArea.vue'
import AgentUserInputForm from '../AgentUserInputForm.vue'
import { AgentStatus } from '~/types/agent/AgentStatus'
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
  cancelOperationForSource: vi.fn(async () => undefined), toggleRecording: vi.fn(async () => undefined),
}) }))
vi.mock('~/stores/contextFileUploadStore', () => ({ useContextFileUploadStore: () => reactive({ isUploading: false }) }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => reactive({ isEmbeddedWindow: false }) }))
vi.mock('~/stores/workspace', () => ({ useWorkspaceStore: () => reactive({ activeWorkspace: null }) }))
const composerTarget = vi.hoisted(() => ({ value: null as unknown }))
vi.mock('~/composables/agentInput/useComposerTarget', () => ({ useComposerTarget: () => composerTarget }))
vi.mock('~/components/agentInput/ContextFilePathInputArea.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))

const context = () => reactive({
  requirement: '',
  contextFilePaths: [],
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
  beforeEach(() => { vi.clearAllMocks(); ready() })

  it('opens the run menu above the composer with Agents then Teams, the relay footer and combobox semantics', async () => {
    const ctx = context()
    const wrapper = mount(AgentUserInputTextArea, { props: { target: target(ctx) }, attachTo: document.body })
    await type(wrapper, 'please ask @')
    const menu = wrapper.find('[data-test="run-mention-menu"]')
    expect(menu.exists()).toBe(true)
    expect(candidates.refresh).toHaveBeenCalledWith('agent_team', 'team-run')
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

describe('AgentUserInputForm mention chips', () => {
  beforeEach(() => { vi.clearAllMocks(); ready() })

  it('shows a chip while @Name is in the text; removing it keeps the words and drops the mention', async () => {
    const ctx = context()
    ctx.requirement = 'ask @Code Reviewer to look'
    ctx.requestedMentions = [{ kind: 'agent', definitionId: 'code-reviewer', name: 'Code Reviewer' }]
    composerTarget.value = target(ctx)
    const wrapper = mount(AgentUserInputForm)
    const chip = wrapper.find('[data-test="run-mention-chip-Code Reviewer"]')
    expect(chip.text()).toContain('@Code Reviewer')
    expect(chip.find('button').attributes('aria-label')).toMatch(/^Remove mention/)
    await chip.find('button').trigger('click')
    expect(ctx.requirement).toBe('ask Code Reviewer to look')
    expect(ctx.requestedMentions).toEqual([])
    expect(wrapper.find('[data-test="agent-input-mention-chips"]').exists()).toBe(false)
  })

  it('drops the chip when the @Name text is deleted', async () => {
    const ctx = context()
    ctx.requirement = 'ask @Code Reviewer'
    ctx.requestedMentions = [{ kind: 'agent', definitionId: 'code-reviewer', name: 'Code Reviewer' }]
    composerTarget.value = target(ctx)
    const wrapper = mount(AgentUserInputForm)
    expect(wrapper.find('[data-test="agent-input-mention-chips"]').exists()).toBe(true)
    ctx.requirement = 'ask '
    await nextTick()
    expect(wrapper.find('[data-test="agent-input-mention-chips"]').exists()).toBe(false)
  })
})
