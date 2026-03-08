import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AgentUserInputTextArea from '../AgentUserInputTextArea.vue'

const {
  activeContextStoreMock,
  voiceInputStoreMock,
  windowNodeContextStoreMock,
  workspaceStoreMock,
} = vi.hoisted(() => ({
  activeContextStoreMock: {
    activeAgentContext: { contextId: 'ctx-1' },
    isSending: false,
    currentRequirement: '',
    updateRequirement: vi.fn(),
    send: vi.fn(),
    stopGeneration: vi.fn(),
  },
  voiceInputStoreMock: {
    isAvailable: false,
    isRecording: false,
    isTranscribing: false,
    initialize: vi.fn().mockResolvedValue(undefined),
    cleanup: vi.fn().mockResolvedValue(undefined),
    toggleRecording: vi.fn().mockResolvedValue(undefined),
  },
  windowNodeContextStoreMock: {
    isEmbeddedWindow: true,
  },
  workspaceStoreMock: {
    activeWorkspace: { absolutePath: '/tmp/workspace' },
  },
}))

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
  beforeEach(() => {
    vi.clearAllMocks()
    activeContextStoreMock.activeAgentContext = { contextId: 'ctx-1' }
    activeContextStoreMock.isSending = false
    activeContextStoreMock.currentRequirement = ''
    voiceInputStoreMock.isAvailable = false
    voiceInputStoreMock.isRecording = false
    voiceInputStoreMock.isTranscribing = false
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
})
