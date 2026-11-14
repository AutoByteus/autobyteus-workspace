import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentRunModelOptions, RunLaunch, TeamRunModelOptions } from '~/graphql/queries/runModelOptionsQueries'
import { TerminateAgentRun } from '~/graphql/mutations/agentMutations'
import { TerminateAgentTeamRun } from '~/graphql/mutations/agentTeamRunMutations'

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), agentSave: vi.fn(), teamSave: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query, mutate: io.mutate }) }))
vi.mock('../existingRunModelConfigMutationClient', () => ({ updateStoppedAgentSelection: io.agentSave, updateStoppedTeamSelections: io.teamSave }))

import { loadDelegatedRunLaunches, loadDelegatedRunOptions, saveDelegatedRuns, terminateDelegatedRun } from '../delegatedLaunchSelectionClient'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'

/**
 * autobyteus-461 SR-064 … SR-066: a delegator's Settings reach each delegated run as itself: its options by its own query,
 * its change by its own stopped-run save in row order, its Stop by its own terminate.
 */
const targets = new Map<any, any>([
  ['agent:writer', { kind: 'agent', agentRunId: 'writer' }],
  ['team:eng', { kind: 'team', teamRunId: 'eng' }],
  ['agent:lead', { kind: 'team_member', teamRunId: 'eng', memberAddress: '/lead' }],
  ['agent:dev', { kind: 'team_member', teamRunId: 'eng', memberAddress: '/dev' }],
])
const selection = (llmModelIdentifier: string) => ({ runtimeKind: 'claude_agent_sdk', llmModelIdentifier, llmConfig: null })
const answer = (current: string) => ({ currentModelIdentifier: current, currentModel: null, unavailableReason: null, modelListReadable: true, replacements: [] })
const ok = { success: true, message: 'Saved.', fieldErrors: [] }

beforeEach(() => { vi.clearAllMocks() })

