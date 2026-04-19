import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ApplicationSurface from '../ApplicationSurface.vue'
import type { ApplicationCatalogEntry } from '~/stores/applicationStore'
import type { ApplicationHostBootstrapEnvelopeV2, ApplicationIframeReadySignal } from '~/types/application/ApplicationIframeContract'
import type { ApplicationIframeLaunchDescriptor } from '~/utils/application/applicationLaunchDescriptor'

const hostHarness = vi.hoisted(() => ({
  props: {
    descriptor: null as ApplicationIframeLaunchDescriptor | null,
    bootstrapEnvelope: null as ApplicationHostBootstrapEnvelopeV2 | null,
  },
  bindingRevision: 0,
}))

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'applications.components.applications.ApplicationSurface.applicationUnavailable': 'Application unavailable',
        'applications.components.applications.ApplicationSurface.applicationUnavailableHelp': 'Launch this application to bootstrap the bundled UI.',
        'applications.components.applications.ApplicationIframeHost.initializationFailed': 'Application initialization failed',
        'applications.components.applications.ApplicationIframeHost.handshakeDidNotComplete': 'The bundled application did not complete the required iframe handshake.',
        'applications.components.applications.ApplicationIframeHost.retryBootstrap': 'Retry bootstrap',
        'applications.components.applications.ApplicationIframeHost.initializingApplication': 'Initializing application…',
      }
      if (key === 'applications.components.applications.ApplicationIframeHost.readyTimeout') {
        return `The bundled application did not send a valid ${params?.eventName} message within ${params?.timeoutMs} ms.`
      }
      return translations[key] ?? key
    },
  }),
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    getBoundEndpoints: () => ({
      graphqlHttp: 'http://127.0.0.1:43123/graphql',
      graphqlWs: 'ws://127.0.0.1:43123/graphql',
      rest: 'http://127.0.0.1:43123/rest',
    }),
    get bindingRevision() {
      return hostHarness.bindingRevision
    },
  }),
}))

const ApplicationIframeHostStub = defineComponent({
  name: 'ApplicationIframeHost',
  props: {
    descriptor: {
      type: Object,
      required: true,
    },
    bootstrapEnvelope: {
      type: Object,
      default: null,
    },
  },
  emits: ['ready', 'bootstrap-delivered', 'bridge-error'],
  setup(props) {
    return () => {
      hostHarness.props.descriptor = props.descriptor as ApplicationIframeLaunchDescriptor
      hostHarness.props.bootstrapEnvelope = props.bootstrapEnvelope as ApplicationHostBootstrapEnvelopeV2 | null
      return h('div', { 'data-testid': 'iframe-host' })
    }
  },
})

const buildApplication = (): ApplicationCatalogEntry => ({
  id: 'bundle-app__pkg__sample-app',
  localApplicationId: 'sample-app',
  packageId: 'pkg',
  name: 'Sample App',
  description: 'Sample description',
  iconAssetPath: null,
  entryHtmlAssetPath: '/application-bundles/sample-app/assets/ui/index.html',
  writable: true,
  bundleResources: [],
})

describe('ApplicationSurface', () => {
  beforeEach(() => {
    hostHarness.props.descriptor = null
    hostHarness.props.bootstrapEnvelope = null
    hostHarness.bindingRevision = 0
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('owns the v2 launch handshake and clears the spinner after bootstrap delivery', async () => {
    const wrapper = mount(ApplicationSurface, {
      props: {
        application: buildApplication(),
        launchInstanceId: 'bundle-app__pkg__sample-app::launch-1',
      },
      global: {
        stubs: {
          ApplicationIframeHost: ApplicationIframeHostStub,
        },
      },
    })

    expect(hostHarness.props.descriptor?.applicationId).toBe('bundle-app__pkg__sample-app')
    expect(hostHarness.props.descriptor?.launchInstanceId).toBe('bundle-app__pkg__sample-app::launch-1')
    expect(hostHarness.props.bootstrapEnvelope).toBeNull()
    expect(wrapper.text()).toContain('Initializing application')

    const descriptor = hostHarness.props.descriptor!
    await wrapper.getComponent(ApplicationIframeHostStub).vm.$emit('ready', {
      applicationId: descriptor.applicationId,
      launchInstanceId: descriptor.launchInstanceId,
      iframeOrigin: descriptor.expectedIframeOrigin,
    } satisfies ApplicationIframeReadySignal)
    await nextTick()

    expect(hostHarness.props.bootstrapEnvelope?.payload.requestContext).toEqual({
      applicationId: descriptor.applicationId,
      launchInstanceId: descriptor.launchInstanceId,
    })
    expect(hostHarness.props.bootstrapEnvelope?.payload.launch).toEqual({
      launchInstanceId: descriptor.launchInstanceId,
    })
    expect(hostHarness.props.bootstrapEnvelope?.payload).not.toHaveProperty('session')
    expect(hostHarness.props.bootstrapEnvelope?.payload).not.toHaveProperty('runtime')

    await wrapper.getComponent(ApplicationIframeHostStub).vm.$emit('bootstrap-delivered', {
      applicationId: descriptor.applicationId,
      launchInstanceId: descriptor.launchInstanceId,
    })
    await nextTick()

    expect(hostHarness.props.bootstrapEnvelope).toBeNull()
    expect(wrapper.text()).not.toContain('Initializing application')

    wrapper.unmount()
  })

  it('ignores stale ready signals that do not match the active launch descriptor', async () => {
    const wrapper = mount(ApplicationSurface, {
      props: {
        application: buildApplication(),
        launchInstanceId: 'bundle-app__pkg__sample-app::launch-1',
      },
      global: {
        stubs: {
          ApplicationIframeHost: ApplicationIframeHostStub,
        },
      },
    })

    await wrapper.getComponent(ApplicationIframeHostStub).vm.$emit('ready', {
      applicationId: 'bundle-app__pkg__sample-app',
      launchInstanceId: 'stale-launch',
      iframeOrigin: hostHarness.props.descriptor!.expectedIframeOrigin,
    } satisfies ApplicationIframeReadySignal)
    await nextTick()

    expect(hostHarness.props.bootstrapEnvelope).toBeNull()
    expect(wrapper.text()).toContain('Initializing application')

    wrapper.unmount()
  })
})
