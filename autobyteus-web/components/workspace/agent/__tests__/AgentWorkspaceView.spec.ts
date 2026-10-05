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
  copyAgentFromConfig: vi.fn(),
  showConfig: vi.fn(),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({ get activeWorkspaceTarget() { return mocks.target } }) }))
vi.mock('~/composables/runSettings/useRunStart', () => ({ useRunStart: () => ({ copyAgentFromConfig: mocks.copyAgentFromConfig }) }))
vi.mock('~/stores/workspaceCenterViewStore', () => ({ useWorkspaceCenterViewStore: () => ({ showConfig: mocks.showConfig }) }))
vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => ({ agentDefinitions: [{ id: 'autobyteus-daily-assistant' }], getAgentDefinitionById: () => null, fetchAllAgentDefinitions: vi.fn() }),
}))
vi.mock('~/composables/agentCollaboration/useAgentRunCollaborationSync', () => ({ useAgentRunCollaborationSync: vi.fn() }))
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
      AgentEventMonitor: { name: 'AgentEventMonitor', props: ['skillTagging', 'composerPlaceholder'], template: '<div data-test="monitor" />' },
      AgentStatusDisplay: { template: '<span data-test="status" />' },
      SkillImprovementComposerCta: true,
      WorkspaceHeaderActions: {
        props: { showEditConfig: { type: Boolean, default: true } },
        template: '<div><button data-test="new-agent" @click="$emit(\'new-agent\')" /><button v-if="showEditConfig" data-test="edit-config" @click="$emit(\'edit-config\')" /></div>',
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

  it('＋ opens New chat copied from this run (REQ-013); ⚙ opens the run settings', async () => {
    mocks.target = buildTarget('run-1', 'hello')
    const wrapper = mountView()

    await wrapper.get('[data-test="new-agent"]').trigger('click')
    await flushPromises()
    expect(mocks.copyAgentFromConfig).toHaveBeenCalledWith(expect.objectContaining({
      agentDefinitionId: 'autobyteus-daily-assistant', runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5',
      autoExecuteTools: true, workspaceMetadata: expect.objectContaining({ workspaceRootPath: '/Users/me/project' }),
    }))

    await wrapper.get('[data-test="edit-config"]').trigger('click')
    expect(mocks.showConfig).toHaveBeenCalledTimes(1)
  })

  it('hides ⚙ for a `temp-*` context whose first send failed; its composer stays available (AR-003)', () => {
    mocks.target = buildTarget('temp-chat-1', 'hello')
    const wrapper = mountView()
    expect(wrapper.find('[data-test="edit-config"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="new-agent"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="monitor"]').exists()).toBe(true)
  })

  it('gives the box `/` skill tagging with the agent skills', () => {
    mocks.target = buildTarget('run-1', 'hello')
    const monitor = mountView().getComponent({ name: 'AgentEventMonitor' })
    expect(monitor.props('skillTagging')).toEqual({
      skills: [{ name: 'writer', description: 'Writes' }], allInstalled: true, placeholder: expect.any(String),
    })
  })

  it('F-04: a collaborator of the run has the ⚙ and ＋ controls, is titled by its name, and its box names it', async () => {
    const host = buildTarget('run-1', 'hello')
    const context = host.context
    context.config = { ...context.config, agentDefinitionId: 'computer-use', agentDefinitionName: 'computer use agent' }
    mocks.target = { ...host, kind: 'agent_run_task_agent', host: { hostRunId: 'host-run' } }
    const wrapper = mountView()
    expect(wrapper.get('[data-test="agent-workspace-title"]').text()).toBe('computer use agent')
    const monitor = wrapper.getComponent({ name: 'AgentEventMonitor' })
    expect(monitor.props('skillTagging')).toBeNull()
    expect(monitor.props('composerPlaceholder')).toBe('Message computer use agent…')
    // CR-001: ＋ copies the collaborator on screen, not the host run.
    await wrapper.get('[data-test="new-agent"]').trigger('click')
    await flushPromises()
    expect(mocks.copyAgentFromConfig).toHaveBeenCalledTimes(1)
    expect(mocks.copyAgentFromConfig).toHaveBeenCalledWith(expect.objectContaining({ agentDefinitionId: 'computer-use' }))
    await wrapper.get('[data-test="edit-config"]').trigger('click')
    expect(mocks.showConfig).toHaveBeenCalledTimes(1)
  })

  it('CR-001: ＋ on a task team’s member copies that member agent', async () => {
    const host = buildTarget('run-1', 'hello')
    host.context.config = { ...host.context.config, agentDefinitionId: 'reviewer-def', agentDefinitionName: 'reviewer' }
    mocks.target = { ...host, kind: 'agent_run_task_team_member', host: { hostRunId: 'host-run' } }
    const wrapper = mountView()
    await wrapper.get('[data-test="new-agent"]').trigger('click')
    await flushPromises()
    expect(mocks.copyAgentFromConfig).toHaveBeenCalledWith(expect.objectContaining({ agentDefinitionId: 'reviewer-def' }))
  })
})
