import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { loadTeamRunLaunchSeed } from '../teamRunLaunchSeed'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
const io = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
const tree = () => JSON.parse(JSON.stringify(buildTestTeamContext({ teamRunId: 'source', teamDefinitionId: 'definition',
  coordinatorAddress: '/lead', workspaceRootPath: '/canonical', rootChildren: [testAgentNode('/lead', {
    agentRunId: 'old-agent', agentDefinitionId: 'agent', llmModelIdentifier: 'model', llmConfig: { budget: 0, enabled: false }, workspaceRootPath: '/canonical',
  })],
}).view.getExecutionTree()))
const meta = { workspaceId: 'workspace', workspaceRootPath: '/canonical', displayName: 'Canonical', kind: 'filesystem' as const }
beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })
describe('fresh canonical Team seed reader', () => {
  it.each([false, true])('copies current configured values under active=%s with path-matched metadata; no mutation/start/history calls', async isActive => {
    const canonical = tree(); canonical.root_team.default_launch_configuration.llm_config = { budget: 0, enabled: false }
    canonical.root_team.members[0].launch_configuration.llm_config = null
    const original = JSON.stringify(canonical), history = useRunHistoryStore()
    io.query.mockResolvedValue({ data: { getTeamRunResumeConfig: { teamRunId: 'source', executionTree: canonical, isActive } } })
    const resolve = vi.spyOn(history, 'resolveWorkspaceMetadataByRootPath').mockResolvedValue(meta)
    const ensure = vi.spyOn(history, 'ensureWorkspaceByRootPath')
    const seed = await loadTeamRunLaunchSeed({ teamRunId: 'source', expectedDefinitionId: 'definition', workspaceMetadata: [{ ...meta, workspaceRootPath: '/stale' }] })
    expect(seed.rootConfig.llmConfig).toEqual({ budget: 0, enabled: false }); expect(seed.agentOverrides['/lead'].llmConfig).toBeNull()
    expect(seed.rootConfig.workspace.workspaceId).toBe('workspace'); expect(resolve).toHaveBeenCalledTimes(1); expect(ensure).not.toHaveBeenCalled()
    expect(io.query).toHaveBeenCalledTimes(1); expect(io.query.mock.calls[0][0]).toMatchObject({ variables: { teamRunId: 'source' }, fetchPolicy: 'network-only' })
    expect(JSON.stringify(seed)).not.toContain('old-agent'); seed.rootConfig.llmConfig!.budget = 4; expect(JSON.stringify(canonical)).toBe(original)
  })
  it('keeps a distinct configured member model and parameters without altering non-model configuration', async () => {
    const canonical = tree()
    canonical.root_team.default_launch_configuration.llm_config = { budget: 4, enabled: true }
    canonical.root_team.members[0].launch_configuration.llm_model_identifier = 'member-model'
    io.query.mockResolvedValue({ data: { getTeamRunResumeConfig: { teamRunId: 'source', executionTree: canonical, isActive: false } } })
    const seed = await loadTeamRunLaunchSeed({ teamRunId: 'source', expectedDefinitionId: 'definition', workspaceMetadata: [meta] })
    expect(seed.rootConfig.llmConfig).toEqual({ budget: 4, enabled: true })
    expect(seed.agentOverrides['/lead']).toMatchObject({ llmModelIdentifier: 'member-model', llmConfig: { budget: 0, enabled: false } })
    expect(seed.rootConfig.runtimeKind).toBe(canonical.root_team.default_launch_configuration.runtime_kind)
    expect(seed.rootConfig.autoExecuteTools).toBe(canonical.root_team.default_launch_configuration.auto_execute_tools)
  })
  it.each(['payload', 'tree', 'malformed', 'missing'])('rejects %s before publishing to the history cache', async failure => {
    const canonical = tree(), history = useRunHistoryStore(); const previous = { sentinel: true }
    history.teamResumeConfigByTeamRunId.source = previous as any
    if (failure === 'tree') canonical.root_team.team_run_id = 'foreign'
    io.query.mockResolvedValue({ data: { getTeamRunResumeConfig: failure === 'missing' ? null : { teamRunId: failure === 'payload' ? 'foreign' : 'source', executionTree: failure === 'malformed' ? {} : canonical, isActive: false } } })
    await expect(history.refreshTeamResumeConfig('source')).rejects.toThrow()
    expect(history.teamResumeConfigByTeamRunId.source).toEqual(previous)
  })
  it.each(['definition', 'unresolved', 'wrong-path'])('fails %s without fallback to retained/default values', async failure => {
    const canonical = tree(); io.query.mockResolvedValue({ data: { getTeamRunResumeConfig: { teamRunId: 'source', executionTree: canonical, isActive: false } } })
    vi.spyOn(useRunHistoryStore(), 'resolveWorkspaceMetadataByRootPath').mockResolvedValue(failure === 'wrong-path' ? { ...meta, workspaceRootPath: '/other' } : null)
    await expect(loadTeamRunLaunchSeed({ teamRunId: 'source', expectedDefinitionId: failure === 'definition' ? 'other' : 'definition' })).rejects.toThrow()
  })
  it('reuses matching snapshot metadata only and permits unassigned workspace as incomplete', async () => {
    const canonical = tree(); io.query.mockResolvedValue({ data: { getTeamRunResumeConfig: { teamRunId: 'source', executionTree: canonical, isActive: false } } })
    const resolve = vi.spyOn(useRunHistoryStore(), 'resolveWorkspaceMetadataByRootPath')
    const seed = await loadTeamRunLaunchSeed({ teamRunId: 'source', expectedDefinitionId: 'definition', workspaceMetadata: [meta] })
    expect(seed.rootConfig.workspace.workspaceId).toBe(meta.workspaceId); expect(resolve).not.toHaveBeenCalled()
    canonical.root_team.default_launch_configuration.workspace_root_path = null; canonical.root_team.members[0].launch_configuration.workspace_root_path = null
    const empty = await loadTeamRunLaunchSeed({ teamRunId: 'source', expectedDefinitionId: 'definition' })
    expect(empty.rootConfig.workspace).toEqual({ workspaceId: null, workspaceMetadata: null }); expect(resolve).not.toHaveBeenCalled()
  })
})