describe('delegated runs reached as themselves', () => {
  it('saves each run by its own save in row order: an agent run, then one Team save with its own scope and a member (CR-461-089: the Team\'s choice is its default only)', async () => {
    io.agentSave.mockResolvedValue(ok); io.teamSave.mockResolvedValue(ok)
    const result = await saveDelegatedRuns({ targets, nameOf: (key) => key,
      changes: [{ key: 'agent:writer', selection: selection('opus') }, { key: 'team:eng', selection: selection('sonnet') }, { key: 'agent:dev', selection: selection('haiku') }] })
    expect(result.success).toBe(true)
    expect(io.agentSave).toHaveBeenCalledWith({ agentRunId: 'writer', ...selection('opus') })
    expect(io.teamSave).toHaveBeenCalledWith({ teamRunId: 'eng', selectionPatches: [
      { scopeKind: 'CONFIGURED_TEAM', scopeAddress: '/', ...selection('sonnet') },
      // A member with no choice of its own keeps its own launch: no patch reaches '/lead'.
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
      .resolves.toEqual({ success: false, message: 'lead was not saved: The run is running. Saved: writer.', fieldErrors: [{ path: 'selectionPatches[0]', message: 'x' }],
        saved: {} })
  })

  it('CR-461-077: each saved run\'s own answer says what its rows now have: an agent\'s canonical selection, a Team\'s tree for the Team and its members', async () => {
    const tree = buildTestTeamContext({ teamRunId: 'eng', rootChildren: [
      testAgentNode('/lead' as never, { agentRunId: 'lead', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'sonnet' }),
      testAgentNode('/dev' as never, { agentRunId: 'dev', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'haiku' }),
    ] }).view.getExecutionTree()
    io.agentSave.mockResolvedValue({ ...ok, canonicalSelection: selection('opus') })
    io.teamSave.mockResolvedValue({ ...ok, canonicalExecutionTree: tree })
    const result = await saveDelegatedRuns({ targets, nameOf: (key) => key,
      changes: [{ key: 'agent:writer', selection: selection('opus') }, { key: 'team:eng', selection: selection('sonnet') }] })
    expect(result.saved).toEqual({
      'agent:writer': selection('opus'),
      'team:eng': selection('sonnet'),
      'agent:lead': selection('sonnet'),
      'agent:dev': selection('haiku'),
    })
    // A run that refused gives nothing; the runs saved before it keep theirs.
    io.teamSave.mockResolvedValue({ success: false, message: 'The run is running.', fieldErrors: [] })
    const partial = await saveDelegatedRuns({ targets, nameOf: (key) => key,
      changes: [{ key: 'agent:writer', selection: selection('opus') }, { key: 'team:eng', selection: selection('sonnet') }] })
    expect(partial.saved).toEqual({ 'agent:writer': selection('opus') })
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

  it('CR-461-086: reads each run\'s launch from the run itself: an agent\'s own, a Team\'s default and each member\'s (its own source, else the Team\'s); an unreadable run is left out', async () => {
    const launch = (llmModelIdentifier: string, llmConfig: Record<string, unknown> | null = null) => ({ runtimeKind: 'claude_agent_sdk', llmModelIdentifier, llmConfig, autoExecuteTools: false, workspaceRootPath: '/w' })
    const settings = { origin: 'settings', fallbacks: [] }, configured = { origin: 'configured', fallbacks: [] }
    io.query.mockImplementation(async ({ query, variables }: any) => {
      expect(query).toBe(RunLaunch)
      if (variables.kind === 'agent') return { data: { runLaunch: { kind: 'agent', agentDefinitionId: 'writer', launchConfiguration: launch('opus', { reasoning_effort: 'xhigh' }), launchSource: settings } } }
      return { data: { runLaunch: { kind: 'agent_team', teamDefinitionId: 'eng', coordinatorAddress: '/lead', handoffs: [], defaultLaunchConfiguration: launch('sonnet'), defaultLaunchSource: configured,
        members: [{ address: '/lead', agentDefinitionId: 'lead', launchConfiguration: launch('sonnet') },
          { address: '/dev', agentDefinitionId: 'dev', launchConfiguration: launch('haiku', { reasoning_effort: 'high' }), launchSource: settings }] } } }
    })
    const read = await loadDelegatedRunLaunches(targets)
    expect(io.query.mock.calls.map(([request]) => request.variables)).toEqual([{ kind: 'agent', runId: 'writer' }, { kind: 'agent_team', runId: 'eng' }])
    expect(read).toEqual({
      'agent:writer': { launch: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus', llmConfig: { reasoning_effort: 'xhigh' }, autoExecuteTools: false }, source: settings, ownSource: true },
      'team:eng': { launch: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'sonnet', llmConfig: null, autoExecuteTools: false }, source: configured, ownSource: true },
      'agent:lead': { launch: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'sonnet', llmConfig: null, autoExecuteTools: false }, source: configured, ownSource: false },
      'agent:dev': { launch: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'haiku', llmConfig: { reasoning_effort: 'high' }, autoExecuteTools: false }, source: settings, ownSource: true },
    })
    io.query.mockReset()
    io.query.mockImplementation(async ({ variables }: any) => variables.kind === 'agent' ? Promise.reject(new Error('offline')) : { data: { runLaunch: null } })
    await expect(loadDelegatedRunLaunches(targets)).resolves.toEqual({})
  })

  it('stops a run by its own terminate, on this node or a peer\'s (the server sends a peer\'s to its node)', async () => {
    io.mutate.mockResolvedValue({ data: { terminateAgentRun: { success: true, message: 'Stopped.' }, terminateAgentTeamRun: { success: true, message: 'Stopped.' } } })
    await expect(terminateDelegatedRun({ agentRunId: 'writer' })).resolves.toMatchObject({ success: true })
    expect(io.mutate).toHaveBeenLastCalledWith({ mutation: TerminateAgentRun, variables: { agentRunId: 'writer' } })
    await terminateDelegatedRun({ teamRunId: 'eng' })
    expect(io.mutate).toHaveBeenLastCalledWith({ mutation: TerminateAgentTeamRun, variables: { teamRunId: 'eng' } })
  })
})
