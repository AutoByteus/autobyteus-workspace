import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, reactive } from 'vue'
import AgentWorkspaceView from '../AgentWorkspaceView.vue'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'

const mocks = vi.hoisted(() => ({
  target: null as any,
  push: vi.fn(),
  startNewChat: vi.fn(),
  showConfig: vi.fn(),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({ get activeWorkspaceTarget() { return mocks.target } }) }))
vi.mock('~/stores/chatDraftStore', () => ({ useChatDraftStore: () => ({ startNewChat: mocks.startNewChat }) }))
vi.mock('~/stores/workspaceCenterViewStore', () => ({ useWorkspaceCenterViewStore: () => ({ showConfig: mocks.showConfig }) }))
vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => ({ agentDefinitions: [{ id: 'autobyteus-daily-assistant' }], getAgentDefinitionById: () => null, fetchAllAgentDefinitions: vi.fn() }),
}))
vi.mock('~/composables/chat/useChatComposerOptions', () => ({
  useChatComposerOptions: () => ({
    skillOptions: computed(() => [{ name: 'writer', description: 'Writes' }]),
    skillsAllInstalled: computed(() => true),
  }),
}))

const buildTarget = (runId: string, firstMessage: string | null) => {
  const context = reactive(new AgentContext({
    agentDefinitionId: 'autobyteus-daily-assistant', agentDefinitionName: 'Daily Assistant', llmModelIdentifier: 'gpt-5.5',
    runtimeKind: 'codex_app_server', workspaceId: 'ws-1',
    workspaceMetadata: { workspaceId: 'ws-1', workspaceRootPath: '/Users/me/project', displayName: 'project', kind: 'filesystem' } as any,
    autoExecuteTools: true, isLocked: false,
  }, new AgentRunState(runId, { id: runId, messages: [], createdAt: '', updatedAt: '', agentDefinitionId: 'autobyteus-daily-assistant' }))) as AgentContext
  context.state.currentStatus = AgentStatus.Idle
  if (firstMessage) context.state.conversation.messages.push({ type: 'user', text: firstMessage, timestamp: new Date(), contextFilePaths: [] } as any)
  return { kind: 'standalone_agent', access: 'live', context, browse: { kind: 'run', runId } }
}

const mountView = () => mount(AgentWorkspaceView, {
  global: {
    stubs: {
      AgentEventMonitor: { name: 'AgentEventMonitor', props: ['skillTagging'], template: '<div data-test="monitor" />' },
      AgentStatusDisplay: { template: '<span data-test="status" />' },
      SkillImprovementComposerCta: true,
      WorkspaceHeaderActions: {
        template: '<div><button data-test="new-agent" @click="$emit(\'new-agent\')" /><button data-test="edit-config" @click="$emit(\'edit-config\')" /></div>',
      },
    },
    mocks: { $t: (key: string) => key },
  },
})

describe('AgentWorkspaceView (the chat run view, D-17)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('titles the run with its first message, truncated to 42 characters, with the full text on hover', () => {
    const text = 'Help me write a skill for weekly planning and review'
    mocks.target = buildTarget('run-1', text)
    const title = mountView().get('[data-test="agent-workspace-title"]')
    expect(title.text()).toBe(`${text.slice(0, 41)}…`)
    expect(title.attributes('title')).toBe(text)
  })

  it('keeps the product title for a draft without messages', () => {
    mocks.target = buildTarget('temp-1', null)
    expect(mountView().get('[data-test="agent-workspace-title"]').text()).toBe('New - Daily Assistant')
  })

  it('＋ starts a New chat preset to this agent and workspace; ⚙ opens the run settings', async () => {
    mocks.target = buildTarget('run-1', 'hello')
    const wrapper = mountView()

    await wrapper.get('[data-test="new-agent"]').trigger('click')
    await flushPromises()
    expect(mocks.startNewChat).toHaveBeenCalledWith({ agentDefinitionId: 'autobyteus-daily-assistant', workspaceRootPath: '/Users/me/project' })
    expect(mocks.push).toHaveBeenCalledWith('/chat')

    await wrapper.get('[data-test="edit-config"]').trigger('click')
    expect(mocks.showConfig).toHaveBeenCalledTimes(1)
  })

  it('gives the box `/` skill tagging with the agent skills', () => {
    mocks.target = buildTarget('run-1', 'hello')
    const monitor = mountView().getComponent({ name: 'AgentEventMonitor' })
    expect(monitor.props('skillTagging')).toEqual({
      skills: [{ name: 'writer', description: 'Writes' }], allInstalled: true, placeholder: expect.any(String),
    })
  })
})
