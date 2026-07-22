import { describe, expect, it } from 'vitest'
import { buildApplicationHostTransport } from '../applicationHostTransport'

const endpoints = {
  graphqlHttp: 'http://127.0.0.1:43123/graphql',
  graphqlWs: 'ws://127.0.0.1:43123/graphql',
  rest: 'http://127.0.0.1:43123/rest',
}

describe('buildApplicationHostTransport', () => {
  it('returns the exact four-field v4 desktop transport', () => {
    expect(buildApplicationHostTransport(endpoints, 'app one')).toEqual({
      backendBaseUrl: 'http://127.0.0.1:43123/rest/applications/app%20one/backend',
      backendNotificationsUrl: 'ws://127.0.0.1:43123/ws/applications/app%20one/backend/notifications',
      backendWebSocketBaseUrl: 'ws://127.0.0.1:43123/ws/applications/app%20one/backend/routes',
      agentCommunicationWebSocketBaseUrl: 'ws://127.0.0.1:43123/ws/applications/app%20one/agent-communication',
    })
  })

  it('returns four null capabilities when no application is selected', () => {
    expect(buildApplicationHostTransport(endpoints, null)).toEqual({
      backendBaseUrl: null,
      backendNotificationsUrl: null,
      backendWebSocketBaseUrl: null,
      agentCommunicationWebSocketBaseUrl: null,
    })
  })
})
