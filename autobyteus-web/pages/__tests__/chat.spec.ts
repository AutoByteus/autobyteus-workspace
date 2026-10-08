import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'

const routing = vi.hoisted(() => ({
  route: { path: '/chat', query: {} as Record<string, string> },
  replace: vi.fn(),
  push: vi.fn(),
  open: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routing.route,
  useRouter: () => ({ replace: routing.replace, push: routing.push }),
}))
vi.mock('~/services/workspace/workspaceNavigationService', () => ({
  buildAgentRunChatRoute: (runId: string) => ({ path: '/chat', query: { id: runId } }),
  openWorkspaceExecutionLink: routing.open,
}))
vi.mock('~/stores/chatDraftStore', () => ({ useChatDraftStore: () => ({ startNewChat: vi.fn() }) }))

import ChatPage from '../chat.vue'
import { ArchivedAgentRunOpenError } from '~/services/runOpen/agentRunOpenCoordinator'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'

const buildContext = (runId: string) => new AgentContext({
  agentDefinitionId: 'a', agentDefinitionName: 'A', llmModelIdentifier: 'm', runtimeKind: 'autobyteus',
  workspaceId: null, workspaceMetadata: null, autoExecuteTools: true, isLocked: false,
}, new AgentRunState(runId, { id: runId, messages: [], createdAt: '', updatedAt: '', agentDefinitionId: 'a' }))

const mountPage = () => mount(ChatPage, {
  global: {
    stubs: {
      ChatNewSurface: { template: '<div data-test="stub-new" />' },
      // The chat run view is the workspace frame over the selected standalone run (D-17).
      WorkspaceAdaptiveLayout: { template: '<div data-test="stub-frame" />' },
      // New chat is a start surface: its tools sit behind one icon (REQ-020).
      WorkspaceToolShell: { props: { startSurface: Boolean }, template: '<div data-test="stub-tool-shell" :data-start-surface="String(startSurface)"><slot /></div>' },
    },
    mocks: { $t: (key: string) => key },
  },
})

