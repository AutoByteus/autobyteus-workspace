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
  resolveWorkspaceMetadataByRootPath: io.metadata, applyAgentOrgActivity: vi.fn(), refreshAgentOrgHistoryItem: vi.fn(async () => undefined),
}) }))
vi.mock('~/services/agentOrgExecution/agentOrgReferenceProjection', () => ({
  loadAgentOrgImmediateReferenceProjection: vi.fn().mockResolvedValue({ agents: {}, teams: {} }),
}))

const STALE = 'Org configuration read is stale; refresh required.'
const meta = (root: string) => ({ workspaceId: root, workspaceRootPath: root, displayName: root, kind: 'filesystem' })
const stage = async (isActive: boolean) => {
  const view = JSON.parse(JSON.stringify(taskBearingView())); view.is_active = isActive
  const source = isActive ? 'stream' : 'inspection'
  return shallowReactive((await stageAgentOrgExecutionContext({ source, orgRunId: 'org-run', view })).context)
}
const canonical = (tree: unknown, isActive: boolean) => ({ orgRunId: 'org-run', executionTree: tree, isActive,
  editability: { editable: !isActive, reason: null } })
/** A canonical read the test resolves after changing the store under it. */
const deferredRead = () => {
  let resolve!: (value: unknown) => void
  io.read.mockReturnValueOnce(new Promise(complete => { resolve = complete }))
  return (value: unknown) => resolve(value)
}
/** What the Org stream does after a checkpointed reconnect: publish a new context for the same Org. */
const republish = async (store: ReturnType<typeof useAgentOrgContextsStore>) => {
  const previous = store.contexts['org-run']!, next = await stage(true)
  next.adoptLocalContexts(previous); store.contexts['org-run'] = next
}

beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks()
  io.metadata.mockImplementation(async (root: string) => meta(root))
  io.query.mockImplementation(async ({ variables }: any) => ({ data: { getAgentOrgMemberRunProjection: { ...variables,
    conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }))
})

describe('Org canonical settings read while the Org view refreshes (autobyteus-265)', () => {
  it('reads again and resolves when the live Org stream republishes its view mid-read', async () => {
    const store = useAgentOrgContextsStore()
    const first = await stage(true); store.contexts['org-run'] = first
    const tree = first.executionTree
    const resolveFirst = deferredRead()
    io.read.mockResolvedValueOnce(canonical(tree, true))
    const pending = store.readRunConfig('org-run')
    await republish(store)
    resolveFirst(canonical(tree, true))
    await expect(pending).resolves.toMatchObject({ orgRunId: 'org-run', isActive: true })
    expect(io.read).toHaveBeenCalledTimes(2)
  })

  it('reads again when a stopped Org view is replaced during metadata preparation, then applies the settings', async () => {
    const store = useAgentOrgContextsStore()
    const org = await stage(false); store.contexts['org-run'] = org
    const tree = JSON.parse(JSON.stringify(org.executionTree))
    tree.rootOrg.members[2].defaultLaunchConfiguration.workspaceRootPath = '/B'
    tree.rootOrg.members[2].members.forEach((agent: any) => { agent.launchConfiguration.workspaceRootPath = '/B' })
    io.read.mockResolvedValue(canonical(tree, false))
    let resolveMetadata!: (value: unknown) => void
    io.metadata.mockReturnValueOnce(new Promise(complete => { resolveMetadata = complete }))
    const pending = store.readRunConfig('org-run')
    await vi.waitFor(() => expect(io.metadata).toHaveBeenCalledTimes(1))
    org.view = { ...org.view }
    resolveMetadata(meta('/B'))
    await expect(pending).resolves.toMatchObject({ isActive: false })
    expect(io.read).toHaveBeenCalledTimes(2)
    expect(org.getAgentContext('agent-lead-configured')!.config.workspaceId).toBe('/B')
  })

  it.each(['released', 'binding', 'operation', 'inspection'])('refuses the read when the target changes mid-read (%s)', async change => {
    const store = useAgentOrgContextsStore()
    const org = await stage(true); store.contexts['org-run'] = org
    const resolve = deferredRead()
    const pending = store.readRunConfig('org-run')
    if (change === 'released') store.releaseContext('org-run')
    if (change === 'binding') useWindowNodeContextStore().bindingRevision += 1
    if (change === 'operation') store.operations['org-run'] = 'stop'
    if (change === 'inspection') {
      io.query.mockReturnValueOnce(new Promise(() => undefined)) // the inspection stays pending
      void store.openForInspection('org-run')
    }
    resolve(canonical(org.executionTree, true))
    await expect(pending).rejects.toThrow(STALE)
    expect(io.read).toHaveBeenCalledTimes(1)
  })

  it('gives up with the stale error after 3 reads when the view keeps being republished', async () => {
    const store = useAgentOrgContextsStore()
    const org = await stage(true); store.contexts['org-run'] = org
    const tree = org.executionTree
    io.read.mockImplementation(async () => { await republish(store); return canonical(tree, true) })
    await expect(store.readRunConfig('org-run')).rejects.toThrow(STALE)
    expect(io.read).toHaveBeenCalledTimes(3)
  })
})
