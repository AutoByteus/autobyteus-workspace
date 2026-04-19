import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ApplicationIframeHost from '../ApplicationIframeHost.vue'
import {
  createApplicationHostBootstrapEnvelopeV2,
  createApplicationUiReadyEnvelopeV2,
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
    applicationId: 'bundle-app__pkg__sample-app',
    entryHtmlUrl: 'http://127.0.0.1:43123/rest/application-bundles/sample-app/assets/ui/index.html',
    expectedIframeOrigin: 'http://127.0.0.1:43123',
    normalizedHostOrigin: 'file://',
    contractVersion: '2',
    launchInstanceId: 'bundle-app__pkg__sample-app::launch-1',
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
    expect(iframe.attributes('src')).toContain('autobyteusContractVersion=2')
    expect(iframe.attributes('src')).toContain('autobyteusApplicationId=bundle-app__pkg__sample-app')
    expect(iframe.attributes('src')).toContain('autobyteusLaunchInstanceId=bundle-app__pkg__sample-app%3A%3Alaunch-1')
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
        applicationId: descriptor.applicationId,
        launchInstanceId: descriptor.launchInstanceId,
        src: iframe.attributes('src'),
      },
    ]])

    const wrongLaunchEvent = createApplicationUiReadyEnvelopeV2({
      applicationId: descriptor.applicationId,
      launchInstanceId: 'stale-launch',
    })
    const wrongLaunchMessage = new MessageEvent('message', {
      data: wrongLaunchEvent,
      origin: descriptor.expectedIframeOrigin,
    })
    Object.defineProperty(wrongLaunchMessage, 'source', {
      value: contentWindowMock,
      configurable: true,
    })
    window.dispatchEvent(wrongLaunchMessage)
    await nextTick()

    expect(wrapper.emitted('ready')).toBeUndefined()
    expect(contentWindowMock.postMessage).not.toHaveBeenCalled()

    const readyEvent = createApplicationUiReadyEnvelopeV2({
      applicationId: descriptor.applicationId,
      launchInstanceId: descriptor.launchInstanceId,
    })
    const readyMessage = new MessageEvent('message', {
      data: readyEvent,
      origin: descriptor.expectedIframeOrigin,
    })
    Object.defineProperty(readyMessage, 'source', {
      value: contentWindowMock,
      configurable: true,
    })
    window.dispatchEvent(readyMessage)
    await nextTick()

    expect(wrapper.emitted('ready')).toEqual([[
      {
        applicationId: descriptor.applicationId,
        launchInstanceId: descriptor.launchInstanceId,
        iframeOrigin: descriptor.expectedIframeOrigin,
      },
    ]])
    expect(contentWindowMock.postMessage).not.toHaveBeenCalled()

    const bootstrapEnvelope = createApplicationHostBootstrapEnvelopeV2({
      host: {
        origin: descriptor.normalizedHostOrigin,
      },
      application: {
        applicationId: descriptor.applicationId,
        localApplicationId: 'sample-app',
        packageId: 'pkg',
        name: 'Sample App',
      },
      launch: {
        launchInstanceId: descriptor.launchInstanceId,
      },
      requestContext: {
        applicationId: descriptor.applicationId,
        launchInstanceId: descriptor.launchInstanceId,
      },
      transport: {
        graphqlUrl: 'http://127.0.0.1:43123/graphql',
        restBaseUrl: 'http://127.0.0.1:43123/rest',
        websocketUrl: 'ws://127.0.0.1:43123/graphql',
        backendStatusUrl: 'http://127.0.0.1:43123/rest/applications/bundle-app__pkg__sample-app/backend/status',
        backendEnsureReadyUrl: 'http://127.0.0.1:43123/rest/applications/bundle-app__pkg__sample-app/backend/ensure-ready',
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
        applicationId: descriptor.applicationId,
        launchInstanceId: descriptor.launchInstanceId,
      },
    ]])

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

    await wrapper.setProps({
      bootstrapEnvelope: createApplicationHostBootstrapEnvelopeV2({
        host: {
          origin: descriptor.normalizedHostOrigin,
        },
        application: {
          applicationId: descriptor.applicationId,
          localApplicationId: 'sample-app',
          packageId: 'pkg',
          name: 'Sample App',
        },
        launch: {
          launchInstanceId: descriptor.launchInstanceId,
        },
        requestContext: {
          applicationId: descriptor.applicationId,
          launchInstanceId: descriptor.launchInstanceId,
        },
        transport: {
          graphqlUrl: 'http://127.0.0.1:43123/graphql',
          restBaseUrl: 'http://127.0.0.1:43123/rest',
          websocketUrl: 'ws://127.0.0.1:43123/graphql',
          backendStatusUrl: null,
          backendEnsureReadyUrl: null,
          backendQueriesBaseUrl: null,
          backendCommandsBaseUrl: null,
          backendGraphqlUrl: null,
          backendRoutesBaseUrl: null,
          backendNotificationsUrl: null,
        },
      }),
    })
    await nextTick()

    expect(wrapper.emitted('bridgeError')).toEqual([[
      "Failed to execute 'postMessage' on 'Window': #<Object> could not be cloned.",
    ]])

    wrapper.unmount()
  })
})
