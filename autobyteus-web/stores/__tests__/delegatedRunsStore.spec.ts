import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const io = vi.hoisted(() => ({
  agentContexts: new Map<string, any>(),
  teams: new Map<string, any>(),
  openAgentRun: vi.fn(),
  openTeamRun: vi.fn(),
  ensureMember: vi.fn(async () => undefined),
  agentRuns: {
    connectToAgentStream: vi.fn(), sendUserInputAndSubscribe: vi.fn(async () => undefined), interruptGeneration: vi.fn(),
    postToolExecutionApproval: vi.fn(async () => undefined), terminateRun: vi.fn(async () => true),
  },
  teamRuns: {
    connectToTeamStream: vi.fn(), sendMessageToFocusedMember: vi.fn(async () => undefined), interruptFocusedMemberGeneration: vi.fn(),
    postToolExecutionApproval: vi.fn(async () => undefined), terminateTeamRun: vi.fn(async () => true),
  },
}))
vi.mock('~/services/runOpen/agentRunOpenCoordinator', () => ({ openAgentRun: io.openAgentRun }))
vi.mock('~/services/runOpen/teamRunOpenCoordinator', () => ({ openTeamRun: io.openTeamRun }))
vi.mock('~/services/runHydration/teamMemberProjectionHydrationService', () => ({ ensureAuthoritativeTeamMemberProjection: io.ensureMember }))
vi.mock('~/stores/agentContextsStore', () => ({ useAgentContextsStore: () => ({ getRun: (id: string) => io.agentContexts.get(id) }) }))
vi.mock('~/stores/agentTeamContextsStore', () => ({ useAgentTeamContextsStore: () => ({ getTeamContextById: (id: string) => io.teams.get(id) }) }))
vi.mock('~/stores/agentRunStore', () => ({ useAgentRunStore: () => io.agentRuns }))
vi.mock('~/stores/agentTeamRunStore', () => ({ useAgentTeamRunStore: () => io.teamRuns }))
vi.mock('~/stores/workspace', () => ({ useWorkspaceStore: () => ({ resolveWorkspaceMetadataByRootPath: vi.fn(async () => null) }) }))

import { useDelegatedRunsStore } from '../delegatedRunsStore'

const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }
const agent = { kind: 'agent' as const, agentRunId: 'child-run' }
const member = { kind: 'team_member' as const, teamRunId: 'child-team', memberAddress: '/reviewer', agentRunId: 'reviewer-run' }
const teamContext = (contexts: Record<string, unknown>) => ({ view: {
  getAgentContext: (id: string) => contexts[id] ?? null, getAgentWorkspaceRootPath: () => '/team-ws',
} })

