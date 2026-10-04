import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import WorkspaceAgentOrgHistoryCollection from '~/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue'
import type { WorkspaceHistorySectionState } from '~/components/workspace/history/workspaceHistorySectionContracts'
import { flushPromises, mount } from '@vue/test-utils'
import { ControlledOrgApollo, historyData } from '~/test-support/agentOrgApolloFixture'
import { useAgentOrgContextsStore } from '../agentOrgContextsStore'
import { useRunHistoryStore } from '../runHistoryStore'
import { parseAgentOrgHistoryItems } from '../runHistoryStoreSupport'
const io = vi.hoisted(() => ({ client: null as any }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io.client }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ waitForBoundBackendReady: async () => true }) }))
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => ({ agentDefinitions: [], fetchAllAgentDefinitions: async () => undefined }) }))
let recovery: ReturnType<typeof vi.spyOn>, wrapper: ReturnType<typeof mount>
let transport: ControlledOrgApollo, store: ReturnType<typeof useRunHistoryStore>
const HISTORY = 'ListCollaborationRootHistory', ROOT = 'GetAgentOrgRootHistory', WORKSPACE = 'ListWorkspaceRunHistory'
const row = (id = 'org-run') => store.agentOrgHistory.find(r => r.rootRunId === id)!
const rawRow = (active: boolean, id = 'org-run') => {
  const result = historyData(active).listCollaborationRootHistory[0]!
  result.root_run_id = id; result.org.rootOrg.orgRunId = id
  return result
}
const response = (kind: string, active: boolean, id = 'org-run') => kind === 'root'
  ? { getAgentOrgRootHistory: rawRow(active, id) } : { listCollaborationRootHistory: [rawRow(active, id)] }
const load = (kind: string, id = 'org-run') => kind === 'full' ? store.fetchTree()
  : kind === 'collection' ? store.refreshAgentOrgHistory() : store.refreshAgentOrgHistoryItem(id)
const workspace = { workspaceRootPath: '/workspace', workspaceName: 'Independent workspace', agentDefinitions: [], teamDefinitions: [] }
const releaseWorkspace = () => transport.pending(WORKSPACE).forEach(r => r.respond({ listWorkspaceRunHistory: [workspace] }))
async function call(kind: string, n: number) {
  const name = kind === 'root' ? ROOT : HISTORY
  await vi.waitFor(() => expect(transport.named(name)).toHaveLength(n))
  return transport.named(name)[n - 1]!
}
beforeEach(() => {
  setActivePinia(createPinia()); transport = new ControlledOrgApollo(); io.client = transport.client
  recovery = vi.spyOn(useAgentOrgContextsStore(), 'reconcileRetainedHistory')
  store = useRunHistoryStore(); store.agentOrgHistory = parseAgentOrgHistoryItems(historyData(true).listCollaborationRootHistory)
  wrapper = mount(defineComponent({ setup: () => () => h(WorkspaceAgentOrgHistoryCollection, {
    avatars: { getOrgAvatarUrl: () => '', showOrgAvatar: () => false, onOrgAvatarError: () => {} },
    workspaceId: 'history', groups: store.getTreeNodes().flatMap(w => w.agentOrgDefinitions),
    state: { isAgentOrgDefinitionExpanded: () => true } as WorkspaceHistorySectionState, actions: {},
  }) }), { global: { stubs: { Icon: true } } })
  expect(wrapper.find('button[title="Stop Agent Org"]').exists()).toBe(true)
})
afterEach(() => { wrapper.unmount(); transport.client.stop(); vi.restoreAllMocks() })

