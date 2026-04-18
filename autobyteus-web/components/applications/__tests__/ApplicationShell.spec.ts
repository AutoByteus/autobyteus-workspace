import { mount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  routeMock,
  routerReplaceMock,
  navigateToMock,
  applicationStoreMock,
  applicationSessionStoreMock,
  applicationPageStoreState,
  appLayoutStoreMock,
  setHostShellPresentationMock,
  resetHostShellPresentationMock,
} = vi.hoisted(() => {
  const application = {
    applicationId: 'app-1',
    localApplicationId: 'brief-studio',
    packageId: 'application-local:/packages/brief-studio',
    name: 'Brief Studio',
    description: 'Brief creation app',
    iconAssetPath: null,
    entryHtmlAssetPath: '/application-bundles/brief-studio/ui/index.html',
    writable: true,
    runtimeTarget: {
      kind: 'AGENT_TEAM',
      definitionId: 'brief-team',
    },
  }

  const session = {
    applicationSessionId: 'app-session-1',
    application: {
      ...application,
    },
    runtime: {
      kind: 'AGENT_TEAM',
      runId: 'team-run-1',
      definitionId: 'brief-team',
    },
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
    createdAt: '2026-04-15T08:00:00.000Z',
    terminatedAt: null,
  }

  const storeState = {
    hostShellPresentation: 'standard' as 'standard' | 'application_immersive',
  }

  const setHostShellPresentation = vi.fn((presentation: 'standard' | 'application_immersive') => {
    storeState.hostShellPresentation = presentation
  })
  const resetHostShellPresentation = vi.fn(() => {
    storeState.hostShellPresentation = 'standard'
  })

  return {
    routeMock: {
      params: { id: 'brief-studio' },
      query: { applicationSessionId: 'app-session-1' } as Record<string, unknown>,
      path: '/applications/brief-studio',
    },
    routerReplaceMock: vi.fn(async () => undefined),
    navigateToMock: vi.fn(async () => undefined),
    applicationStoreMock: {
      fetchApplicationById: vi.fn(async () => undefined),
      getApplicationById: vi.fn(() => application),
    },
    applicationSessionStoreMock: {
      bindApplicationRoute: vi.fn(async () => ({
        applicationId: 'app-1',
        requestedSessionId: 'app-session-1',
        resolvedSessionId: 'app-session-1',
        resolution: 'requested_live',
        session,
      })),
      getSessionById: vi.fn(() => session),
      terminateSession: vi.fn(async () => true),
    },
    applicationPageStoreState: {
      mode: 'application' as 'application' | 'execution',
      selectedMemberRouteKey: 'writer' as string | null,
    },
    appLayoutStoreMock: {
      get hostShellPresentation() {
        return storeState.hostShellPresentation
      },
      setHostShellPresentation,
      resetHostShellPresentation,
    },
    setHostShellPresentationMock: setHostShellPresentation,
    resetHostShellPresentationMock: resetHostShellPresentation,
  }
})

vi.mock('~/stores/applicationStore', () => ({
  useApplicationStore: () => applicationStoreMock,
}))

vi.mock('~/stores/applicationSessionStore', () => ({
  useApplicationSessionStore: () => applicationSessionStoreMock,
}))

vi.mock('~/stores/applicationPageStore', () => ({
  useApplicationPageStore: () => ({
    getMode: () => applicationPageStoreState.mode,
    setMode: (_applicationId: string, mode: 'application' | 'execution') => {
      applicationPageStoreState.mode = mode
    },
    getSelectedMemberRouteKey: () => applicationPageStoreState.selectedMemberRouteKey,
    setSelectedMemberRouteKey: (_applicationId: string, memberRouteKey: string | null) => {
      applicationPageStoreState.selectedMemberRouteKey = memberRouteKey
    },
  }),
}))

vi.mock('~/stores/appLayoutStore', () => ({
  useAppLayoutStore: () => appLayoutStoreMock,
}))