/** autobyteus-461 rule 2: a delegated run is reached through its own standard path, by its own run ID. */
describe('delegatedRunsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); vi.clearAllMocks(); io.agentContexts.clear(); io.teams.clear()
    io.openAgentRun.mockImplementation(async ({ runId }: { runId: string }) => {
      io.agentContexts.set(runId, { state: { runId }, config: { workspaceMetadata: { workspaceRootPath: '/own-ws' } } })
    })
    io.openTeamRun.mockImplementation(async ({ teamRunId }: { teamRunId: string }) => { io.teams.set(teamRunId, teamContext({ 'reviewer-run': { state: { runId: 'reviewer-run' } } })) })
  })

  it('opens an agent run as its own open does, without selecting it, once while in flight, and keeps its own stream', async () => {
    const store = useDelegatedRunsStore()
    expect(store.bindingOf(agent)).toBeNull()
    store.ensureOpen(agent); store.ensureOpen(agent)
    await flush()
    expect(io.openAgentRun).toHaveBeenCalledOnce()
    expect(io.openAgentRun).toHaveBeenCalledWith(expect.objectContaining({ runId: 'child-run', selectRun: false }))
    expect(io.agentRuns.connectToAgentStream).toHaveBeenCalledWith('child-run')
    expect(store.bindingOf(agent)).toMatchObject({ context: { state: { runId: 'child-run' } }, workspaceRootPath: '/own-ws', browse: { kind: 'run', runId: 'child-run' } })
    // Opened already: selecting it again only keeps its stream.
    store.ensureOpen(agent)
    expect(io.openAgentRun).toHaveBeenCalledOnce()
    expect(io.agentRuns.connectToAgentStream).toHaveBeenCalledTimes(2)
  })

  it('an agent run\'s message, interrupt, tool decision and Stop go to that run by its run ID', async () => {
    const store = useDelegatedRunsStore()
    store.ensureOpen(agent); await flush()
    const { interaction } = store.bindingOf(agent)!
    await interaction.send('ignored: the composer wrote the draft on the run\'s own context', [])
    await interaction.interrupt()
    await interaction.decideTool('invocation', true, null)
    await store.stop(agent)
    expect(io.agentRuns.sendUserInputAndSubscribe).toHaveBeenCalledWith('child-run')
    expect(io.agentRuns.interruptGeneration).toHaveBeenCalledWith('child-run')
    expect(io.agentRuns.postToolExecutionApproval).toHaveBeenCalledWith('child-run', 'invocation', true, null)
    expect(io.agentRuns.terminateRun).toHaveBeenCalledWith('child-run')
  })

  it('a delegated Team\'s member: the Team run opens focused on it (its stream with it), and its commands go to that Team run', async () => {
    const store = useDelegatedRunsStore()
    store.ensureOpen(member); await flush()
    expect(io.openTeamRun).toHaveBeenCalledWith(expect.objectContaining({ teamRunId: 'child-team', agentRunId: 'reviewer-run', selectRun: false }))
    const binding = store.bindingOf(member)!
    expect(binding).toMatchObject({ workspaceRootPath: '/team-ws', browse: { kind: 'teamMember', teamRunId: 'child-team', memberAddress: '/reviewer', agentRunId: 'reviewer-run' } })
    await binding.interaction.send('hello', [])
    await binding.interaction.interrupt()
    await binding.interaction.decideTool('invocation', false, 'no')
    await store.stop(member)
    const target = { teamRunId: 'child-team', agentRunId: 'reviewer-run' }
    expect(io.teamRuns.sendMessageToFocusedMember).toHaveBeenCalledWith('hello', [], { member: target })
    expect(io.teamRuns.interruptFocusedMemberGeneration).toHaveBeenCalledWith(target)
    expect(io.teamRuns.postToolExecutionApproval).toHaveBeenCalledWith('invocation', false, 'no', null, 'child-team')
    expect(io.teamRuns.terminateTeamRun).toHaveBeenCalledWith('child-team')
    // The Team open already connects its stream; another member of the open Team is read as its own view reads one.
    store.ensureOpen({ ...member, agentRunId: 'other-run', memberAddress: '/other' }); await flush()
    expect(io.openTeamRun).toHaveBeenCalledOnce()
    expect(io.teamRuns.connectToTeamStream).toHaveBeenCalledWith('child-team')
    expect(io.ensureMember).toHaveBeenCalledWith(expect.objectContaining({ agentRunId: 'other-run' }))
  })

  it('a failed open is kept as the run\'s error, and selecting the row again retries', async () => {
    io.openAgentRun.mockRejectedValueOnce(new Error('projection unavailable'))
    const store = useDelegatedRunsStore()
    store.ensureOpen(agent); await flush()
    expect(store.errorFor(agent)).toBe('projection unavailable')
    expect(store.bindingOf(agent)).toBeNull()
    store.ensureOpen(agent); await flush()
    expect(io.openAgentRun).toHaveBeenCalledTimes(2)
    expect(store.errorFor(agent)).toBeNull()
    expect(store.bindingOf(agent)).not.toBeNull()
  })
})
