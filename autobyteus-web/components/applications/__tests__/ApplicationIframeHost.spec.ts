import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
  createApplicationHostBootstrapEnvelopeV3,
  createApplicationUiReadyEnvelopeV3,
} from '@autobyteus/application-sdk-contracts'
import ApplicationIframeHost from '../ApplicationIframeHost.vue'
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
    contractVersion: '3',
    iframeLaunchId: 'bundle-app__pkg__sample-app::iframe-launch-1',
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
    expect(iframe.attributes('src')).toContain('autobyteusContractVersion=3')
    expect(iframe.attributes('src')).toContain('autobyteusApplicationId=bundle-app__pkg__sample-app')
    expect(iframe.attributes('src')).toContain('autobyteusIframeLaunchId=bundle-app__pkg__sample-app%3A%3Aiframe-launch-1')
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
        iframeLaunchId: descriptor.iframeLaunchId,
        src: iframe.attributes('src'),
      },
    ]])

    const wrongIframeLaunchEvent = createApplicationUiReadyEnvelopeV3({
      applicationId: descriptor.applicationId,
      iframeLaunchId: 'stale-iframe-launch',
    })
    const wrongIframeLaunchMessage = new MessageEvent('message', {
      data: wrongIframeLaunchEvent,
      origin: descriptor.expectedIframeOrigin,
    })
    Object.defineProperty(wrongIframeLaunchMessage, 'source', {
      value: contentWindowMock,
      configurable: true,
    })
    window.dispatchEvent(wrongIframeLaunchMessage)
    await nextTick()

    expect(wrapper.emitted('ready')).toBeUndefined()
    expect(contentWindowMock.postMessage).not.toHaveBeenCalled()

    const readyEvent = createApplicationUiReadyEnvelopeV3({
      applicationId: descriptor.applicationId,
      iframeLaunchId: descriptor.iframeLaunchId,
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
        iframeLaunchId: descriptor.iframeLaunchId,
        iframeOrigin: descriptor.expectedIframeOrigin,
      },
    ]])
    expect(contentWindowMock.postMessage).not.toHaveBeenCalled()

    const bootstrapEnvelope = createApplicationHostBootstrapEnvelopeV3({
      host: {
        origin: descriptor.normalizedHostOrigin,
      },
      application: {
        applicationId: descriptor.applicationId,
        localApplicationId: 'sample-app',
        packageId: 'pkg',
        name: 'Sample App',
      },
      iframeLaunchId: descriptor.iframeLaunchId,
      requestContext: {
        applicationId: descriptor.applicationId,
      },
      transport: {
        backendBaseUrl: 'http://127.0.0.1:43123/rest/applications/bundle-app__pkg__sample-app/backend',
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
        iframeLaunchId: descriptor.iframeLaunchId,
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
      bootstrapEnvelope: createApplicationHostBootstrapEnvelopeV3({
        host: {
          origin: descriptor.normalizedHostOrigin,
        },
        application: {
          applicationId: descriptor.applicationId,
          localApplicationId: 'sample-app',
          packageId: 'pkg',
          name: 'Sample App',
        },
        iframeLaunchId: descriptor.iframeLaunchId,
        requestContext: {
          applicationId: descriptor.applicationId,
        },
        transport: {
          backendBaseUrl: null,
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
