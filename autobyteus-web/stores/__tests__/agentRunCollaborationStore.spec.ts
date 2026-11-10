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
  buildAgentRunCollaborationContext: vi.fn(async () => build()),
}))
// The member loader asks for each selected child's load target (autobyteus-358); the test records the requests only.
const childHydration = vi.hoisted(() => ({ hydrate: vi.fn((_input: { agentRunId: string }) => null) }))
vi.mock('~/services/agentCollaboration/agentRunCollaborationChildHydration', () => ({
  hubChildLoadTarget: childHydration.hydrate,
}))
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ applyRunNavigationEffect: vi.fn() }) }))

import { useAgentRunCollaborationStore } from '../agentRunCollaborationStore'

describe('agentRunCollaborationStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); stream.instances.length = 0; childHydration.hydrate.mockClear() })

  it('reads a stopped run without connecting, keeps a new task Team collapsed and preserves explicit disclosure', async () => {
    const store = useAgentRunCollaborationStore()
    store.syncHost('host-run', false)
    await store.inspect('host-run')
    expect(stream.instances).toHaveLength(0)
    expect(store.isTaskTeamExpanded('host-run', 'team-run')).toBe(false)
    expect(store.taskRows('host-run').map((entry) => entry.row.displayName)).toEqual(['computer use agent', 'product team'])
    store.toggleTaskTeam('host-run', 'team-run')
    await store.inspect('host-run')
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
    // Each selected child starts one load of its details; the run's own agent and unknown children none.
    expect(childHydration.hydrate.mock.calls.map(([input]) => input.agentRunId)).toEqual(['pp-run', 'cua-run'])
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

  it('releaseAll closes every host stream and drops every host view (autobyteus-435 REQ-010 (b))', async () => {
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    const context = store.contextFor('host-run')!.getAgentContext('cua-run')!
    await store.submit('host-run', 'cua-run', context, 'hello', [])
    expect(stream.instances).toHaveLength(1)

    store.releaseAll()

    expect(stream.instances[0]!.disconnect).toHaveBeenCalled()
    expect(store.contextFor('host-run')).toBeNull()
  })

  it('reads a hub selection\'s view once: Settings shares the inspection in flight and the published view (AC-004)', async () => {
    const reads = vi.mocked((await import('~/services/agentCollaboration/agentRunCollaborationHydration')).readAgentRunCollaboration)
    reads.mockClear()
    const store = useAgentRunCollaborationStore()
    const inspection = store.inspect('host-run')
    const settings = store.viewFor('host-run')
    await inspection
    expect(await settings).toBe(store.contextFor('host-run')!.view)
    expect(await store.viewFor('host-run')).toBe(store.contextFor('host-run')!.view)
    expect(reads).toHaveBeenCalledOnce()
  })

  it('a deliberate re-read (fresh) reads the view again and publishes it; a failed one rejects with its reason (autobyteus-366, CR-003)', async () => {
    const hydration = await import('~/services/agentCollaboration/agentRunCollaborationHydration')
    const reads = vi.mocked(hydration.readAgentRunCollaboration)
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    const published = store.contextFor('host-run')!
    reads.mockClear()
    // A normal selection keeps the one read (DS-004).
    expect(await store.viewFor('host-run')).toBe(published.view)
    expect(reads).not.toHaveBeenCalled()
    // After a committed Save: a new read, published.
    const fresh = await store.viewFor('host-run', { fresh: true })
    expect(reads).toHaveBeenCalledOnce()
    expect(store.contextFor('host-run')).not.toBe(published)
    expect(fresh).toBe(store.contextFor('host-run')!.view)
    // A failed re-read rejects, never handing back the published (older) view.
    reads.mockRejectedValueOnce(new Error('collaboration view unavailable'))
    await expect(store.viewFor('host-run', { fresh: true })).rejects.toThrow('collaboration view unavailable')
    const recovered = await store.viewFor('host-run', { fresh: true })
    expect(recovered).toBe(store.contextFor('host-run')!.view)
  })

  it('a first read that fails fails Settings\' load with its reason, not a hub without copies (CR-003)', async () => {
    const reads = vi.mocked((await import('~/services/agentCollaboration/agentRunCollaborationHydration')).readAgentRunCollaboration)
    reads.mockRejectedValueOnce(new Error('collaboration view unavailable'))
    await expect(useAgentRunCollaborationStore().viewFor('host-run')).rejects.toThrow('collaboration view unavailable')
  })

  it('a fresh read for Settings after a Save reads a stopped host again; a live host is kept current by its stream (autobyteus-348)', async () => {
    const reads = vi.mocked((await import('~/services/agentCollaboration/agentRunCollaborationHydration')).readAgentRunCollaboration)
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    const first = store.contextFor('host-run')!.view
    reads.mockClear()
    expect(await store.viewFor('host-run')).toBe(first)
    expect(reads).not.toHaveBeenCalled()
    await store.viewFor('host-run', { fresh: true })
    expect(reads).toHaveBeenCalledOnce()
    expect(store.contextFor('host-run')!.view).not.toBe(first)
    // A host with a stream (it is running) is not read again: the stream is the source.
    store.attach('host-run')
    reads.mockClear()
    await store.viewFor('host-run', { fresh: true })
    expect(reads).not.toHaveBeenCalled()
  })

  it('selecting a stopped hub whose stored view is already published reads it no more (QR-002); a hub that stops is read again', async () => {
    const reads = vi.mocked((await import('~/services/agentCollaboration/agentRunCollaborationHydration')).readAgentRunCollaboration)
    const store = useAgentRunCollaborationStore()
    await store.inspect('host-run')
    store.contextFor('host-run')!.setActive(false) // the stored view of a stopped hub
    reads.mockClear()
    store.syncHost('host-run', false)
    store.syncHost('host-run', false)
    await Promise.resolve()
    expect(reads).not.toHaveBeenCalled()
    store.syncHost('host-run', true)
    store.syncHost('host-run', false)
    await Promise.resolve()
    expect(reads).toHaveBeenCalledOnce()
  })
})