mockNuxtImport('useRoute', () => () => routeMock)
mockNuxtImport('useRouter', () => () => ({ replace: routerReplaceMock }))
mockNuxtImport('navigateTo', () => navigateToMock)

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string>) => ({
      'applications.components.applications.ApplicationShell.backToApplications': 'Back to applications',
      'applications.components.applications.ApplicationShell.loadingApplication': 'Loading application…',
      'applications.components.applications.ApplicationShell.unableToLoadApplication': 'Unable to load application',
      'applications.components.applications.ApplicationShell.applicationNotFound': 'Application not found',
      'applications.components.applications.ApplicationShell.noApplicationExistsForId': `No application exists for id ${params?.id ?? ''}.`,
      'applications.components.applications.ApplicationShell.launchAgain': 'Relaunch',
      'applications.components.applications.ApplicationShell.stopSession': 'Stop current session',
      'applications.components.applications.ApplicationShell.showDetails': 'Details',
      'applications.components.applications.ApplicationShell.hideDetails': 'Hide details',
      'applications.components.applications.ApplicationShell.launchToOpenAppView': 'Launch to open app view.',
      'applications.components.applications.ApplicationShell.singleLiveSessionNotice': 'Only one live session runs per application. Relaunch replaces the current live session.',
      'applications.components.applications.ApplicationShell.tabApplication': 'Application',
      'applications.components.applications.ApplicationShell.tabExecution': 'Execution',
      'applications.components.applications.ApplicationShell.enterImmersive': 'Immersive view',
      'applications.components.applications.ApplicationShell.requestedSessionReattachedNotice': 'Reattached notice',
      'applications.components.applications.ApplicationShell.requestedSessionMissingNotice': 'Missing notice',
      'applications.components.applications.ApplicationShell.applicationIdMissingFromRoute': 'Missing route id',
      'applications.components.applications.ApplicationShell.sessionIdLabel': 'Session id',
      'applications.components.applications.ApplicationShell.runtimeKindLabel': 'Runtime kind',
      'applications.components.applications.ApplicationShell.runIdLabel': 'Run id',
      'applications.components.applications.ApplicationShell.bindingResultLabel': 'Binding result',
      'applications.components.applications.ApplicationImmersiveControls.exitImmersive': 'Show host controls',
      'applications.components.applications.ApplicationImmersiveControls.actions': 'Actions',
      'applications.shared.noDescriptionProvided': 'No description provided.',
      'applications.shared.package': 'Package',
      'applications.shared.localApplicationId': 'Local application id',
      'applications.shared.runtimeTargetId': 'Runtime target id',
      'applications.shared.writableSource': 'Writable source',
      'applications.shared.yes': 'Yes',
      'applications.shared.no': 'No',
      'applications.shared.singleAgent': 'Single agent',
      'applications.shared.agentTeam': 'Agent team',
      'applications.shared.sessionActive': 'Session active',
      'applications.components.applications.ApplicationLaunchConfigModal.launch_application': 'Launch Application',
    } as Record<string, string>)[key] ?? key,
  }),
}))

import ApplicationShell from '../ApplicationShell.vue'

