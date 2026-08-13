import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import AgentUserInputTextArea from '../AgentUserInputTextArea.vue'
import { AgentStatus } from '~/types/agent/AgentStatus'

type MockAgentContext = {
  contextId: string
  requirement: string
  contextFilePaths: Array<{ path: string; type: 'Text' | 'Image' | 'Audio' | 'Video' }>
}

const createContext = (contextId: string, requirement = ''): MockAgentContext => ({
  contextId,
  requirement,
  contextFilePaths: [],
})

const activeContextStoreMock = reactive({
  activeAgentContext: createContext('ctx-1') as MockAgentContext | null,
  submissionPending: false,
  currentStatus: AgentStatus.Idle,
  currentRequirement: '',
  updateRequirement: vi.fn(),
  updateRequirementForContext: vi.fn(),
  send: vi.fn(),
  interruptGeneration: vi.fn(),
})

const voiceInputStoreMock = reactive({
  isAvailable: false,
  isStarting: false,
  isRecording: false,
  isTranscribing: false,
  initialize: vi.fn().mockResolvedValue(undefined),
  cleanup: vi.fn().mockResolvedValue(undefined),
  cancelOperationForSource: vi.fn().mockResolvedValue(undefined),
  toggleRecording: vi.fn().mockResolvedValue(undefined),
})

const windowNodeContextStoreMock = reactive({
  isEmbeddedWindow: true,
})

const contextFileUploadStoreMock = reactive({
  isUploading: false,
})

const workspaceStoreMock = reactive({
  activeWorkspace: { absolutePath: '/tmp/workspace' },
})

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  const { toRef } = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    storeToRefs: (store: any) => ({
      submissionPending: toRef(store, 'submissionPending'),
      currentStatus: toRef(store, 'currentStatus'),
      currentRequirement: toRef(store, 'currentRequirement'),
    }),
  }
})

vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => activeContextStoreMock,
}))

vi.mock('~/stores/voiceInputStore', () => ({
  useVoiceInputStore: () => voiceInputStoreMock,
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}))

vi.mock('~/stores/contextFileUploadStore', () => ({
  useContextFileUploadStore: () => contextFileUploadStoreMock,
}))

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => workspaceStoreMock,
}))

vi.mock('@iconify/vue', () => ({
  Icon: {
    props: ['icon'],
    template: '<span :data-icon="icon" />',
  },
}))

