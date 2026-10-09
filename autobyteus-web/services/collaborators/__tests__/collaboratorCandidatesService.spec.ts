import { beforeEach, describe, expect, it, vi } from 'vitest'

const query = vi.hoisted(() => vi.fn())
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query }) }))

import { collaboratorCandidatesService } from '../collaboratorCandidatesService'

const payload = (definitionIds: string[]) => ({
  data: { collaboratorMentionCandidates: { availability: 'AVAILABLE', candidates: definitionIds.map((definitionId) => ({ kind: 'agent', definitionId, name: definitionId, description: '' })) } },
})
const ids = (entry: ReturnType<typeof collaboratorCandidatesService.entry>) => entry?.candidates.map((candidate) => candidate.definitionId)

const host = { rootKind: 'agent', rootRunId: 'pm-run', focusedAgentRunId: 'pm-run' } as const
const child = { rootKind: 'agent', rootRunId: 'pm-run', focusedAgentRunId: 'reviewer-run' } as const
const team = { rootKind: 'agent_team', rootRunId: 'team-run' } as const

describe('collaboratorCandidatesService', () => {
  beforeEach(() => { collaboratorCandidatesService.reset(); query.mockReset() })

  it('asks an Agent root for the focused agent and keeps one list per focused agent (REQ-001)', async () => {
    query.mockResolvedValueOnce(payload(['reviewer'])).mockResolvedValueOnce(payload(['pm', 'reviewer']))
    await collaboratorCandidatesService.refresh(host)
    await collaboratorCandidatesService.refresh(child)
    expect(query.mock.calls.map(([options]) => options.variables)).toEqual([
      { rootSubjectKind: 'agent', rootRunId: 'pm-run', focusedAgentRunId: 'pm-run' },
      { rootSubjectKind: 'agent', rootRunId: 'pm-run', focusedAgentRunId: 'reviewer-run' },
    ])
    expect(ids(collaboratorCandidatesService.entry(host))).toEqual(['reviewer'])
    expect(ids(collaboratorCandidatesService.entry(child))).toEqual(['pm', 'reviewer'])
  })

  it('asks Team and Org roots per root, without a focused agent', async () => {
    query.mockResolvedValueOnce(payload(['reviewer']))
    await collaboratorCandidatesService.refresh(team)
    expect(query.mock.calls[0]![0].variables).toEqual({ rootSubjectKind: 'agent_team', rootRunId: 'team-run', focusedAgentRunId: null })
    expect(ids(collaboratorCandidatesService.entry(team))).toEqual(['reviewer'])
  })

  it('one request per open: a concurrent refresh of the same subject shares the request (QR-001)', async () => {
    query.mockResolvedValue(payload(['reviewer']))
    await Promise.all([collaboratorCandidatesService.refresh(child), collaboratorCandidatesService.refresh(child)])
    expect(query).toHaveBeenCalledOnce()
  })

  it('invalidating a root clears the list of every focused agent of that root and nothing else', async () => {
    query.mockResolvedValue(payload(['reviewer']))
    const otherRoot = { rootKind: 'agent', rootRunId: 'pm-run-2', focusedAgentRunId: 'pm-run-2' } as const
    for (const subject of [host, child, team, otherRoot]) await collaboratorCandidatesService.refresh(subject)
    collaboratorCandidatesService.invalidate('agent', 'pm-run')
    expect(collaboratorCandidatesService.entry(host)).toBeNull()
    expect(collaboratorCandidatesService.entry(child)).toBeNull()
    expect(collaboratorCandidatesService.entry(team)).not.toBeNull()
    expect(collaboratorCandidatesService.entry(otherRoot)).not.toBeNull()
    collaboratorCandidatesService.invalidate('agent_team', 'team-run')
    expect(collaboratorCandidatesService.entry(team)).toBeNull()
  })
})