describe.each(['full', 'collection', 'root'])('old %s history', older => {
  it.each(['full', 'collection', 'root'].flatMap(newer => [true, false].flatMap(oldFirst =>
    ['inactive', 'network', 'graphql', 'malformed'].map(result => ({ newer, oldFirst, result })))))(
    'new $newer $result oldFirst=$oldFirst preserves confirmed inactive UI/error truth', async ({ newer, oldFirst, result }) => {
      const old = load(older); const first = await call(older, 1); const original = row()
      store.applyAgentOrgActivity('org-run', false)
      expect(row()).toEqual({ ...original, isActive: false })
      await flushPromises(); expect(wrapper.find('[aria-label="Stopped"]').exists()).toBe(true)
      const fresh = load(newer)
      const latest = await call(newer, (newer === 'root') === (older === 'root') ? 2 : 1)
      expect(first).not.toBe(latest)
      ;[first, latest].forEach(r => expect(r.operation.getContext().queryDeduplication).toBe(false))
      const finishOld = () => { first.respond(response(older, true)); releaseWorkspace() }
      if (oldFirst) { finishOld(); await old; expect(row().isActive).toBe(false) }
      if (result === 'inactive') latest.respond(response(newer, false))
      else if (result === 'network') latest.fail('new history failed')
      else if (result === 'graphql') latest.graphqlError('new GraphQL failure')
      else latest.respond(newer === 'root' ? { getAgentOrgRootHistory: {} } : { listCollaborationRootHistory: [{}] })
      releaseWorkspace(); await fresh
      const error = store.agentOrgHistoryError
      expect(Boolean(error)).toBe(result !== 'inactive')
      expect(recovery).toHaveBeenCalledTimes(result === 'inactive' ? 1 : 0)
      if (result === 'inactive') expect(recovery).toHaveBeenCalledWith(['org-run'])
      if (!oldFirst) { finishOld(); await old }
      expect(row()).toEqual({ ...original, isActive: false })
      expect(store.agentOrgHistoryError).toBe(error)
      await flushPromises(); expect(wrapper.find('button[title="Stop Agent Org"]').exists()).toBe(false)
      if (older === 'full' || newer === 'full') expect(store.workspaceGroups).toEqual([workspace])
    },
  )
})
it.each(['full', 'collection'])('scoped publication invalidates an older %s collection regardless of response order', async kind => {
  const old = load(kind); const first = await call(kind, 1)
  const scope = load('root'); const latest = await call('root', 1)
  latest.respond(response('root', false)); await scope
  const retained = row(); first.respond(response(kind, true)); releaseWorkspace(); await old
  expect(row()).toBe(retained); expect(row().isActive).toBe(false)
})
it.each(['full', 'collection'].flatMap(kind => [true, false].map(scopeFirst => ({ kind, scopeFirst }))))(
  'pending root versus newer $kind scopeFirst=$scopeFirst: first committed authority wins', async ({ kind, scopeFirst }) => {
    const scoped = load('root'); const scope = await call('root', 1)
    const full = load(kind); const snapshot = await call(kind, 1)
    if (scopeFirst) {
      scope.respond(response('root', false)); await scoped
      snapshot.respond(response(kind, true)); releaseWorkspace(); await full
      expect(row().isActive).toBe(false)
    } else {
      snapshot.respond(response(kind, false)); releaseWorkspace(); await full
      scope.respond(response('root', true)); await scoped
      expect(row().isActive).toBe(false)
    }
    expect(recovery).toHaveBeenCalledTimes(1)
  },
)
it('same root overlapping requests are physically independent and late errors cannot overwrite the matching retry', async () => {
  const old = load('root'); const first = await call('root', 1)
  const fresh = load('root'); const second = await call('root', 2)
  second.respond(response('root', false)); await fresh
  first.graphqlError('obsolete failure'); await old
  expect(store.agentOrgHistoryError).toBeNull(); expect(row().isActive).toBe(false)
})
it('different roots publish independently, retain unrelated references and remove only authoritative null', async () => {
  store.agentOrgHistory.push(parseAgentOrgHistoryItems([rawRow(true, 'other-root')])[0]!)
  const a = load('root'); const first = await call('root', 1)
  const b = load('root', 'other-root'); const second = await call('root', 2)
  second.respond(response('root', false, 'other-root')); await b
  const other = row('other-root'); first.respond(response('root', false)); await a
  expect(row('other-root')).toBe(other); expect(row().isActive).toBe(false)
  const absent = load('root'); const third = await call('root', 3)
  third.respond({ getAgentOrgRootHistory: null }); await absent
  expect(row()).toBeUndefined(); expect(row('other-root')).toBe(other)
})
it('scoped failure/identity mismatch is not absence; successful root retry cannot clear collection or another root error', async () => {
  const collection = load('collection'); const first = await call('collection', 1)
  first.fail('collection failed'); await collection
  const scoped = load('root'); const second = await call('root', 1); const retained = row()
  second.respond(response('root', false, 'wrong-root')); await scoped
  expect(row()).toBe(retained); expect(store.agentOrgHistoryItemErrors['org-run']).toContain('identity mismatch')
  store.agentOrgHistoryItemErrors['other-root'] = 'other error'
  const retry = load('root'); (await call('root', 2)).respond(response('root', false)); await retry
  expect(store.historyFamilyErrors.agentOrg).toBe('collection failed')
  expect(store.agentOrgHistoryItemErrors).toEqual({ 'other-root': 'other error' })
  const resync = load('collection'); (await call('collection', 2)).respond(response('collection', true)); await resync
  expect(store.agentOrgHistoryError).toBeNull()
})
it('full failure does not commit a revision that rejects an independent root read', async () => {
  const scope = load('root'); const first = await call('root', 1)
  const full = load('collection'); (await call('collection', 1)).fail('collection failed'); await full
  first.respond(response('root', false)); await scope
  expect(row().isActive).toBe(false); expect(store.historyFamilyErrors.agentOrg).toBe('collection failed')
})
it('equal/absent confirmed activity performs no I/O/publication; changed activity invalidates only its own root', async () => {
  const topology = vi.spyOn(store, 'refreshRunNavigationTopology');
  store.applyAgentOrgActivity('org-run', true); store.applyAgentOrgActivity('absent', false)
  expect(topology).not.toHaveBeenCalled(); expect(transport.requests).toEqual([])
  store.applyAgentOrgActivity('org-run', false)
  expect(topology).toHaveBeenCalledTimes(1); expect(transport.requests).toEqual([])
  const refresh = load('root'); (await call('root', 1)).respond(response('root', true)); await refresh
  expect(row().isActive).toBe(true)
})
it('reset rejects responses from old logical requests even after counters restart', async () => {
  const old = load('root'); const first = await call('root', 1); store.$reset()
  const current = load('root'); const second = await call('root', 2)
  second.respond(response('root', false)); await current
  first.respond(response('root', true)); await old; expect(row().isActive).toBe(false)
})
it('publishes accepted families only, including real avatar enrichment, and retains workspace on independent failure', async () => {
  store.workspaceGroups = [workspace]
  const topology = vi.spyOn(store, 'refreshRunNavigationTopology')
  const loading = store.fetchTree(); const org = await call('full', 1)
  transport.pending(WORKSPACE)[0]!.fail('workspace unavailable'); org.respond(response('full', false)); await loading
  expect(store.workspaceGroups).toEqual([workspace]); expect(store.historyFamilyErrors.workspace).toBe('workspace unavailable')
  expect(topology).toHaveBeenCalledTimes(1); expect(topology).toHaveBeenCalledWith('agent-org-history-ready')
})
