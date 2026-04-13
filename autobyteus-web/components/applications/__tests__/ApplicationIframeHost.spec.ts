import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ApplicationIframeHost from '../ApplicationIframeHost.vue'
import { createApplicationUiReadyEnvelopeV1 } from '~/types/application/ApplicationIframeContract'

const {
  sessionStoreMock,
  windowNodeContextStoreMock,
} = vi.hoisted(() => ({
  sessionStoreMock: {
    getSessionById: vi.fn(),
    markSessionBootstrapWaiting: vi.fn(),
    markSessionBootstrapped: vi.fn(),
    markSessionBootstrapFailed: vi.fn(),
    retryBootstrap: vi.fn(),
  },
  windowNodeContextStoreMock: {
    getBoundEndpoints: vi.fn(() => ({
      graphqlHttp: 'http://127.0.0.1:43123/graphql',
      graphqlWs: 'ws://127.0.0.1:43123/graphql',
      rest: 'http://127.0.0.1:43123/rest',
    })),
  },
}))

vi.mock('~/stores/applicationSessionStore', () => ({
  useApplicationSessionStore: () => sessionStoreMock,
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}))

describe('ApplicationIframeHost', () => {
  const session = {
    applicationSessionId: 'app-session-123',
    application: {
      applicationId: 'bundle-app__pkg__sample-app',
      localApplicationId: 'sample-app',
      packageId: 'pkg',
      name: 'Sample App',
      description: 'Sample description',
      iconAssetPath: '/application-bundles/sample-app/assets/ui/icon.svg',
      entryHtmlAssetPath: '/application-bundles/sample-app/assets/ui/index.html',
      writable: true,
    },
    runtime: {
      kind: 'AGENT_TEAM' as const,
      runId: 'team-run-456',
      definitionId: 'bundle-team__pkg__sample-app__sample-team',
    },
    bootstrapState: 'waiting_for_ready' as const,
    bootstrapError: null,
    createdAt: '2026-04-10T12:00:00.000Z',
    terminatedAt: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStoreMock.getSessionById.mockReturnValue(session)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('accepts ready only from the resolved iframe origin and targets bootstrap back to that origin', async () => {
    const wrapper = mount(ApplicationIframeHost, {
      props: {
        applicationSessionId: session.applicationSessionId,
      },
    })

    const iframe = wrapper.get('iframe')
    expect(iframe.attributes('src')).toContain(
      'http://127.0.0.1:43123/rest/application-bundles/sample-app/assets/ui/index.html',
    )
    expect(iframe.attributes('src')).toContain('autobyteusApplicationSessionId=app-session-123')

    const contentWindowMock = {
      postMessage: vi.fn(),
    }
    Object.defineProperty(iframe.element, 'contentWindow', {
      value: contentWindowMock,
      configurable: true,
    })

    await iframe.trigger('load')
    expect(sessionStoreMock.markSessionBootstrapWaiting).toHaveBeenCalledWith(
      session.applicationSessionId,
    )

    const readyMessage = createApplicationUiReadyEnvelopeV1({
      applicationSessionId: session.applicationSessionId,
    })

    const wrongOriginEvent = new MessageEvent('message', {
      data: readyMessage,
      origin: window.location.origin,
    })
    Object.defineProperty(wrongOriginEvent, 'source', {
      value: contentWindowMock,
      configurable: true,
    })
    window.dispatchEvent(wrongOriginEvent)
    await nextTick()

    expect(contentWindowMock.postMessage).not.toHaveBeenCalled()

    const correctOriginEvent = new MessageEvent('message', {
      data: readyMessage,
      origin: 'http://127.0.0.1:43123',
    })
    Object.defineProperty(correctOriginEvent, 'source', {
      value: contentWindowMock,
      configurable: true,
    })
    window.dispatchEvent(correctOriginEvent)
    await nextTick()

    expect(contentWindowMock.postMessage).toHaveBeenCalledTimes(1)
    const [bootstrapEnvelope, targetOrigin] = contentWindowMock.postMessage.mock.calls[0]
    expect(targetOrigin).toBe('http://127.0.0.1:43123')
    expect(bootstrapEnvelope.payload.session.applicationSessionId).toBe(
      session.applicationSessionId,
    )
    expect(bootstrapEnvelope.payload.host.origin).toBe(window.location.origin)
    expect(bootstrapEnvelope.payload.transport).toEqual({
      graphqlUrl: 'http://127.0.0.1:43123/graphql',
      restBaseUrl: 'http://127.0.0.1:43123/rest',
      websocketUrl: 'ws://127.0.0.1:43123/graphql',
      sessionStreamUrl: 'ws://127.0.0.1:43123/ws/application-session',
    })
    expect(sessionStoreMock.markSessionBootstrapped).toHaveBeenCalledWith(
      session.applicationSessionId,
    )

    wrapper.unmount()
  })
})
