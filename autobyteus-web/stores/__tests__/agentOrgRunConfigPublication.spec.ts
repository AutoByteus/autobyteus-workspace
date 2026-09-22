import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { shallowReactive } from 'vue'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { stageAgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgContextHydration'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

const io = vi.hoisted(() => ({ query: vi.fn(), read: vi.fn(), save: vi.fn(), metadata: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('~/services/runConfigEditing/agentOrgRunConfigClient', () => ({ readAgentOrgRunConfig: io.read, updateStoppedAgentOrgRunConfig: io.save }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  resolveWorkspaceMetadataByRootPath: io.metadata, applyAgentOrgActivity: vi.fn(),
}) }))
vi.mock('~/services/agentOrgExecution/agentOrgReferenceProjection', () => ({
  loadAgentOrgImmediateReferenceProjection: vi.fn().mockResolvedValue({ agents: {}, teams: {} }),
}))
const meta = (root: string) => ({ workspaceId: root, workspaceRootPath: root, displayName: root, kind: 'filesystem' })
const result = (tree: unknown) => ({ orgRunId: 'org-run', executionTree: tree, canonicalExecutionTree: tree,
  isActive: false, editability: { editable: true, reason: null }, success: true, outcome: 'UPDATED', message: 'Saved', fieldErrors: [] })
const setup = async () => {
  const view = JSON.parse(JSON.stringify(taskBearingView())); view.is_active = false
  const team = view.execution_tree.rootOrg.members[2]
  team.defaultLaunchConfiguration.workspaceRootPath = '/C'; team.members.forEach((agent: any) => { agent.launchConfiguration.workspaceRootPath = '/C' })
  const staged = await stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view })
  const store = useAgentOrgContextsStore(); store.contexts['org-run'] = shallowReactive(staged.context)
  const org = store.contextFor('org-run')!
  const tree = JSON.parse(JSON.stringify(org.executionTree))
  tree.rootOrg.members[2].defaultLaunchConfiguration.workspaceRootPath = '/B'
  tree.rootOrg.members[2].members.forEach((agent: any) => { agent.launchConfiguration.workspaceRootPath = '/B' })
  return { store, org, tree }
}
beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks()
  io.metadata.mockImplementation(async (root: string) => meta(root))
  io.query.mockImplementation(async ({ variables }: any) => ({ data: { getAgentOrgMemberRunProjection: { ...variables,
    conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }))
})

describe('guarded Org configuration publication', () => {
  it('deduplicates resolution, clears unavailable changed metadata, retries without replacing retained state or task config', async () => {
    const { store, org, tree } = await setup()
    const member = org.getAgentContext('agent-lead-configured')!, task = org.getAgentContext('agent-task-lead')!
    const state = member.state, taskConfig = task.config, selection = org.selection
    io.metadata.mockRejectedValueOnce(new Error('metadata unavailable'))
    io.save.mockResolvedValue(result(tree)); io.metadata.mockClear()
    await store.saveRunConfig('org-run', { modelPatches: [], teamWorkspacePatches: [{ teamAddress: '/team', workspaceRootPath: '/B' }] })
    expect(io.metadata).toHaveBeenCalledExactlyOnceWith('/B')
    expect(member.config.workspaceId).toBeNull(); expect(member.state).toBe(state)
    expect(task.config).toBe(taskConfig); expect(org.selection).toBe(selection)
    io.read.mockResolvedValue(result(tree)); await store.readRunConfig('org-run')
    expect(member.config.workspaceId).toBe('/B'); expect(member.state).toBe(state)
    expect(io.save).toHaveBeenCalledTimes(1)
  })

  it.each(['view', 'window', 'active', 'replacement'])('does not publish after %s changes during metadata preparation', async invalidation => {
    const { store, org, tree } = await setup()
    const member = org.getAgentContext('agent-lead-configured')!
    let resolve!: (value: any) => void
    io.metadata.mockReturnValueOnce(new Promise(complete => { resolve = complete }))
    io.save.mockResolvedValue(result(tree))
    const pending = store.saveRunConfig('org-run', { modelPatches: [], teamWorkspacePatches: [{ teamAddress: '/team', workspaceRootPath: '/B' }] })
    await Promise.resolve(); await Promise.resolve()
    if (invalidation === 'view') org.view = { ...org.view }
    if (invalidation === 'window') useWindowNodeContextStore().bindingRevision += 1
    if (invalidation === 'active') org.setActive(true)
    if (invalidation === 'replacement') delete store.contexts['org-run']
    resolve(meta('/B'))
    await expect(pending).rejects.toThrow('refresh canonical')
    expect(member.config.workspaceId).toBe('/C')
    expect(org.index.requireAgent(member.state.runId).source.launchConfiguration.workspaceRootPath).toBe('/C')
    expect(store.operations['org-run']).toBeUndefined()
  })

  it('rejects incomplete propagation and protected root workspace before metadata work or publication', async () => {
    const { store, org, tree } = await setup(); const before = org.view
    tree.rootOrg.members[2].members[1].launchConfiguration.workspaceRootPath = '/C'
    io.read.mockResolvedValue(result(tree)); io.metadata.mockClear()
    await expect(store.readRunConfig('org-run')).rejects.toThrow('every configured child')
    expect(io.metadata).not.toHaveBeenCalled(); expect(org.view).toBe(before)
    tree.rootOrg.defaultLaunchConfiguration.workspaceRootPath = '/illegal'
    await expect(store.readRunConfig('org-run')).rejects.toThrow('locked fields')
  })
})
