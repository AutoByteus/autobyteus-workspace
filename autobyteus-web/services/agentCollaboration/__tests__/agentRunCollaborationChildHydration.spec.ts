import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  GetAgentRunCollaborationMemberFileChanges,
  GetAgentRunCollaborationMemberProjection,
} from '~/graphql/queries/collaboratorQueries'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { useRunFileChangesStore } from '~/stores/runFileChangesStore'
import { beginLocalUserSubmission } from '~/services/runSubmission/localUserSubmission'
import { handleAgentInputState } from '~/services/agentStreaming/handlers/agentInputStateHandler'
import { buildAgentRunCollaborationContext } from '../agentRunCollaborationHydration'
import { hydrateAgentRunCollaborationChild } from '../agentRunCollaborationChildHydration'
import { agentRootView } from './agentRootFixture'

/**
 * delegated-copies-slow-open D-2 / DS-005 (AC-004, AC-006): one child's stored details load into one
 * published context, hub-scoped; a load whose context is no longer published writes nothing; a live
 * change during the fetch retries within the same context.
 */
const mocks = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: mocks.query }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  ensureWorkspaceByRootPath: vi.fn(async () => null),
  resolveWorkspaceMetadataByRootPath: vi.fn(async () => null),
}) }))

const artifact = (runId: string, name: string, overrides: Record<string, unknown> = {}) => ({
  id: `${runId}:/outputs/${name}`, runId, path: `/outputs/${name}`, type: 'image', status: 'available',
  sourceTool: 'generated_output', sourceInvocationId: null, content: null,
  createdAt: '2026-10-06T10:00:00.000Z', updatedAt: '2026-10-06T10:00:00.000Z', ...overrides,
})
const userEntry = (messageId: string, content: string) => ({ kind: 'message', role: 'user', content, messageId, ts: 1_700_000_000 })
const assistantEntry = (content: string) => ({ kind: 'message', role: 'assistant', content, ts: 1_700_000_001 })
type Served = { conversation?: unknown[]; fail?: 'projection' | 'artifacts'; hold?: Promise<unknown> }
const serve = (next: () => Served = () => ({})) => mocks.query.mockImplementation(async ({ query, variables }) => {
  const plan = next()
  if (plan.hold) await plan.hold
  if (query === GetAgentRunCollaborationMemberFileChanges) {
    return plan.fail === 'artifacts'
      ? { data: null, errors: [{ message: `artifacts unavailable for ${variables.agentRunId}` }] }
      : { data: { agentRunCollaborationMemberFileChanges: [artifact(variables.agentRunId, '1.png'), artifact(variables.agentRunId, '2.png')] } }
  }
  if (query === GetAgentRunCollaborationMemberProjection) {
    if (plan.fail === 'projection') return { data: null, errors: [{ message: 'projection unavailable' }] }
    return { data: { agentRunCollaborationMemberProjection: {
      agentRunId: variables.agentRunId, memberAddress: variables.memberAddress,
      conversation: plan.conversation ?? [assistantEntry('stored answer')],
      activities: [{ kind: 'system_instruction', activityId: `projected-${variables.agentRunId}`, content: 'projected', ts: 1 }],
      hasEarlierActiveTraceEvents: true,
    } } }
  }
  throw new Error('Unexpected query')
})
const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((yes) => { resolve = yes })
  return { promise, resolve }
}
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }
const requests = (query: unknown) => mocks.query.mock.calls.filter(([options]) => options.query === query)
const paths = (runId: string) => useRunFileChangesStore().getArtifactsForRun(runId).map((entry) => entry.path)
const setup = async (input: { published?: () => boolean; live?: () => boolean } = {}) => {
  const collaboration = await buildAgentRunCollaborationContext({ hostRunId: 'host-run', view: agentRootView() })
  const load = () => hydrateAgentRunCollaborationChild({
    hostRunId: 'host-run', collaboration, agentRunId: 'pp-run',
    isPublished: input.published ?? (() => true), liveToolAuthority: input.live ?? (() => false),
  })
  return { collaboration, child: collaboration.getAgentContext('pp-run')!, load }
}
const texts = (messages: readonly { type: string; text?: string }[]) => messages.map((message) => message.type === 'user' ? message.text : message.type)

