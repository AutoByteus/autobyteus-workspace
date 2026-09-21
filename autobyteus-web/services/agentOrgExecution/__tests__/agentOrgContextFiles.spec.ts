import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ContextFilePathInputArea from '~/components/agentInput/ContextFilePathInputArea.vue'
import UserMessage from '~/components/conversation/UserMessage.vue'
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useActiveContextStore } from '~/stores/activeContextStore'
import { taskBearingView } from './taskBearingOrgFixture'

const mocks = vi.hoisted(() => ({
  post: vi.fn(), delete: vi.fn(), query: vi.fn(), mutate: vi.fn(), historyRefresh: vi.fn(), navigation: vi.fn(),
  route: { query: { rootSubjectKind: 'agent_org', orgRunId: 'org-run', mode: 'active' } },
}))
vi.mock('vue-router', async (original) => ({ ...await original<typeof import('vue-router')>(), useRoute: () => mocks.route }))
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ initialized: true, nodeBaseUrl: 'http://example.test', getBoundEndpoints: () => ({ orgWs: 'ws://example.test/org', rest: 'http://example.test/rest' }) }),
}))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: mocks.query, mutate: mocks.mutate }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  applyAgentOrgActivity: vi.fn(), refreshAgentOrgHistory: mocks.historyRefresh, applyRunNavigationEffect: mocks.navigation,
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

vi.mock('~/services/api', () => ({ default: { post: mocks.post, delete: mocks.delete } }))

