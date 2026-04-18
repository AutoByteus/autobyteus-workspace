import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ApplicationSurface from '../ApplicationSurface.vue'
import type { ApplicationSession } from '~/types/application/ApplicationSession'
import type { ApplicationHostBootstrapEnvelopeV1, ApplicationIframeReadySignal } from '~/types/application/ApplicationIframeContract'
import type { ApplicationIframeLaunchDescriptor } from '~/utils/application/applicationLaunchDescriptor'

const hostHarness = vi.hoisted(() => ({
  props: {
    descriptor: null as ApplicationIframeLaunchDescriptor | null,
    bootstrapEnvelope: null as ApplicationHostBootstrapEnvelopeV1 | null,
  },
}))

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'applications.components.applications.ApplicationSurface.noActiveSession': 'No active application session',
        'applications.components.applications.ApplicationSurface.noActiveSessionHelp': 'Launch this application to create the backend-owned session and bootstrap the bundled application UI.',
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
      hostHarness.props.bootstrapEnvelope = props.bootstrapEnvelope as ApplicationHostBootstrapEnvelopeV1 | null
      return h('div', { 'data-testid': 'iframe-host' })
    }
  },
})

const buildSession = (): ApplicationSession => ({
  applicationSessionId: 'app-session-123',
  application: {
    applicationId: 'bundle-app__pkg__sample-app',
    localApplicationId: 'sample-app',
    packageId: 'pkg',
    name: 'Sample App',
    description: 'Sample description',
    iconAssetPath: null,
    entryHtmlAssetPath: '/application-bundles/sample-app/assets/ui/index.html',
    writable: true,
  },
  runtime: {
    kind: 'AGENT_TEAM',
    runId: 'team-run-456',
    definitionId: 'bundle-team__pkg__sample-app__sample-team',
  },
  view: {
    members: [],
  },
  createdAt: '2026-04-15T08:00:00.000Z',
  terminatedAt: null,
})

describe('ApplicationSurface', () => {
  beforeEach(() => {
    hostHarness.props.descriptor = null
    hostHarness.props.bootstrapEnvelope = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('owns the launch handshake and clears the spinner after bootstrap delivery in immersive presentation', async () => {
    const wrapper = mount(ApplicationSurface, {
      props: {
        session: buildSession(),
        presentation: 'immersive',
      },
      global: {
        stubs: {
          ApplicationIframeHost: ApplicationIframeHostStub,
        },
      },
    })

    expect(hostHarness.props.descriptor?.applicationSessionId).toBe('app-session-123')
    expect(hostHarness.props.bootstrapEnvelope).toBeNull()
    expect(wrapper.text()).toContain('Initializing application')
    expect(wrapper.html()).not.toContain('rounded-2xl')

    const descriptor = hostHarness.props.descriptor!
    await wrapper.getComponent(ApplicationIframeHostStub).vm.$emit('ready', {
      applicationSessionId: descriptor.applicationSessionId,
      launchInstanceId: descriptor.launchInstanceId,
      iframeOrigin: descriptor.expectedIframeOrigin,
    } satisfies ApplicationIframeReadySignal)
    await nextTick()

    expect(hostHarness.props.bootstrapEnvelope?.payload.session).toEqual({
      applicationSessionId: descriptor.applicationSessionId,
      launchInstanceId: descriptor.launchInstanceId,
    })
    expect(() => structuredClone(hostHarness.props.bootstrapEnvelope)).not.toThrow()

    await wrapper.getComponent(ApplicationIframeHostStub).vm.$emit('bootstrap-delivered', {
      applicationSessionId: descriptor.applicationSessionId,
      launchInstanceId: descriptor.launchInstanceId,
    })
    await nextTick()

    expect(hostHarness.props.bootstrapEnvelope).toBeNull()
    expect(wrapper.text()).not.toContain('Initializing application')

    wrapper.unmount()
  })

  it('renders the standard framed surface presentation when requested', async () => {
    const wrapper = mount(ApplicationSurface, {
      props: {
        session: buildSession(),
        presentation: 'standard',
      },
      global: {
        stubs: {
          ApplicationIframeHost: ApplicationIframeHostStub,
        },
      },
    })

    expect(wrapper.html()).toContain('rounded-2xl')
    expect(wrapper.html()).toContain('border-slate-200')

    wrapper.unmount()
  })

  it('creates a new launch instance when retry is requested after a ready timeout', async () => {
    vi.useFakeTimers()

    const wrapper = mount(ApplicationSurface, {
      props: {
        session: buildSession(),
      },
      global: {
        stubs: {
          ApplicationIframeHost: ApplicationIframeHostStub,
        },
      },
    })

    const firstLaunchInstanceId = hostHarness.props.descriptor?.launchInstanceId
    vi.advanceTimersByTime(10_001)
    await nextTick()

    expect(wrapper.text()).toContain('Initialization failed')
    await wrapper.get('button').trigger('click')
    await nextTick()

    expect(hostHarness.props.descriptor?.launchInstanceId).not.toBe(firstLaunchInstanceId)
    expect(wrapper.text()).toContain('Initializing application')

    wrapper.unmount()
  })

  it('keeps the same launch descriptor when only retained session view data changes', async () => {
    const wrapper = mount(ApplicationSurface, {
      props: {
        session: buildSession(),
      },
      global: {
        stubs: {
          ApplicationIframeHost: ApplicationIframeHostStub,
        },
      },
    })

    const firstLaunchInstanceId = hostHarness.props.descriptor?.launchInstanceId
    await wrapper.setProps({
      session: {
        ...buildSession(),
        view: {
          members: [
            {
              memberRouteKey: 'writer',
              displayName: 'Writer',
              teamPath: ['writer'],
              runtimeTarget: {
                runId: 'member-run-1',
                runtimeKind: 'AGENT_TEAM_MEMBER',
              },
              artifactsByKey: {},
              primaryArtifactKey: null,
            },
          ],
        },
      },
    })
    await nextTick()

    expect(hostHarness.props.descriptor?.launchInstanceId).toBe(firstLaunchInstanceId)

    wrapper.unmount()
  })
})