describe('pages/chat.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routing.route = reactive({ path: '/chat', query: {} as Record<string, string> })
    routing.replace.mockReset().mockImplementation(async (target: any) => {
      routing.route.query = typeof target === 'string' ? {} : { ...target.query }
    })
    routing.open.mockReset()
  })

  it('shows the New chat surface without an id, as a start surface', () => {
    const wrapper = mountPage()
    expect(wrapper.find('[data-test="stub-new"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="stub-tool-shell"]').attributes('data-start-surface')).toBe('true')
  })

  it('selects and shows a mounted run', async () => {
    useAgentContextsStore().runs.set('run-1', buildContext('run-1'))
    routing.route.query = { id: 'run-1' }
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('[data-test="stub-frame"]').exists()).toBe(true)
    expect(useAgentSelectionStore().selectedRunId).toBe('run-1')
    expect(routing.open).not.toHaveBeenCalled()
  })

  it('opens an unmounted run through the run open path', async () => {
    routing.open.mockImplementation(async () => { useAgentContextsStore().runs.set('run-2', buildContext('run-2')) })
    routing.route.query = { id: 'run-2' }
    const wrapper = mountPage()
    await flushPromises()

    expect(routing.open).toHaveBeenCalledWith({ kind: 'agent', runId: 'run-2' })
    // The open path (mocked here) selects the run; the page then shows the frame.
    expect(wrapper.find('[data-test="stub-frame"]').exists()).toBe(true)
  })

  it('shows the missing-chat state for an id that cannot be opened', async () => {
    routing.open.mockRejectedValue(new Error('not found'))
    routing.route.query = { id: 'gone' }
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('[data-test="chat-missing"]').text()).toContain('chat.missing.title')
  })

  it('returns to New chat for a temp id that is no longer registered', async () => {
    routing.route.query = { id: 'temp-gone' }
    mountPage()
    await flushPromises()

    expect(routing.replace).toHaveBeenCalledWith('/chat')
  })

  it('follows promotion of the displayed temp context to its permanent id', async () => {
    const contexts = useAgentContextsStore()
    contexts.registerDraftRun(buildContext('temp-3'))
    routing.route.query = { id: 'temp-3' }
    const wrapper = mountPage()
    await flushPromises()

    contexts.promoteTemporaryId('temp-3', 'run-3')
    await flushPromises()

    expect(routing.replace).toHaveBeenCalledWith({ path: '/chat', query: { id: 'run-3' } })
    expect(routing.replace).not.toHaveBeenCalledWith('/chat')
    expect(routing.replace).not.toHaveBeenCalledWith({ path: '/workspace' })
    expect(wrapper.find('[data-test="stub-frame"]').exists()).toBe(true)
    expect(useAgentSelectionStore().selectedRunId).toBe('run-3')
  })

  describe('an archived or deleted run leaves to the workspace empty view', () => {
    it('leaves a displayed stored run that is removed, without re-opening it or selecting another run', async () => {
      const contexts = useAgentContextsStore()
      contexts.runs.set('run-other', buildContext('run-other'))
      contexts.runs.set('run-open', buildContext('run-open'))
      routing.route.query = { id: 'run-open' }
      mountPage()
      await flushPromises()
      expect(useAgentSelectionStore().selectedRunId).toBe('run-open')

      // Archive / Archive all / Delete cleanup removes the stored run's context.
      contexts.removeRun('run-open')
      await flushPromises()

      expect(routing.replace).toHaveBeenCalledWith({ path: '/workspace' })
      expect(routing.open).not.toHaveBeenCalled()
      expect(contexts.getRun('run-open')).toBeUndefined()
      expect(useAgentSelectionStore().selectedRunId).toBeNull()
    })

    it('keeps the displayed run when a different run is removed', async () => {
      const contexts = useAgentContextsStore()
      contexts.runs.set('run-other', buildContext('run-other'))
      contexts.runs.set('run-open', buildContext('run-open'))
      routing.route.query = { id: 'run-open' }
      const wrapper = mountPage()
      await flushPromises()

      contexts.removeRun('run-other')
      await flushPromises()

      expect(routing.replace).not.toHaveBeenCalled()
      expect(wrapper.find('[data-test="stub-frame"]').exists()).toBe(true)
      expect(useAgentSelectionStore().selectedRunId).toBe('run-open')
    })

    it('returns to New chat when a displayed draft is discarded', async () => {
      const contexts = useAgentContextsStore()
      contexts.registerDraftRun(buildContext('temp-5'))
      routing.route.query = { id: 'temp-5' }
      mountPage()
      await flushPromises()

      contexts.removeRun('temp-5')
      await flushPromises()

      expect(routing.replace).toHaveBeenCalledWith('/chat')
      expect(routing.replace).not.toHaveBeenCalledWith({ path: '/workspace' })
    })

    it('leaves a stale address of an archived run without opening it', async () => {
      useAgentContextsStore().runs.set('run-other', buildContext('run-other'))
      useAgentSelectionStore().selectRun('run-other', 'agent')
      routing.open.mockRejectedValue(new ArchivedAgentRunOpenError('run-archived'))
      routing.route.query = { id: 'run-archived' }
      const wrapper = mountPage()
      await flushPromises()

      expect(routing.open).toHaveBeenCalledWith({ kind: 'agent', runId: 'run-archived' })
      expect(routing.replace).toHaveBeenCalledWith({ path: '/workspace' })
      expect(wrapper.find('[data-test="chat-missing"]').exists()).toBe(false)
      expect(useAgentContextsStore().getRun('run-archived')).toBeUndefined()
      expect(useAgentSelectionStore().selectedRunId).toBeNull()
    })
  })

  describe('run settings (⚙) belong to their run (CR-005)', () => {
    it('shows the conversation of a new chat sent after ⚙ was left open on another chat', async () => {
      const contexts = useAgentContextsStore()
      const center = useWorkspaceCenterViewStore()
      contexts.runs.set('run-a', buildContext('run-a'))
      routing.route.query = { id: 'run-a' }
      mountPage()
      await flushPromises()
      center.showConfig()
      await flushPromises()

      // Pencil → New chat (no id), then the first send lands on the new run.
      routing.route.query = {}
      await flushPromises()
      contexts.registerDraftRun(buildContext('temp-p'))
      routing.route.query = { id: 'temp-p' }
      await flushPromises()

      expect(center.isConfigMode).toBe(false)
    })

    it('keeps a draft’s settings open across its temp → permanent promotion', async () => {
      const contexts = useAgentContextsStore()
      const center = useWorkspaceCenterViewStore()
      contexts.registerDraftRun(buildContext('temp-d'))
      routing.route.query = { id: 'temp-d' }
      mountPage()
      await flushPromises()
      center.showConfig()
      await flushPromises()

      contexts.promoteTemporaryId('temp-d', 'run-d')
      await flushPromises()

      expect(routing.replace).toHaveBeenCalledWith({ path: '/chat', query: { id: 'run-d' } })
      expect(center.isConfigMode).toBe(true)
    })

    it('shows the conversation when Chat mounts while settings are open for another run', async () => {
      useWorkspaceCenterViewStore().showConfig()
      useAgentContextsStore().runs.set('run-b', buildContext('run-b'))
      routing.route.query = { id: 'run-b' }
      mountPage()
      await flushPromises()

      expect(useWorkspaceCenterViewStore().isConfigMode).toBe(false)
    })
  })
})

