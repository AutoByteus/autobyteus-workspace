import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'

// CR-004: a "+" copy (or a switcher carry) keeps its settings; the start loads runtime availability,
// so a member on a disabled runtime is reported by the shared readiness rule before Send.
const mocks = vi.hoisted(() => ({
  availability: { hasFetched: false, enabled: new Set(['autobyteus']) },
  fetchModels: vi.fn(async (_runtimeKind: string) => undefined),
}))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({
  useRuntimeAvailabilityStore: () => ({
    get hasFetched() { return mocks.availability.hasFetched },
    fetchRuntimeAvailabilities: vi.fn(async () => { mocks.availability.hasFetched = true; return [] }),
    isRuntimeEnabled: (runtimeKind: string) => !mocks.availability.hasFetched || mocks.availability.enabled.has(runtimeKind),
  }),
}))
vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => ({
    fetchProvidersWithModels: mocks.fetchModels,
    models: () => ['gpt-5.5', 'gpt-5.5-codex'],
    modelConfigSchemaByIdentifier: () => null,
  }),
}))
vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => ({
    agentDefinitions: [{ id: 'autobyteus-daily-assistant', name: 'Daily Assistant' }],
    fetchAllAgentDefinitions: vi.fn(async () => undefined),
    getAgentDefinitionById: (id: string) => (id === 'autobyteus-daily-assistant' ? { id, name: 'Daily Assistant' } : null),
  }),
}))
vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => ({
    agentTeamDefinitions: [{ id: 'team-1', name: 'Writers', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: 'a' }, { memberName: 'writer', ref: 'b' }] }],
    fetchAllAgentTeamDefinitions: vi.fn(async () => undefined),
  }),
}))
vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({ tempWorkspaceId: 'temp_ws_default', findWorkspaceInfoByRootPath: () => null }),
}))

import { useChatDraftStore } from '~/stores/chatDraftStore'
import { resolveChatLaunchReadiness } from '../chatLaunchService'

describe('copied start readiness (CR-004, R10)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    mocks.availability = reactive({ hasFetched: false, enabled: new Set(['autobyteus']) })
    mocks.fetchModels.mockClear()
  })

  it('a Team "+" copy with a member on a disabled runtime is not ready once availability resolves', async () => {
    const draft = useChatDraftStore().startForDefinition({ kind: 'team', teamDefinitionId: 'team-1' }, {
      copied: {
        workspace: null, runtimeKind: 'autobyteus', llmModelIdentifier: 'gpt-5.5', llmConfig: null, autoExecuteTools: true,
        teamAgentOverrides: { '/writer': { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5-codex', llmConfig: { service_tier: 'fast' } } },
      },
    })
    await flushPromises()

    expect(mocks.availability.hasFetched).toBe(true)
    const readiness = resolveChatLaunchReadiness(draft)
    expect(readiness.ready).toBe(false)
    expect((readiness as { reason: string }).reason).toMatch(/Codex/)
    // The copy itself is kept (REQ-013).
    expect(draft.teamAgentOverrides['/writer']).toMatchObject({ runtimeKind: 'codex_app_server', llmConfig: { service_tier: 'fast' } })
    expect(mocks.fetchModels).toHaveBeenCalledWith('autobyteus')
    expect(mocks.fetchModels).not.toHaveBeenCalledWith('codex_app_server')
  })

  it('an Agent "+" copy on an enabled runtime is ready, with its catalog loaded', async () => {
    const draft = useChatDraftStore().startForDefinition({ kind: 'agent', agentDefinitionId: 'autobyteus-daily-assistant' }, {
      copied: { workspace: null, runtimeKind: 'autobyteus', llmModelIdentifier: 'gpt-5.5', llmConfig: { reasoning_effort: 'low' }, autoExecuteTools: true },
    })
    await flushPromises()
    expect(resolveChatLaunchReadiness(draft)).toEqual({ ready: true })
    expect(mocks.fetchModels).toHaveBeenCalledWith('autobyteus')
  })
})
