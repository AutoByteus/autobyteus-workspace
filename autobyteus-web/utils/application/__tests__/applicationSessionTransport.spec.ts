import { describe, expect, it } from 'vitest'
import { buildApplicationSessionTransport } from '../applicationSessionTransport'

describe('buildApplicationSessionTransport', () => {
  it('resolves the session-stream websocket from the node base rather than from the /rest prefix', () => {
    expect(buildApplicationSessionTransport({
      graphqlHttp: 'http://127.0.0.1:43123/graphql',
      graphqlWs: 'ws://127.0.0.1:43123/graphql',
      rest: 'http://127.0.0.1:43123/rest',
      agentWs: 'ws://127.0.0.1:43123/ws/agent',
      teamWs: 'ws://127.0.0.1:43123/ws/agent-team',
      terminalWs: 'ws://127.0.0.1:43123/ws/terminal',
      fileExplorerWs: 'ws://127.0.0.1:43123/ws/file-explorer',
      health: 'http://127.0.0.1:43123/rest/health',
    })).toEqual({
      graphqlUrl: 'http://127.0.0.1:43123/graphql',
      restBaseUrl: 'http://127.0.0.1:43123/rest',
      websocketUrl: 'ws://127.0.0.1:43123/graphql',
      sessionStreamUrl: 'ws://127.0.0.1:43123/ws/application-session',
      backendStatusUrl: null,
      backendQueriesBaseUrl: null,
      backendCommandsBaseUrl: null,
      backendGraphqlUrl: null,
      backendRoutesBaseUrl: null,
      backendNotificationsUrl: null,
    })
  })
})