const mounted: ReturnType<typeof mount>[] = []
let activeView: ReturnType<typeof taskBearingView>
let store: ReturnType<typeof useAgentOrgContextsStore>
let files: ReturnType<typeof mount>
const uploaded = new Map<string, File>()
const ownerPath = (owner: any, draft: boolean) => `/rest/${draft ? 'drafts/' : ''}agent-org-runs/${encodeURIComponent(owner.orgRunId)}/agent-runs/${encodeURIComponent(owner.agentRunId)}/context-files/`
const file = () => new File(['Exact selected Agent file contents'], 'notes.txt', { type: 'text/plain' })
async function choose() {
  const input = files.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { configurable: true, value: [file()] })
  await input.trigger('change')
  await flushPromises()
}
async function open(id = 'agent-director', isActive = false) {
  activeView.is_active = isActive
  if (!isActive) activeView.agent_statuses = []
  store = useAgentOrgContextsStore()
  await store.openForInspection('org-run')
  if (isActive) await ready()
  store.select('org-run', { kind: 'agent_execution', agentRunId: id })
  files = mount(ContextFilePathInputArea)
  mounted.push(files)
  await flushPromises()
  return useActiveContextStore().activeAgentContext!
}
async function ready() {
  const socket = Socket.instances.at(-1)!
  socket.emit({ type: 'CONNECTED', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', session_id: 'session' } })
  socket.emit({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', schema_version: 1, root_org: { ...activeView, is_active: true, agent_statuses: taskBearingView().agent_statuses } } })
  await vi.waitFor(() => expect(store.contextFor('org-run')?.phase).toBe('live'))
  return socket
}
beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks(); Socket.instances = []; uploaded.clear()
  mocks.route.query.orgRunId = 'org-run'
  vi.stubGlobal('WebSocket', Socket)
  activeView = taskBearingView()
  mocks.mutate.mockResolvedValue({ data: { restoreAgentOrgRun: { success: true, agentOrgRunId: 'org-run' } } })
  mocks.query.mockImplementation(async ({ variables }: any) => !variables.agentRunId
    ? { data: { getAgentOrgRunInspection: { schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: activeView } } }
    : { data: { getAgentOrgMemberRunProjection: { agentRunId: variables.agentRunId, memberAddress: variables.memberAddress, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } })
  mocks.post.mockImplementation(async (url: string, body: any) => {
    if (url === '/context-files/upload') {
      const owner = JSON.parse(body.get('owner')), input = body.get('file') as File
      const storedFilename = `${uploaded.size + 1}-notes.txt`, locator = ownerPath(owner, true) + storedFilename
      uploaded.set('http://example.test' + locator, input)
      return { data: { storedFilename, displayName: input.name, locator, phase: 'draft' } }
    }
    if (url === '/context-files/finalize') return { data: { attachments: body.attachments.map((a: any) => {
      const locator = ownerPath(body.finalOwner, false) + a.storedFilename
      uploaded.set('http://example.test' + locator, uploaded.get('http://example.test' + ownerPath(body.draftOwner, true) + a.storedFilename)!)
      return { ...a, locator, phase: 'final' }
    }) } }
    throw new Error(`Unexpected HTTP write ${url}`)
  })
  mocks.delete.mockResolvedValue({ status: 204 })
})
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount()
  store?.disconnect('org-run'); vi.unstubAllGlobals(); vi.restoreAllMocks()
})

describe('actual shared Org file input -> active target -> attachment upload owner', () => {
  it.each(['agent-director', 'agent-team-worker-configured'])('uploads, opens exact content, removes and clears on inactive %s without activation', async (id) => {
    const context = await open(id)
    const address = store.contextFor('org-run')!.index.requireAgent(id).address
    expect(useActiveContextStore().activeWorkspaceTarget?.access).toBe('continuable')
    await choose()
    expect(JSON.parse(mocks.post.mock.calls[0]![1].get('owner'))).toEqual({ kind: 'org_member_draft', orgRunId: 'org-run', agentRunId: id })
    expect(context.contextFilePaths).toHaveLength(1)
    expect(files.text()).toContain('Context Files (1)')
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null)
    await files.find('button[title="notes.txt"]').trigger('click')
    const url = opened.mock.calls[0]![0] as string
    expect(url).toBe('http://example.test' + context.contextFilePaths[0]!.locator)
    expect(await uploaded.get(url)!.text()).toBe('Exact selected Agent file contents')
    await files.find('button[aria-label="Remove file"]').trigger('click'); await flushPromises()
    expect(context.contextFilePaths).toEqual([])
    expect(mocks.delete).toHaveBeenCalledWith(ownerPath({ orgRunId: 'org-run', agentRunId: id }, true).replace('/rest', '') + '1-notes.txt')
    await choose()
    expect(context.contextFilePaths).toHaveLength(1)
    await files.findAll('button').find((button) => /clear.all/i.test(button.text()))!.trigger('click'); await flushPromises()
    expect(context.contextFilePaths).toEqual([])
    expect(mocks.mutate).not.toHaveBeenCalled(); expect(Socket.instances).toHaveLength(0)
  })
  it.each(['agent-director', 'agent-team-worker-configured'])('finalizes captured %s attachments only on deliberate continuation and opens the canonical sent file', async (id) => {
    const context = await open(id); await choose()
    const address = store.contextFor('org-run')!.index.requireAgent(id).address
    const composer = mount(AgentUserInputTextArea, { global: { stubs: { Icon: true } } }); mounted.push(composer)
    await composer.find('textarea').setValue('Use this file')
    await composer.find('button[title="Send message"]').trigger('click'); await flushPromises()
    expect(mocks.mutate).toHaveBeenCalledOnce(); expect(context.contextFilePaths).toEqual([]); expect(context.submissionPending).toBe(true)
    expect(mocks.post.mock.calls.map(([url]) => url)).toEqual(['/context-files/upload'])
    const socket = await ready(); await flushPromises()
    expect(mocks.post.mock.calls[1]).toEqual(['/context-files/finalize', {
      draftOwner: { kind: 'org_member_draft', orgRunId: 'org-run', agentRunId: id },
      finalOwner: { kind: 'org_member_final', orgRunId: 'org-run', agentRunId: id },
      attachments: [{ storedFilename: '1-notes.txt', displayName: 'notes.txt' }],
    }])
    expect(socket.sent).toHaveLength(1)
    const command = socket.sent[0].payload
    expect(command.target_agent_run_id).toBe(id)
    expect(command.context_file_paths).toEqual([ownerPath({ orgRunId: 'org-run', agentRunId: id }, false) + '1-notes.txt'])
    socket.emit({ type: 'ROOT_EXECUTION_EVENT', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', change_sequence: activeView.base_change_sequence + 1,
      event: { kind: 'agent_presentation', agent_run_id: id, member_address: address, message: { type: 'MEMBER_INPUT_MESSAGE', payload: {
        message_id: command.message_id, dedupe_key: command.dedupe_key, content: command.content, input_origin: 'user_message',
        received_at: '2026-09-12T00:00:00.000Z', context_file_paths: command.context_file_paths.map((path: string) => ({ path, type: 'Text' })),
        sender_agent_run_id: null, parent_communication_message_id: null,
      } } } } })
    socket.emit({ type: 'AGENT_COMMAND_ACK', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', command_id: command.command_id,
      command_type: 'SEND_MESSAGE', target_agent_run_id: id, state: 'accepted', code: null, message: null } })
    await flushPromises()
    expect(context.conversation.messages.filter((m) => m.type === 'user')).toHaveLength(1)
    const message = mount(UserMessage, { props: { message: context.conversation.messages[0] as any } }); mounted.push(message)
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null)
    await message.find('button[title^="Open "]').trigger('click')
    expect(await uploaded.get(opened.mock.calls[0]![0] as string)!.text()).toBe('Exact selected Agent file contents')
    expect(mocks.historyRefresh).toHaveBeenCalledOnce(); expect(mocks.navigation).not.toHaveBeenCalled()
    expect(mocks.delete).not.toHaveBeenCalled()
  })
  it('captures upload ownership across focus switches and does not acquire draft ownership for stopped tasks', async () => {
    const original = await open()
    let finish!: (value: any) => void
    const physical = mocks.post.getMockImplementation()!
    mocks.post.mockImplementationOnce(async (...args) => new Promise((resolve) => { finish = async () => resolve(await physical(...args)) }))
    const input = files.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [file()] })
    await input.trigger('change')
    store.select('org-run', { kind: 'agent_execution', agentRunId: 'agent-team-worker-configured' })
    const next = useActiveContextStore().activeAgentContext!
    next.requirement = 'new draft'
    finish(null); await flushPromises()
    expect(original.contextFilePaths).toHaveLength(1); expect(next.contextFilePaths).toEqual([]); expect(next.requirement).toBe('new draft')
    store.select('org-run', { kind: 'agent_execution', agentRunId: 'agent-task-worker' })
    expect(useActiveContextStore().activeWorkspaceTarget?.access).toBe('read_only')
    await choose(); expect(mocks.post).toHaveBeenCalledOnce(); expect(mocks.mutate).not.toHaveBeenCalled()
  })
  it.each(['upload', 'finalize'])('reports %s failure without replay and preserves a newer real textarea draft', async (failure) => {
    const context = await open('agent-director', true)
    if (failure === 'upload') {
      mocks.post.mockRejectedValueOnce(new Error('upload rejected'))
      await choose(); expect(context.contextFilePaths).toEqual([])
      expect(Socket.instances[0]!.sent).toEqual([]); expect(mocks.mutate).not.toHaveBeenCalled(); return
    }
    await choose()
    const composer = mount(AgentUserInputTextArea, { global: { stubs: { Icon: true } } }); mounted.push(composer)
    let reject!: (cause: Error) => void
    mocks.post.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail }))
    await composer.find('textarea').setValue('submitted with file')
    await composer.find('button[title="Send message"]').trigger('click'); await flushPromises()
    expect(context.submissionPending).toBe(true); expect(context.contextFilePaths).toEqual([])
    await composer.find('textarea').setValue('newer text'); await composer.find('textarea').setValue('')
    reject(new Error('finalize rejected')); await flushPromises()
    expect(context.requirement).toBe(''); expect(context.contextFilePaths).toEqual([]); expect(context.submissionPending).toBe(false)
    expect(Socket.instances[0]!.sent).toEqual([]); expect(mocks.mutate).not.toHaveBeenCalled()
  })
  it('restores a finalized attachment after rejected Send and opens/removes it without deleting the retained file', async () => {
    const context = await open('agent-director', true); await choose()
    const composer = mount(AgentUserInputTextArea, { global: { stubs: { Icon: true } } }); mounted.push(composer)
    await composer.find('textarea').setValue('keep on rejection')
    await composer.find('button[title="Send message"]').trigger('click'); await flushPromises()
    const socket = Socket.instances[0]!, command = socket.sent[0].payload
    socket.emit({ type: 'AGENT_COMMAND_ACK', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', command_id: command.command_id,
      command_type: 'SEND_MESSAGE', target_agent_run_id: 'agent-director', state: 'rejected', code: 'REJECTED', message: 'Input rejected' } })
    await flushPromises()
    expect(context.requirement).toBe('keep on rejection'); expect(context.contextFilePaths[0]).toMatchObject({ phase: 'final' })
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null)
    await files.find('button[title="notes.txt"]').trigger('click')
    expect(await uploaded.get(opened.mock.calls[0]![0] as string)!.text()).toBe('Exact selected Agent file contents')
    await files.find('button[aria-label="Remove file"]').trigger('click'); await flushPromises()
    expect(mocks.delete).not.toHaveBeenCalled(); expect(context.contextFilePaths).toEqual([]); expect(socket.sent).toHaveLength(1)
  })
  it('hydrates and opens an inactive retained member image through the same UserMessage preview, without Restore or upload', async () => {
    const locator = '/rest/agent-org-runs/org-run/agent-runs/agent-team-worker-configured/context-files/retained.png'
    const query = mocks.query.getMockImplementation()!
    mocks.query.mockImplementation(async (input) => {
      const result = await query(input)
      if (input.variables.agentRunId === 'agent-team-worker-configured') result.data.getAgentOrgMemberRunProjection.conversation = [
        { kind: 'message', role: 'user', content: 'Retained attachment', ts: 1789000000, media: { images: [locator] } },
      ]
      return result
    })
    const context = await open('agent-team-worker-configured')
    expect(context.conversation.messages[0]).toMatchObject({ contextFilePaths: [{ kind: 'uploaded', phase: 'final', locator }] })
    const message = mount(UserMessage, { props: { message: context.conversation.messages[0] as any } }); mounted.push(message)
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null)
    await message.find('button[title^="Open "]').trigger('click')
    expect(opened).toHaveBeenCalledWith('http://example.test' + locator, '_blank', 'noopener,noreferrer')
    expect(Socket.instances).toHaveLength(0); expect(mocks.mutate).not.toHaveBeenCalled(); expect(mocks.post).not.toHaveBeenCalled()
  })

})
