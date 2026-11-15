import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readAgentRunCollaboration } from '../agentRunCollaborationHydration'
import { agentRootView } from './agentRootFixture'

const query = vi.hoisted(() => vi.fn())
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query }) }))

const envelope = (rootRunId: string) => ({ data: { agentRunCollaboration: { root_subject_kind: 'agent', root_run_id: rootRunId, root_agent: agentRootView() } } })

/** autobyteus-461 SR-084: a run's view is read alone; who is under it is its tree's, read on its own. */
describe('readAgentRunCollaboration', () => {
  beforeEach(() => { query.mockReset() })

  it('reads the run\'s view, null when it has none, and refuses another run\'s', async () => {
    query.mockResolvedValueOnce(envelope('host-run'))
    expect(await readAgentRunCollaboration('host-run')).toEqual(agentRootView())
    expect(query.mock.calls[0]![0]).toMatchObject({ variables: { runId: 'host-run' }, fetchPolicy: 'network-only' })
    query.mockResolvedValueOnce({ data: { agentRunCollaboration: null } })
    expect(await readAgentRunCollaboration('host-run')).toBeNull()
    query.mockResolvedValueOnce(envelope('other-run'))
    await expect(readAgentRunCollaboration('host-run')).rejects.toThrow('root mismatch')
    query.mockResolvedValueOnce({ data: null, errors: [{ message: 'denied' }] })
    await expect(readAgentRunCollaboration('host-run')).rejects.toThrow('denied')
  })
})
