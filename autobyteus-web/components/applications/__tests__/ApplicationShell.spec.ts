import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const {
  routeMock,
  navigateToMock,
  applicationStoreMock,
  applicationHostStoreMock,
  appLayoutStoreMock,
  hostHarness,
} = vi.hoisted(() => ({
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
    clearLaunchState: vi.fn(),
  },
  appLayoutStoreMock: {
    setHostShellPresentation: vi.fn(),
    resetHostShellPresentation: vi.fn(),
  },
  hostHarness: {
    launchState: {
      status: 'idle',
      launchInstanceId: null,
      engineState: null,
      startedAt: null,
      lastError: null,
      lastFailure: null,
    },
  },
}))

mockNuxtImport('useRoute', () => () => routeMock)
mockNuxtImport('navigateTo', () => navigateToMock)

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'applications.components.applications.ApplicationLaunchSetupPanel.title': 'Launch setup',
        'applications.components.applications.ApplicationShell.backToApplications': 'Back',
        'applications.components.applications.ApplicationShell.loadingApplication': 'Loading application…',
        'applications.components.applications.ApplicationShell.unableToLoadApplication': 'Unable to load application',
        'applications.components.applications.ApplicationShell.applicationNotFound': 'Application not found',
        'applications.components.applications.ApplicationShell.startingApplication': 'Starting application…',
        'applications.components.applications.ApplicationShell.enterApplication': 'Enter application',
        'applications.components.applications.ApplicationShell.retryLaunch': 'Retry launch',
        'applications.components.applications.ApplicationShell.applicationReadyNotice': 'Application ready notice',
        'applications.components.applications.ApplicationShell.preEntryGateTitle': 'Confirm launch setup before opening the app',
        'applications.components.applications.ApplicationShell.preEntryGateDescription': 'Save setup first, then open the app.',
        'applications.components.applications.ApplicationShell.businessOverviewHelp': 'Business summary',
        'applications.components.applications.ApplicationShell.showTechnicalDetails': 'Show technical details',
        'applications.components.applications.ApplicationShell.hideTechnicalDetails': 'Hide technical details',
        'applications.components.applications.ApplicationShell.launchInstanceIdLabel': 'Launch instance id',
        'applications.components.applications.ApplicationShell.engineStateLabel': 'Engine state',
        'applications.components.applications.ApplicationShell.startedAtLabel': 'Started at',
        'applications.components.applications.ApplicationIframeHost.initializationFailed': 'Initialization failed',
        'applications.components.applications.ApplicationImmersiveControlPanel.exitApplication': 'Exit application',
        'applications.shared.noDescriptionProvided': 'No description',
        'applications.shared.noBundleResources': 'No bundled runtime resources',
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

vi.mock('~/stores/appLayoutStore', () => ({
  useAppLayoutStore: () => appLayoutStoreMock,
}))

const ApplicationLaunchSetupPanelStub = defineComponent({
  name: 'ApplicationLaunchSetupPanel',
  props: {
    applicationId: {
      type: String,
      required: true,
    },
    presentation: {
      type: String,
      default: 'page',
    },
  },
  setup(props) {
    return () => h('div', { 'data-testid': 'launch-setup-panel' }, `${props.applicationId}:${props.presentation}`)
  },
})

const ApplicationSurfaceStub = defineComponent({
  name: 'ApplicationSurface',
  setup() {
    return () => h('div', { 'data-testid': 'application-surface' }, 'surface')
  },
})

