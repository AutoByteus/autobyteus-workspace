import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  definitions: [] as Array<{ id: string; name: string; avatarUrl?: string | null; defaultLaunchConfig?: unknown }>,
  enabledRuntimes: new Set<string>(['autobyteus', 'codex_app_server']),
  modelsByRuntime: {} as Record<string, string[]>,
  workspacesByRoot: {} as Record<string, { workspaceId: string }>,
}))

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => ({
    get agentDefinitions() { return mocks.definitions },
    fetchAllAgentDefinitions: vi.fn(async () => undefined),
    getAgentDefinitionById: (id: string) => mocks.definitions.find((definition) => definition.id === id),
  }),
}))
vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({
    tempWorkspaceId: 'temp_ws_default',
    findWorkspaceInfoByRootPath: (rootPath: string) => mocks.workspacesByRoot[rootPath] ?? null,
  }),
}))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({
  useRuntimeAvailabilityStore: () => ({
    fetchRuntimeAvailabilities: vi.fn(async () => []),
    isRuntimeEnabled: (runtimeKind: string) => mocks.enabledRuntimes.has(runtimeKind),
  }),
}))
vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => ({
    fetchProvidersWithModels: vi.fn(async () => undefined),
    models: (runtimeKind: string) => mocks.modelsByRuntime[runtimeKind] ?? [],
  }),
}))

import { useChatDraftStore } from '../chatDraftStore'
import { useAgentContextsStore } from '../agentContextsStore'
import { writeChatLastModel } from '~/utils/chat/chatLastModelPreference'

describe('chatDraftStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    mocks.definitions = [
      { id: 'autobyteus-daily-assistant', name: 'Daily Assistant', defaultLaunchConfig: null },
      { id: 'codex', name: 'Codex', avatarUrl: '/codex.png' },
    ]
    mocks.enabledRuntimes = new Set(['autobyteus', 'codex_app_server'])
    mocks.modelsByRuntime = { autobyteus: ['gpt-5.5', 'claude-sonnet-5'], codex_app_server: ['gpt-5.5-codex'] }
    mocks.workspacesByRoot = {}
  })

  it('starts an unregistered Daily Assistant draft in the temp workspace with Auto-approve', async () => {
    const store = useChatDraftStore()
    const draft = store.startNewChat()
    await flushPromises()

    expect(draft.context.state.runId.startsWith('temp-')).toBe(true)
    expect(draft.target).toEqual({ kind: 'agent', agentDefinitionId: 'autobyteus-daily-assistant' })
    expect(draft.workspace).toEqual({ kind: 'existing', workspaceId: 'temp_ws_default' })
    expect(draft.autoExecuteTools).toBe(true)
    expect(draft.context.config.skillAccessMode).toBe('PRELOADED_ONLY')
    // No tree row exists before send.
    expect(useAgentContextsStore().runs.size).toBe(0)
  })

  it('preselects the last-used runtime + model when its runtime is enabled and the model exists', async () => {
    writeChatLastModel({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5-codex' })
    const draft = useChatDraftStore().startNewChat()
    await flushPromises()

    expect(draft.context.config.runtimeKind).toBe('codex_app_server')
    expect(draft.context.config.llmModelIdentifier).toBe('gpt-5.5-codex')
  })

  it('falls back to the Daily Assistant default launch config, then to the runtime default', async () => {
    writeChatLastModel({ runtimeKind: 'grok_build', llmModelIdentifier: 'grok-9' })
    mocks.definitions[0]!.defaultLaunchConfig = { runtimeKind: 'autobyteus', llmModelIdentifier: 'claude-sonnet-5', llmConfig: null }
    const withDefault = useChatDraftStore().startNewChat()
    await flushPromises()
    expect(withDefault.context.config.llmModelIdentifier).toBe('claude-sonnet-5')

    mocks.definitions[0]!.defaultLaunchConfig = null
    const withRuntimeDefault = useChatDraftStore().startNewChat()
    await flushPromises()
    expect(withRuntimeDefault.context.config.runtimeKind).toBe('autobyteus')
    expect(withRuntimeDefault.context.config.llmModelIdentifier).toBe('gpt-5.5')
  })

  it('never lets a late default resolution override an explicit model choice', async () => {
    const store = useChatDraftStore()
    const draft = store.startNewChat()
    store.setModel({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5-codex' })
    await flushPromises()

    expect(draft.context.config.runtimeKind).toBe('codex_app_server')
    expect(draft.context.config.llmModelIdentifier).toBe('gpt-5.5-codex')
    expect(draft.context.config.llmConfig).toBeNull()
  })

  it('presets the agent and workspace from the tree +, matching an existing workspace by root path', () => {
    mocks.workspacesByRoot['/ws/a'] = { workspaceId: 'ws-a' }
    const store = useChatDraftStore()

    expect(store.startNewChat({ agentDefinitionId: 'codex', workspaceRootPath: '/ws/a' })).toMatchObject({
      target: { kind: 'agent', agentDefinitionId: 'codex' },
      workspace: { kind: 'existing', workspaceId: 'ws-a' },
    })
    expect(store.startNewChat({ agentDefinitionId: 'codex', workspaceRootPath: '/ws/new' }).workspace)
      .toEqual({ kind: 'folder', rootPath: '/ws/new' })
  })

  it('re-addresses the draft: both definition ids change; text, files, id, workspace, approval and model are kept; tags are cleared', () => {
    const store = useChatDraftStore()
    const draft = store.startNewChat()
    const runId = draft.context.state.runId
    draft.context.requirement = 'hello'
    draft.context.contextFilePaths = [{ path: '/tmp/a.txt', type: 'Text' } as any]
    draft.context.requestedSkillNames = ['writer']
    draft.context.config.llmModelIdentifier = 'gpt-5.5'
    store.setAutoExecuteTools(false)

    store.setTarget({ kind: 'agent', agentDefinitionId: 'codex' })

    const current = store.draft!
    expect(current.context.state.runId).toBe(runId)
    expect(current.context.config.agentDefinitionId).toBe('codex')
    expect(current.context.config.agentDefinitionName).toBe('Codex')
    expect(current.context.state.conversation.agentDefinitionId).toBe('codex')
    expect(current.context.requirement).toBe('hello')
    expect(current.context.contextFilePaths).toHaveLength(1)
    expect(current.context.requestedSkillNames).toEqual([])
    expect(current.context.config.llmModelIdentifier).toBe('gpt-5.5')
    expect(current.autoExecuteTools).toBe(false)

    current.context.requestedSkillNames = ['writer']
    store.setTarget({ kind: 'team', teamDefinitionId: 'team-1' })
    expect(store.draft!.target).toEqual({ kind: 'team', teamDefinitionId: 'team-1' })
    expect(store.draft!.context.requestedSkillNames).toEqual([])
  })
})