describe('AgentUserInputTextArea', () => {
  const selectContext = (context: MockAgentContext | null) => {
    activeContextStoreMock.activeAgentContext = context
    activeContextStoreMock.currentRequirement = context?.requirement ?? ''
  }

  beforeEach(() => {
    vi.clearAllMocks()
    activeContextStoreMock.updateRequirement.mockImplementation((text: string) => {
      const context = activeContextStoreMock.activeAgentContext
      if (!context) {
        return
      }
      context.requirement = text
      activeContextStoreMock.currentRequirement = text
    })
    activeContextStoreMock.updateRequirementForContext.mockImplementation(
      (context: MockAgentContext | null, text: string) => {
        if (!context) {
          return
        }
        context.requirement = text
        if (activeContextStoreMock.activeAgentContext === context) {
          activeContextStoreMock.currentRequirement = text
        }
      },
    )
    selectContext(createContext('ctx-1'))
    activeContextStoreMock.submissionPending = false
    activeContextStoreMock.currentStatus = AgentStatus.Idle
    contextFileUploadStoreMock.isUploading = false
    voiceInputStoreMock.isAvailable = false
    voiceInputStoreMock.isStarting = false
    voiceInputStoreMock.isRecording = false
    voiceInputStoreMock.isTranscribing = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hides the voice button when voice input is not installed', async () => {
    const wrapper = mount(AgentUserInputTextArea)
    await nextTick()

    expect(wrapper.find('button[title="Start voice input"]').exists()).toBe(false)
  })

  it('shows the voice button when voice input is installed and ready', async () => {
    voiceInputStoreMock.isAvailable = true

    const wrapper = mount(AgentUserInputTextArea)
    await nextTick()

    expect(wrapper.find('button[title="Start voice input"]').exists()).toBe(true)
  })

  it('shows visible recording feedback while voice input is active', async () => {
    voiceInputStoreMock.isAvailable = true
    voiceInputStoreMock.isRecording = true

    const wrapper = mount(AgentUserInputTextArea)
    await nextTick()

    expect(wrapper.text()).toContain('Recording... Tap stop when you are done.')
    expect(wrapper.find('button[title="Stop recording"]').exists()).toBe(true)
  })

  it('shows immediate starting feedback, guards duplicate activation, and cancels only composer on unmount', async () => {
    voiceInputStoreMock.isAvailable = true
    voiceInputStoreMock.isStarting = true

    const wrapper = mount(AgentUserInputTextArea)
    await nextTick()

    const button = wrapper.find('button[title="Starting microphone..."]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')
    expect(wrapper.text()).toContain('Starting microphone...')

    wrapper.unmount()
    expect(voiceInputStoreMock.cancelOperationForSource).toHaveBeenCalledWith('composer')
  })

  it('disables send while context files are still uploading', async () => {
    contextFileUploadStoreMock.isUploading = true
    selectContext(createContext('ctx-uploading', 'ready to send'))

    const wrapper = mount(AgentUserInputTextArea)
    await nextTick()

    expect(wrapper.find('button[title="Send message"]').attributes('disabled')).toBeDefined()
  })

  it('uses canonical running status to show and trigger stop even without a sendable draft', async () => {
    activeContextStoreMock.currentStatus = AgentStatus.Running
    activeContextStoreMock.submissionPending = false
    selectContext(createContext('ctx-interrupt', ''))

    const wrapper = mount(AgentUserInputTextArea)
    await nextTick()

    const button = wrapper.find('button[title="Stop generation"]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-icon="heroicons:stop-solid"]').exists()).toBe(true)

    await button.trigger('click')

    expect(activeContextStoreMock.interruptGeneration).toHaveBeenCalledTimes(1)
    expect(activeContextStoreMock.send).not.toHaveBeenCalled()
  })

  it('keeps send disabled while a submission is pending without presenting stop', async () => {
    activeContextStoreMock.submissionPending = true
    activeContextStoreMock.currentStatus = AgentStatus.Idle
    selectContext(createContext('ctx-sending', 'ready to send'))

    const wrapper = mount(AgentUserInputTextArea)
    await nextTick()

    const sendButton = wrapper.find('button[title="Send message"]')
    expect(sendButton.exists()).toBe(true)
    expect(sendButton.attributes('disabled')).toBeDefined()
    expect(wrapper.find('button[title="Stop generation"]').exists()).toBe(false)
    expect(wrapper.find('[data-icon="heroicons:paper-airplane-solid"]').exists()).toBe(true)
  })

  it('applies the same disabled primary-action policy to Enter', async () => {
    activeContextStoreMock.submissionPending = true
    selectContext(createContext('ctx-pending-enter', 'ready to send'))

    const wrapper = mount(AgentUserInputTextArea)
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })

    expect(activeContextStoreMock.send).not.toHaveBeenCalled()
    expect(activeContextStoreMock.interruptGeneration).not.toHaveBeenCalled()
  })

  it('applies the same running interrupt policy to Enter', async () => {
    activeContextStoreMock.currentStatus = AgentStatus.Running
    selectContext(createContext('ctx-running-enter', 'draft is ignored while running'))

    const wrapper = mount(AgentUserInputTextArea)
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })

    expect(activeContextStoreMock.interruptGeneration).toHaveBeenCalledTimes(1)
    expect(activeContextStoreMock.send).not.toHaveBeenCalled()
  })

  it('leaves Shift+Enter to the textarea without invoking the primary action', async () => {
    selectContext(createContext('ctx-shift-enter', 'first line'))

    const wrapper = mount(AgentUserInputTextArea)
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter', shiftKey: true })

    expect(activeContextStoreMock.send).not.toHaveBeenCalled()
    expect(activeContextStoreMock.interruptGeneration).not.toHaveBeenCalled()
  })

  it('clears the visible composer when the active send is locally acknowledged while send remains pending', async () => {
    const context = createContext('ctx-local-ack')
    selectContext(context)
    let resolveSend: (() => void) | undefined
    let requirementAtSend = ''
    activeContextStoreMock.send.mockImplementation(() => {
      requirementAtSend = activeContextStoreMock.activeAgentContext?.requirement ?? ''
      if (activeContextStoreMock.activeAgentContext) {
        activeContextStoreMock.activeAgentContext.requirement = ''
      }
      activeContextStoreMock.currentRequirement = ''
      activeContextStoreMock.submissionPending = true
      return new Promise<void>((resolve) => {
        resolveSend = resolve
      })
    })

    const wrapper = mount(AgentUserInputTextArea)
    const textarea = wrapper.find('textarea')

    await textarea.setValue('launch this offline agent')
    const sendButton = wrapper.find('button[title="Send message"]')
    await sendButton.trigger('click')
    await nextTick()

    expect(requirementAtSend).toBe('launch this offline agent')
    expect(activeContextStoreMock.updateRequirementForContext).toHaveBeenCalledWith(
      context,
      'launch this offline agent',
    )
    expect((textarea.element as HTMLTextAreaElement).value).toBe('')
    expect(wrapper.find('button[title="Send message"]').attributes('disabled')).toBeDefined()

    resolveSend?.()
    activeContextStoreMock.submissionPending = false
    await nextTick()
  })

  it('runs the optional beforeSend seam before sending without changing the synced requirement', async () => {
    const context = createContext('ctx-before-send')
    selectContext(context)
    const events: string[] = []
    const beforeSend = vi.fn().mockImplementation(() => {
      events.push(`before:${activeContextStoreMock.activeAgentContext?.requirement ?? ''}`)
    })
    activeContextStoreMock.send.mockImplementation(() => {
      events.push(`send:${activeContextStoreMock.activeAgentContext?.requirement ?? ''}`)
      return Promise.resolve()
    })

    const wrapper = mount(AgentUserInputTextArea, {
      props: { beforeSend },
    })
    await wrapper.find('textarea').setValue('message with pending mobile files')
    await wrapper.find('button[title="Send message"]').trigger('click')
    await flushPromises()

    expect(beforeSend).toHaveBeenCalledTimes(1)
    expect(activeContextStoreMock.send).toHaveBeenCalledTimes(1)
    expect(events).toEqual([
      'before:message with pending mobile files',
      'send:message with pending mobile files',
    ])
  })

  it('keeps activeContextStore.send untouched when the optional beforeSend seam blocks submission', async () => {
    const context = createContext('ctx-before-send-block')
    selectContext(context)
    const beforeSend = vi.fn().mockRejectedValue(new Error('mobile pending attachment focus is invalid'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const wrapper = mount(AgentUserInputTextArea, {
      props: { beforeSend },
    })
    await wrapper.find('textarea').setValue('blocked until focus is valid')
    await wrapper.find('button[title="Send message"]').trigger('click')
    await flushPromises()

    expect(beforeSend).toHaveBeenCalledTimes(1)
    expect(activeContextStoreMock.send).not.toHaveBeenCalled()
    expect(context.requirement).toBe('blocked until focus is valid')
    consoleError.mockRestore()
  })

  it('keeps a debounced draft with the member that typed it when focus changes', async () => {
    vi.useFakeTimers()

    const architectureContext = createContext('ctx-architecture')
    const apiE2eContext = createContext('ctx-api-e2e')
    selectContext(architectureContext)

    const wrapper = mount(AgentUserInputTextArea)
    const textarea = wrapper.find('textarea')

    await textarea.setValue('dsfdsf')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('dsfdsf')

    selectContext(apiE2eContext)
    await nextTick()

    expect((textarea.element as HTMLTextAreaElement).value).toBe('')

    vi.advanceTimersByTime(750)
    await nextTick()

    expect(architectureContext.requirement).toBe('dsfdsf')
    expect(apiE2eContext.requirement).toBe('')
    expect(activeContextStoreMock.updateRequirementForContext).toHaveBeenCalledWith(
      architectureContext,
      'dsfdsf',
    )
  })

  it('flushes the previous member draft before a new member starts typing', async () => {
    vi.useFakeTimers()

    const architectureContext = createContext('ctx-architecture')
    const apiE2eContext = createContext('ctx-api-e2e')
    selectContext(architectureContext)

    const wrapper = mount(AgentUserInputTextArea)
    const textarea = wrapper.find('textarea')

    await textarea.setValue('draft for architecture')
    selectContext(apiE2eContext)
    await nextTick()

    expect(architectureContext.requirement).toBe('draft for architecture')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('')

    await textarea.setValue('draft for api e2e')
    vi.advanceTimersByTime(750)
    await nextTick()

    expect(architectureContext.requirement).toBe('draft for architecture')
    expect(apiE2eContext.requirement).toBe('draft for api e2e')
    expect(activeContextStoreMock.updateRequirementForContext).toHaveBeenCalledWith(
      architectureContext,
      'draft for architecture',
    )
    expect(activeContextStoreMock.updateRequirementForContext).toHaveBeenCalledWith(
      apiE2eContext,
      'draft for api e2e',
    )
  })
})
