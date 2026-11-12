import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { ControlledOrgApollo, OrgTestSocket, historyData, inspectionData, memberData, rootView } from '~/test-support/agentOrgApolloFixture'
import { registerTestWorkspace } from '~/test-support/registeredWorkspaceFixture'
import { useAgentOrgContextsStore } from '../agentOrgContextsStore'
import { useRunHistoryStore } from '../runHistoryStore'
import { useAgentActivityStore } from '../agentActivityStore'
import { useRunFileChangesStore } from '../runFileChangesStore'
import { parseAgentOrgHistoryItems } from '../runHistoryStoreSupport'
import { stageAgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgContextHydration'
import { GetAgentOrgRunInspection, GetAgentOrgMemberRunProjection } from '~/graphql/queries/runHistoryQueries'

const io = vi.hoisted(() => ({ client: null as any }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io.client }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({
  waitForBoundBackendReady: async () => true, getBoundEndpoints: () => ({ orgWs: 'ws://example.test/org' }),
}) }))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))
const ROOT = 'GetAgentOrgRunInspection', MEMBER = 'GetAgentOrgMemberRunProjection', HISTORY = 'ListCollaborationRootHistory'
let transport: ControlledOrgApollo
let orgs: ReturnType<typeof useAgentOrgContextsStore>, history: ReturnType<typeof useRunHistoryStore>
const observedRow = () => history.getTreeNodes().flatMap(w => w.agentOrgDefinitions).flatMap(g => g.runs)[0]!
const outcome = (p: Promise<void>) => p.then(() => null, e => e as Error)
async function requests(name: string, count: number) {
  await vi.waitFor(() => expect(transport.named(name)).toHaveLength(count))
  return transport.named(name)
}
function releaseMembers(batch: ReturnType<ControlledOrgApollo['named']>, label: string) {
  for (const r of batch) r.respond(memberData(r.operation.variables, label))
}
// The Workspaces view lists an Org only under its registered root folder (workspace-tree-vs-chooser CR-001).
const ORG_ROOT = '/org-workspace'
async function seed() {
  const open = orgs.openForInspection('org-run')
  ;(await requests(ROOT, 1))[0]!.respond(inspectionData(true))
  // autobyteus-358: nothing is selected, so no member is staged; a member loads when it is selected.
  await open
  transport.pending(HISTORY).forEach(r => r.respond(historyData(true, ORG_ROOT)))
  await flushPromises()
}
async function beginStop() {
  const stop = outcome(orgs.stopAndInspect('org-run'))
  const r = (await requests('TerminateAgentOrgRun', 1))[0]!
  expect(observedRow().isActive).toBe(true)
  r.respond({ terminateAgentOrgRun: { success: true, message: null, agentOrgRunId: 'org-run' } })
  await vi.waitFor(() => expect(observedRow().isActive).toBe(false))
  // No history I/O is released to make the existing visible projection inactive.
  return { stop }
}
beforeEach(() => {
  setActivePinia(createPinia()); transport = new ControlledOrgApollo(); io.client = transport.client
  OrgTestSocket.instances = []; vi.stubGlobal('WebSocket', OrgTestSocket)
  orgs = useAgentOrgContextsStore(); history = useRunHistoryStore()
  registerTestWorkspace(ORG_ROOT)
  history.agentOrgHistory = parseAgentOrgHistoryItems(historyData(true, ORG_ROOT).listCollaborationRootHistory)
  expect(observedRow().isActive).toBe(true)
})
afterEach(() => { orgs.releaseContext('org-run'); transport.client.stop(); vi.unstubAllGlobals() })

