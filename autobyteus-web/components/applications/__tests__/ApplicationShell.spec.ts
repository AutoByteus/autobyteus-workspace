import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const { routeMock, navigateToMock, applicationStoreMock, applicationHostStoreMock } = vi.hoisted(() => ({
  routeMock: {
    params: {
      id: 'bundle-app__pkg__brief-studio',
    },
  },
  navigateToMock: vi.fn(),
  applicationStoreMock: {
    fetchApplicationById: vi.fn(),
    getApplicationById: vi.fn(),
  },
  applicationHostStoreMock: {
    getLaunchState: vi.fn(),
    startLaunch: vi.fn(),
  },
}))

mockNuxtImport('useRoute', () => () => routeMock)
mockNuxtImport('navigateTo', () => navigateToMock)

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'applications.components.applications.ApplicationShell.backToApplications': 'Back',
        'applications.components.applications.ApplicationShell.loadingApplication': 'Loading application…',
        'applications.components.applications.ApplicationShell.unableToLoadApplication': 'Unable to load application',
        'applications.components.applications.ApplicationShell.applicationNotFound': 'Application not found',
        'applications.components.applications.ApplicationShell.showDetails': 'Details',
        'applications.components.applications.ApplicationShell.hideDetails': 'Hide details',
        'applications.components.applications.ApplicationShell.startingApplication': 'Starting application…',
        'applications.components.applications.ApplicationShell.enterApplication': 'Enter application',
        'applications.components.applications.ApplicationShell.reloadApplication': 'Reload application',
        'applications.components.applications.ApplicationShell.retryLaunch': 'Retry launch',
        'applications.components.applications.ApplicationShell.applicationReadyNotice': 'Application ready notice',
        'applications.components.applications.ApplicationShell.preEntryGateTitle': 'Confirm launch setup before opening the app',
        'applications.components.applications.ApplicationShell.preEntryGateDescription': 'Save setup first, then open the app.',
        'applications.components.applications.ApplicationShell.launchInstanceIdLabel': 'Launch instance id',
        'applications.components.applications.ApplicationShell.engineStateLabel': 'Engine state',
        'applications.components.applications.ApplicationShell.startedAtLabel': 'Started at',
        'applications.components.applications.ApplicationIframeHost.initializationFailed': 'Initialization failed',
        'applications.shared.noDescriptionProvided': 'No description',
        'applications.shared.noBundleResources': 'No bundled runtime resources',
        'applications.shared.mixedResources': 'Mixed resources',
        'applications.shared.singleAgent': 'Single agent',
        'applications.shared.agentTeam': 'Agent team',
        'applications.shared.package': 'Package',
        'applications.shared.localApplicationId': 'Local application id',
        'applications.shared.bundleResources': 'Bundle resources',
        'applications.shared.writableSource': 'Writable',
        'applications.shared.yes': 'Yes',
        'applications.shared.no': 'No',
      }
      if (key === 'applications.components.applications.ApplicationShell.noApplicationExistsForId') {
        return `No application exists for id ${params?.id}.`
      }
      return translations[key] ?? key
    },
  }),
}))

vi.mock('~/stores/applicationStore', () => ({
  useApplicationStore: () => applicationStoreMock,
}))

vi.mock('~/stores/applicationHostStore', () => ({
  useApplicationHostStore: () => applicationHostStoreMock,
}))

const ApplicationLaunchSetupPanelStub = defineComponent({
  name: 'ApplicationLaunchSetupPanel',
  props: {
    applicationId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    return () => h('div', { 'data-testid': 'launch-setup-panel' }, props.applicationId)
  },
})

const ApplicationSurfaceStub = defineComponent({
  name: 'ApplicationSurface',
  setup() {
    return () => h('div', { 'data-testid': 'application-surface' }, 'surface')
  },
})

