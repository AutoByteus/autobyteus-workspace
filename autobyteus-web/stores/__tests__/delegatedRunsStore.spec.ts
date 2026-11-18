import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const io = vi.hoisted(() => ({
  agentContexts: new Map<string, any>(),
  teams: new Map<string, any>(),
  openAgentRun: vi.fn(),
  openTeamRun: vi.fn(),
  ensureWorkspace: vi.fn(async () => 'workspace-1'),
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
vi.mock('~/stores/runHistoryLoadActions', () => ({ ensureRunHistoryWorkspaceByRootPath: io.ensureWorkspace }))
vi.mock('~/stores/workspace', () => ({ useWorkspaceStore: () => ({ resolveWorkspaceMetadataByRootPath: vi.fn(async () => null) }) }))
const peerStreams = vi.hoisted(() => ({ opened: new Map<string, { context: unknown; service: unknown }>() }))
vi.mock('~/services/peerRuns/peerRunStreams', () => ({ createPeerRunStreams: () => ({
  open: (subject: { agentRunId: string }) => { peerStreams.opened.set(subject.agentRunId, { context: { state: { runId: subject.agentRunId } }, service: {} }) },
  streamOf: (subject: { agentRunId: string }) => peerStreams.opened.get(subject.agentRunId) ?? null,
  closeAll: () => peerStreams.opened.clear(),
}) }))

import { useDelegatedRunsStore } from '../delegatedRunsStore'

const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }
const agent = { kind: 'agent' as const, agentRunId: 'child-run' }
const member = { kind: 'team_member' as const, teamRunId: 'child-team', agentRunId: 'reviewer-run' }
const teamContext = (contexts: Record<string, unknown>) => ({ view: {
  getAgentContext: (id: string) => contexts[id] ?? null, getAgentWorkspaceRootPath: () => '/team-ws',
  // The member's address in the Team run's own space (SR-084: the subject carries none; the open Team's view has it).
  getMemberAddress: (id: string) => (id === 'reviewer-run' ? '/reviewer' : null),
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
    // SR-087: its own stream starts with the run's snapshot, which catches up what the open's read missed.
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
    io.agentRuns.interruptGeneration.mockResolvedValueOnce({ kind: 'refused', detail: 'x' })
    await expect(interaction.interrupt()).resolves.toEqual({ kind: 'refused', detail: 'x' })
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
    // CR-461-076 (PMU-003): a running Team needs its workspaces activated, as the Team's own open does.
    expect(io.openTeamRun).toHaveBeenCalledWith(expect.objectContaining({ teamRunId: 'child-team', agentRunId: 'reviewer-run', selectRun: false,
      ensureWorkspaceByRootPath: io.ensureWorkspace }))
    const binding = store.bindingOf(member)!
    expect(binding).toMatchObject({ workspaceRootPath: '/team-ws', browse: { kind: 'teamMember', teamRunId: 'child-team', memberAddress: '/reviewer', agentRunId: 'reviewer-run' } })
    await binding.interaction.send('hello', [])
    io.teamRuns.interruptFocusedMemberGeneration.mockResolvedValueOnce({ kind: 'accepted' })
    await expect(binding.interaction.interrupt()).resolves.toEqual({ kind: 'accepted' })
    await binding.interaction.decideTool('invocation', false, 'no')
    await store.stop(member)
    const target = { teamRunId: 'child-team', agentRunId: 'reviewer-run' }
    expect(io.teamRuns.sendMessageToFocusedMember).toHaveBeenCalledWith('hello', [], { member: target })
    expect(io.teamRuns.interruptFocusedMemberGeneration).toHaveBeenCalledWith(target)
    expect(io.teamRuns.postToolExecutionApproval).toHaveBeenCalledWith('invocation', false, 'no', null, 'child-team')
    expect(io.teamRuns.terminateTeamRun).toHaveBeenCalledWith('child-team')
    // The Team open already connects its stream; another member of the open Team is read as its own view reads one.
    store.ensureOpen({ ...member, agentRunId: 'other-run' }); await flush()
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

  it("CR-461-099: a peer team's member binds as its run on its node: no workspace, and its trace and files read as a peer's (kept there)", async () => {
    const peer = { kind: 'peer' as const, nodeId: 'node-b', runKind: 'agent_team' as const, runId: 'studio-team', agentRunId: 'studio-mate', address: '/studio_team/mate' }
    const store = useDelegatedRunsStore()
    store.ensureOpen(peer)
    await store.whenOpen(peer)
    expect(store.bindingOf(peer)).toMatchObject({ workspaceRootPath: null,
      browse: { kind: 'peerRun', nodeId: 'node-b', runId: 'studio-team', agentRunId: 'studio-mate' } })
  })

  // MSP-06: the phone on its trusted private HTTP pairing is not a secure context, so `crypto.randomUUID` is missing there.
  it('a message and an interrupt to a peer run are sent without crypto.randomUUID (the phone over plain HTTP)', async () => {
    const peer = { kind: 'peer' as const, nodeId: 'node-b', runKind: 'agent' as const, runId: 'beta-run', agentRunId: 'beta-run', address: '/beta' }
    const store = useDelegatedRunsStore()
    store.ensureOpen(peer)
    await store.whenOpen(peer)
    const service = { whenBound: vi.fn(async () => undefined), sendMessageAwaitingAdmission: vi.fn(async () => undefined), interruptGeneration: vi.fn() }
    Object.assign(peerStreams.opened.get('beta-run')!, { service, context: { requirement: 'hi' } })
    const randomUUID = globalThis.crypto.randomUUID
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true })
    try {
      await store.bindingOf(peer)!.interaction.send('hi', [])
      await store.bindingOf(peer)!.interaction.interrupt()
    } finally { Object.defineProperty(globalThis.crypto, 'randomUUID', { value: randomUUID, configurable: true }) }
    const [, , , ids] = service.sendMessageAwaitingAdmission.mock.calls[0] as unknown as [string, unknown, unknown, { messageId: string; dedupeKey: string }]
    expect(ids.messageId).toMatch(/^peer_msg_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(ids.dedupeKey).toBe(ids.messageId)
    expect(service.interruptGeneration).toHaveBeenCalledWith(expect.stringMatching(/^peer_interrupt_/))
  })

  it.each(['not_sent', 'unknown'] as const)('a peer run\'s %s message keeps its draft and shows the notice; a new send clears it (autobyteus-540 D-1, D-4)', async (certainty) => {
    const peer = { kind: 'peer' as const, nodeId: 'node-b', runKind: 'agent' as const, runId: `delta-${certainty}`, agentRunId: `delta-${certainty}`, address: '/delta' }
    const store = useDelegatedRunsStore()
    store.ensureOpen(peer)
    await store.whenOpen(peer)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { MessageNotDeliveredError } = await import('~/services/runSubmission/messageNotDelivered')
    const context = { requirement: 'hello node B', messageNotDelivered: null as string | null }
    const service = {
      whenBound: vi.fn(async () => { if (certainty === 'not_sent') throw new MessageNotDeliveredError('not_sent', 'not bound') }),
      sendMessageAwaitingAdmission: vi.fn(async () => { throw new MessageNotDeliveredError('unknown', 'closed') }),
      interruptGeneration: vi.fn(),
    }
    Object.assign(peerStreams.opened.get(`delta-${certainty}`)!, { service, context })
    await expect(store.bindingOf(peer)!.interaction.send('hello node B', [])).resolves.toBeUndefined()
    expect(context.requirement).toBe('hello node B')
    expect(context.messageNotDelivered).toBe(certainty)
    expect(service.sendMessageAwaitingAdmission).toHaveBeenCalledTimes(certainty === 'not_sent' ? 0 : 1)
    service.whenBound.mockResolvedValue(undefined)
    service.sendMessageAwaitingAdmission.mockResolvedValue(undefined as never)
    await store.bindingOf(peer)!.interaction.send('hello node B', [])
    expect(context.messageNotDelivered).toBeNull()
    expect(context.requirement).toBe('')
  })

  it('a peer run\'s Stop returns its stream\'s outcome; with no open stream it is not sent (autobyteus-533 D-W1)', async () => {
    const peer = { kind: 'peer' as const, nodeId: 'node-b', runKind: 'agent' as const, runId: 'gamma-run', agentRunId: 'gamma-run', address: '/gamma' }
    const store = useDelegatedRunsStore()
    store.ensureOpen(peer)
    await store.whenOpen(peer)
    const interaction = store.bindingOf(peer)!.interaction
    Object.assign(peerStreams.opened.get('gamma-run')!, { service: { interruptGeneration: vi.fn(async () => ({ kind: 'connection_lost' })) } })
    await expect(interaction.interrupt()).resolves.toEqual({ kind: 'connection_lost' })
    peerStreams.opened.delete('gamma-run')
    await expect(interaction.interrupt()).resolves.toEqual({ kind: 'not_sent' })
  })
})
