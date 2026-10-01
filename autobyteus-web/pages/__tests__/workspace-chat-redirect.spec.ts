import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'

const routing = vi.hoisted(() => ({
  route: { path: '/workspace', query: {} as Record<string, string> },
  replace: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routing.route,
  useRouter: () => ({ replace: routing.replace, push: vi.fn() }),
}))
vi.mock('~/composables/workspace/useWorkspaceRouteSelection', () => ({ useWorkspaceRouteSelection: vi.fn() }))
vi.mock('~/stores/serverSettings', () => ({ useServerSettingsStore: () => ({ fetchServerSettings: vi.fn().mockResolvedValue(undefined) }) }))
vi.mock('~/stores/fileExplorer', () => ({ useFileExplorerStore: () => ({ getOpenFiles: () => [] }) }))
vi.mock('~/stores/workspace', () => ({ useWorkspaceStore: () => ({ activeWorkspace: null, activeWorkspaceMetadata: null }) }))

import WorkspacePage from '../workspace.vue'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'

const mountPage = () => shallowMount(WorkspacePage, { global: { stubs: { WorkspaceAdaptiveLayout: true } } })

describe('/workspace → /chat redirect for standalone agent runs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routing.route = reactive({ path: '/workspace', query: {} as Record<string, string> })
    routing.replace.mockClear()
  })

  it('redirects a committed standalone selection change to the chat view', async () => {
    mountPage()
    useAgentSelectionStore().selectRun('temp-7', 'agent')
    await nextTick()
    await flushPromises()

    expect(routing.replace).toHaveBeenCalledWith({ path: '/chat', query: { id: 'temp-7' } })
  })

  it('does not redirect a stale standalone selection on mount', async () => {
    useAgentSelectionStore().selectRun('run-stale', 'agent')
    mountPage()
    await flushPromises()

    expect(routing.replace).not.toHaveBeenCalled()
  })

  it('never redirects while an Agent Org route is shown, and leaves team selections alone', async () => {
    routing.route.query = { rootSubjectKind: 'agent_org', orgRunId: 'org-1', mode: 'active' }
    mountPage()
    useAgentSelectionStore().selectRun('run-1', 'agent')
    await flushPromises()
    expect(routing.replace).not.toHaveBeenCalled()

    routing.route.query = {}
    useAgentSelectionStore().selectRun('team-1', 'team')
    await flushPromises()
    expect(routing.replace).not.toHaveBeenCalled()
  })
})
