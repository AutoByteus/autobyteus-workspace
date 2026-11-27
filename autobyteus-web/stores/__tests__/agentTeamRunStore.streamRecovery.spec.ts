import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAgentTeamRunStore } from '../agentTeamRunStore'
import { useTeamStreamRecoveryStore } from '~/stores/teamStreamRecoveryStore'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { MessageNotDeliveredError } from '~/services/runSubmission/messageNotDelivered'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext'
import type { ContextAttachment } from '~/types/conversation'

/**
 * autobyteus-541 A (ARCH-REV-001 AR-001, AC-010): the page's own state across a Team stream's recovery commit. Each walk
 * of the design is one test: typing across the commit; a send, then the commit, then its success; a send that times out
 * before a later commit; a send the failed stream had taken; a held send; an echo already in the new conversation.
 */

type FakeService = {
  options: { onStreamRecoveryRequired(notice: unknown): void }
  connectionState: string
  isReady: boolean
  isReopenRequired: boolean
  connect: ReturnType<typeof vi.fn>
  connectCandidate: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  attachContext: ReturnType<typeof vi.fn>
  sendMessage: ReturnType<typeof vi.fn>
}

const { services, teams, contexts, runHistory } = vi.hoisted(() => {
  const teams = new Map<string, any>()
  return {
    services: [] as any[],
    teams,
    contexts: {
      get activeTeamContext() { return teams.get('team-r') ?? null },
      getTeamContextById: (id: string) => teams.get(id),
      replaceTeamContext: (id: string, expected: any, replacement: any) => {
        if (teams.get(id) !== expected) throw new Error(`Team context '${id}' changed before recovery commit.`)
        teams.set(id, replacement)
      },
    },
    runHistory: { refreshTreeQuietly: () => Promise.resolve(), applyRunNavigationEffect: () => undefined },
  }
})

vi.mock('~/services/agentStreaming', () => ({
  ConnectionState: { DISCONNECTED: 'disconnected', CONNECTING: 'connecting', CONNECTED: 'connected' },
  TeamStreamingService: vi.fn().mockImplementation((_endpoint: string, options: unknown) => {
    const service = {
      options, connectionState: 'connected', isReady: true, isReopenRequired: false,
      connect: vi.fn(), connectCandidate: vi.fn().mockResolvedValue(undefined), disconnect: vi.fn(),
      attachContext: vi.fn(), sendMessage: vi.fn().mockResolvedValue(undefined),
    }
    services.push(service)
    return service
  }),
}))
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ teamWs: 'ws://node.example/ws/agent-team' }) }),
}))
vi.mock('~/stores/agentTeamContextsStore', () => ({ useAgentTeamContextsStore: () => contexts }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => runHistory }))
vi.mock('~/stores/contextFileUploadStore', () => ({
  useContextFileUploadStore: () => ({ finalizeDraftAttachments: async ({ attachments }: { attachments: unknown[] }) => attachments }),
}))
vi.mock('~/stores/runHistoryLoadActions', () => ({
  ensureRunHistoryWorkspaceByRootPath: vi.fn(),
  resolveRunHistoryWorkspaceMetadataByRootPath: vi.fn(),
}))
vi.mock('~/services/runHydration/teamRunContextHydrationService', () => ({ hydrateLiveTeamRunContext: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ mutate: vi.fn() }) }))

const ROOT = 'team-r'
const WORKER = 'worker-run'
const LEAD = 'lead-run'

const team = (): AgentTeamContext => buildTestTeamContext({
  teamRunId: ROOT,
  coordinatorAddress: '/lead',
  rootChildren: [
    testAgentNode('/lead', { displayName: 'Lead', agentRunId: LEAD, currentStatus: AgentStatus.Idle }),
    testAgentNode('/worker', { displayName: 'Worker', agentRunId: WORKER, currentStatus: AgentStatus.Idle }),
  ],
  focusedAgentRunId: WORKER,
})
const worker = (context: AgentTeamContext) => context.view.getAgentContext(WORKER)!
const userRows = (context: AgentTeamContext) => worker(context).state.conversation.messages.filter((message) => message.type === 'user')
const attachment: ContextAttachment = {
  kind: 'workspace_path', id: 'notes', locator: '/tmp/notes.md', displayName: 'notes.md', type: 'Text',
}

/** A ready stream for the open Team, which then loses order: the first service is `reopen_required` and published. */
const failedTeam = () => {
  const failed = team()
  teams.set(ROOT, failed)
  const store = useAgentTeamRunStore()
  store.connectToTeamStream(ROOT)
  const first = services[0] as FakeService
  first.isReady = false
  first.isReopenRequired = true
  first.options.onStreamRecoveryRequired({ kind: 'team_stream_recovery_required', rootTeamRunId: ROOT })
  return { store, failed, first }
}

