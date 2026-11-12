import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentRunModelOptions, TeamRunModelOptions } from '~/graphql/queries/runModelOptionsQueries'
import { TerminateAgentRun } from '~/graphql/mutations/agentMutations'
import { TerminateAgentTeamRun } from '~/graphql/mutations/agentTeamRunMutations'

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), agentSave: vi.fn(), teamSave: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query, mutate: io.mutate }) }))
vi.mock('../existingRunModelConfigMutationClient', () => ({ updateStoppedAgentSelection: io.agentSave, updateStoppedTeamSelections: io.teamSave }))

import { loadDelegatedRunOptions, saveDelegatedRuns, terminateDelegatedRun } from '../delegatedLaunchSelectionClient'

/**
 * autobyteus-461 SR-064 … SR-066: a delegator's Settings reach each delegated run as itself: its options by its own query,
 * its change by its own stopped-run save in row order, its Stop by its own terminate.
 */
const targets = new Map<any, any>([
  ['agent:writer', { kind: 'agent', agentRunId: 'writer' }],
  ['team:eng', { kind: 'team', teamRunId: 'eng', followerAddresses: ['/lead', '/dev'] }],
  ['agent:lead', { kind: 'team_member', teamRunId: 'eng', memberAddress: '/lead' }],
  ['agent:dev', { kind: 'team_member', teamRunId: 'eng', memberAddress: '/dev' }],
])
const selection = (llmModelIdentifier: string) => ({ runtimeKind: 'claude_agent_sdk', llmModelIdentifier, llmConfig: null })
const answer = (current: string) => ({ currentModelIdentifier: current, currentModel: null, unavailableReason: null, modelListReadable: true, replacements: [] })
const ok = { success: true, message: 'Saved.', fieldErrors: [] }

beforeEach(() => { vi.clearAllMocks() })

describe('delegated runs reached as themselves', () => {
  it('saves each run by its own save in row order: an agent run, then one Team save with its own scope, its followers and a member', async () => {
    io.agentSave.mockResolvedValue(ok); io.teamSave.mockResolvedValue(ok)
    const result = await saveDelegatedRuns({ targets, nameOf: (key) => key,
      changes: [{ key: 'agent:writer', selection: selection('opus') }, { key: 'team:eng', selection: selection('sonnet') }, { key: 'agent:dev', selection: selection('haiku') }] })
    expect(result.success).toBe(true)
    expect(io.agentSave).toHaveBeenCalledWith({ agentRunId: 'writer', ...selection('opus') })
    expect(io.teamSave).toHaveBeenCalledWith({ teamRunId: 'eng', selectionPatches: [
      { scopeKind: 'CONFIGURED_TEAM', scopeAddress: '/', ...selection('sonnet') },
      // A follower with no choice of its own follows the Team's; one with its own choice keeps it.
      { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/lead', ...selection('sonnet') },
      { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/dev', ...selection('haiku') },
    ] })
    expect(io.agentSave.mock.invocationCallOrder[0]).toBeLessThan(io.teamSave.mock.invocationCallOrder[0]!)
  })

  it('a refusal stops the Save there: it names the run that refused and the runs already saved', async () => {
    io.agentSave.mockResolvedValue(ok)
    io.teamSave.mockResolvedValue({ success: false, message: 'The run is running.', fieldErrors: [{ path: 'selectionPatches[0]', message: 'x' }] })
    const names: Record<string, string> = { 'agent:writer': 'writer', 'agent:lead': 'lead' }
    await expect(saveDelegatedRuns({ targets, nameOf: (key) => names[key] ?? key,
      changes: [{ key: 'agent:writer', selection: selection('opus') }, { key: 'agent:lead', selection: selection('haiku') }] }))
      .resolves.toEqual({ success: false, message: 'lead was not saved: The run is running. Saved: writer.', fieldErrors: [{ path: 'selectionPatches[0]', message: 'x' }] })
  })

  it('reads each run\'s own options: an agent\'s query, one Team query for the Team and its members; an unreadable run is left out', async () => {
    io.query.mockImplementation(async ({ query, variables }: any) => query === AgentRunModelOptions
      ? { data: { agentRunModelOptions: answer(`model-of-${variables.agentRunId}`) } }
      : query === TeamRunModelOptions ? { data: { teamRunModelOptions: [{ scopeAddress: '/', ...answer('team') }, { scopeAddress: '/lead', ...answer('lead') }] } } : {})
    const { options, complete } = await loadDelegatedRunOptions(targets)
    expect(complete).toBe(true)
    expect(Object.keys(options).sort()).toEqual(['agent:lead', 'agent:writer', 'team:eng'])
    expect(options['agent:writer']).toMatchObject({ status: 'ready', options: { currentModelIdentifier: 'model-of-writer' } })
    expect(io.query.mock.calls.filter(([request]) => request.query === TeamRunModelOptions)).toHaveLength(1)
    io.query.mockRejectedValue(new Error('offline'))
    await expect(loadDelegatedRunOptions(targets)).resolves.toEqual({ options: {}, complete: false })
  })

  it('stops a run by its own terminate, on this node or a peer\'s (the server sends a peer\'s to its node)', async () => {
    io.mutate.mockResolvedValue({ data: { terminateAgentRun: { success: true, message: 'Stopped.' }, terminateAgentTeamRun: { success: true, message: 'Stopped.' } } })
    await expect(terminateDelegatedRun({ agentRunId: 'writer' })).resolves.toMatchObject({ success: true })
    expect(io.mutate).toHaveBeenLastCalledWith({ mutation: TerminateAgentRun, variables: { agentRunId: 'writer' } })
    await terminateDelegatedRun({ teamRunId: 'eng' })
    expect(io.mutate).toHaveBeenLastCalledWith({ mutation: TerminateAgentTeamRun, variables: { teamRunId: 'eng' } })
  })
})
