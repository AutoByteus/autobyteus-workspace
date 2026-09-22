import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import AgentOrgWorkspaceView from '~/components/workspace/org/AgentOrgWorkspaceView.vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import { createPinia, setActivePinia } from 'pinia'
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useActiveContextStore } from '~/stores/activeContextStore'
import { taskBearingView } from './taskBearingOrgFixture'

const mocks = vi.hoisted(() => ({
  query: vi.fn(), mutate: vi.fn(), routeReplace: vi.fn(), activity: vi.fn(), historyRefresh: vi.fn(), navigation: vi.fn(),
  route: { query: { rootSubjectKind: 'agent_org', orgRunId: 'org-run', mode: 'active' } },
}))
vi.mock('vue-router', async (original) => ({ ...await original<typeof import('vue-router')>(), useRoute: () => reactive(mocks.route), useRouter: () => ({ replace: mocks.routeReplace, push: mocks.navigation }) }))
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ orgWs: 'ws://example.test/org' }) }),
}))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: mocks.query, mutate: mocks.mutate }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  applyAgentOrgActivity: mocks.activity, refreshAgentOrgHistory: mocks.historyRefresh, applyRunNavigationEffect: mocks.navigation,
}) }))
vi.mock('~/stores/voiceInputStore', () => ({ useVoiceInputStore: () => ({
  isAvailable: false, initialize: vi.fn(), cancelOperationForSource: vi.fn(),
}) }))

class Socket {
  static OPEN = 1
  static CONNECTING = 0
  static instances: Socket[] = []
  readyState = 1
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror = null
  sent: any[] = []
  constructor() { Socket.instances.push(this) }
  send(value: string) { this.sent.push(JSON.parse(value)) }
  close(code?: number) {
    if (code !== undefined && code !== 1000 && (code < 3000 || code > 4999)) throw new Error('Invalid client close code')
    this.readyState = 3
    this.onclose?.()
  }
  emit(message: unknown) { this.onmessage?.({ data: JSON.stringify(message) }) }
}
const attachment = (id = 'submitted') => ({
  id, kind: 'workspace_path' as const, locator: `/workspace/${id}.txt`, displayName: `${id}.txt`, type: 'Text' as const,
})
let wrapper: ReturnType<typeof mount> | undefined
let workspace: ReturnType<typeof mount> | undefined
let socket: Socket
let sequence: number
const ack = (state = 'accepted') => {
  const command = socket.sent.at(-1)!
  socket.emit({ type: 'AGENT_COMMAND_ACK', payload: {
    root_subject_kind: 'agent_org', root_run_id: 'org-run',
    command_id: command.payload.command_id, command_type: 'SEND_MESSAGE',
    target_agent_run_id: command.payload.target_agent_run_id, state,
    code: state === 'accepted' ? null : 'REJECTED', message: state === 'accepted' ? null : 'Input was rejected',
  } })
}
const presentation = (message: unknown) => {
  const id = socket.sent.at(-1)!.payload.target_agent_run_id
  const context = useAgentOrgContextsStore().contextFor('org-run')!
  socket.emit({ type: 'ROOT_EXECUTION_EVENT', payload: {
    root_subject_kind: 'agent_org', root_run_id: 'org-run', change_sequence: ++sequence,
    event: { kind: 'agent_presentation', agent_run_id: id, member_address: context.index.requireAgent(id).address, message },
  } })
}
const echo = () => {
  const command = socket.sent.at(-1)!.payload
  presentation({ type: 'MEMBER_INPUT_MESSAGE', payload: {
    message_id: command.message_id, dedupe_key: command.dedupe_key, content: command.content,
    input_origin: 'user_message', received_at: '2026-09-11T23:00:00.000Z',
    context_file_paths: command.context_file_paths.map((path: string) => ({ path, type: 'Text' })),
    sender_agent_run_id: null,
    parent_communication_message_id: null,
  } })
}
const status = (value: string) => presentation({ type: 'AGENT_STATUS', payload: {
  status: value, trigger: null, tool_name: null, error_message: null, error_details: null,
} })

