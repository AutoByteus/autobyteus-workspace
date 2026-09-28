import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'

const existing = vi.hoisted(() => ({
  store: null as any,
}))

vi.mock('~/stores/existingRunConfigStore', () => ({
  useExistingRunConfigStore: () => existing.store,
}))
vi.mock('~/stores/chatDraftStore', () => ({
  useChatDraftStore: () => ({ draft: null, setModel: vi.fn(), setThinkingConfig: vi.fn() }),
}))
vi.mock('~/composables/useToasts', () => ({ useToasts: () => ({ addToast: vi.fn() }) }))
vi.mock('~/composables/chat/useChatModelCatalog', () => ({
  useChatModelCatalog: () => ({
    modelLabel: (_runtime: string, id: string) => id,
    schemaFor: () => null,
  }),
}))

import { useChatRunModelControls } from '../chatRunModelControls'

const buildContext = (runId: string, overrides: { isLocked?: boolean; status?: AgentStatus } = {}) => {
  const context = new AgentContext({
    agentDefinitionId: 'a', agentDefinitionName: 'A', llmModelIdentifier: 'gpt-5.5', runtimeKind: 'codex_app_server',
    workspaceId: null, workspaceMetadata: null, autoExecuteTools: true, skillAccessMode: 'PRELOADED_ONLY',
    isLocked: overrides.isLocked ?? false, llmConfig: null,
  }, new AgentRunState(runId, { id: runId, messages: [], createdAt: '', updatedAt: '', agentDefinitionId: 'a' }))
  context.state.currentStatus = overrides.status ?? AgentStatus.Offline
  return reactive(context) as AgentContext
}

const mountControls = (context: AgentContext) => {
  let controls!: ReturnType<typeof useChatRunModelControls>
  mount(defineComponent({ setup() { controls = useChatRunModelControls(ref(context)); return () => h('div') } }))
  return controls
}

describe('useChatRunModelControls', () => {
  beforeEach(() => {
    existing.store = reactive({
      draft: null as any,
      loadingCanonical: false,
      modelOptionsByAddress: {} as Record<string, any>,
      feedback: null,
      loadAgentCanonical: vi.fn(async (runId: string) => {
        existing.store.draft = { kind: 'agent', runId, isActive: false, editability: { editable: true } }
        existing.store.modelOptionsByAddress = { '/': { status: 'ready', options: {
          currentModelIdentifier: 'gpt-5.5',
          currentModel: { llmModelIdentifier: 'gpt-5.5', providerName: 'OpenAI', displayName: 'GPT-5.5', description: null, configSchema: null },
          replacements: [{ llmModelIdentifier: 'gpt-6-sol', providerName: 'OpenAI', displayName: 'GPT-6-Sol', description: null, configSchema: null }],
        } } }
      }),
      updateAgentModelConfig: vi.fn(),
      setSchemaState: vi.fn(),
      save: vi.fn(async () => true),
      refreshModelOptions: vi.fn(),
    })
  })

  it('edits a temp-* draft context directly with a selectable runtime', async () => {
    const context = buildContext('temp-1')
    const controls = mountControls(context)

    expect(controls.mode.value).toBe('draft')
    expect(controls.lockedReason.value).toBeNull()
    await controls.selectModel({ runtimeKind: 'autobyteus', llmModelIdentifier: 'claude-sonnet-5' })

    expect(context.config.runtimeKind).toBe('autobyteus')
    expect(context.config.llmModelIdentifier).toBe('claude-sonnet-5')
    expect(context.config.llmConfig).toBeNull()
    expect(existing.store.loadAgentCanonical).not.toHaveBeenCalled()
  })

  it('treats a reopened Offline run with isLocked === false as persisted and saves through existingRunConfigStore', async () => {
    const context = buildContext('run-7', { isLocked: false, status: AgentStatus.Offline })
    const controls = mountControls(context)
    await nextTick()

    expect(controls.mode.value).toBe('persisted')
    expect(existing.store.loadAgentCanonical).toHaveBeenCalledWith('run-7')
    expect(controls.lockedReason.value).toBeNull()
    expect(controls.fixedModels.value.groups[0]!.models.map((model) => model.llmModelIdentifier)).toEqual(['gpt-5.5', 'gpt-6-sol'])

    await controls.selectModel({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-6-sol' })

    expect(existing.store.updateAgentModelConfig).toHaveBeenCalledWith({ llmModelIdentifier: 'gpt-6-sol', llmConfig: null })
    expect(existing.store.setSchemaState).toHaveBeenCalledWith('/', { status: 'ready', message: null })
    expect(existing.store.save).toHaveBeenCalled()
    // The persisted run's context is never edited directly.
    expect(context.config.llmModelIdentifier).toBe('gpt-5.5')
  })

  it('locks a persisted run while it is live and does not load or save', async () => {
    const context = buildContext('run-8', { isLocked: true, status: AgentStatus.Idle })
    const controls = mountControls(context)
    await nextTick()

    expect(controls.lockedReason.value).toBeTruthy()
    await controls.selectModel({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-6-sol' })
    expect(existing.store.loadAgentCanonical).not.toHaveBeenCalled()
    expect(existing.store.save).not.toHaveBeenCalled()
  })

  it('does not retry a failed canonical load in a loop', async () => {
    existing.store.loadAgentCanonical = vi.fn(async () => { /* failure: no draft */ })
    const context = buildContext('run-9')
    mountControls(context)
    await nextTick()
    await nextTick()
    expect(existing.store.loadAgentCanonical).toHaveBeenCalledTimes(1)
  })
})
