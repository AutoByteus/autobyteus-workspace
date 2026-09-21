import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentOrgExecutionViewIndex } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext'
import { projectAgentOrgTasks } from '~/services/agentOrgExecution/agentOrgTaskPresentation'
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
  getApolloClient: () => ({ query: mocks.query }),
}))
vi.mock('~/services/agentOrgExecution/agentOrgContextHydration', () => ({
  stageAgentOrgExecutionContext: async (input: unknown) => ({ context: await mocks.hydrate(input), commitActivities: vi.fn() }),
}))

import { AgentOrgStreamingService } from '~/services/agentOrgExecution/agentOrgStreamingService'

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


// Diagnostic reproduction of the recorded production checkpoint rejection, not a fix.
it('records active-only checkpoint preventing inactive retained-root recovery', async () => {
 vi.useFakeTimers(); vi.stubGlobal('WebSocket',TestWebSocket); setActivePinia(createPinia())
 const view=snapshot.payload.root_org
 const context=new AgentOrgExecutionContext({orgRunId:'org-run',view:view as never,entries:[{
  agentRunId:'agent-run',memberAddress:'/direct' as never,
  context:new AgentContext({agentDefinitionId:'agent-def'} as never,new AgentRunState('agent-run',{id:'agent-run',messages:[]} as never)),
 }]})
 mocks.hydrate.mockResolvedValue(context)
 mocks.query.mockRejectedValue(new Error("Active AgentOrg 'org-run' was not found."))
 const publish=vi.fn(),reportError=vi.fn(),onInactive=vi.fn()
 const service=new AgentOrgStreamingService({orgRunId:'org-run',publish,reportError,onInactive})
 try {
  service.connect(); const socket=TestWebSocket.instances[0]!
  socket.emit(connected); socket.emit(snapshot); await vi.advanceTimersByTimeAsync(0)
  expect(publish).toHaveBeenCalledTimes(1)
  socket.emitClose(); await vi.advanceTimersByTimeAsync(20000)
  const observed={checkpointAttempts:mocks.query.mock.calls.length,websockets:TestWebSocket.instances.length,
   publications:publish.mock.calls.length,inactiveCallbacks:onInactive.mock.calls.length,
   phase:context.phase,status:context.getAgentContext('agent-run')!.state.currentStatus,
   reported:reportError.mock.calls.map(x=>x[0])}
  console.log(JSON.stringify(observed))
  expect(observed).toMatchObject({checkpointAttempts:5,websockets:1,publications:1,inactiveCallbacks:0,phase:'reopen_required',status:'idle'})
  expect(reportError).toHaveBeenCalledWith("Active AgentOrg 'org-run' was not found.")
 } finally { service.disconnect(); vi.useRealTimers(); vi.unstubAllGlobals() }
})