/** The verified replacement commits `candidate` (what the automatic recovery and a reselect both do). */
const commit = async (store: ReturnType<typeof useAgentTeamRunStore>, candidate: AgentTeamContext) => {
  await store.replaceFailedTeamStream({ rootTeamRunId: ROOT, candidateContext: candidate, expectedBaseChangeSequence: 5 })
  return services.at(-1) as FakeService
}

describe('agentTeamRunStore across a Team stream recovery (autobyteus-541 A)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    services.length = 0
    teams.clear()
    useTeamStreamRecoveryStore().registerOwner()
  })
  // The store's streams are the module's: each test starts without one.
  afterEach(() => { useAgentTeamRunStore().disconnectAllTeamStreams(); vi.useRealTimers() })

  it('typing across the commit: the draft and the page state go with the member; Stopping does not (D-A6)', async () => {
    const { store, failed } = failedTeam()
    const old = worker(failed)
    old.requirement = 'half a sentence'
    old.contextFilePaths = [attachment]
    old.requestedSkillNames = ['review']
    old.requestedMentions = [{ kind: 'agent', definitionId: 'agent-def', name: 'Tester' }]
    old.messageNotDelivered = 'not_sent'
    old.collaboratorAddFailure = { kind: 'agent', name: 'Tester' } as never
    old.submissionPending = true
    old.interruptPending = true
    worker(failed).state.currentStatus = AgentStatus.Running
    const candidate = team()

    await commit(store, candidate)

    expect(contexts.getTeamContextById(ROOT)).toBe(candidate)
    const now = worker(candidate)
    expect(now.requirement).toBe('half a sentence')
    expect(now.contextFilePaths).toEqual([attachment])
    expect(now.requestedSkillNames).toEqual(['review'])
    expect(now.requestedMentions).toEqual([{ kind: 'agent', definitionId: 'agent-def', name: 'Tester' }])
    expect(now.messageNotDelivered).toBe('not_sent')
    expect(now.collaboratorAddFailure).toEqual({ kind: 'agent', name: 'Tester' })
    expect(now.submissionPending).toBe(true)
    expect(now.interruptPending).toBe(false)
    // The status is the replacement's (its snapshot's), not carried.
    expect(now.state.currentStatus).toBe(AgentStatus.Idle)
    expect(useTeamStreamRecoveryStore().stateOf(ROOT)).toBeNull()
  })

  it('a send, then the commit, then success: the send waits, goes on the new stream, and lands on the new member (D-A4, D-A7)', async () => {
    vi.useFakeTimers()
    const { store, failed, first } = failedTeam()
    const sending = store.sendMessageToFocusedMember('please continue', [])
    await vi.advanceTimersByTimeAsync(2_000)
    // Waiting: the old member shows the message and "sending"; nothing went to the failed stream.
    expect(userRows(failed)).toHaveLength(1)
    expect(worker(failed).submissionPending).toBe(true)
    expect(first.sendMessage).not.toHaveBeenCalled()

    const candidate = team()
    const replacement = await commit(store, candidate)
    expect(worker(candidate).submissionPending).toBe(true)
    await vi.advanceTimersByTimeAsync(100)
    await sending

    expect(replacement.sendMessage).toHaveBeenCalledWith('please continue', WORKER, [], [], expect.objectContaining({ messageId: expect.any(String) }))
    expect(userRows(candidate).map((row) => row.type === 'user' && row.text)).toEqual(['please continue'])
    expect(worker(candidate).messageNotDelivered).toBeNull()
    expect(worker(candidate).requirement).toBe('')
    expect(worker(candidate).state.currentStatus).toBe(AgentStatus.Idle)
    expect(worker(candidate).state.conversation.messages.some((message) => message.type === 'ai')).toBe(false)
  })

  it('a send whose 10 s wait ends before a later commit: the draft and its notice come back and are carried (DEC-002)', async () => {
    vi.useFakeTimers()
    const { store, failed } = failedTeam()
    const sending = store.sendMessageToFocusedMember('later please', [attachment])
    await vi.advanceTimersByTimeAsync(10_100)
    await sending

    const old = worker(failed)
    expect(old.messageNotDelivered).toBe('not_sent')
    expect(old.requirement).toBe('later please')
    expect(old.contextFilePaths).toEqual([attachment])
    expect(old.submissionPending).toBe(false)
    expect(userRows(failed)).toHaveLength(0)
    // Never "select this Team member again", and the member's status is left as it was.
    expect(old.state.currentStatus).toBe(AgentStatus.Idle)
    expect(old.state.conversation.messages.some((message) => message.type === 'ai')).toBe(false)

    await vi.advanceTimersByTimeAsync(5_000)
    const candidate = team()
    await commit(store, candidate)
    expect(worker(candidate).requirement).toBe('later please')
    expect(worker(candidate).contextFilePaths).toEqual([attachment])
    expect(worker(candidate).messageNotDelivered).toBe('not_sent')
    expect(worker(candidate).submissionPending).toBe(false)
  })

  it('a send the failed stream had taken: its draft and unknown notice settle on the old member and are carried', async () => {
    const live = team()
    teams.set(ROOT, live)
    const store = useAgentTeamRunStore()
    store.connectToTeamStream(ROOT)
    const first = services[0] as FakeService
    // The gap drains the admitted send (`teamSends.drain` → `unknown`) and fails the stream.
    first.sendMessage.mockImplementation(async () => {
      first.isReady = false
      first.isReopenRequired = true
      first.options.onStreamRecoveryRequired({ kind: 'team_stream_recovery_required', rootTeamRunId: ROOT })
      throw new MessageNotDeliveredError('unknown', 'Team message admission was cancelled because Team stream recovery is required.')
    })

    await store.sendMessageToFocusedMember('did it arrive?', [])
    expect(worker(live).messageNotDelivered).toBe('unknown')
    expect(worker(live).requirement).toBe('did it arrive?')

    const candidate = team()
    await commit(store, candidate)
    expect(worker(candidate).messageNotDelivered).toBe('unknown')
    expect(worker(candidate).requirement).toBe('did it arrive?')
    // The replacement's snapshot shows whether the node had it (540's unknown rule): nothing is added to it.
    expect(userRows(candidate)).toHaveLength(0)
  })

  it('a held send (with a mention) moves without a row and shows on the new member when accepted (D-A7a)', async () => {
    vi.useFakeTimers()
    const { store, failed } = failedTeam()
    worker(failed).requestedMentions = [{ kind: 'agent', definitionId: 'agent-def', name: 'Tester' }]
    const sending = store.sendMessageToFocusedMember('ask @Tester to check', [])
    await vi.advanceTimersByTimeAsync(500)
    expect(userRows(failed)).toHaveLength(0)
    expect(worker(failed).requirement).toBe('')

    const candidate = team()
    const replacement = await commit(store, candidate)
    let resolveSend!: () => void
    replacement.sendMessage.mockReturnValue(new Promise<void>((resolve) => { resolveSend = resolve }))
    await vi.advanceTimersByTimeAsync(100)
    // Retargeted, still held: no row on either member until the root accepts it.
    expect(userRows(candidate)).toHaveLength(0)
    expect(replacement.sendMessage).toHaveBeenCalledWith('ask @Tester to check', WORKER, [], [],
      expect.objectContaining({ mentions: [{ kind: 'agent', definition_id: 'agent-def' }] }))

    resolveSend()
    await sending
    expect(userRows(candidate).map((row) => row.type === 'user' && row.text)).toEqual(['ask @Tester to check'])
    expect(userRows(failed)).toHaveLength(0)
    expect(worker(candidate).requestedMentions).toEqual([])
  })

  it('a send whose echo is already in the new conversation is not shown twice', async () => {
    vi.useFakeTimers()
    const { store, failed } = failedTeam()
    const sending = store.sendMessageToFocusedMember('only once', [])
    await vi.advanceTimersByTimeAsync(200)
    const optimistic = userRows(failed)[0]
    const messageId = optimistic?.type === 'user' ? optimistic.messageId : undefined
    expect(messageId).toEqual(expect.any(String))
    // The replacement's snapshot already holds the node's echo of this message (same message ID).
    const candidate = team()
    worker(candidate).state.conversation.messages.push({
      type: 'user', text: 'only once', timestamp: '2026-11-27T00:00:00.000Z', messageId, contextFilePaths: [],
    } as never)
    await commit(store, candidate)
    await vi.advanceTimersByTimeAsync(100)
    await sending
    expect(userRows(candidate)).toHaveLength(1)
  })

  it('a send whose Team stream is closed while it waits gives the not-sent notice at once', async () => {
    vi.useFakeTimers()
    const { store, failed } = failedTeam()
    const sending = store.sendMessageToFocusedMember('closing', [])
    await vi.advanceTimersByTimeAsync(100)
    store.disconnectTeamStream(ROOT)
    await vi.advanceTimersByTimeAsync(100)
    await sending
    expect(worker(failed).messageNotDelivered).toBe('not_sent')
    expect(worker(failed).requirement).toBe('closing')
  })
})