const ApplicationImmersiveControlPanelStub = defineComponent({
  name: 'ApplicationImmersiveControlPanel',
  props: {
    applicationName: {
      type: String,
      required: true,
    },
    reloadDisabled: {
      type: Boolean,
      default: false,
    },
    reloadStatusMessage: {
      type: String,
      default: null,
    },
  },
  emits: ['reload-application', 'exit-application'],
  setup(props, { emit, slots }) {
    return () => h('div', { 'data-testid': 'immersive-control-panel' }, [
      h('span', props.applicationName),
      slots.details?.(),
      slots.configure?.(),
      h('button', {
        type: 'button',
        'data-testid': 'immersive-reload',
        disabled: props.reloadDisabled,
        onClick: () => emit('reload-application'),
      }, 'reload'),
      h('button', {
        type: 'button',
        'data-testid': 'immersive-exit',
        onClick: () => emit('exit-application'),
      }, 'exit'),
    ])
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
    applicationHostStoreMock.clearLaunchState.mockReset()
    appLayoutStoreMock.setHostShellPresentation.mockReset()
    appLayoutStoreMock.resetHostShellPresentation.mockReset()

    hostHarness.launchState = {
      status: 'idle',
      launchInstanceId: null,
      engineState: null,
      startedAt: null,
      lastError: null,
      lastFailure: null,
    }

    applicationStoreMock.fetchApplicationById.mockResolvedValue({
      id: 'bundle-app__pkg__brief-studio',
    })
    applicationStoreMock.getApplicationById.mockReturnValue({
      id: 'bundle-app__pkg__brief-studio',
      name: 'Brief Studio',
      description: 'Business-first brief workflow',
      iconAssetPath: null,
      entryHtmlAssetPath: '/application-bundles/brief-studio/assets/ui/index.html',
      resourceSlots: [
        {
          slotKey: 'draftingTeam',
          required: true,
        },
      ],
      technicalDetails: {
        localApplicationId: 'brief-studio',
        packageId: 'pkg',
        writable: true,
        bundleResources: [
          {
            kind: 'AGENT_TEAM',
            localId: 'brief-studio-team',
            definitionId: 'brief-studio-team',
          },
        ],
      },
    })
    applicationHostStoreMock.getLaunchState.mockImplementation(() => hostHarness.launchState)
    applicationHostStoreMock.startLaunch.mockImplementation(async () => {
      hostHarness.launchState = {
        status: 'preparing',
        launchInstanceId: null,
        engineState: null,
        startedAt: null,
        lastError: null,
        lastFailure: null,
      }
      return hostHarness.launchState
    })
    applicationHostStoreMock.clearLaunchState.mockImplementation(() => {
      hostHarness.launchState = {
        status: 'idle',
        launchInstanceId: null,
        engineState: null,
        startedAt: null,
        lastError: null,
        lastFailure: null,
      }
    })
  })

  it('shows the setup-first route, hides technical details by default, and does not auto-launch on initial load', async () => {
    const { default: ApplicationShell } = await import('../ApplicationShell.vue')

    const wrapper = mount(ApplicationShell, {
      global: {
        stubs: {
          ApplicationLaunchSetupPanel: ApplicationLaunchSetupPanelStub,
          ApplicationImmersiveControlPanel: ApplicationImmersiveControlPanelStub,
          ApplicationSurface: ApplicationSurfaceStub,
        },
      },
    })

    await flushPromises()

    expect(applicationStoreMock.fetchApplicationById).toHaveBeenCalledWith('bundle-app__pkg__brief-studio', true)
    expect(applicationHostStoreMock.clearLaunchState).toHaveBeenCalledWith('bundle-app__pkg__brief-studio')
    expect(applicationHostStoreMock.startLaunch).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="application-setup-phase"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="application-pre-entry-gate"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="launch-setup-panel"]').text()).toContain('bundle-app__pkg__brief-studio:page')
    expect(wrapper.text()).toContain('Business-first brief workflow')
    expect(wrapper.text()).toContain('Show technical details')
    expect(wrapper.text()).not.toContain('Package')
    expect(wrapper.text()).not.toContain('brief-studio-team → brief-studio-team')

    await wrapper.findAll('button').find((candidate) => candidate.text() === 'Show technical details')?.trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Package')
    expect(wrapper.text()).toContain('pkg')
    expect(wrapper.text()).toContain('brief-studio-team → brief-studio-team')

    const enterButton = wrapper.findAll('button').find((candidate) => candidate.text() === 'Enter application')
    expect(enterButton?.attributes('disabled')).toBeDefined()

    await enterButton?.trigger('click')

    expect(applicationHostStoreMock.startLaunch).not.toHaveBeenCalled()
  })

  it('starts a fresh immersive launch after the setup panel reports launch-ready state', async () => {
    const { default: ApplicationShell } = await import('../ApplicationShell.vue')

    const wrapper = mount(ApplicationShell, {
      global: {
        stubs: {
          ApplicationLaunchSetupPanel: ApplicationLaunchSetupPanelStub,
          ApplicationImmersiveControlPanel: ApplicationImmersiveControlPanelStub,
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
    await flushPromises()

    expect(applicationHostStoreMock.startLaunch).toHaveBeenCalledWith('bundle-app__pkg__brief-studio')
    expect(appLayoutStoreMock.setHostShellPresentation).toHaveBeenCalledWith('application_immersive')
    expect(wrapper.get('[data-testid="application-immersive-phase"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="launch-setup-panel"]').text()).toContain('bundle-app__pkg__brief-studio:panel')
    expect(wrapper.get('[data-testid="application-immersive-loading-canvas"]').exists()).toBe(true)
  })

  it('owns immersive launch failure before a launch instance exists', async () => {
    applicationHostStoreMock.startLaunch.mockImplementationOnce(async () => {
      throw new Error('Host launch failed')
    })

    const { default: ApplicationShell } = await import('../ApplicationShell.vue')

    const wrapper = mount(ApplicationShell, {
      global: {
        stubs: {
          ApplicationLaunchSetupPanel: ApplicationLaunchSetupPanelStub,
          ApplicationImmersiveControlPanel: ApplicationImmersiveControlPanelStub,
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
    await wrapper.findAll('button').find((candidate) => candidate.text() === 'Enter application')?.trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="application-immersive-error-canvas"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Host launch failed')
    expect(wrapper.find('[data-testid="application-surface"]').exists()).toBe(false)
  })
})
