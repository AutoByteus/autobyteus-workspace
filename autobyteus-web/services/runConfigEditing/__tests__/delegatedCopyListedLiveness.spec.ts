import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const io = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query }) }))

import { isDelegatedCopyLive } from '~/services/runConfigEditing/delegatedCopyLiveness'
import { useListedRunChildrenStore } from '~/stores/listedRunChildrenStore'

/**
 * autobyteus-461 SR-055: a listed run that is not open has no view; its delegated rows come from the history poll's
 * answer, and so does whether a row's copy runs (its Stop icon), as the rows of an open run do from its view.
 */
const startedAt = '2026-11-12T00:00:00.000Z'
const answer = (kind: 'agent' | 'agent_team' | 'agent_org', runId: string, worker: string, lead: string) => ({
  kind, runId, isActive: false, children: [
    { row: { kind: 'agent', address: '/worker', agentRunId: 'worker-run', agentDefinitionId: null, delegatorAgentRunId: 'd', startedAt },
      delegatorAddress: '/d', statuses: [{ agentRunId: 'worker-run', memberAddress: '/worker', status: worker }], node: null },
    { row: { kind: 'agent_team', address: '/qa', teamRunId: 'qa-run', coordinatorAgentRunId: 'lead-run', delegatorAgentRunId: 'd', startedAt,
      members: [{ address: '/lead', agentRunId: 'lead-run', agentDefinitionId: null }] },
      delegatorAddress: '/d', statuses: [{ agentRunId: 'lead-run', memberAddress: '/lead', status: lead }], node: null },
  ],
})

beforeEach(() => { setActivePinia(createPinia()); io.query.mockReset() })

describe.each([['AGENT', 'agent'], ['AGENT_TEAM', 'agent_team'], ['AGENT_ORG', 'agent_org']] as const)('a listed %s run that is not open', (rootKind, kind) => {
  const root = { rootKind, rootRunId: 'run-1' }
  const poll = async (worker: string, lead: string) => {
    io.query.mockResolvedValueOnce({ data: { runCollaborationStatuses: [answer(kind, 'run-1', worker, lead)] } })
    await useListedRunChildrenStore().refresh([{ kind, runId: 'run-1' }])
  }

  it('offers Stop for a copy whose agents run in the poll\'s answer, and not for an offline or unlisted one', async () => {
    expect(isDelegatedCopyLive(root, { agentRunId: 'worker-run' })).toBe(false)
    await poll('running', 'offline')
    expect(isDelegatedCopyLive(root, { agentRunId: 'worker-run' })).toBe(true)
    expect(isDelegatedCopyLive(root, { teamRunId: 'qa-run' })).toBe(false)
    expect(isDelegatedCopyLive(root, { agentRunId: 'other-run' })).toBe(false)
    await poll('offline', 'idle')
    expect(isDelegatedCopyLive(root, { agentRunId: 'worker-run' })).toBe(false)
    expect(isDelegatedCopyLive(root, { teamRunId: 'qa-run' })).toBe(true)
  })
})