describe('ApplicationShell', () => {
  beforeEach(() => {
    routeMock.params.id = 'bundle-app__pkg__brief-studio'
    navigateToMock.mockReset()
    applicationStoreMock.fetchApplicationById.mockReset()
    applicationStoreMock.getApplicationById.mockReset()
    applicationHostStoreMock.getLaunchState.mockReset()
    applicationHostStoreMock.startLaunch.mockReset()

    applicationStoreMock.fetchApplicationById.mockResolvedValue({
      id: 'bundle-app__pkg__brief-studio',
    })
    applicationStoreMock.getApplicationById.mockReturnValue({
      id: 'bundle-app__pkg__brief-studio',
      localApplicationId: 'brief-studio',
      packageId: 'pkg',
      name: 'Brief Studio',
      description: 'Business-first brief workflow',
      writable: true,
      bundleResources: [
        {
          kind: 'AGENT_TEAM',
          localId: 'brief-studio-team',
          definitionId: 'brief-studio-team',
        },
      ],
    })
    applicationHostStoreMock.getLaunchState.mockReturnValue({
      status: 'idle',
      launchInstanceId: null,
      engineState: null,
      startedAt: null,
      lastError: null,
      lastFailure: null,
    })
    applicationHostStoreMock.startLaunch.mockResolvedValue(undefined)
  })

  it('shows the pre-entry launch gate and does not auto-launch on initial load', async () => {
    const { default: ApplicationShell } = await import('../ApplicationShell.vue')

    const wrapper = mount(ApplicationShell, {
      global: {
        stubs: {
          ApplicationLaunchSetupPanel: ApplicationLaunchSetupPanelStub,
          ApplicationSurface: ApplicationSurfaceStub,
        },
      },
    })

    await flushPromises()

    expect(applicationStoreMock.fetchApplicationById).toHaveBeenCalledWith('bundle-app__pkg__brief-studio', true)
    expect(applicationHostStoreMock.startLaunch).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="application-pre-entry-gate"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="launch-setup-panel"]').text()).toContain('bundle-app__pkg__brief-studio')
    expect(wrapper.text()).toContain('Enter application')

    const enterButton = wrapper.findAll('button').find((candidate) => candidate.text() === 'Enter application')
    expect(enterButton?.attributes('disabled')).toBeDefined()

    await enterButton?.trigger('click')

    expect(applicationHostStoreMock.startLaunch).not.toHaveBeenCalled()
  })

  it('starts the host launch only after the setup panel reports launch-ready state', async () => {
    const { default: ApplicationShell } = await import('../ApplicationShell.vue')

    const wrapper = mount(ApplicationShell, {
      global: {
        stubs: {
          ApplicationLaunchSetupPanel: ApplicationLaunchSetupPanelStub,
          ApplicationSurface: ApplicationSurfaceStub,
        },
      },
    })

    await flushPromises()
    await wrapper.getComponent(ApplicationLaunchSetupPanelStub).vm.$emit('setup-state-change', {
      phase: 'ready',
      isLaunchReady: true,
      blockingReason: null,
    })
    await nextTick()

    const enterButton = wrapper.findAll('button').find((candidate) => candidate.text() === 'Enter application')
    expect(enterButton?.attributes('disabled')).toBeUndefined()

    await enterButton?.trigger('click')

    expect(applicationHostStoreMock.startLaunch).toHaveBeenCalledWith('bundle-app__pkg__brief-studio')
  })

  it('keeps entry blocked when the setup panel reports a load failure', async () => {
    const { default: ApplicationShell } = await import('../ApplicationShell.vue')

    const wrapper = mount(ApplicationShell, {
      global: {
        stubs: {
          ApplicationLaunchSetupPanel: ApplicationLaunchSetupPanelStub,
          ApplicationSurface: ApplicationSurfaceStub,
        },
      },
    })

    await flushPromises()
    await wrapper.getComponent(ApplicationLaunchSetupPanelStub).vm.$emit('setup-state-change', {
      phase: 'error',
      isLaunchReady: false,
      blockingReason: 'Unable to load application setup',
    })
    await nextTick()

    expect(wrapper.text()).toContain('Unable to load application setup')
    const enterButton = wrapper.findAll('button').find((candidate) => candidate.text() === 'Enter application')
    expect(enterButton?.attributes('disabled')).toBeDefined()

    await enterButton?.trigger('click')

    expect(applicationHostStoreMock.startLaunch).not.toHaveBeenCalled()
  })
})
