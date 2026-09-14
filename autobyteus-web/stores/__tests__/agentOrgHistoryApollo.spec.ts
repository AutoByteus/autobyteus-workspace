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
let recovery: ReturnType<typeof vi.spyOn>
let wrapper: ReturnType<typeof mount>
const HISTORY = 'ListCollaborationRootHistory', WORKSPACE = 'ListWorkspaceRunHistory'
let transport: ControlledOrgApollo, store: ReturnType<typeof useRunHistoryStore>
const row = () => store.getTreeNodes().flatMap(w => w.agentOrgDefinitions).flatMap(d => d.runs)[0]!
const load = (kind: string) => kind === 'full' ? store.fetchTree() : store.refreshAgentOrgHistory()
const workspace = { workspaceRootPath: '/workspace', workspaceName: 'Independent workspace', agentDefinitions: [], teamDefinitions: [] }
function releaseWorkspace() { transport.pending(WORKSPACE).forEach(r => r.respond({ listWorkspaceRunHistory: [workspace] })) }
async function count(n: number) { await vi.waitFor(() => expect(transport.named(HISTORY)).toHaveLength(n)); return transport.named(HISTORY) }
beforeEach(() => {
  setActivePinia(createPinia()); transport = new ControlledOrgApollo(); io.client = transport.client
  recovery = vi.spyOn(useAgentOrgContextsStore(), 'reconcileRetainedHistory')
  store = useRunHistoryStore(); store.agentOrgHistory = parseAgentOrgHistoryItems(historyData(true).listCollaborationRootHistory)
  expect(row().isActive).toBe(true)
  wrapper = mount(defineComponent({ setup: () => () => h(WorkspaceAgentOrgHistoryCollection, { workspaceId: 'history', groups: store.getTreeNodes().flatMap(w => w.agentOrgDefinitions), state: { isAgentOrgDefinitionExpanded: () => true } as WorkspaceHistorySectionState, actions: {} }) }), { global: { stubs: { Icon: true } } })
  expect(wrapper.find('button[title="Stop Agent Org"]').exists()).toBe(true)
})
afterEach(() => { wrapper.unmount(); transport.client.stop(); vi.restoreAllMocks() })

