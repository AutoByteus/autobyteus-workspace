import { ApolloClient, ApolloLink, InMemoryCache, Observable, type Operation, type FetchResult } from '@apollo/client/core'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'

// Transport-only control. The caller still executes the installed Apollo query manager,
// actual documents, strict readers, Pinia stores and staged publication.
export class ControlledOrgApollo {
  requests: Array<{
    operation: Operation; delivered: boolean;
    respond(data: Record<string, unknown>): void;
    fail(message: string): void;
    graphqlError(message: string): void;
  }> = []
  client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(operation => new Observable<FetchResult>(observer => {
      const request = {
        operation, delivered: false,
        respond(data: Record<string, unknown>) { request.delivered = true; observer.next({ data }); observer.complete() },
        fail(message: string) { request.delivered = true; observer.error(new Error(message)) },
        graphqlError(message: string) { request.delivered = true; observer.next({ errors: [{ message }] }); observer.complete() },
      }
      this.requests.push(request)
    })),
  })
  named(name: string) { return this.requests.filter(r => r.operation.operationName === name) }
  pending(name: string) { return this.named(name).filter(r => !r.delivered) }
}
export const rootView = (active: boolean) => {
  const view = taskBearingView()
  view.is_active = active
  if (!active) view.agent_statuses = []
  return view
}
export const inspectionData = (active: boolean) => ({ getAgentOrgRunInspection: {
  schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: rootView(active),
} })
export const historyData = (active: boolean) => ({ listCollaborationRootHistory: [{
  __typename: 'AgentOrgRootHistoryObject', root_subject_kind: 'agent_org', root_run_id: 'org-run',
  created_at: '2026-09-01T00:00:00.000Z', archived_at: null, is_active: active,
  summary: 'Exact retained conversation', org: taskBearingView().execution_tree,
}] })
export const memberData = (variables: Operation['variables'], label: string) => ({ getAgentOrgMemberRunProjection: {
  __typename: 'AgentOrgMemberRunProjection', agentRunId: variables.agentRunId, memberAddress: variables.memberAddress,
  summary: label, lastActivityAt: '2026-09-01T00:00:03.000Z',
  conversation: [{ kind: 'message', role: 'assistant', content: `${label}:${variables.agentRunId}`, ts: 1700000001 }],
  activities: [{ kind: 'tool', invocationId: `${label}:${variables.agentRunId}`, toolName: 'read_file', status: 'success', result: label, ts: 1700000001 }],
  hasEarlierActiveTraceEvents: false,
} })
export class OrgTestSocket {
  static OPEN = 1
  static CONNECTING = 0
  static instances: OrgTestSocket[] = []
  readyState = 1
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror = null
  sent: string[] = []
  constructor() { OrgTestSocket.instances.push(this) }
  send(value: string) { this.sent.push(value) }
  close() { this.readyState = 3; this.onclose?.() }
  emit(message: unknown) { this.onmessage?.({ data: JSON.stringify(message) }) }
}
