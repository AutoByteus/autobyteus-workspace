import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { AgentRunCollaborationContext } from '~/services/agentCollaboration/agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '~/services/agentCollaboration/agentRunCollaborationIndex'
import { agentRootView } from '~/services/agentCollaboration/__tests__/agentRootFixture'

const stream = vi.hoisted(() => ({
  instances: [] as Array<{ options: any; connect: any; whenReady: any; sendMessage: any; isReady: any; disconnect: any }>,
}))
vi.mock('~/services/agentCollaboration/agentRunCollaborationStreamingService', () => ({
  AgentRunCollaborationStreamingService: class {
    connect = vi.fn(); whenReady = vi.fn(async () => undefined); sendMessage = vi.fn(async () => undefined)
    isReady = vi.fn(() => false); disconnect = vi.fn(); interrupt = vi.fn(); decideTool = vi.fn()
    constructor(public options: any) { stream.instances.push(this as never) }
  },
}))
const build = () => {
  const view = agentRootView()
  return new AgentRunCollaborationContext({
    hostRunId: 'host-run', view,
    entries: [...new AgentRunCollaborationIndex(view.execution_tree).agents.values()].map((agent) => {
      const state = new AgentRunState(agent.agentRunId, { id: agent.agentRunId, messages: [], createdAt: 'x', updatedAt: 'x', agentDefinitionId: 'd', agentName: agent.address })
      state.currentStatus = AgentStatus.Offline
      return { agentRunId: agent.agentRunId, memberAddress: agent.address, context: new AgentContext({ agentDefinitionId: 'd', agentDefinitionName: agent.address } as never, state) }
    }),
  })
}
vi.mock('~/services/agentCollaboration/agentRunCollaborationHydration', () => ({
  readAgentRunCollaboration: vi.fn(async () => ({})),
  stageAgentRunCollaborationContext: vi.fn(async () => ({ context: build(), commit: () => undefined })),
}))
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ applyRunNavigationEffect: vi.fn() }) }))

import { useAgentRunCollaborationStore } from '../agentRunCollaborationStore'

describe('agentRunCollaborationStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); stream.instances.length = 0 })

  it('reads a stopped run without connecting, opens a new task Team once and lists its rows', async () => {
    const store = useAgentRunCollaborationStore()
    store.syncHost('host-run', false)
    await store.inspect('host-run')
    expect(stream.instances).toHaveLength(0)
    expect(store.isTaskTeamExpanded('host-run', 'team-run')).toBe(true)
    expect(store.taskRows('host-run').map((entry) => entry.row.displayName)).toEqual(['computer use agent', 'product team', 'prototyper', 'bootstrapper'])
    store.toggleTaskTeam('host-run', 'team-run')
    await store.inspect('host-run')
    expect(store.isTaskTeamExpanded('host-run', 'team-run')).toBe(false)
  })

  it('selects a child as the target, and the run row returns to the host with a Team tab', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    expect(store.childTargetFor('host-run')).toBeNull()
    expect(store.hostMessagesView('host-run')).toMatchObject({ rootKind: 'agent', focusedAgentRunId: 'host-run' })
    store.selectChild('host-run', 'pp-run')
    expect(store.childTargetFor('host-run')).toMatchObject({
      kind: 'agent_run_task_team_member', host: { hostRunId: 'host-run' }, address: '/product_team/prototyper', agentRunId: 'pp-run', access: 'live',
      collaborationMessages: { focusedAgentRunId: 'pp-run' }, workspaceRootPath: '/ws',
    })
    store.selectChild('host-run', 'cua-run')
    expect(store.childTargetFor('host-run')).toMatchObject({ kind: 'agent_run_task_agent', agentRunId: 'cua-run', workspaceRootPath: '/ws' })
    store.selectChild('host-run', 'unknown')
    expect(store.childTargetFor('host-run')).toBeNull()
  })

  it('reads a child\'s earlier events from the host\'s collaboration package, not as a top-level run (CR-002)', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    store.selectChild('host-run', 'pp-run')
    expect(store.childTargetFor('host-run')?.browse).toEqual({
      kind: 'standaloneMember', hostRunId: 'host-run', memberAddress: '/product_team/prototyper', agentRunId: 'pp-run',
    })
    store.selectChild('host-run', 'cua-run')
    expect(store.childTargetFor('host-run')?.browse).toEqual({
      kind: 'standaloneMember', hostRunId: 'host-run', memberAddress: '/computer_use_agent', agentRunId: 'cua-run',
    })
  })

  it('sending to a child attaches the stream (which restores the host) and carries mentions', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    const context = store.contextFor('host-run')!.getAgentContext('cua-run')!
    context.requestedMentions = [{ kind: 'agent', definitionId: 'code-reviewer', name: 'Code Reviewer' }]
    await store.submit('host-run', 'cua-run', context, 'ask @Code Reviewer', [])
    expect(stream.instances).toHaveLength(1)
    expect(stream.instances[0]!.connect).toHaveBeenCalled()
    expect(stream.instances[0]!.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      agentRunId: 'cua-run', content: 'ask @Code Reviewer', mentions: [{ kind: 'agent', definition_id: 'code-reviewer' }],
    }))
    expect(context.state.conversation.messages.at(-1)).toMatchObject({ type: 'user', text: 'ask @Code Reviewer', mentionNames: ['Code Reviewer'] })
    expect(context.requestedMentions).toEqual([])
  })
})
