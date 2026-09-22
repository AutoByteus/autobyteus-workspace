import { GetAgentOrgRunInspection } from '~/graphql/queries/runHistoryQueries'
import { taskBearingView } from './taskBearingOrgFixture'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentOrgExecutionViewIndex } from '../agentOrgExecutionViewIndex'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { AgentOrgExecutionContext } from '../agentOrgExecutionContext'
import { projectAgentOrgTasks } from '../agentOrgTaskPresentation'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  hydrate: vi.fn(),
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ orgWs: 'ws://example.test/org' }) }),
}))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({
  getActiveRemoteAccessCredential: () => null,
}))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({
  buildAuthenticatedWebSocketUrl: (url: string) => url,
}))
vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({ query: (request: any) => request.query === GetAgentOrgRunInspection
    ? Promise.resolve({ data: { getAgentOrgRunInspection: { ...snapshot.payload } } })
    : mocks.query(request) }),
}))
vi.mock('../agentOrgContextHydration', () => ({
  stageAgentOrgExecutionContext: async (input: unknown) => ({ context: await mocks.hydrate(input), commitActivities: vi.fn() }),
}))

import { AgentOrgStreamingService } from '../agentOrgStreamingService'

class TestWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 3
  static instances: TestWebSocket[] = []

  readyState = TestWebSocket.OPEN
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  sent: string[] = []
  closeCalls: Array<Readonly<{ code: number | undefined, reason: string | undefined }>> = []

  constructor(readonly url: string) { TestWebSocket.instances.push(this) }
  send(value: string) { this.sent.push(value) }
  close(code?: number, reason?: string) {
    this.closeCalls.push(Object.freeze({ code, reason }))
    if (code !== undefined && code !== 1000 && (code < 3000 || code > 4999)) {
      throw new DOMException(
        'The close code must be either 1000, or between 3000 and 4999.',
        'InvalidAccessError',
      )
    }
    if (this.readyState === TestWebSocket.CLOSED) return
    this.readyState = TestWebSocket.CLOSED
    this.onclose?.()
  }
  emitClose() {
    if (this.readyState === TestWebSocket.CLOSED) return
    this.readyState = TestWebSocket.CLOSED
    this.onclose?.()
  }
  emit(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) } as MessageEvent)
  }
  emitRaw(raw: string) { this.onmessage?.({ data: raw } as MessageEvent) }
}

const launch = {
  runtimeKind: 'codex_app_server' as const, llmModelIdentifier: 'gpt-5.6-sol', llmConfig: null,
  autoExecuteTools: false, skillAccessMode: 'PRELOADED_ONLY' as const, workspaceRootPath: null,
}
const connected = {
  type: 'CONNECTED',
  payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', session_id: 'session-1' },
}
const serverError = {
  type: 'ERROR',
  payload: { code: 'AGENT_ORG_STREAM_UNAVAILABLE', message: 'Agent Org is temporarily unavailable.' },
}
const snapshot = {
  type: 'ROOT_EXECUTION_VIEW_SNAPSHOT',
  payload: {
    root_subject_kind: 'agent_org', root_run_id: 'org-run', schema_version: 1,
    root_org: {
      base_change_sequence: 4, is_active: true,
      execution_tree: {
        schemaVersion: 1, subjectKind: 'agent_org', createdAt: '2026-09-01T00:00:00.000Z',
        archivedAt: null, applicationBinding: null, handoffs: [],
        rootOrg: {
          address: '/', orgDefinitionId: 'org-def', orgDefinitionName: 'Org', orgRunId: 'org-run',
          defaultLaunchConfiguration: launch, taskExecutions: [],
          members: [{
            address: '/direct', agentDefinitionId: 'agent-def', role: null, description: null,
            agentRunId: 'agent-run', platformAgentRunId: null, launchConfiguration: launch,
          }],
        },
      },
      task_records: { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'org-run', records: [] },
      communication_messages: { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'org-run', messages: [] },
      agent_statuses: [{
        member_address: '/direct', agent_run_id: 'agent-run', status: 'idle', trigger: null,
        tool_name: null, error_message: null, error_details: null,
      }],
    },
  },
}

