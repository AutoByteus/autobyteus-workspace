import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import type {
  ApplicationHostBootstrapEnvelopeV3,
  ApplicationIframeReadySignal,
} from '@autobyteus/application-sdk-contracts'
import ApplicationSurface from '../ApplicationSurface.vue'
import type { ApplicationDetailRecord } from '~/stores/applicationStore'
import type { ApplicationIframeLaunchDescriptor } from '~/utils/application/applicationLaunchDescriptor'

const hostHarness = vi.hoisted(() => ({
  props: {
    descriptor: null as ApplicationIframeLaunchDescriptor | null,
    bootstrapEnvelope: null as ApplicationHostBootstrapEnvelopeV3 | null,
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
      hostHarness.props.bootstrapEnvelope = props.bootstrapEnvelope as ApplicationHostBootstrapEnvelopeV3 | null
      return h('div', { 'data-testid': 'iframe-host' })
    }
  },
})

const buildApplication = (): ApplicationDetailRecord => ({
  id: 'bundle-app__pkg__sample-app',
  name: 'Sample App',
  description: 'Sample description',
  iconAssetPath: null,
  entryHtmlAssetPath: '/application-bundles/sample-app/assets/ui/index.html',
  resourceSlots: [],
  technicalDetails: {
    localApplicationId: 'sample-app',
    packageId: 'pkg',
    writable: true,
    bundleResources: [],
  },
})

const mountSurface = (): VueWrapper => mount(ApplicationSurface, {
  props: {
    application: buildApplication(),
    iframeLaunchId: 'bundle-app__pkg__sample-app::iframe-launch-1',
  },
  global: {
    stubs: {
      ApplicationIframeHost: ApplicationIframeHostStub,
    },
  },
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

  it('keeps the iframe canvas hidden behind an opaque host reveal gate until bootstrap delivery succeeds', async () => {
    const wrapper = mountSurface()

    expect(hostHarness.props.descriptor?.applicationId).toBe('bundle-app__pkg__sample-app')
    expect(hostHarness.props.descriptor?.iframeLaunchId).toBe('bundle-app__pkg__sample-app::iframe-launch-1')
    expect(hostHarness.props.bootstrapEnvelope).toBeNull()

    const canvas = wrapper.get('[data-testid="application-surface-canvas"]')
    const loadingOverlay = wrapper.get('[data-testid="application-surface-loading-overlay"]')
    expect(canvas.classes()).toContain('opacity-0')
    expect(canvas.attributes('aria-hidden')).toBe('true')
    expect(loadingOverlay.classes()).toContain('bg-slate-950')
    expect(wrapper.text()).toContain('Initializing application')

    const descriptor = hostHarness.props.descriptor!
    await wrapper.getComponent(ApplicationIframeHostStub).vm.$emit('ready', {
      applicationId: descriptor.applicationId,
      iframeLaunchId: descriptor.iframeLaunchId,
      iframeOrigin: descriptor.expectedIframeOrigin,
    } satisfies ApplicationIframeReadySignal)
    await nextTick()

    expect(hostHarness.props.bootstrapEnvelope?.payload.application).toEqual({
      applicationId: descriptor.applicationId,
      localApplicationId: 'sample-app',
      packageId: 'pkg',
      name: 'Sample App',
    })
    expect(hostHarness.props.bootstrapEnvelope?.payload.requestContext).toEqual({
      applicationId: descriptor.applicationId,
    })
    expect(hostHarness.props.bootstrapEnvelope?.payload.iframeLaunchId).toBe(descriptor.iframeLaunchId)
    expect(hostHarness.props.bootstrapEnvelope?.payload).not.toHaveProperty('session')
    expect(hostHarness.props.bootstrapEnvelope?.payload).not.toHaveProperty('runtime')

    await wrapper.getComponent(ApplicationIframeHostStub).vm.$emit('bootstrap-delivered', {
      applicationId: descriptor.applicationId,
      iframeLaunchId: descriptor.iframeLaunchId,
    })
    await nextTick()

    expect(hostHarness.props.bootstrapEnvelope).toBeNull()
    expect(wrapper.find('[data-testid="application-surface-loading-overlay"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="application-surface-canvas"]').classes()).toContain('opacity-100')
    expect(wrapper.get('[data-testid="application-surface-canvas"]').attributes('aria-hidden')).toBe('false')

    wrapper.unmount()
  })

  it('ignores stale ready signals that do not match the active launch descriptor', async () => {
    const wrapper = mountSurface()

    await wrapper.getComponent(ApplicationIframeHostStub).vm.$emit('ready', {
      applicationId: 'bundle-app__pkg__sample-app',
      iframeLaunchId: 'stale-iframe-launch',
      iframeOrigin: hostHarness.props.descriptor!.expectedIframeOrigin,
    } satisfies ApplicationIframeReadySignal)
    await nextTick()

    expect(hostHarness.props.bootstrapEnvelope).toBeNull()
    expect(wrapper.text()).toContain('Initializing application')

    wrapper.unmount()
  })

  it('keeps bootstrap failures inside the transition state and allows retry without revealing the canvas', async () => {
    const wrapper = mountSurface()

    await wrapper.getComponent(ApplicationIframeHostStub).vm.$emit('bridge-error', 'Bootstrap bridge failed')
    await nextTick()

    expect(wrapper.find('[data-testid="application-surface-loading-overlay"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="application-surface-failure-overlay"]').classes()).toContain('bg-slate-950')
    expect(wrapper.text()).toContain('Bootstrap bridge failed')
    expect(wrapper.get('[data-testid="application-surface-canvas"]').classes()).toContain('opacity-0')

    await wrapper.get('button').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="application-surface-failure-overlay"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="application-surface-loading-overlay"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="application-surface-canvas"]').classes()).toContain('opacity-0')

    wrapper.unmount()
  })
})