describe.each(['full', 'focused'])('old %s history', older => {
  it.each(['full', 'focused'].flatMap(newer => [true, false].flatMap(oldFirst => ['inactive', 'network', 'graphql', 'malformed'].map(result => ({ newer, oldFirst, result })))))(
    'new $newer $result oldFirst=$oldFirst', async ({ newer, oldFirst, result }) => {
      const old = load(older)
      const first = (await count(1))[0]!
      const original = row()
      store.applyAgentOrgActivity('org-run', false)
      expect(row()).toEqual({ ...original, isActive: false })
      // applyActivity starts its normal focused refresh; full refresh may also overlap.
      await count(2)
      await flushPromises()
      expect(wrapper.find('[aria-label="Stopped"]').exists()).toBe(true)
      expect(wrapper.find('button[title="Stop Agent Org"]').exists()).toBe(false)
      const current = newer === 'full' ? load('full') : null
      const calls = await count(newer === 'full' ? 3 : 2)
      const latest = calls.at(-1)!
      calls.forEach(r => expect(r.operation.getContext().queryDeduplication).toBe(false))
      const finishOld = () => {
        first.respond(historyData(true))
        if (calls.length === 3) calls[1]!.respond(historyData(true))
        releaseWorkspace()
      }
      if (oldFirst) { finishOld(); await old; expect(row().isActive).toBe(false) }
      if (result === 'inactive') latest.respond(historyData(false))
      else if (result === 'network') latest.fail('new history failed')
      else if (result === 'graphql') latest.graphqlError('new GraphQL failure')
      else latest.respond({ listCollaborationRootHistory: [{ __typename: 'AgentOrgRootHistoryObject', root_subject_kind: 'agent_org', root_run_id: 'org-run', created_at: null, archived_at: null, is_active: false, summary: '', org: {} }] })
      releaseWorkspace(); await current; await flushPromises()
      expect(recovery).toHaveBeenCalledTimes(result === 'inactive' ? 1 : 0)
      if (result === 'inactive') expect(recovery).toHaveBeenCalledWith(['org-run'])
      const error = store.historyFamilyErrors.agentOrg
      if (result === 'inactive') expect(error).toBeNull()
      else expect(error).toBeTruthy()
      if (!oldFirst) { finishOld(); await old; await flushPromises() }
      expect(row()).toEqual({ ...original, isActive: false })
      expect(recovery).toHaveBeenCalledTimes(result === 'inactive' ? 1 : 0)
      expect(store.historyFamilyErrors.agentOrg).toBe(error)
      expect(wrapper.find('button[title="Stop Agent Org"]').exists()).toBe(false)
      if (older === 'full' || newer === 'full') {
        expect(store.workspaceGroups).toEqual([workspace])
        expect(store.historyFamilyErrors.workspace).toBeNull()
      }
    },
  )
})
it.each(['full', 'focused'].flatMap(kind => [true, false].map(success => ({ kind, success }))))('obsolete $kind error cannot overwrite newer success=$success', async ({ kind, success }) => {
  const old = load(kind); const first = (await count(1))[0]!
  const fresh = store.refreshAgentOrgHistory(); const second = (await count(2))[1]!
  if (success) second.respond(historyData(false)); else second.fail('latest failure')
  await fresh
  first.graphqlError('obsolete failure'); releaseWorkspace(); await old
  expect(store.historyFamilyErrors.agentOrg).toBe(success ? null : 'latest failure')
  expect(row().isActive).toBe(!success)
  await flushPromises()
  expect(wrapper.find('button[title="Stop Agent Org"]').exists()).toBe(!success)
})
it('later independent active truth is not masked by a stopped overlay', async () => {
  store.applyAgentOrgActivity('org-run', false); expect(row().isActive).toBe(false)
  ;(await count(1))[0]!.respond(historyData(false)); await flushPromises()
  const next = store.refreshAgentOrgHistory(); (await count(2))[1]!.respond(historyData(true)); await next
  expect(row().isActive).toBe(true)
  expect(wrapper.find('button[title="Stop Agent Org"]').exists()).toBe(true)
})
it('preserves an unrelated exact root when publishing the confirmed inactive fact', async () => {
  const other = structuredClone(store.agentOrgHistory[0]!)
  other.rootRunId = 'other-root'; other.stableKey = 'agent_org:other-root'
  other.executionTree.rootOrg.orgRunId = 'other-root'; other.summary = 'Unrelated conversation'
  store.agentOrgHistory.push(other); store.refreshRunNavigationTopology('fixture')
  const retainedOther = store.agentOrgHistory[1]
  store.applyAgentOrgActivity('org-run', false)
  expect(store.agentOrgHistory[1]).toBe(retainedOther)
  expect(store.agentOrgHistory[1]?.isActive).toBe(true)
  expect(store.agentOrgHistory[1]?.summary).toBe('Unrelated conversation')
  const call = (await count(1))[0]!
  call.fail('unavailable'); await flushPromises()
  expect(store.agentOrgHistory[1]).toBe(retainedOther)
})
it('does not erase a workspace family on independent Org failure, or an Org family on workspace failure', async () => {
  store.workspaceGroups = [workspace]
  const loading = store.fetchTree(); const org = (await count(1))[0]!
  transport.pending(WORKSPACE)[0]!.fail('workspace unavailable')
  org.respond(historyData(false)); await loading
  expect(store.workspaceGroups).toEqual([workspace])
  expect(store.historyFamilyErrors.workspace).toBe('workspace unavailable')
  expect(store.historyFamilyErrors.agentOrg).toBeNull()
  expect(row().isActive).toBe(false)
})
