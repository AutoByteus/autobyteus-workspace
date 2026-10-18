import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { AgentOrgExecutionEventDto } from '@autobyteus/collaboration-stream-contracts'
import type { AgentContext } from '~/types/agent/AgentContext'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  ensureWorkspaceByRootPath: vi.fn(),
  resolveWorkspaceMetadataByRootPath: vi.fn(),
}))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: mocks.query }) }))
vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => ({
    ensureWorkspaceByRootPath: mocks.ensureWorkspaceByRootPath,
    resolveWorkspaceMetadataByRootPath: mocks.resolveWorkspaceMetadataByRootPath,
  }),
}))

import { stageAgentOrgExecutionContext } from '../agentOrgContextHydration'
import { taskBearingView } from './taskBearingOrgFixture'

const hydrate = async () => {
  const staged = await stageAgentOrgExecutionContext({ orgRunId: 'org-run', view: taskBearingView(), source: 'stream' })
  staged.commit()
  return staged.context
}
const segment = { segment_id: 'segment-1', turn_id: 'turn-1', segment_type: 'text' as const }
const start = (address: string, agentRunId: string): AgentOrgExecutionEventDto => ({
  kind: 'agent_presentation', member_address: address, agent_run_id: agentRunId,
  message: { type: 'SEGMENT_START', payload: { ...segment, metadata: null } },
} as AgentOrgExecutionEventDto)
const item = (address: string, agentRunId: string, delta: string) => ({
  member_address: address, agent_run_id: agentRunId, message: { type: 'SEGMENT_CONTENT' as const, payload: { ...segment, delta } },
})
const batch = (...items: ReturnType<typeof item>[]): AgentOrgExecutionEventDto => ({ kind: 'agent_presentation_batch', items })
const text = (context: AgentContext): string => context.conversation.messages
  .flatMap((message) => ('segments' in message ? message.segments : []) as { content?: string }[])
  .map((part) => part.content ?? '').join('|')

describe('AgentOrg context content batches (autobyteus-139)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.query.mockImplementation(async ({ variables }) => ({ data: { getAgentOrgMemberRunProjection: {
      agentRunId: variables.agentRunId, memberAddress: variables.memberAddress, conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
    } } }))
  })

  it('applies a batch at the next sequence, per agent in item order, and continues after its range', async () => {
    const context = await hydrate()
    expect(context.applyEvent(9, start('/worker', 'agent-worker-task'))).toBe('applied')
    expect(context.applyEvent(10, start('/team/lead', 'agent-task-lead'))).toBe('applied')
    expect(context.applyEvent(11, batch(
      item('/worker', 'agent-worker-task', 'xy'), item('/team/lead', 'agent-task-lead', '12'),
    ), 16)).toBe('applied')
    expect(context.changeSequence).toBe(16)
    expect(text(context.getAgentContext('agent-worker-task')!)).toBe('xy')
    expect(text(context.getAgentContext('agent-task-lead')!)).toBe('12')
    expect(context.applyEvent(17, batch(item('/worker', 'agent-worker-task', 'z')), 17)).toBe('applied')
    expect(text(context.getAgentContext('agent-worker-task')!)).toBe('xyz')
    expect(context.phase).toBe('live')
  })

  it('requires reopen for a batch that does not start at the next sequence', async () => {
    const context = await hydrate()
    expect(() => context.applyEvent(10, batch(item('/worker', 'agent-worker-task', 'x')), 12))
      .toThrow('Expected change sequence 9, received 10.')
    expect(context.phase).toBe('reopen_required')
  })

  it('requires reopen for a batch with a wrong identity before applying any of its items', async () => {
    const context = await hydrate()
    context.applyEvent(9, start('/worker', 'agent-worker-task'))
    expect(() => context.applyEvent(10, batch(
      item('/worker', 'agent-worker-task', 'x'), item('/elsewhere', 'agent-task-lead', 'y'),
    ), 11)).toThrow("Agent presentation identity 'agent-task-lead' is not in the context.")
    expect(text(context.getAgentContext('agent-worker-task')!)).toBe('')
  })
})