describe.each(['/director', '/team/lead'])('installed Apollo final inspection %s', address => {
  it.each([false, true].flatMap(prior => [false, true].map(oldFirst => ({ prior, oldFirst }))))(
    'root completed / child pending; prior=$prior oldFirst=$oldFirst', async ({ prior, oldFirst }) => {
      if (prior) await seed()
      orgs.select('org-run', address)
      const retained = orgs.contextFor('org-run')?.selectedTarget()?.context
      if (retained) retained.requirement = 'untouched draft'
      const old = orgs.openForInspection('org-run')
      // An ordinary duplicate open still shares the store-owned current inspection.
      const duplicate = orgs.openForInspection('org-run')
      const roots = await requests(ROOT, prior ? 2 : 1)
      roots.at(-1)!.respond(inspectionData(true))
      // Only the selected member is staged (autobyteus-358); with a prior context, selecting it loaded it first.
      const oldBatch = (await requests(MEMBER, prior ? 2 : 1)).slice(-1)
      expect(roots.at(-1)!.delivered).toBe(true)
      expect(oldBatch.every(r => !r.delivered)).toBe(true)
      const { stop } = await beginStop()
      ;(await requests(ROOT, prior ? 3 : 2)).at(-1)!.respond(inspectionData(false))
      const freshBatch = (await requests(MEMBER, prior ? 3 : 2)).slice(-1)
      freshBatch.forEach((r, i) => {
        expect(r.operation.query).toEqual(oldBatch[i]!.operation.query)
        expect(r.operation.variables).toEqual(oldBatch[i]!.operation.variables)
        expect(r.operation.getContext().queryDeduplication).toBe(false)
      })
      if (oldFirst) { releaseMembers(oldBatch, 'old'); await old; expect(orgs.contextFor('org-run')?.selectedTarget()?.context).toBe(retained) }
      releaseMembers(freshBatch, 'final')
      expect(await stop).toBeNull()
      if (!oldFirst) { releaseMembers(oldBatch, 'old'); await old }
      await duplicate
      const final = orgs.contextFor('org-run')!, context = final.selectedTarget()!.context
      expect(final.phase).toBe('historical'); expect(final.selectedAddress).toBe(address)
      expect(context.conversation.messages).toHaveLength(1)
      expect(JSON.stringify(context.conversation.messages)).toContain(`final:${context.state.runId}`)
      expect(useAgentActivityStore().getActivities(context.state.runId).map(a => a.activityId)).toEqual([`final:${context.state.runId}`])
      if (retained) { expect(context).toBe(retained); expect(context.requirement).toBe('untouched draft') }
      expect(observedRow().isActive).toBe(false)
      const count = transport.requests.length
      await orgs.openForInspection('org-run')
      expect(transport.requests).toHaveLength(count)
      expect(orgs.contextFor('org-run')).toBe(final)
      expect(OrgTestSocket.instances.flatMap(s => s.sent)).toEqual([])
      expect(transport.named('RestoreAgentOrgRun')).toHaveLength(0)
    },
  )

  it.each([true, false])('old root still pending, oldFirst=%s', async oldFirst => {
    orgs.select('org-run', address)
    const old = orgs.openForInspection('org-run')
    const first = (await requests(ROOT, 1))[0]!
    const { stop } = await beginStop()
    const second = (await requests(ROOT, 2))[1]!
    expect(first.operation.variables).toEqual(second.operation.variables)
    if (oldFirst) { first.respond(inspectionData(true)); await old }
    second.respond(inspectionData(false))
    releaseMembers(await requests(MEMBER, 1), 'final')
    expect(await stop).toBeNull()
    if (!oldFirst) { first.respond(inspectionData(true)); await old }
    expect(orgs.contextFor('org-run')?.phase).toBe('historical')
    expect(observedRow().isActive).toBe(false)
    expect(OrgTestSocket.instances).toHaveLength(0)
  })
})

it('keeps global Apollo deduplication enabled for unchanged ordinary options', async () => {
  const input = { query: GetAgentOrgRunInspection, variables: { orgRunId: 'org-run' }, fetchPolicy: 'network-only' as const }
  const a = transport.client.query(input), b = transport.client.query(input)
  expect(transport.named(ROOT)).toHaveLength(1)
  transport.named(ROOT)[0]!.respond(inspectionData(false)); await Promise.all([a, b])
  const childInput = { query: GetAgentOrgMemberRunProjection, variables: { orgRunId: 'org-run', memberAddress: '/director', agentRunId: 'agent-director' }, fetchPolicy: 'network-only' as const }
  const c = transport.client.query(childInput), d = transport.client.query(childInput)
  expect(transport.named(MEMBER)).toHaveLength(1)
  transport.named(MEMBER)[0]!.respond(memberData(childInput.variables, 'baseline')); await Promise.all([c, d])
})

it.each(['network', 'graphql', 'null', 'identity', 'partial', 'activity-conflict'])('final member %s retains committed content atomically', async failure => {
  await seed(); orgs.select('org-run', '/director')
  // Selecting the member loads it (autobyteus-358).
  releaseMembers(await requests(MEMBER, 1), 'committed'); await flushPromises()
  const retained = orgs.contextFor('org-run')!, context = retained.selectedTarget()!.context
  context.requirement = 'keep draft'
  const messages = JSON.stringify(context.conversation.messages)
  const beforeActivities = useAgentActivityStore().getActivities('agent-director').map(a => a.activityId)
  const old = orgs.openForInspection('org-run')
  ;(await requests(ROOT, 2))[1]!.respond(inspectionData(true))
  const oldBatch = (await requests(MEMBER, 2)).slice(-1)
  const { stop } = await beginStop()
  ;(await requests(ROOT, 3))[2]!.respond(inspectionData(false))
  // Only the selected member is staged (autobyteus-358): its failure keeps the committed content.
  const fresh = (await requests(MEMBER, 3)).slice(-1)
  if (failure === 'activity-conflict') {
    useAgentActivityStore().addActivity('agent-director', { kind: 'system_instruction', activityId: 'interleaved', content: 'newer local activity', timestamp: new Date() })
    releaseMembers(fresh, 'final')
  } else {
    const last = fresh[0]!
    if (failure === 'network' || failure === 'partial') last.fail('member failed')
    else if (failure === 'graphql') last.graphqlError('member GraphQL error')
    else if (failure === 'null') last.respond({ getAgentOrgMemberRunProjection: null })
    else last.respond({ getAgentOrgMemberRunProjection: { ...memberData(last.operation.variables, 'bad').getAgentOrgMemberRunProjection, agentRunId: 'wrong-execution' } })
  }
  expect(await stop).toBeInstanceOf(Error)
  releaseMembers(oldBatch, 'old'); await old
  expect(orgs.contextFor('org-run')).toBe(retained)
  expect(context.requirement).toBe('keep draft')
  expect(JSON.stringify(context.conversation.messages)).toBe(messages)
  expect(retained.phase).toBe('historical'); expect(observedRow().isActive).toBe(false)
  expect(orgs.errorFor('org-run')).toBeTruthy()
  expect(useAgentActivityStore().getActivities('agent-director').map(a => a.activityId))
    .toEqual(failure === 'activity-conflict' ? [...beforeActivities, 'interleaved'] : beforeActivities)
})

