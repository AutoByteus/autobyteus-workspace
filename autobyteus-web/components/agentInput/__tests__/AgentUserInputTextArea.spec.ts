import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import AgentUserInputTextArea from '../AgentUserInputTextArea.vue'

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
  isSending: false,
  currentRequirement: '',
  updateRequirement: vi.fn(),
  updateRequirementForContext: vi.fn(),
  send: vi.fn(),
  stopGeneration: vi.fn(),
})

const voiceInputStoreMock = reactive({
  isAvailable: false,
  isRecording: false,
  isTranscribing: false,
  initialize: vi.fn().mockResolvedValue(undefined),
  cleanup: vi.fn().mockResolvedValue(undefined),
  toggleRecording: vi.fn().mockResolvedValue(undefined),
})

const windowNodeContextStoreMock = reactive({
  isEmbeddedWindow: true,
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
      isSending: toRef(store, 'isSending'),
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
    activeContextStoreMock.isSending = false
    voiceInputStoreMock.isAvailable = false
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