async function open(agentRunId = 'agent-director') {
  const store = useAgentOrgContextsStore()
  await store.openForInspection('org-run')
  socket = Socket.instances[0]!
  const view = taskBearingView()
  sequence = view.base_change_sequence
  socket.emit({ type: 'CONNECTED', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', session_id: 'session' } })
  socket.emit({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: {
    root_subject_kind: 'agent_org', root_run_id: 'org-run', schema_version: 1, root_org: view,
  } })
  await vi.waitFor(() => expect(store.contextFor('org-run')?.phase).toBe('live'))
  const org = store.contextFor('org-run')!
  org.select({ kind: 'agent_execution', agentRunId })
  const active = useActiveContextStore()
  wrapper = mount(AgentUserInputTextArea, { global: { stubs: { Icon: true } } })
  await flushPromises()
  return { org, active, context: active.activeAgentContext! }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mocks.route.query.mode = 'active'
  Socket.instances = []
  mocks.mutate.mockReset()
  vi.stubGlobal('WebSocket', Socket)
  mocks.query.mockImplementation(async ({ variables }: any) => !variables.agentRunId
    ? { data: { getAgentOrgRunInspection: { schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: taskBearingView() } } }
    : ({ data: { getAgentOrgMemberRunProjection: {
    agentRunId: variables.agentRunId, memberAddress: variables.memberAddress,
    conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
  } } }))
})
afterEach(async () => {
  workspace?.unmount()
  workspace = undefined
  await localizationRuntime.setPreference('en')
  wrapper?.unmount()
  wrapper = undefined
  useAgentOrgContextsStore().releaseContext('org-run')
  vi.unstubAllGlobals()
})

describe('Org shared composer -> exact interaction -> correlated stream', () => {
  it.each(['agent-director', 'agent-team-worker-configured', 'agent-task-worker'])(
    'clears exact %s text/attachments immediately, retains pending and projects one authoritative echo', async (id) => {
      const { context } = await open(id)
      context.contextFilePaths = [attachment()]
      await wrapper!.find('textarea').setValue('hello')
      await wrapper!.find('button[title="Send message"]').trigger('click')
      expect(socket.sent).toHaveLength(1)
      expect(socket.sent[0].payload).toMatchObject({ content: 'hello', target_agent_run_id: id,
        context_file_paths: ['/workspace/submitted.txt'] })
      expect(wrapper!.find('textarea').element.value).toBe('')
      expect(context.requirement).toBe('')
      expect(context.contextFilePaths).toEqual([])
      expect(context.submissionPending).toBe(true)
      expect(context.conversation.messages).toHaveLength(1)
      expect(context.conversation.messages[0]).toMatchObject({ messageId: socket.sent[0].payload.message_id,
        dedupeKey: socket.sent[0].payload.dedupe_key, contextFilePaths: [attachment()] })
      expect(mocks.navigation).not.toHaveBeenCalled()
      expect(mocks.historyRefresh).not.toHaveBeenCalled()
      echo()
      await flushPromises()
      expect(useAgentOrgContextsStore().contextFor('org-run')!.phase).toBe('live')
      expect(context.conversation.messages[0]!.timestamp).toEqual(new Date('2026-09-11T23:00:00.000Z'))
      echo(); ack(); status('running'); status('idle')
      await flushPromises()
      expect(context.conversation.messages.filter((m) => m.type === 'user')).toHaveLength(1)
      expect(context.submissionPending).toBe(false)
      expect(wrapper!.find('textarea').element.value).toBe('')
      expect(mocks.historyRefresh).toHaveBeenCalledTimes(1)
      expect(mocks.navigation).not.toHaveBeenCalled()
      expect(useAgentOrgContextsStore().errorFor('org-run')).toBeNull()
    },
  )

  it('restores an untouched rejected draft/attachments and shows local error without history or replay', async () => {
    const { active, context } = await open()
    context.requirement = 'retry me'; context.contextFilePaths = [attachment()]
    const outcome = active.send()
    const rejected = expect(outcome).rejects.toThrow('Input was rejected')
    ack('rejected')
    await rejected; await flushPromises()
    expect(context.requirement).toBe('retry me')
    expect(wrapper!.find('textarea').element.value).toBe('retry me')
    expect(context.contextFilePaths).toEqual([attachment()])
    expect(context.submissionPending).toBe(false)
    expect(context.conversation.messages.at(-1)).toMatchObject({ segments: [expect.objectContaining({ code: 'LOCAL_SUBMISSION_ERROR' })] })
    expect(mocks.historyRefresh).not.toHaveBeenCalled()
    expect(mocks.navigation).not.toHaveBeenCalled()
    expect(socket.sent).toHaveLength(1)
  })

  it.each(['accepted', 'rejected'])('preserves focus-switched drafts/attachments when ACK is %s', async (state) => {
    const { org, active, context } = await open()
    context.requirement = 'first'; context.contextFilePaths = [attachment()]
    const outcome = active.send().catch((error) => error)
    context.requirement = 'new draft'; context.contextFilePaths = [attachment('new')]
    org.select({ kind: 'agent_execution', agentRunId: 'agent-team-worker-configured' })
    const other = active.activeAgentContext!
    other.requirement = 'other draft'
    other.contextFilePaths = [attachment('other')]
    ack(state)
    await outcome; await flushPromises()
    expect(context.requirement).toBe('new draft')
    expect(context.contextFilePaths).toEqual([attachment('new')])
    expect(other.requirement).toBe('other draft')
    expect(other.contextFilePaths).toEqual([attachment('other')])
    expect(wrapper!.find('textarea').element.value).toBe('other draft')
    expect(socket.sent[0].payload.target_agent_run_id).toBe('agent-director')
  })

  it('commits newer textarea edits before rejection restoration', async () => {
    const { context } = await open()
    context.contextFilePaths = [attachment()]
    await wrapper!.find('textarea').setValue('first')
    await wrapper!.find('button[title="Send message"]').trigger('click')
    await wrapper!.find('textarea').setValue('newer unsaved text')
    expect(context.requirement).toBe('newer unsaved text')
    ack('rejected'); await flushPromises()
    expect(wrapper!.find('textarea').element.value).toBe('newer unsaved text')
    expect(context.requirement).toBe('newer unsaved text')
    expect(context.contextFilePaths).toEqual([])
  })

  it('preserves an actual typed-then-cleared draft and empty attachments when the prior send is rejected', async () => {
    const { context } = await open()
    context.contextFilePaths = [attachment()]
    await wrapper!.find('textarea').setValue('first message')
    await wrapper!.find('button[title="Send message"]').trigger('click')
    await wrapper!.find('textarea').setValue('a newer draft')
    await wrapper!.find('textarea').setValue('')
    ack('rejected'); await flushPromises()
    expect(context.submissionPending).toBe(false)
    expect(context.requirement).toBe('')
    expect(wrapper!.find('textarea').element.value).toBe('')
    expect(wrapper!.find('button[title="Send message"]').attributes('disabled')).toBeDefined()
    expect(context.contextFilePaths).toEqual([])
    expect(socket.sent).toHaveLength(1)
    expect(mocks.historyRefresh).not.toHaveBeenCalled()
    expect(mocks.navigation).not.toHaveBeenCalled()
  })

  it('rejects an already disconnected send without consuming its draft', async () => {
    const { active, context } = await open()
    context.requirement = 'not sent'; context.contextFilePaths = [attachment()]
    socket.readyState = 3
    await expect(active.send()).rejects.toThrow('not ready')
    expect(context.requirement).toBe('not sent')
    expect(context.contextFilePaths).toEqual([attachment()])
    expect(context.submissionPending).toBe(false)
    expect(context.conversation.messages).toEqual([])
    expect(socket.sent).toEqual([])
  })

  it('preserves a newer attachment-only draft after rejection', async () => {
    const { active, context } = await open()
    context.requirement = 'first'; context.contextFilePaths = [attachment()]
    const outcome = active.send().catch((error) => error)
    context.contextFilePaths.push(attachment('new-only'))
    ack('rejected'); await outcome
    expect(context.requirement).toBe('')
    expect(context.contextFilePaths).toEqual([attachment('new-only')])
  })

  it('handles a synchronous transport failure and retires its pending command', async () => {
    const { active, context } = await open()
    context.requirement = 'retry transport'
    vi.spyOn(socket, 'send').mockImplementationOnce(() => { throw new Error('transport failed') })
    await expect(active.send()).rejects.toThrow('transport failed')
    expect(context.requirement).toBe('retry transport')
    expect(context.submissionPending).toBe(false)
    expect(mocks.historyRefresh).not.toHaveBeenCalled()
    // A subsequent ordinary user send remains possible; no automatic retry.
    const next = active.send()
    ack(); await next
    expect(socket.sent).toHaveLength(1)
    expect(mocks.historyRefresh).toHaveBeenCalledTimes(1)
  })

  it('preserves the exact newer draft and focus through existing verified recovery after a pending disconnect', async () => {
    const { org, active, context } = await open()
    context.requirement = 'submitted'
    const outcome = active.send().catch((error) => error)
    context.requirement = 'unsent next'; context.contextFilePaths = [attachment('next')]
    org.select({ kind: 'agent_execution', agentRunId: 'agent-team-worker-configured' })
    active.activeAgentContext!.requirement = 'mounted draft'
    mocks.query.mockImplementation(async ({ query, variables }: any) => ({ data:
      query.definitions[0].name.value === 'GetAgentOrgRunInspection'
        ? { getAgentOrgRunInspection: { schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: taskBearingView() } }
        : query.definitions[0].name.value === 'GetAgentOrgExecutionCheckpoint'
        ? { getAgentOrgExecutionCheckpoint: { orgRunId: 'org-run', changeSequence: sequence, hasOpenExecutionWork: false } }
        : { getAgentOrgMemberRunProjection: { agentRunId: variables.agentRunId, memberAddress: variables.memberAddress,
          conversation: [], activities: [], hasEarlierActiveTraceEvents: false } },
    }))
    socket.close()
    expect(await outcome).toBeInstanceOf(Error)
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(2))
    socket = Socket.instances[1]!
    socket.emit({ type: 'CONNECTED', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', session_id: 'recovery' } })
    socket.emit({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: {
      root_subject_kind: 'agent_org', root_run_id: 'org-run', schema_version: 1, root_org: taskBearingView(),
    } })
    await vi.waitFor(() => expect(useAgentOrgContextsStore().contextFor('org-run')).not.toBe(org))
    const replacement = useAgentOrgContextsStore().contextFor('org-run')!
    expect(replacement.phase).toBe('live')
    expect(replacement.selection).toEqual({ kind: 'agent_execution', agentRunId: 'agent-team-worker-configured' })
    expect(active.activeAgentContext!.requirement).toBe('mounted draft')
    expect(replacement.getAgentContext('agent-director')!.requirement).toBe('unsent next')
    expect(replacement.getAgentContext('agent-director')!.contextFilePaths).toEqual([attachment('next')])
    expect(replacement.getAgentContext('agent-director')!.submissionPending).toBe(false)
    expect(replacement.getAgentContext('agent-director')!.conversation.messages).toEqual([])
    expect(socket.sent).toEqual([])
    expect(mocks.historyRefresh).not.toHaveBeenCalled()
  })

  it('preserves actual textarea edits while a verified same-Agent replacement is held', async () => {
    const { org, active, context } = await open()
    const initialSocket = socket
    let releaseProjection!: () => void
    let projectionStarted = false
    const heldProjection = new Promise<void>((resolve) => { releaseProjection = resolve })
    mocks.query.mockImplementation(async ({ query, variables }: any) => {
      if (query.definitions[0].name.value === 'GetAgentOrgExecutionCheckpoint') {
        return { data: { getAgentOrgExecutionCheckpoint: { orgRunId: 'org-run', changeSequence: sequence, hasOpenExecutionWork: false } } }
      }
      if (query.definitions[0].name.value === 'GetAgentOrgRunInspection') return { data: { getAgentOrgRunInspection: { schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: taskBearingView() } } }
      projectionStarted = true
      await heldProjection
      return { data: { getAgentOrgMemberRunProjection: { agentRunId: variables.agentRunId, memberAddress: variables.memberAddress,
        conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }
    })
    socket.close()
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(2))
    socket = Socket.instances[1]!
    socket.emit({ type: 'CONNECTED', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', session_id: 'held-recovery' } })
    socket.emit({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: {
      root_subject_kind: 'agent_org', root_run_id: 'org-run', schema_version: 1, root_org: taskBearingView(),
    } })
    await vi.waitFor(() => expect(projectionStarted).toBe(true))
    expect(active.activeAgentContext).toBe(context)
    context.contextFilePaths = [attachment('unsent')]
    await wrapper!.find('textarea').setValue('still composing my next message')
    releaseProjection()
    await vi.waitFor(() => expect(useAgentOrgContextsStore().contextFor('org-run')).not.toBe(org))
    await flushPromises()
    const current = active.activeAgentContext!
    expect(current).toBe(context)
    expect(current.state.runId).toBe('agent-director')
    expect(current.requirement).toBe('still composing my next message')
    expect(wrapper!.find('textarea').element.value).toBe('still composing my next message')
    expect(current.contextFilePaths).toEqual([attachment('unsent')])
    expect(current.submissionPending).toBe(false)
    expect(current.conversation.messages).toEqual([])
    expect(useAgentOrgContextsStore().contextFor('org-run')!.phase).toBe('live')
    expect(initialSocket.sent).toEqual([])
    expect(socket.sent).toEqual([])
    expect(mocks.historyRefresh).not.toHaveBeenCalled()
    expect(mocks.navigation).not.toHaveBeenCalled()
  })

  it('defers view disposal until the exact pending submission finishes without touching another draft', async () => {
    const { org, active, context } = await open()
    context.requirement = 'pending'
    const outcome = active.send().catch((error) => error)
    org.select({ kind: 'agent_execution', agentRunId: 'agent-team-worker-configured' })
    const other = active.activeAgentContext!
    other.requirement = 'other'
    useAgentOrgContextsStore().releaseContext('org-run')
    expect(useAgentOrgContextsStore().contextFor('org-run')).toBe(org)
    expect(socket.readyState).toBe(Socket.OPEN)
    ack('rejected')
    expect(await outcome).toBeInstanceOf(Error)
    expect(context.submissionPending).toBe(false)
    expect(context.requirement).toBe('pending')
    expect(other.requirement).toBe('other')
    expect(socket.sent).toHaveLength(1)
    expect(mocks.historyRefresh).not.toHaveBeenCalled()
  })
})

const projectionResult = (variables: any) => ({ data: { getAgentOrgMemberRunProjection: {
  agentRunId: variables.agentRunId, memberAddress: variables.memberAddress,
  conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
} } })
const inspectionResult = (active = false) => {
  const view = taskBearingView(); view.is_active = active
  if (!active) view.agent_statuses = []
  return { data: { getAgentOrgRunInspection: { schema_version: 1,
    root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: view } } }
}
async function inactive(id = 'agent-director') {
  mocks.route.query.mode = 'history'
  mocks.query.mockImplementation(async ({ variables }: any) => variables.agentRunId
    ? projectionResult(variables) : inspectionResult())
  const store = useAgentOrgContextsStore()
  await store.openForInspection('org-run')
  store.select('org-run', { kind: 'agent_execution', agentRunId: id })
  const active = useActiveContextStore()
  wrapper = mount(AgentUserInputTextArea, { global: { stubs: { Icon: true } } })
  await flushPromises()
  return { store, active, context: active.activeAgentContext! }
}
async function readyRestored() {
  await vi.waitFor(() => expect(Socket.instances).toHaveLength(1))
  socket = Socket.instances[0]!
  const view = taskBearingView(); sequence = view.base_change_sequence
  socket.emit({ type: 'CONNECTED', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', session_id: 'restore' } })
  socket.emit({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', schema_version: 1, root_org: view } })
  await vi.waitFor(() => expect(socket.sent).toHaveLength(1))
}

describe('observational Org history, exact deliberate continuation and retained stop', () => {
  it.each(['agent-director', 'agent-team-worker-configured'])('restores only on deliberate %s Send, preserves real input/identity through readiness and sends once', async (id) => {
    const { store, active, context } = await inactive(id)
    workspace = mount(AgentOrgWorkspaceView, { global: { stubs: { Icon: true, AgentEventMonitor: true } } })
    await flushPromises()
    expect(workspace.find('[role="alert"]').exists()).toBe(false)
    expect(mocks.mutate).not.toHaveBeenCalled(); expect(Socket.instances).toHaveLength(0)
    expect(active.activeWorkspaceTarget?.access).toBe('continuable')
    expect('interaction' in active.activeWorkspaceTarget!).toBe(false)
    let release!: () => void
    mocks.mutate.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ data: { restoreAgentOrgRun: { success: true, agentOrgRunId: 'org-run' } } }) }))
    context.contextFilePaths = [attachment()]
    await wrapper!.get('textarea').setValue('resume exact')
    const sent = active.send()
    expect(context.requirement).toBe(''); expect(context.contextFilePaths).toEqual([]); expect(context.submissionPending).toBe(true)
    await wrapper!.get('textarea').setValue('next while restoring')
    store.select('org-run', { kind: 'agent_execution', agentRunId: id === 'agent-director' ? 'agent-team-worker-configured' : 'agent-director' })
    const other = active.activeAgentContext!
    other.requirement = 'not consumed'
    await flushPromises()
    expect(wrapper!.get('button[title="Send message"]').attributes('disabled')).toBeDefined()
    await expect(active.send()).rejects.toThrow('Cannot send')
    await expect(store.stopAndInspect('org-run')).rejects.toThrow('pending')
    expect(other.requirement).toBe('not consumed')
    release(); await readyRestored()
    expect(workspace.find('[role="alert"]').exists()).toBe(false)
    expect(mocks.routeReplace).toHaveBeenCalledWith({ path: '/workspace', query: { ...mocks.route.query, mode: 'active' } })
    expect(store.contextFor('org-run')!.getAgentContext(id)).toBe(context)
    expect(active.activeAgentContext).toBe(other)
    expect(context.requirement).toBe('next while restoring')
    expect(context.submissionPending).toBe(true)
    expect(context.conversation.messages.filter((m) => m.type === 'user')).toHaveLength(1)
    expect(socket.sent[0].payload).toMatchObject({ target_agent_run_id: id, content: 'resume exact', context_file_paths: ['/workspace/submitted.txt'] })
    echo(); ack(); status('idle'); await sent; await flushPromises()
    expect(context.conversation.messages.filter((m) => m.type === 'user')).toHaveLength(1)
    expect(context.submissionPending).toBe(false)
    expect(mocks.mutate).toHaveBeenCalledOnce(); expect(mocks.historyRefresh).toHaveBeenCalledOnce()
    expect(mocks.navigation).not.toHaveBeenCalled()
  })

  it('keeps stopped exact tasks read-only, not continuable configured lookalikes', async () => {
    const { store, active, context } = await inactive('agent-task-worker')
    context.requirement = 'cannot resurrect'
    expect(active.activeWorkspaceTarget?.access).toBe('read_only')
    await expect(active.send()).rejects.toThrow('No active workspace target')
    expect(context.requirement).toBe('cannot resurrect')
    expect(mocks.mutate).not.toHaveBeenCalled(); expect(Socket.instances).toHaveLength(0)
    store.select('org-run', { kind: 'agent_execution', agentRunId: 'agent-team-worker-configured' })
    expect(active.activeWorkspaceTarget?.access).toBe('continuable')
  })

  it('restores untouched input on failed restore, keeps deliberate discard and releases the root guard', async () => {
    const { store, active, context } = await inactive()
    mocks.mutate.mockRejectedValueOnce(new Error('restore rejected'))
    context.contextFilePaths = [attachment()]
    await wrapper!.get('textarea').setValue('untouched')
    await expect(active.send()).rejects.toThrow('restore rejected')
    expect(context.requirement).toBe('untouched'); expect(context.contextFilePaths).toEqual([attachment()])
    expect(context.submissionPending).toBe(false); expect(store.operations).toEqual({})
    let reject!: (error: Error) => void
    mocks.mutate.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail }))
    const sent = active.send(); const failure = expect(sent).rejects.toThrow('restore rejected again')
    await wrapper!.get('textarea').setValue('next'); await wrapper!.get('textarea').setValue('')
    reject(new Error('restore rejected again')); await failure; await flushPromises()
    expect(context.requirement).toBe(''); expect(context.contextFilePaths).toEqual([])
    expect(wrapper!.get('textarea').element.value).toBe(''); expect(Socket.instances).toHaveLength(0)
    expect(mocks.historyRefresh).not.toHaveBeenCalled()
  })

  it('does not dispose an explicit continuation on view/root departure before prepared Send completes', async () => {
    const { store, active, context } = await inactive()
    mocks.mutate.mockResolvedValue({ data: { restoreAgentOrgRun: { success: true, agentOrgRunId: 'org-run' } } })
    context.requirement = 'continue after leaving'
    const sent = active.send()
    store.releaseContext('org-run')
    expect(store.contextFor('org-run')?.getAgentContext('agent-director')).toBe(context)
    await readyRestored(); ack(); await sent
    expect(socket.sent).toHaveLength(1); expect(socket.readyState).toBe(3)
    expect(store.contextFor('org-run')).toBeNull()
    expect(mocks.navigation).not.toHaveBeenCalled()
  })

  it('keeps exact conversation Offline after confirmed stop even if final strict inspection fails', async () => {
    const { org, context } = await open()
    context.requirement = 'unsent after stop'
    context.conversation.messages.push({ type: 'user', text: 'last conversation', timestamp: new Date() })
    mocks.mutate.mockResolvedValue({ data: { terminateAgentOrgRun: { success: true } } })
    mocks.query.mockRejectedValue(new Error('final read unavailable'))
    const store = useAgentOrgContextsStore()
    await expect(store.stopAndInspect('org-run')).rejects.toThrow('final read unavailable')
    expect(store.contextFor('org-run')).toBe(org)
    expect(org.phase).toBe('historical'); expect(org.selectedTarget()?.context).toBe(context)
    expect(context.state.currentStatus).toBe('offline'); expect(context.requirement).toBe('unsent after stop')
    expect(context.conversation.messages.at(-1)?.text).toBe('last conversation')
    expect(store.activeTargetFor('org-run')?.access).toBe('continuable')
    expect(store.errorFor('org-run')).toBe('final read unavailable')
    expect(socket.readyState).toBe(3); expect(socket.sent).toEqual([])
    socket.emit({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', schema_version: 1, root_org: taskBearingView() } })
    await flushPromises(); expect(org.phase).toBe('historical')
  })

  it('failed Stop retains last-known identity but requires fresh observation after invalidating the old transport', async () => {
    const { org, context } = await open()
    mocks.mutate.mockRejectedValue(new Error('stop rejected'))
    const store = useAgentOrgContextsStore()
    await expect(store.stopAndInspect('org-run')).rejects.toThrow('stop rejected')
    expect(store.contextFor('org-run')).toBe(org); expect(org.isActive).toBe(true)
    expect(org.selectedTarget()?.context).toBe(context); expect(socket.readyState).toBe(3)
    expect(org.phase).toBe('reopen_required')
    expect(store.operations).toEqual({}); expect(store.activeTargetFor('org-run')?.access).toBe('read_only')
    store.reconcileRetainedHistory(['org-run'])
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(2))
    expect(store.activeTargetFor('org-run')?.access).toBe('read_only')
    const replacement = Socket.instances[1]!
    replacement.emit({ type: 'CONNECTED', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', session_id: 'after-stop-rejection' } })
    replacement.emit({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', schema_version: 1, root_org: taskBearingView() } })
    await vi.waitFor(() => expect(store.activeTargetFor('org-run')?.access).toBe('live'))
    expect(store.activeTargetFor('org-run')?.context).toBe(context)
  })
})

describe('Org strict candidate and terminal boundaries', () => {
  it('does not partially mutate retained AgentContexts when any inspected projection is invalid', async () => {
    const { org, context } = await open()
    context.requirement = 'do not lose'; context.contextFilePaths = [attachment('unsent')]
    const state = context.state; const config = context.config
    socket.close()
    mocks.query.mockImplementation(async ({ variables }: any) => {
      if (!variables.agentRunId) return inspectionResult()
      const result = projectionResult(variables)
      if (variables.agentRunId === 'agent-task-worker') result.data.getAgentOrgMemberRunProjection.agentRunId = 'wrong-exact-id'
      return result
    })
    const store = useAgentOrgContextsStore()
    await expect(store.openForInspection('org-run')).rejects.toThrow('Projection identity mismatch')
    expect(store.contextFor('org-run')).toBe(org)
    expect(context.state).toBe(state); expect(context.config).toBe(config)
    expect(context.requirement).toBe('do not lose'); expect(context.contextFilePaths).toEqual([attachment('unsent')])
    expect(org.phase).toBe('reopen_required'); expect(socket.sent).toEqual([])
  })

  it('retains selection/identity and terminal truth after a correlated inactive event, ignoring retired-generation frames', async () => {
    const { org, context } = await open('agent-task-worker')
    socket.emit({ type: 'ROOT_LIFECYCLE', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', is_active: false } })
    await flushPromises()
    const store = useAgentOrgContextsStore()
    expect(org.phase).toBe('historical'); expect(org.selectedTarget()?.context).toBe(context)
    expect(context.state.currentStatus).toBe('offline'); expect(store.activeTargetFor('org-run')?.access).toBe('read_only')
    socket.emit({ type: 'ROOT_LIFECYCLE', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', is_active: true } })
    await flushPromises()
    expect(org.isActive).toBe(false); expect(Socket.instances).toHaveLength(1)
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it.each(['en', 'zh-CN'] as const)('renders truthful %s recovery on the retained history route after Restore succeeds but readiness exhausts', async (locale) => {
    await localizationRuntime.setPreference(locale)
    const { store, active, context } = await inactive()
    const org = store.contextFor('org-run')!
    const savedView = JSON.stringify(org.view)
    workspace = mount(AgentOrgWorkspaceView, { global: { stubs: { Icon: true, AgentEventMonitor: true } } })
    await flushPromises()
    expect(workspace.find('[role="alert"]').exists()).toBe(false)
    expect(mocks.route.query.mode).toBe('history')
    expect(active.activeWorkspaceTarget?.access).toBe('continuable')
    vi.useFakeTimers()
    try {
      mocks.mutate.mockResolvedValue({ data: { restoreAgentOrgRun: { success: true, agentOrgRunId: 'org-run' } } })
      vi.stubGlobal('WebSocket', class { static OPEN = 1; static CONNECTING = 0; constructor() { throw new Error('socket unavailable') } })
      context.requirement = 'not sent'
      const sent = active.send(); const failure = expect(sent).rejects.toThrow('socket unavailable')
      await vi.runAllTimersAsync(); await failure
      expect(mocks.mutate).toHaveBeenCalledOnce()
      expect(context.requirement).toBe('not sent'); expect(context.submissionPending).toBe(false)
      expect(store.contextFor('org-run')?.phase).toBe('reopen_required')
      expect(store.activeTargetFor('org-run')?.access).toBe('read_only')
      expect(store.errorFor('org-run')).toBe('socket unavailable')
      expect(store.operations).toEqual({}); expect(Socket.instances).toHaveLength(0)
      expect(mocks.historyRefresh).not.toHaveBeenCalled()
      await workspace.vm.$nextTick()
      expect(workspace.get('[role="alert"]').text()).toBe(localizationRuntime.translate('workspace.agentOrg.recovery.exhausted'))
      expect(workspace.text()).not.toContain(localizationRuntime.translate('workspace.agentOrg.inspectionUnavailable'))
      expect(mocks.route.query.mode).toBe('history')
      expect(mocks.routeReplace).not.toHaveBeenCalled()
      expect(active.activeAgentContext).toBe(context)
      expect(org.selectedAddress).toBe('/director')
      expect(JSON.stringify(org.view)).toBe(savedView) // No invented live snapshot or rollback.
      expect(mocks.activity).toHaveBeenLastCalledWith('org-run', true)
      expect(context.conversation.messages.at(-1)).toMatchObject({ segments: [expect.objectContaining({ code: 'LOCAL_SUBMISSION_ERROR' })] })
    } finally { vi.useRealTimers() }
  })
})