it.each(['network', 'null', 'identity'])('invalid new root %s retains the stopped prior context', async failure => {
  await seed(); orgs.select('org-run', '/team/lead')
  const retained = orgs.contextFor('org-run')!, context = retained.selectedTarget()!.context
  context.requirement = 'same draft'
  const before = JSON.stringify(context.conversation)
  const old = orgs.openForInspection('org-run'); const first = (await requests(ROOT, 2))[1]!
  const { stop } = await beginStop(); const next = (await requests(ROOT, 3))[2]!
  if (failure === 'network') next.fail('inspection unavailable')
  else if (failure === 'null') next.respond({ getAgentOrgRunInspection: null })
  else next.respond({ getAgentOrgRunInspection: { ...inspectionData(false).getAgentOrgRunInspection, root_run_id: 'wrong-root' } })
  expect(await stop).toBeInstanceOf(Error)
  first.respond(inspectionData(true)); await old
  expect(orgs.contextFor('org-run')).toBe(retained)
  expect(JSON.stringify(context.conversation)).toBe(before)
  expect(context.requirement).toBe('same draft'); expect(observedRow().isActive).toBe(false)
  // Only the selection's load (autobyteus-358); the superseded inspection staged nothing.
  expect(transport.named(MEMBER)).toHaveLength(1)
})

it('invalidating an ordinary stage through explicit release cannot publish a staged candidate', async () => {
  orgs.select('org-run', '/director')
  const old = orgs.openForInspection('org-run')
  ;(await requests(ROOT, 1))[0]!.respond(inspectionData(true))
  const batch = await requests(MEMBER, 1)
  orgs.releaseContext('org-run'); releaseMembers(batch, 'obsolete'); await old
  expect(orgs.contextFor('org-run')).toBeNull()
  expect(useAgentActivityStore().getActivities('agent-director')).toEqual([])
  expect(OrgTestSocket.instances).toHaveLength(0)
})

it('stream staging and inspection staging independently acquire the same exact focused member', async () => {
  const stream = stageAgentOrgExecutionContext({ source: 'stream', orgRunId: 'org-run', view: rootView(true), focus: '/director' })
  const first = await requests(MEMBER, 1)
  const inspection = stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view: rootView(false), focus: '/director' })
  const second = (await requests(MEMBER, 2)).slice(-1)
  releaseMembers(second, 'final'); const staged = await inspection; staged.commit()
  releaseMembers(first, 'old'); await stream
  expect(useAgentActivityStore().getActivities('agent-director').map(a => a.activityId)).toEqual(['final:agent-director'])
  expect(JSON.stringify(staged.context.getAgentContext('agent-director')!.conversation)).toContain('final:agent-director')
})

it('opening a historical Org loads the selected member artifact list, a nested Team member included (AC-003, AC-004)', async () => {
  const artifact = (runId: string, name: string) => ({
    __typename: 'RunFileChangeEntry', id: `${runId}:/outputs/${name}`, runId, path: `/outputs/${name}`, type: 'image',
    status: 'available', sourceTool: 'generated_output', sourceInvocationId: null, content: null,
    createdAt: '2026-10-06T10:00:00.000Z', updatedAt: '2026-10-06T10:00:00.000Z',
  })
  for (const runId of ['agent-director', 'agent-task-lead']) {
    transport.fileChangesByRunId.set(runId, [artifact(runId, '1.png'), artifact(runId, '2.png')])
  }
  orgs.select('org-run', { kind: 'agent_execution', agentRunId: 'agent-task-lead' })
  const open = orgs.openForInspection('org-run')
  ;(await requests(ROOT, 1))[0]!.respond(inspectionData(false))
  releaseMembers(await requests(MEMBER, 1), 'historical')
  await open

  const files = useRunFileChangesStore()
  expect(orgs.contexts['org-run']?.isActive).toBe(false)
  expect(files.getArtifactsForRun('agent-task-lead').map((entry) => entry.path)).toEqual(['/outputs/1.png', '/outputs/2.png'])
  expect(files.getArtifactsForRun('agent-director')).toEqual([])
})
