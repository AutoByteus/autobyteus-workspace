import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import CompactionConfigCard from '../CompactionConfigCard.vue'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useServerSettingsStore } from '~/stores/serverSettings'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const agentDefinitions = [
  {
    id: 'helper-agent',
    name: 'Helper',
    role: 'assistant',
    description: 'Helps.',
    instructions: '',
    toolNames: [],
    inputProcessorNames: [],
    llmResponseProcessorNames: [],
    systemPromptProcessorNames: [],
    toolExecutionResultProcessorNames: [],
    toolInvocationPreprocessorNames: [],
    lifecycleProcessorNames: [],
    skillNames: [],
    defaultLaunchConfig: {
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'helper-model',
      llmConfig: null,
    },
  },
  {
    id: 'memory-compactor',
    name: 'Memory Compactor',
    role: 'summarizer',
    description: 'Compacts memory.',
    instructions: '',
    toolNames: [],
    inputProcessorNames: [],
    llmResponseProcessorNames: [],
    systemPromptProcessorNames: [],
    toolExecutionResultProcessorNames: [],
    toolInvocationPreprocessorNames: [],
    lifecycleProcessorNames: [],
    skillNames: [],
    defaultLaunchConfig: {
      runtimeKind: 'codex_app_server',
      llmModelIdentifier: 'codex:gpt-5',
      llmConfig: null,
    },
  },
]

const mountComponent = async () => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: {
      serverSettings: {
        settings: [
          {
            key: 'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO',
            value: '0.75',
            description: 'ratio',
            isEditable: true,
            isDeletable: false,
          },
          {
            key: 'AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID',
            value: 'memory-compactor',
            description: 'compactor agent',
            isEditable: true,
            isDeletable: false,
          },
          {
            key: 'AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE',
            value: '4096',
            description: 'override',
            isEditable: true,
            isDeletable: false,
          },
          {
            key: 'AUTOBYTEUS_COMPACTION_DEBUG_LOGS',
            value: 'true',
            description: 'logs',
            isEditable: true,
            isDeletable: false,
          },
        ],
      },
      agentDefinition: {
        agentDefinitions,
      },
    },
  })
  setActivePinia(pinia)

  const serverSettingsStore = useServerSettingsStore()
  serverSettingsStore.updateServerSetting = vi.fn().mockResolvedValue(true)

  const agentDefinitionStore = useAgentDefinitionStore()
  agentDefinitionStore.fetchAllAgentDefinitions = vi.fn().mockResolvedValue(undefined)

  const wrapper = mount(CompactionConfigCard, {
    global: {
      plugins: [pinia],
      stubs: {
        Icon: true,
      },
    },
  })

  await flushPromises()
  return { wrapper, serverSettingsStore, agentDefinitionStore }
}

describe('CompactionConfigCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('syncs typed inputs from the server settings store', async () => {
    const { wrapper, agentDefinitionStore } = await mountComponent()

    expect(wrapper.get('[data-testid="compaction-ratio-input"]').element).toHaveProperty('value', '75')
    expect(wrapper.get('[data-testid="compaction-agent-select"]').element).toHaveProperty('value', 'memory-compactor')
    expect(wrapper.get('[data-testid="compaction-context-override-input"]').element).toHaveProperty('value', '4096')
    expect((wrapper.get('[data-testid="compaction-debug-logs-toggle"]').element as HTMLInputElement).checked).toBe(true)
    expect(agentDefinitionStore.fetchAllAgentDefinitions).toHaveBeenCalledTimes(1)
  })

  it('lists compactor agent definitions with friendly labels and selected launch summary', async () => {
    const { wrapper } = await mountComponent()

    const options = wrapper.findAll('[data-testid="compaction-agent-select"] option').map((option) => option.text())
    expect(options).toContain('Memory Compactor (summarizer)')
    expect(options).toContain('Helper (assistant)')
    expect(wrapper.get('[data-testid="compaction-agent-summary"]').text()).toContain('codex_app_server / codex:gpt-5')
  })

  it('saves typed compaction settings through the server settings store', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent()

    await wrapper.get('[data-testid="compaction-ratio-input"]').setValue('60')
    await wrapper.get('[data-testid="compaction-agent-select"]').setValue('helper-agent')
    await wrapper.get('[data-testid="compaction-context-override-input"]').setValue('2048')
    await wrapper.get('[data-testid="compaction-debug-logs-toggle"]').setValue(false)
    await wrapper.get('[data-testid="compaction-config-save"]').trigger('click')
    await flushPromises()

    expect(serverSettingsStore.updateServerSetting).toHaveBeenNthCalledWith(
      1,
      'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO',
      '0.6',
    )
    expect(serverSettingsStore.updateServerSetting).toHaveBeenNthCalledWith(
      2,
      'AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID',
      'helper-agent',
    )
    expect(serverSettingsStore.updateServerSetting).toHaveBeenNthCalledWith(
      3,
      'AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE',
      '2048',
    )
    expect(serverSettingsStore.updateServerSetting).toHaveBeenNthCalledWith(
      4,
      'AUTOBYTEUS_COMPACTION_DEBUG_LOGS',
      'false',
    )
  })
})