const candidate = (selectedAddress: string | null = null, changeSequence = 4) => ({
  isActive: true, phase: 'live', changeSequence, selectedAddress, selection: selectedAddress ? { kind: 'agent_execution', agentRunId: 'agent-run' } : null,
  select: vi.fn(), setActive: vi.fn(), applyEvent: vi.fn(), requireReopen: vi.fn(),
  listAgentContextEntries: () => [], getAgentContext: () => null,
}) as unknown as AgentOrgExecutionContext

describe('AgentOrgStreamingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.query.mockReset()
    mocks.hydrate.mockReset()
    TestWebSocket.instances = []
    vi.stubGlobal('WebSocket', TestWebSocket)
    setActivePinia(createPinia())
  })

  it('rejects and records browser-reserved client close codes in the WebSocket double', () => {
    const socket = new TestWebSocket('ws://example.test/contract')

    expect(() => socket.close(1002, 'Protocol error')).toThrowError(
      expect.objectContaining({ name: 'InvalidAccessError' }),
    )
    expect(socket.closeCalls).toEqual([{ code: 1002, reason: 'Protocol error' }])
    expect(socket.readyState).toBe(TestWebSocket.OPEN)
  })

  it('keeps the committed context until a checkpointed candidate is complete, then restores focus atomically', async () => {
    const first = candidate('/direct')
    const second = candidate()
    let finishHydration!: (value: AgentOrgExecutionContext) => void
    const pendingHydration = new Promise<AgentOrgExecutionContext>((resolve) => { finishHydration = resolve })
    mocks.hydrate.mockResolvedValueOnce(first).mockReturnValueOnce(pendingHydration)
    mocks.query.mockResolvedValue({
      data: { getAgentOrgExecutionCheckpoint: {
        orgRunId: 'org-run', changeSequence: 4, hasOpenExecutionWork: false,
      } },
    })
    const publish = vi.fn()
    const reportError = vi.fn()
    const service = new AgentOrgStreamingService({ orgRunId: 'org-run', publish, reportError })

    service.connect()
    const initialSocket = TestWebSocket.instances[0]!
    initialSocket.emit(connected)
    initialSocket.emit(snapshot)
    await vi.waitFor(() => expect(publish).toHaveBeenCalledWith(first, expect.any(Function)))

    initialSocket.emitRaw('{not-json')
    await vi.waitFor(() => expect(first.requireReopen).toHaveBeenCalled())
    expect(publish).toHaveBeenCalledTimes(1)

    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(2))
    const recoverySocket = TestWebSocket.instances[1]!
    recoverySocket.emit(connected)
    recoverySocket.emit(snapshot)
    await vi.waitFor(() => expect(mocks.hydrate).toHaveBeenCalledTimes(2))
    expect(publish).toHaveBeenCalledTimes(1)

    finishHydration(second)
    await vi.waitFor(() => expect(publish).toHaveBeenCalledTimes(2))
    expect(second.select).toHaveBeenCalledWith({ kind: 'agent_execution', agentRunId: 'agent-run' })
    expect(publish).toHaveBeenLastCalledWith(second, expect.any(Function))
    expect(mocks.query).toHaveBeenCalledTimes(2)
    expect(reportError).not.toHaveBeenCalled()
  })

  it('recovers transparently when a strict snapshot arrives before CONNECTED', async () => {
    const reportError = vi.fn()
    const service = new AgentOrgStreamingService({
      orgRunId: 'org-run', publish: vi.fn(), reportError,
    })
    service.connect()
    TestWebSocket.instances[0]!.emit(snapshot)
    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(2))
    expect(reportError).not.toHaveBeenCalled()
    expect(mocks.hydrate).not.toHaveBeenCalled()
  })

  it('uses checkpointed transparent recovery after an established stream closes and preserves focus', async () => {
    const first = candidate('/direct')
    const second = candidate()
    mocks.hydrate.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    mocks.query.mockResolvedValue({ data: { getAgentOrgExecutionCheckpoint: {
      orgRunId: 'org-run', changeSequence: 4, hasOpenExecutionWork: false,
    } } })
    const publish = vi.fn()
    const reportError = vi.fn()
    const service = new AgentOrgStreamingService({ orgRunId: 'org-run', publish, reportError })

    service.connect()
    const initialSocket = TestWebSocket.instances[0]!
    initialSocket.emit(connected)
    initialSocket.emit(snapshot)
    await vi.waitFor(() => expect(publish).toHaveBeenCalledWith(first, expect.any(Function)))

    initialSocket.emitClose()
    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(2))
    const replacement = TestWebSocket.instances[1]!
    replacement.emit(connected)
    replacement.emit(snapshot)

    await vi.waitFor(() => expect(publish).toHaveBeenLastCalledWith(second, expect.any(Function)))
    expect(first.requireReopen).toHaveBeenCalled()
    expect(second.select).toHaveBeenCalledWith({ kind: 'agent_execution', agentRunId: 'agent-run' })
    expect(mocks.query).toHaveBeenCalledTimes(2)
    expect(reportError).not.toHaveBeenCalled()
  })

  it('shows the bounded error only after checkpointed transparent recovery is exhausted', async () => {
    const first = candidate('/direct')
    mocks.hydrate.mockResolvedValue(first)
    const publish = vi.fn()
    const reportError = vi.fn()
    const service = new AgentOrgStreamingService({ orgRunId: 'org-run', publish, reportError })

    service.connect()
    const initialSocket = TestWebSocket.instances[0]!
    initialSocket.emit(connected)
    initialSocket.emit(snapshot)
    await vi.waitFor(() => expect(publish).toHaveBeenCalledWith(first, expect.any(Function)))
    mocks.query.mockRejectedValue(new Error('checkpoint unavailable'))

    vi.useFakeTimers()
    try {
      initialSocket.emitClose()
      await vi.runAllTimersAsync()
      expect(mocks.query).toHaveBeenCalledTimes(5)
      expect(reportError).toHaveBeenCalledTimes(1)
      expect(reportError).toHaveBeenCalledWith('checkpoint unavailable')
      expect(TestWebSocket.instances).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('retires a valid server ERROR with a browser-permitted close and publishes recovered context', async () => {
    const recovered = candidate()
    mocks.hydrate.mockResolvedValue(recovered)
    const publish = vi.fn()
    const reportError = vi.fn()
    const service = new AgentOrgStreamingService({
      orgRunId: 'org-run', publish, reportError,
    })

    service.connect()
    const failedSocket = TestWebSocket.instances[0]!
    failedSocket.emit(serverError)

    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(2))
    expect(failedSocket.readyState).toBe(TestWebSocket.CLOSED)
    expect(failedSocket.closeCalls).toEqual([{
      code: 4000,
      reason: 'Invalid AgentOrg stream',
    }])
    expect(reportError).not.toHaveBeenCalled()

    const recoverySocket = TestWebSocket.instances[1]!
    recoverySocket.emit(connected)
    recoverySocket.emit(snapshot)

    await vi.waitFor(() => expect(publish).toHaveBeenCalledWith(recovered, expect.any(Function)))
    expect(recoverySocket.readyState).toBe(TestWebSocket.OPEN)
    expect(reportError).not.toHaveBeenCalled()
  })

  it('publishes one server ERROR only after recovery exhaustion and clears it on a later successful selection', async () => {
    const recovered = candidate()
    mocks.hydrate.mockResolvedValue(recovered)
    let visibleError: string | null = null
    const publish = vi.fn(() => { visibleError = null })
    const reportError = vi.fn((message: string) => { visibleError = message })
    const service = new AgentOrgStreamingService({ orgRunId: 'org-run', publish, reportError })

    vi.useFakeTimers()
    try {
      service.connect()
      for (let cycle = 0; cycle < 6; cycle += 1) {
        const socket = TestWebSocket.instances[cycle]!
        socket.emit(serverError)
        await vi.runAllTimersAsync()
        if (cycle < 5) {
          expect(reportError).not.toHaveBeenCalled()
          expect(TestWebSocket.instances).toHaveLength(cycle + 2)
        }
      }

      expect(reportError).toHaveBeenCalledTimes(1)
      expect(reportError).toHaveBeenCalledWith(
        'AGENT_ORG_STREAM_UNAVAILABLE: Agent Org is temporarily unavailable.',
      )
      expect(visibleError).toContain('temporarily unavailable')
      expect(TestWebSocket.instances.slice(0, 6).map((socket) => socket.closeCalls)).toEqual(
        Array.from({ length: 6 }, () => [{
          code: 4000,
          reason: 'Invalid AgentOrg stream',
        }]),
      )

      service.connect()
      const recoveredSocket = TestWebSocket.instances[6]!
      recoveredSocket.emit(connected)
      recoveredSocket.emit(snapshot)
      await vi.runAllTimersAsync()

      expect(publish).toHaveBeenCalledWith(recovered, expect.any(Function))
      expect(visibleError).toBeNull()
      expect(reportError).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('checkpoint-hydrates a fresh task activation instead of publishing a partial context', async () => {
    const first = candidate()
    vi.mocked(first.applyEvent).mockReturnValue('checkpoint_required')
    const second = candidate(null, 5)
    mocks.hydrate.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    mocks.query.mockResolvedValue({
      data: { getAgentOrgExecutionCheckpoint: {
        orgRunId: 'org-run', changeSequence: 5, hasOpenExecutionWork: true,
      } },
    })
    const publish = vi.fn()
    const reportError = vi.fn()
    const service = new AgentOrgStreamingService({ orgRunId: 'org-run', publish, reportError })

    service.connect()
    const initialSocket = TestWebSocket.instances[0]!
    initialSocket.emit(connected)
    initialSocket.emit(snapshot)
    await vi.waitFor(() => expect(publish).toHaveBeenCalledWith(first, expect.any(Function)))

    initialSocket.emit({
      type: 'ROOT_EXECUTION_EVENT',
      payload: {
        root_subject_kind: 'agent_org', root_run_id: 'org-run', change_sequence: 5,
        event: { kind: 'task', event: { kind: 'activated', task: {
          taskId: 'task-fresh', delegatorAgentRunId: 'agent-run',
          recipientAddress: '/direct', taskExecution: { agentRunId: 'agent-task-fresh' },
          description: 'Fresh task', referenceFiles: [], status: 'active', updates: [],
          createdAt: '2026-09-01T00:00:01.000Z',
        } } },
      },
    })

    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(2))
    expect(publish).toHaveBeenCalledTimes(1)
    const recoverySocket = TestWebSocket.instances[1]!
    recoverySocket.emit(connected)
    recoverySocket.emit(snapshot)
    await vi.waitFor(() => expect(publish).toHaveBeenLastCalledWith(second, expect.any(Function)))
    expect(first.applyEvent).toHaveBeenCalledWith(5, expect.objectContaining({ kind: 'task' }))
    expect(first.requireReopen).not.toHaveBeenCalled()
    expect(reportError).not.toHaveBeenCalled()
    expect(mocks.query).toHaveBeenCalledTimes(2)
  })

  it('publishes one store-observable context identity so the mounted-Team task panel advances without refocus', async () => {
    const view = taskBearingView()
    view.base_change_sequence = 4
    const baseTask = view.task_records.records[0]!
    const context = new AgentOrgExecutionContext({ orgRunId: 'org-run', view,
      entries: [...new AgentOrgExecutionViewIndex(view).agents.values()].map((agent) => ({
        agentRunId: agent.agentRunId, memberAddress: agent.address,
        context: new AgentContext({ ...agent.source.launchConfiguration,
          agentDefinitionId: agent.source.agentDefinitionId, agentDefinitionName: agent.address,
          workspaceId: null, isLocked: true } as any,
          new AgentRunState(agent.agentRunId, { id: agent.agentRunId, messages: [], createdAt: '', updatedAt: '' } as any)),
      })),
    })
    context.select('/director')
    vi.spyOn(context, 'select')
    mocks.hydrate.mockResolvedValue(context)
    const contextsStore = useAgentOrgContextsStore()
    const observed = computed(() => contextsStore.contextFor('org-run'))
    const panelStatus = computed(() => {
      const value = observed.value as any
      if (!value) return null
      return projectAgentOrgTasks({
        orgRunId: 'org-run', view: value.view, index: value.index, focusedAgentRunId: 'agent-director',
      })[0]?.displayStatus ?? null
    })
    const submission = {
      submissionId: 'submission-1', message: 'Initial result.', referenceFiles: [],
      createdAt: '2026-09-01T00:00:02.000Z',
    }
    const revision = {
      reviewId: 'review-1', reviewedSubmissionId: 'submission-1', decision: 'request_revision',
      comment: 'Revise it.', referenceFiles: [], createdAt: '2026-09-01T00:00:03.000Z',
    }
    const acceptance = {
      reviewId: 'review-2', reviewedSubmissionId: 'submission-1', decision: 'accept',
      comment: null, referenceFiles: [], createdAt: '2026-09-01T00:00:04.000Z',
    }

    const inspected = new AgentOrgExecutionContext({ orgRunId: 'org-run', view, entries: context.listAgentContextEntries() })
    inspected.select('/director')
    mocks.hydrate.mockResolvedValueOnce(inspected).mockResolvedValue(context)
    mocks.query.mockResolvedValueOnce({ data: { getAgentOrgRunInspection: {
      schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: view,
    } } })
    await contextsStore.openForInspection('org-run')
    const socket = TestWebSocket.instances[0]!
    socket.emit(connected)
    socket.emit(snapshot)
    await vi.waitFor(() => expect(observed.value?.phase).toBe('live'))
    vi.mocked(context.select).mockClear()
    expect(panelStatus.value).toBe('in_progress')

    socket.emit({
      type: 'ROOT_EXECUTION_EVENT',
      payload: {
        root_subject_kind: 'agent_org', root_run_id: 'org-run', change_sequence: 5,
        event: { kind: 'task', event: {
          kind: 'submitted', submission,
          task: { ...baseTask, status: 'awaiting_review', updates: [submission] },
        } },
      },
    })
    await vi.waitFor(() => expect(panelStatus.value).toBe('awaiting_review'))

    socket.emit({
      type: 'ROOT_EXECUTION_EVENT',
      payload: {
        root_subject_kind: 'agent_org', root_run_id: 'org-run', change_sequence: 6,
        event: { kind: 'task', event: {
          kind: 'reviewed', review: revision,
          task: { ...baseTask, status: 'active', updates: [submission, revision] },
        } },
      },
    })
    await vi.waitFor(() => expect(panelStatus.value).toBe('revision_requested'))

    socket.emit({
      type: 'ROOT_EXECUTION_EVENT',
      payload: {
        root_subject_kind: 'agent_org', root_run_id: 'org-run', change_sequence: 7,
        event: { kind: 'task', event: {
          kind: 'settled', settledAt: '2026-09-01T00:00:05.000Z',
          task: { ...baseTask, status: 'accepted', updates: [submission, acceptance] },
        } },
      },
    })
    await vi.waitFor(() => expect(panelStatus.value).toBe('accepted'))
    expect(context.select).not.toHaveBeenCalled()
    contextsStore.releaseContext('org-run')
  })

  it('completes a command only from an ACK with the exact command type and target', async () => {
    const context = candidate()
    mocks.hydrate.mockResolvedValue(context)
    mocks.query.mockResolvedValue({ data: { getAgentOrgExecutionCheckpoint: {
      orgRunId: 'org-run', changeSequence: 4, hasOpenExecutionWork: false,
    } } })
    const reportError = vi.fn()
    const service = new AgentOrgStreamingService({
      orgRunId: 'org-run', publish: vi.fn(), reportError,
    })
    service.connect()
    const socket = TestWebSocket.instances[0]!
    socket.emit(connected)
    socket.emit(snapshot)
    await vi.waitFor(() => expect(mocks.hydrate).toHaveBeenCalled())

    const completed = service.interrupt('agent-run')
    await vi.waitFor(() => expect(socket.sent).toHaveLength(1))
    const command = JSON.parse(socket.sent[0]!)
    socket.emit({
      type: 'AGENT_COMMAND_ACK',
      payload: {
        root_subject_kind: 'agent_org', root_run_id: 'org-run',
        command_id: command.payload.command_id,
        command_type: 'INTERRUPT_GENERATION', target_agent_run_id: 'agent-run',
        state: 'accepted', code: null, message: null,
      },
    })

    await expect(completed).resolves.toBeUndefined()
    expect(reportError).not.toHaveBeenCalled()
    expect(context.requireReopen).not.toHaveBeenCalled()
  })

  it('notifies history only after an accepted external SEND_MESSAGE ACK without exposing message text', async () => {
    const context = new AgentOrgExecutionContext({
      orgRunId: 'org-run', view: snapshot.payload.root_org as any,
      entries: [{ agentRunId: 'agent-run', memberAddress: '/direct' as any,
        context: new AgentContext({ agentDefinitionId: 'agent-def', agentDefinitionName: 'Direct' } as any,
          new AgentRunState('agent-run', { id: 'agent-run', messages: [], createdAt: '', updatedAt: '' } as any)) }],
    })
    mocks.hydrate.mockResolvedValue(context)
    const onAcceptedExternalUserMessage = vi.fn()
    const service = new AgentOrgStreamingService({
      orgRunId: 'org-run', publish: vi.fn(), reportError: vi.fn(), onAcceptedExternalUserMessage,
    })
    service.connect()
    const socket = TestWebSocket.instances[0]!
    socket.emit(connected)
    socket.emit(snapshot)
    await vi.waitFor(() => expect(mocks.hydrate).toHaveBeenCalled())

    const completed = service.sendPrepared({ agentRunId: 'agent-run', content: 'Authoritative first message', attachments: [], messageId: 'prepared', dedupeKey: 'prepared-key' })
    await vi.waitFor(() => expect(socket.sent).toHaveLength(1))
    const command = JSON.parse(socket.sent[0]!)
    expect(onAcceptedExternalUserMessage).not.toHaveBeenCalled()
    socket.emit({
      type: 'AGENT_COMMAND_ACK',
      payload: {
        root_subject_kind: 'agent_org', root_run_id: 'org-run',
        command_id: command.payload.command_id, command_type: 'SEND_MESSAGE',
        target_agent_run_id: 'agent-run', state: 'accepted', code: null, message: null,
      },
    })

    await expect(completed).resolves.toBeUndefined()
    expect(onAcceptedExternalUserMessage).toHaveBeenCalledWith({
      orgRunId: 'org-run', agentRunId: 'agent-run', commandId: command.payload.command_id,
    })
    expect(JSON.stringify(onAcceptedExternalUserMessage.mock.calls)).not.toContain('Authoritative first message')
  })

  it.each([
    ['command type', 'SEND_MESSAGE', 'agent-run'],
    ['target AgentRun', 'INTERRUPT_GENERATION', 'other-agent-run'],
  ] as const)('fails closed and rejects the pending command for a miscorrelated ACK %s', async (
    _mismatch,
    commandType,
    targetAgentRunId,
  ) => {
    const context = candidate()
    mocks.hydrate.mockResolvedValue(context)
    mocks.query.mockResolvedValue({ data: { getAgentOrgExecutionCheckpoint: {
      orgRunId: 'org-run', changeSequence: 4, hasOpenExecutionWork: false,
    } } })
    const reportError = vi.fn()
    const service = new AgentOrgStreamingService({
      orgRunId: 'org-run', publish: vi.fn(), reportError,
    })
    service.connect()
    const socket = TestWebSocket.instances[0]!
    socket.emit(connected)
    socket.emit(snapshot)
    await vi.waitFor(() => expect(mocks.hydrate).toHaveBeenCalled())

    const rejected = service.interrupt('agent-run')
    await vi.waitFor(() => expect(socket.sent).toHaveLength(1))
    const command = JSON.parse(socket.sent[0]!)
    socket.emit({
      type: 'AGENT_COMMAND_ACK',
      payload: {
        root_subject_kind: 'agent_org', root_run_id: 'org-run',
        command_id: command.payload.command_id,
        command_type: commandType, target_agent_run_id: targetAgentRunId,
        state: 'accepted', code: null, message: null,
      },
    })

    await expect(rejected).rejects.toThrow(/identity mismatch/)
    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(2))
    expect(reportError).not.toHaveBeenCalled()
    expect(context.requireReopen).toHaveBeenCalledWith(expect.stringContaining('identity mismatch'))
  })

  it('ignores a queued frame from the retired socket while checkpoint replacement publishes atomically', async () => {
    const first = candidate()
    vi.mocked(first.applyEvent).mockReturnValue('checkpoint_required')
    const second = candidate(null, 6)
    mocks.hydrate.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    let finishCheckpoint!: (value: unknown) => void
    mocks.query
      .mockReturnValueOnce(new Promise((resolve) => { finishCheckpoint = resolve }))
      .mockResolvedValueOnce({ data: { getAgentOrgExecutionCheckpoint: {
        orgRunId: 'org-run', changeSequence: 6, hasOpenExecutionWork: true,
      } } })
    const publish = vi.fn()
    const reportError = vi.fn()
    const service = new AgentOrgStreamingService({ orgRunId: 'org-run', publish, reportError })

    service.connect()
    const initialSocket = TestWebSocket.instances[0]!
    initialSocket.emit(connected)
    initialSocket.emit(snapshot)
    await vi.waitFor(() => expect(publish).toHaveBeenCalledWith(first, expect.any(Function)))

    initialSocket.emit({
      type: 'ROOT_EXECUTION_EVENT',
      payload: {
        root_subject_kind: 'agent_org', root_run_id: 'org-run', change_sequence: 5,
        event: { kind: 'task', event: { kind: 'activated', task: {
          taskId: 'task-fresh', delegatorAgentRunId: 'agent-run',
          recipientAddress: '/direct', taskExecution: { agentRunId: 'agent-task-fresh' },
          description: 'Fresh task', referenceFiles: [], status: 'active', updates: [],
          createdAt: '2026-09-01T00:00:01.000Z',
        } } },
      },
    })
    await vi.waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(1))

    initialSocket.emit({
      type: 'ROOT_EXECUTION_EVENT',
      payload: {
        root_subject_kind: 'agent_org', root_run_id: 'org-run', change_sequence: 6,
        event: {
          kind: 'agent_presentation', member_address: '/direct', agent_run_id: 'agent-task-fresh',
          message: { type: 'AGENT_STATUS', payload: {
            status: 'running', trigger: 'task', tool_name: null,
            error_message: null, error_details: null,
          } },
        },
      },
    })
    finishCheckpoint({ data: { getAgentOrgExecutionCheckpoint: {
      orgRunId: 'org-run', changeSequence: 6, hasOpenExecutionWork: true,
    } } })

    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(2))
    const replacementSocket = TestWebSocket.instances[1]!
    replacementSocket.emit({
      type: 'CONNECTED',
      payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', session_id: 'session-2' },
    })
    replacementSocket.emit(snapshot)

    await vi.waitFor(() => expect(publish).toHaveBeenLastCalledWith(second, expect.any(Function)))
    expect(replacementSocket.readyState).toBe(TestWebSocket.OPEN)
    expect(first.requireReopen).not.toHaveBeenCalled()
    expect(reportError).not.toHaveBeenCalled()
    expect(mocks.hydrate).toHaveBeenCalledTimes(2)
    expect(mocks.query).toHaveBeenCalledTimes(2)
  })

  it('does not publish hydration that completes after the AgentOrg context is released', async () => {
    const hydrated = candidate()
    let finishHydration!: (value: AgentOrgExecutionContext) => void
    mocks.hydrate.mockReturnValueOnce(new Promise((resolve) => { finishHydration = resolve }))
    const publish = vi.fn()
    const reportError = vi.fn()
    const service = new AgentOrgStreamingService({ orgRunId: 'org-run', publish, reportError })

    service.connect()
    const socket = TestWebSocket.instances[0]!
    socket.emit(connected)
    socket.emit(snapshot)
    await vi.waitFor(() => expect(mocks.hydrate).toHaveBeenCalledTimes(1))

    service.disconnect()
    finishHydration(hydrated)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(socket.readyState).toBe(TestWebSocket.CLOSED)
    expect(TestWebSocket.instances).toHaveLength(1)
    expect(publish).not.toHaveBeenCalled()
    expect(reportError).not.toHaveBeenCalled()
  })

  it('does not reconnect when an activation checkpoint completes after context release', async () => {
    const first = candidate()
    vi.mocked(first.applyEvent).mockReturnValue('checkpoint_required')
    mocks.hydrate.mockResolvedValueOnce(first)
    let finishCheckpoint!: (value: unknown) => void
    mocks.query.mockReturnValueOnce(new Promise((resolve) => { finishCheckpoint = resolve }))
    const publish = vi.fn()
    const reportError = vi.fn()
    const service = new AgentOrgStreamingService({ orgRunId: 'org-run', publish, reportError })

    service.connect()
    const socket = TestWebSocket.instances[0]!
    socket.emit(connected)
    socket.emit(snapshot)
    await vi.waitFor(() => expect(publish).toHaveBeenCalledWith(first, expect.any(Function)))

    socket.emit({
      type: 'ROOT_EXECUTION_EVENT',
      payload: {
        root_subject_kind: 'agent_org', root_run_id: 'org-run', change_sequence: 5,
        event: { kind: 'task', event: { kind: 'activated', task: {
          taskId: 'task-fresh', delegatorAgentRunId: 'agent-run',
          recipientAddress: '/direct', taskExecution: { agentRunId: 'agent-task-fresh' },
          description: 'Fresh task', referenceFiles: [], status: 'active', updates: [],
          createdAt: '2026-09-01T00:00:01.000Z',
        } } },
      },
    })
    await vi.waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(1))

    service.disconnect()
    finishCheckpoint({ data: { getAgentOrgExecutionCheckpoint: {
      orgRunId: 'org-run', changeSequence: 5, hasOpenExecutionWork: true,
    } } })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(socket.readyState).toBe(TestWebSocket.CLOSED)
    expect(TestWebSocket.instances).toHaveLength(1)
    expect(publish).toHaveBeenCalledTimes(1)
    expect(first.setActive).not.toHaveBeenCalled()
    expect(reportError).not.toHaveBeenCalled()
  })
})