describe('hydrateAgentRunCollaborationChild', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads exactly the selected child through the hub-scoped queries and commits conversation, activities and artifacts', async () => {
    serve()
    const { collaboration, child, load } = await setup()
    const revision = child.state.eventMonitorPresentationRevision

    await expect(load()).resolves.toBe('hydrated')

    expect(requests(GetAgentRunCollaborationMemberProjection).map(([options]) => options.variables)).toEqual([
      { hostRunId: 'host-run', memberAddress: '/product_team/prototyper', agentRunId: 'pp-run' },
    ])
    expect(requests(GetAgentRunCollaborationMemberFileChanges).map(([options]) => options.variables)).toEqual([
      { hostRunId: 'host-run', memberAddress: '/product_team/prototyper', agentRunId: 'pp-run' },
    ])
    expect(mocks.query).toHaveBeenCalledTimes(2)
    expect(collaboration.isChildHydrated('pp-run')).toBe(true)
    expect(collaboration.isChildHydrated('cua-run')).toBe(false)
    expect(child.state.conversation.messages).toHaveLength(1)
    expect(child.state.hasEarlierActiveTraceEvents).toBe(true)
    expect(child.state.eventMonitorPresentationRevision).toBe(revision + 1)
    expect(useAgentActivityStore().getActivities('pp-run')).toEqual([expect.objectContaining({ activityId: 'projected-pp-run' })])
    expect(paths('pp-run')).toEqual(['/outputs/1.png', '/outputs/2.png'])
    expect(paths('cua-run')).toEqual([])
  })

  it('keeps a live FILE_CHANGE newer than the loaded list without duplicating it', async () => {
    serve()
    const { load } = await setup()
    useRunFileChangesStore().upsertFromLivePayload(artifact('pp-run', '1.png', { status: 'streaming', updatedAt: '2026-10-06T10:00:05.000Z' }) as never)

    await load()

    const entries = useRunFileChangesStore().getArtifactsForRun('pp-run')
    expect(entries.map((entry) => entry.path).sort()).toEqual(['/outputs/1.png', '/outputs/2.png'])
    expect(entries.find((entry) => entry.path === '/outputs/1.png')).toMatchObject({ status: 'streaming' })
  })

  it('ends superseded and writes nothing once its context is no longer published (republication during the load)', async () => {
    const gate = deferred()
    serve(() => ({ hold: gate.promise }))
    let published = true
    const { collaboration, child, load } = await setup({ published: () => published })
    const conversation = child.state.conversation
    const pending = load(); await flush()

    published = false
    gate.resolve()

    await expect(pending).resolves.toBe('superseded')
    expect(mocks.query).toHaveBeenCalledTimes(2)
    expect(child.state.conversation).toBe(conversation)
    expect(collaboration.isChildHydrated('pp-run')).toBe(false)
    expect(useAgentActivityStore().getActivities('pp-run')).toEqual([])
    expect(paths('pp-run')).toEqual([])
  })

  it('a failed fetch whose context was replaced is superseded too, not an error', async () => {
    serve(() => ({ fail: 'projection' }))
    let published = true
    const { load } = await setup({ published: () => published })
    const pending = load()
    published = false
    await expect(pending).resolves.toBe('superseded')
  })

  it('a live presentation event during the fetch retries against the same context, then commits', async () => {
    const gate = deferred()
    let call = 0
    serve(() => (call++ < 2 ? { hold: gate.promise } : {}))
    const { collaboration, child, load } = await setup()
    const pending = load(); await flush()

    child.state.markEventMonitorPresentationChanged()
    gate.resolve()

    await expect(pending).resolves.toBe('hydrated')
    expect(requests(GetAgentRunCollaborationMemberProjection)).toHaveLength(2)
    expect(requests(GetAgentRunCollaborationMemberFileChanges)).toHaveLength(2)
    expect(collaboration.isChildHydrated('pp-run')).toBe(true)
  })

  it('a message the user sends during the fetch is never overwritten by the stale projection', async () => {
    const gate = deferred()
    let call = 0
    serve(() => (call++ < 2
      ? { hold: gate.promise, conversation: [assistantEntry('stale')] }
      : { conversation: [assistantEntry('stale'), userEntry('m-1', 'hello')] }))
    const { child, load } = await setup()
    const pending = load(); await flush()

    beginLocalUserSubmission(child, { text: 'hello', attachments: [], navigationTarget: null, identity: { messageId: 'm-1', dedupeKey: 'k-1' } })
    expect(texts(child.state.conversation.messages)).toEqual(['hello'])
    gate.resolve()

    await expect(pending).resolves.toBe('hydrated')
    expect(texts(child.state.conversation.messages)).toEqual(['ai', 'hello'])
  })

  it('an activity change during the fetch retries; three changes in a row fail and leave the child not loaded', async () => {
    const gates = [deferred(), deferred(), deferred()]
    let call = 0
    serve(() => ({ hold: gates[Math.floor(call++ / 2)]!.promise }))
    const { collaboration, load } = await setup()
    const pending = load()
    for (const gate of gates) {
      await flush()
      useAgentActivityStore().upsertSystemInstructionActivity('pp-run', {
        kind: 'system_instruction', activityId: `live-${call}`, content: 'live', timestamp: new Date(),
      })
      gate.resolve()
    }

    await expect(pending).rejects.toThrow("Agent collaboration child 'pp-run' of 'host-run' changed while it was loading.")
    expect(requests(GetAgentRunCollaborationMemberProjection)).toHaveLength(3)
    expect(collaboration.isChildHydrated('pp-run')).toBe(false)
    expect(paths('pp-run')).toEqual([])
  })

  it.each(['projection', 'artifacts'] as const)('a %s failure throws and writes nothing', async (fail) => {
    serve(() => ({ fail }))
    const { collaboration, child, load } = await setup()
    const conversation = child.state.conversation

    await expect(load()).rejects.toThrow(fail === 'projection' ? 'projection unavailable' : 'artifacts unavailable for pp-run')
    expect(collaboration.isChildHydrated('pp-run')).toBe(false)
    expect(child.state.conversation).toBe(conversation)
    expect(paths('pp-run')).toEqual([])
  })

  it.each([true, false])('live tool decisions win over the stored projection only while the hub stream is ready (ready=%s)', async (live) => {
    serve(() => ({ conversation: [{ kind: 'tool_call', invocationId: 'inv-1', toolName: 'run_bash', toolArgs: { command: 'ls' }, ts: 1 }] }))
    const { child, load } = await setup({ live: () => live })
    child.state.conversation.messages.push({
      type: 'ai', text: '', timestamp: new Date(), isComplete: false,
      segments: [{ type: 'tool_call', invocationId: 'inv-1', toolName: 'run_bash', arguments: { command: 'ls' },
        status: 'approved', logs: [], result: null, error: null }],
    } as never)

    await load()

    const segment = (child.state.conversation.messages.at(-1) as { segments: { invocationId?: string; status?: string }[] })
      .segments.find((entry) => entry.invocationId === 'inv-1')
    expect(segment).toBeDefined()
    if (live) expect(segment?.status).toBe('approved')
    else expect(segment?.status).not.toBe('approved')
  })

  it('keeps the held or queued input the view showed, even when it is not stored yet', async () => {
    serve(() => ({ conversation: [assistantEntry('stored answer')] }))
    const { child, load } = await setup()
    handleAgentInputState({ run_instance_id: 'i-1', revision: 1, recoverableBlock: null, entries: [{
      message_id: 'q-1', dedupe_key: 'qk-1', sender_type: 'user', content: 'queued', state: 'queued', file_attachments: [],
    }] } as never, child)

    await load()

    expect(child.state.conversation.messages.map((message) => message.type === 'user'
      ? [message.text, message.pendingInput?.state] : [message.type])).toEqual([['ai'], ['queued', 'queued']])
  })
})
