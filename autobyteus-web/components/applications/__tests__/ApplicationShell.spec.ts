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
    application,
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
      mode: 'execution' as 'application' | 'execution',
      selectedMemberRouteKey: 'writer' as string | null,
    },
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
      'applications.components.applications.ApplicationShell.requestedSessionReattachedNotice': 'Reattached notice',
      'applications.components.applications.ApplicationShell.requestedSessionMissingNotice': 'Missing notice',
      'applications.components.applications.ApplicationShell.applicationIdMissingFromRoute': 'Missing route id',
      'applications.components.applications.ApplicationShell.sessionIdLabel': 'Session id',
      'applications.components.applications.ApplicationShell.runtimeKindLabel': 'Runtime kind',
      'applications.components.applications.ApplicationShell.runIdLabel': 'Run id',
      'applications.components.applications.ApplicationShell.bindingResultLabel': 'Binding result',
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
    applicationPageStoreState.mode = 'execution'
    applicationPageStoreState.selectedMemberRouteKey = 'writer'
    routerReplaceMock.mockClear()
    navigateToMock.mockClear()
    applicationStoreMock.fetchApplicationById.mockClear()
    applicationSessionStoreMock.bindApplicationRoute.mockClear()
    applicationSessionStoreMock.terminateSession.mockClear()
  })

  afterEach(() => {
    routeMock.params.id = 'brief-studio'
    routeMock.query = { applicationSessionId: 'app-session-1' }
    routeMock.path = '/applications/brief-studio'
  })

  it('keeps metadata hidden by default for a live session and opens the full execution monitor through the workspace route boundary', async () => {
    const wrapper = mount(ApplicationShell, {
      global: {
        stubs: {
          ApplicationSurface: {
            template: '<div class="surface-stub">Surface</div>',
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

    expect(wrapper.text()).toContain('Brief Studio')
    expect(wrapper.text()).not.toContain('application-local:/packages/brief-studio')
    expect(wrapper.text()).not.toContain('team-run-1')

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
