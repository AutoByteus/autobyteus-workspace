import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ApplicationIframeHost from '../ApplicationIframeHost.vue'
import {
  createApplicationHostBootstrapEnvelopeV1,
  createApplicationUiReadyEnvelopeV1,
} from '~/types/application/ApplicationIframeContract'
import type { ApplicationIframeLaunchDescriptor } from '~/utils/application/applicationLaunchDescriptor'

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'applications.components.applications.ApplicationIframeHost.unsupportedContractVersion') {
        return `Unsupported application iframe contract version "${params?.actual}". Expected "${params?.expected}".`
      }
      if (key === 'applications.components.applications.ApplicationIframeHost.iframeWindowUnavailable') {
        return 'Application iframe window is not available for bootstrap.'
      }
      if (key === 'applications.components.applications.ApplicationIframeHost.iframeTitle') {
        return 'Application iframe host'
      }
      return key
    },
  }),
}))

describe('ApplicationIframeHost', () => {
  const descriptor: ApplicationIframeLaunchDescriptor = {
    applicationSessionId: 'app-session-123',
    entryHtmlUrl: 'http://127.0.0.1:43123/rest/application-bundles/sample-app/assets/ui/index.html',
    expectedIframeOrigin: 'http://127.0.0.1:43123',
    normalizedHostOrigin: 'file://',
    contractVersion: '1',
    launchInstanceId: 'app-session-123::launch-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('emits matching ready signals and posts bootstrap only when instructed by the launch owner', async () => {
    const wrapper = mount(ApplicationIframeHost, {
      props: {
        descriptor,
        bootstrapEnvelope: null,
      },
    })

    const iframe = wrapper.get('iframe')
    expect(iframe.attributes('src')).toContain(
      'http://127.0.0.1:43123/rest/application-bundles/sample-app/assets/ui/index.html',
    )
    expect(iframe.attributes('src')).toContain('autobyteusApplicationSessionId=app-session-123')
    expect(iframe.attributes('src')).toContain('autobyteusLaunchInstanceId=app-session-123%3A%3Alaunch-1')
    expect(iframe.attributes('src')).toContain('autobyteusHostOrigin=file%3A%2F%2F')

    const contentWindowMock = {
      postMessage: vi.fn(),
    }
    Object.defineProperty(iframe.element, 'contentWindow', {
      value: contentWindowMock,
      configurable: true,
    })

    await iframe.trigger('load')
    expect(wrapper.emitted('iframeLoad')).toEqual([[
      {
        applicationSessionId: descriptor.applicationSessionId,
        launchInstanceId: descriptor.launchInstanceId,
        src: iframe.attributes('src'),
      },
    ]])

    const wrongLaunchMessage = createApplicationUiReadyEnvelopeV1({
      applicationSessionId: descriptor.applicationSessionId,
      launchInstanceId: 'stale-launch',
    })
    const wrongLaunchEvent = new MessageEvent('message', {
      data: wrongLaunchMessage,
      origin: descriptor.expectedIframeOrigin,
    })
    Object.defineProperty(wrongLaunchEvent, 'source', {
      value: contentWindowMock,
      configurable: true,
    })
    window.dispatchEvent(wrongLaunchEvent)
    await nextTick()

    expect(wrapper.emitted('ready')).toBeUndefined()
    expect(contentWindowMock.postMessage).not.toHaveBeenCalled()

    const readyMessage = createApplicationUiReadyEnvelopeV1({
      applicationSessionId: descriptor.applicationSessionId,
      launchInstanceId: descriptor.launchInstanceId,
    })
    const readyEvent = new MessageEvent('message', {
      data: readyMessage,
      origin: descriptor.expectedIframeOrigin,
    })
    Object.defineProperty(readyEvent, 'source', {
      value: contentWindowMock,
      configurable: true,
    })
    window.dispatchEvent(readyEvent)
    await nextTick()

    expect(wrapper.emitted('ready')).toEqual([[
      {
        applicationSessionId: descriptor.applicationSessionId,
        launchInstanceId: descriptor.launchInstanceId,
        iframeOrigin: descriptor.expectedIframeOrigin,
      },
    ]])
    expect(contentWindowMock.postMessage).not.toHaveBeenCalled()

    const bootstrapEnvelope = createApplicationHostBootstrapEnvelopeV1({
      host: {
        origin: descriptor.normalizedHostOrigin,
      },
      application: {
        applicationId: 'bundle-app__pkg__sample-app',
        localApplicationId: 'sample-app',
        packageId: 'pkg',
        name: 'Sample App',
      },
      session: {
        applicationSessionId: descriptor.applicationSessionId,
        launchInstanceId: descriptor.launchInstanceId,
      },
      runtime: {
        kind: 'AGENT_TEAM',
        runId: 'team-run-456',
        definitionId: 'bundle-team__pkg__sample-app__sample-team',
      },
      transport: {
        graphqlUrl: 'http://127.0.0.1:43123/graphql',
        restBaseUrl: 'http://127.0.0.1:43123/rest',
        websocketUrl: 'ws://127.0.0.1:43123/graphql',
        sessionStreamUrl: 'ws://127.0.0.1:43123/ws/application-session',
        backendStatusUrl: 'http://127.0.0.1:43123/rest/applications/bundle-app__pkg__sample-app/backend/status',
        backendQueriesBaseUrl: 'http://127.0.0.1:43123/rest/applications/bundle-app__pkg__sample-app/backend/queries',
        backendCommandsBaseUrl: 'http://127.0.0.1:43123/rest/applications/bundle-app__pkg__sample-app/backend/commands',
        backendGraphqlUrl: 'http://127.0.0.1:43123/rest/applications/bundle-app__pkg__sample-app/backend/graphql',
        backendRoutesBaseUrl: 'http://127.0.0.1:43123/rest/applications/bundle-app__pkg__sample-app/backend/routes',
        backendNotificationsUrl: 'ws://127.0.0.1:43123/ws/applications/bundle-app__pkg__sample-app/backend/notifications',
      },
    })

    await wrapper.setProps({
      bootstrapEnvelope,
    })
    await nextTick()

    expect(contentWindowMock.postMessage).toHaveBeenCalledTimes(1)
    expect(contentWindowMock.postMessage).toHaveBeenCalledWith(
      bootstrapEnvelope,
      descriptor.expectedIframeOrigin,
    )
    expect(wrapper.emitted('bootstrapDelivered')).toEqual([[
      {
        applicationSessionId: descriptor.applicationSessionId,
        launchInstanceId: descriptor.launchInstanceId,
      },
    ]])

    wrapper.unmount()
  })

  it('keeps the same iframe element when only the bootstrap envelope changes', async () => {
    const wrapper = mount(ApplicationIframeHost, {
      props: {
        descriptor,
        bootstrapEnvelope: null,
      },
    })

    const originalIframeElement = wrapper.get('iframe').element
    const contentWindowMock = {
      postMessage: vi.fn(),
    }
    Object.defineProperty(originalIframeElement, 'contentWindow', {
      value: contentWindowMock,
      configurable: true,
    })

    await wrapper.setProps({
      bootstrapEnvelope: createApplicationHostBootstrapEnvelopeV1({
        host: {
          origin: descriptor.normalizedHostOrigin,
        },
        application: {
          applicationId: 'bundle-app__pkg__sample-app',
          localApplicationId: 'sample-app',
          packageId: 'pkg',
          name: 'Sample App',
        },
        session: {
          applicationSessionId: descriptor.applicationSessionId,
          launchInstanceId: descriptor.launchInstanceId,
        },
        runtime: {
          kind: 'AGENT_TEAM',
          runId: 'team-run-456',
          definitionId: 'bundle-team__pkg__sample-app__sample-team',
        },
        transport: {
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
        },
      }),
    })
    await nextTick()

    expect(wrapper.get('iframe').element).toBe(originalIframeElement)

    wrapper.unmount()
  })

  it('emits a bridge error when the bootstrap payload cannot be cloned into postMessage', async () => {
    const wrapper = mount(ApplicationIframeHost, {
      props: {
        descriptor,
        bootstrapEnvelope: null,
      },
    })

    const iframe = wrapper.get('iframe')
    const contentWindowMock = {
      postMessage: vi.fn(() => {
        throw new Error("Failed to execute 'postMessage' on 'Window': #<Object> could not be cloned.")
      }),
    }
    Object.defineProperty(iframe.element, 'contentWindow', {
      value: contentWindowMock,
      configurable: true,
    })

    const bootstrapEnvelope = createApplicationHostBootstrapEnvelopeV1({
      host: {
        origin: descriptor.normalizedHostOrigin,
      },
      application: {
        applicationId: 'bundle-app__pkg__sample-app',
        localApplicationId: 'sample-app',
        packageId: 'pkg',
        name: 'Sample App',
      },
      session: {
        applicationSessionId: descriptor.applicationSessionId,
        launchInstanceId: descriptor.launchInstanceId,
      },
      runtime: {
        kind: 'AGENT_TEAM',
        runId: 'team-run-456',
        definitionId: 'bundle-team__pkg__sample-app__sample-team',
      },
      transport: {
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
      },
    })

    await wrapper.setProps({ bootstrapEnvelope })
    await nextTick()

    expect(wrapper.emitted('bridgeError')).toEqual([["Failed to execute 'postMessage' on 'Window': #<Object> could not be cloned."]])
    expect(wrapper.emitted('bootstrapDelivered')).toBeUndefined()

    wrapper.unmount()
  })
})