describe('ApplicationShell', () => {
  beforeEach(() => {
    applicationPageStoreState.mode = 'application'
    applicationPageStoreState.selectedMemberRouteKey = 'writer'
    routerReplaceMock.mockClear()
    navigateToMock.mockClear()
    applicationStoreMock.fetchApplicationById.mockClear()
    applicationSessionStoreMock.bindApplicationRoute.mockClear()
    applicationSessionStoreMock.terminateSession.mockClear()
    setHostShellPresentationMock.mockClear()
    resetHostShellPresentationMock.mockClear()
  })

  afterEach(() => {
    routeMock.params.id = 'brief-studio'
    routeMock.query = { applicationSessionId: 'app-session-1' }
    routeMock.path = '/applications/brief-studio'
  })

  it('defaults live application mode to immersive, keeps metadata secondary, and can return to standard host controls', async () => {
    const wrapper = mount(ApplicationShell, {
      global: {
        stubs: {
          ApplicationSurface: {
            props: ['presentation'],
            template: '<div class="surface-stub">Surface {{ presentation }}</div>',
          },
          ApplicationImmersiveControls: {
            emits: ['exit-immersive', 'switch-execution', 'toggle-details', 'relaunch', 'stop-session', 'sheet-open-change'],
            template: `
              <div class="immersive-controls-stub">
                <button class="open-sheet" @click="$emit('sheet-open-change', true)">Open sheet</button>
                <button class="close-sheet" @click="$emit('sheet-open-change', false)">Close sheet</button>
                <button class="toggle-details" @click="$emit('toggle-details')">Toggle details</button>
                <button class="exit-immersive" @click="$emit('exit-immersive')">Exit immersive</button>
                <button class="switch-execution" @click="$emit('switch-execution')">Execution</button>
              </div>
            `,
          },
          ApplicationLiveSessionToolbar: {
            props: ['applicationName', 'pageMode', 'applicationPresentation', 'detailsOpen', 'bindingNotice', 'detailItems'],
            emits: ['back', 'set-mode', 'enter-immersive', 'toggle-details', 'relaunch', 'stop-session'],
            template: `
              <div class="live-toolbar-stub">
                <span>{{ applicationName }}</span>
                <button
                  v-if="pageMode === 'application' && applicationPresentation === 'standard'"
                  data-testid="application-enter-immersive"
                  @click="$emit('enter-immersive')"
                >
                  Enter immersive
                </button>
                <button data-testid="application-details-toggle" @click="$emit('toggle-details')">
                  Toggle details
                </button>
                <div v-if="detailsOpen">
                  <div v-if="bindingNotice">{{ bindingNotice }}</div>
                  <div v-for="item in detailItems" :key="item.label">{{ item.value }}</div>
                </div>
              </div>
            `,
          },
          ApplicationLaunchConfigModal: true,
          ApplicationExecutionWorkspace: true,
        },
      },
    })

    await flushPromises()

    expect(setHostShellPresentationMock).toHaveBeenLastCalledWith('application_immersive')
    expect(wrapper.text()).toContain('Surface immersive')
    expect(wrapper.text()).not.toContain('application-local:/packages/brief-studio')
    expect(wrapper.text()).not.toContain('team-run-1')
    expect(wrapper.get('[data-testid="application-immersive-surface-container"]').classes()).not.toContain('lg:pr-80')

    await wrapper.get('.open-sheet').trigger('click')
    expect(wrapper.get('[data-testid="application-immersive-surface-container"]').classes()).toContain('lg:pr-80')

    await wrapper.get('.toggle-details').trigger('click')
    expect(wrapper.text()).toContain('application-local:/packages/brief-studio')
    expect(wrapper.text()).toContain('team-run-1')

    await wrapper.get('.close-sheet').trigger('click')
    expect(wrapper.get('[data-testid="application-immersive-surface-container"]').classes()).not.toContain('lg:pr-80')

    await wrapper.get('.exit-immersive').trigger('click')
    await flushPromises()

    expect(setHostShellPresentationMock).toHaveBeenLastCalledWith('standard')
    expect(wrapper.text()).toContain('Surface standard')
    expect(wrapper.find('[data-testid="application-enter-immersive"]').exists()).toBe(true)

    await wrapper.get('[data-testid="application-enter-immersive"]').trigger('click')
    await flushPromises()

    expect(setHostShellPresentationMock).toHaveBeenLastCalledWith('application_immersive')
    expect(wrapper.text()).toContain('Surface immersive')
  })

  it('keeps execution mode host-native and opens the full execution monitor through the workspace route boundary', async () => {
    applicationPageStoreState.mode = 'execution'

    const wrapper = mount(ApplicationShell, {
      global: {
        stubs: {
          ApplicationSurface: true,
          ApplicationImmersiveControls: true,
          ApplicationLiveSessionToolbar: {
            props: ['applicationName', 'detailsOpen', 'detailItems'],
            emits: ['back', 'set-mode', 'enter-immersive', 'toggle-details', 'relaunch', 'stop-session'],
            template: `
              <div class="live-toolbar-stub">
                <span>{{ applicationName }}</span>
                <button data-testid="application-details-toggle" @click="$emit('toggle-details')">
                  Toggle details
                </button>
                <div v-if="detailsOpen">
                  <div v-for="item in detailItems" :key="item.label">{{ item.value }}</div>
                </div>
              </div>
            `,
          },
          ApplicationLaunchConfigModal: true,
          ApplicationExecutionWorkspace: {
            emits: ['openFullExecutionMonitor', 'update:selectedMemberRouteKey'],
            template: '<button class="exec-monitor-trigger" @click="$emit(\'openFullExecutionMonitor\')">Open execution</button>',
          },
        },
      },
    })

    await flushPromises()

    expect(setHostShellPresentationMock).toHaveBeenLastCalledWith('standard')
    expect(wrapper.text()).toContain('Brief Studio')
    expect(wrapper.text()).not.toContain('application-local:/packages/brief-studio')

    await wrapper.get('[data-testid="application-details-toggle"]').trigger('click')
    expect(wrapper.text()).toContain('application-local:/packages/brief-studio')
    expect(wrapper.text()).toContain('team-run-1')

    await wrapper.get('.exec-monitor-trigger').trigger('click')
    expect(navigateToMock).toHaveBeenCalledWith({
      path: '/workspace',
      query: {
        workspaceExecutionKind: 'team',
        workspaceExecutionRunId: 'team-run-1',
        workspaceExecutionMemberRouteKey: 'writer',
      },
    })
  })
})
