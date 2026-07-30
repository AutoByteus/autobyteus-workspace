import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import ApplicationLaunchSetupPanel from '../ApplicationLaunchSetupPanel.vue'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'applications.components.applications.ApplicationLaunchSetupPanel.title': 'Launch setup',
        'applications.components.applications.ApplicationLaunchSetupPanel.heading': 'Saved resource and launch defaults',
        'applications.components.applications.ApplicationLaunchSetupPanel.description': 'Setup description',
        'applications.components.applications.ApplicationLaunchSetupPanel.refresh': 'Refresh setup',
        'applications.components.applications.ApplicationLaunchSetupPanel.refreshing': 'Refreshing setup…',
        'applications.components.applications.ApplicationLaunchSetupPanel.loading': 'Loading saved application setup…',
        'applications.components.applications.ApplicationLaunchSetupPanel.unableToLoad': 'Unable to load application setup',
        'applications.components.applications.ApplicationLaunchSetupPanel.noSlotsTitle': 'No slots',
        'applications.components.applications.ApplicationLaunchSetupPanel.noSlotsDescription': 'No slot description',
        'applications.components.applications.ApplicationLaunchSetupPanel.requiredSlot': 'Required',
        'applications.components.applications.ApplicationLaunchSetupPanel.optionalSlot': 'Optional',
        'applications.components.applications.ApplicationLaunchSetupPanel.currentSelection': 'Current selection',
        'applications.components.applications.ApplicationLaunchSetupPanel.save': 'Save setup',
        'applications.components.applications.ApplicationLaunchSetupPanel.saving': 'Saving setup…',
        'applications.components.applications.ApplicationLaunchSetupPanel.cancelChanges': 'Cancel changes',
        'applications.components.applications.ApplicationLaunchSetupPanel.resetToPackageDefaults': 'Reset to package defaults',
        'applications.components.applications.ApplicationLaunchSetupPanel.saved': 'Setup saved.',
        'applications.components.applications.ApplicationLaunchSetupPanel.packageDefaultsRestored': 'Package defaults restored.',
        'applications.components.applications.ApplicationLaunchSetupPanel.waitingForLoadBeforeEntry': 'Loading setup before entry',
        'applications.components.applications.ApplicationLaunchSetupPanel.savingBeforeEntry': 'Saving setup before entry',
        'applications.components.applications.ApplicationLaunchSetupPanel.saveOrResetChangesBeforeEntry': 'Save or reset changes before entry',
        'applications.components.applications.ApplicationLaunchSetupPanel.bundleResource': 'Bundled',
        'applications.components.applications.ApplicationLaunchSetupPanel.sharedResource': 'Shared',
        'applications.components.applications.ApplicationLaunchSetupPanel.notConfigured': 'Not configured',
        'applications.components.applications.ApplicationLaunchSetupPanel.notSavedYet': 'Using manifest defaults only',
        'applications.components.applications.ApplicationLaunchSetupPanel.applicationIdMissing': 'Application id is required.',
        'applications.shared.agentTeam': 'Agent team',
        'applications.shared.singleAgent': 'Single agent',
      }
      if (key === 'applications.components.applications.ApplicationLaunchSetupPanel.useManifestDefault') {
        return `Use manifest default · ${params?.resource}`
      }
      if (key === 'applications.components.applications.ApplicationLaunchSetupPanel.usingManifestDefault') {
        return `Using manifest default · ${params?.resource}`
      }
      if (key === 'applications.components.applications.ApplicationLaunchSetupPanel.lastUpdated') {
        return `Saved ${params?.value}`
      }
      return translations[key] ?? key
    },
  }),
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    getBoundEndpoints: () => ({
      rest: 'http://127.0.0.1:43123/rest',
    }),
  }),
}))

const ApplicationExecutionResourceSlotEditorStub = defineComponent({
  name: 'ApplicationExecutionResourceSlotEditor',
  emits: ['update:selection', 'update:launchProfile', 'readiness-change'],
  setup(_props, { emit }) {
    return () => h('div', { 'data-testid': 'application-resource-slot-editor' }, [
      h('button', {
        type: 'button',
        'data-testid': 'select-shared-team',
        onClick: () => emit('update:selection', 'shared:AGENT_TEAM:shared-writing-team'),
      }, 'select-shared-team'),
      h('button', {
        type: 'button',
        'data-testid': 'set-sparse-team-override',
        onClick: () => emit('update:launchProfile', {
          kind: 'AGENT_TEAM',
          defaults: {
            runtimeKind: '',
            llmModelIdentifier: '',
            workspaceRootPath: '',
          },
          memberProfiles: [
            {
              memberRouteKey: 'researcher',
              memberName: 'researcher',
              agentDefinitionId: 'shared-researcher',
              runtimeKind: '',
              llmModelIdentifier: '',
            },
            {
              memberRouteKey: 'writer',
              memberName: 'writer',
              agentDefinitionId: 'shared-writer',
              runtimeKind: '',
              llmModelIdentifier: 'host-writer-model',
            },
          ],
        }),
      }, 'set-sparse-team-override'),
      h('button', {
        type: 'button',
        'data-testid': 'mark-ready',
        onClick: () => emit('readiness-change', {
          isReady: true,
          blockingReason: null,
          hasEffectiveResource: true,
        }),
      }, 'mark-ready'),
    ])
  },
})

const okJson = (payload: unknown) => ({
  ok: true,
  json: vi.fn(async () => payload),
}) as unknown as Response

const packageRef = {
  source: 'bundle',
  kind: 'AGENT_TEAM',
  localId: 'brief-studio-team',
} as const
const alternateRef = {
  source: 'shared',
  kind: 'AGENT_TEAM',
  definitionId: 'shared-writing-team',
} as const

const slot = {
  slotKey: 'draftingTeam',
  name: 'Drafting team',
  description: 'Used for brief drafting runs.',
  allowedExecutionResourceKinds: ['AGENT_TEAM'],
  allowedExecutionResourceSources: ['bundle', 'shared'],
  required: true,
  supportedLaunchConfig: {
    AGENT_TEAM: {
      runtimeKind: true,
      llmModelIdentifier: true,
      workspaceRootPath: true,
      memberOverrides: {
        runtimeKind: true,
        llmModelIdentifier: true,
      },
    },
  },
  defaultExecutionResourceRef: packageRef,
}

const baseline = (
  executionResourceRef: typeof packageRef | typeof alternateRef,
  source: 'PACKAGE' | 'SELECTED_RESOURCE',
) => ({
  slotKey: slot.slotKey,
  executionResourceRef,
  resourceDefinitionId: executionResourceRef.source === 'bundle'
    ? 'bundle-team'
    : executionResourceRef.definitionId,
  resourceKind: 'AGENT_TEAM',
  leaves: [
    {
      memberRouteKey: 'researcher',
      memberName: 'researcher',
      agentDefinitionId: executionResourceRef.source === 'bundle' ? 'bundle-researcher' : 'shared-researcher',
      runtimeKind: 'codex_app_server',
      llmModelIdentifier: 'gpt-5.6-luna',
      llmConfig: null,
      provenance: {
        runtimeKind: {
          kind: source === 'PACKAGE' ? 'PACKAGE_AGENT_DEFAULT' : 'SELECTED_RESOURCE_AGENT_DEFAULT',
          agentDefinitionId: executionResourceRef.source === 'bundle' ? 'bundle-researcher' : 'shared-researcher',
        },
        llmModelIdentifier: {
          kind: source === 'PACKAGE' ? 'PACKAGE_AGENT_DEFAULT' : 'SELECTED_RESOURCE_AGENT_DEFAULT',
          agentDefinitionId: executionResourceRef.source === 'bundle' ? 'bundle-researcher' : 'shared-researcher',
        },
        llmConfig: null,
      },
    },
    {
      memberRouteKey: 'writer',
      memberName: 'writer',
      agentDefinitionId: executionResourceRef.source === 'bundle' ? 'bundle-writer' : 'shared-writer',
      runtimeKind: executionResourceRef.source === 'bundle' ? 'codex_app_server' : 'claude_agent_sdk',
      llmModelIdentifier: executionResourceRef.source === 'bundle' ? 'gpt-5.6-luna' : 'claude-sonnet',
      llmConfig: null,
      provenance: {
        runtimeKind: {
          kind: source === 'PACKAGE' ? 'PACKAGE_AGENT_DEFAULT' : 'SELECTED_RESOURCE_AGENT_DEFAULT',
          agentDefinitionId: executionResourceRef.source === 'bundle' ? 'bundle-writer' : 'shared-writer',
        },
        llmModelIdentifier: {
          kind: source === 'PACKAGE' ? 'PACKAGE_AGENT_DEFAULT' : 'SELECTED_RESOURCE_AGENT_DEFAULT',
          agentDefinitionId: executionResourceRef.source === 'bundle' ? 'bundle-writer' : 'shared-writer',
        },
        llmConfig: null,
      },
    },
  ],
})

const effective = (selectedBaseline: ReturnType<typeof baseline>) => ({
  ...selectedBaseline,
  leaves: selectedBaseline.leaves.map((leaf) => ({
    ...leaf,
    runtimeKind: leaf.runtimeKind!,
    llmModelIdentifier: leaf.llmModelIdentifier!,
    workspaceRootPath: '/runtime/brief-app',
    provenance: {
      ...leaf.provenance,
      workspaceRootPath: 'APPLICATION_RUNTIME',
    },
  })),
})

const packageView = {
  applicationId: 'brief-app',
  slots: [{
    slot,
    packageBaseline: baseline(packageRef, 'PACKAGE'),
    selectedResourceBaseline: baseline(packageRef, 'PACKAGE'),
    savedOverride: null,
    savedOverrideState: 'ABSENT',
    effectiveConfiguration: effective(baseline(packageRef, 'PACKAGE')),
    issues: [],
    canResetToPackageDefaults: false,
    updatedAt: null,
  }],
  readiness: { status: 'RUNNABLE', issues: [] },
}

const savedLaunchOverride = {
  kind: 'AGENT_TEAM',
  defaults: null,
  memberProfiles: [
    {
      memberRouteKey: 'researcher',
      memberName: 'researcher',
      agentDefinitionId: 'shared-researcher',
    },
    {
      memberRouteKey: 'writer',
      memberName: 'writer',
      agentDefinitionId: 'shared-writer',
      llmModelIdentifier: 'host-writer-model',
    },
  ],
}

const savedView = {
  applicationId: 'brief-app',
  slots: [{
    slot,
    packageBaseline: baseline(packageRef, 'PACKAGE'),
    selectedResourceBaseline: baseline(alternateRef, 'SELECTED_RESOURCE'),
    savedOverride: {
      slotKey: slot.slotKey,
      executionResourceRef: alternateRef,
      launchOverride: savedLaunchOverride,
    },
    savedOverrideState: 'VALID',
    effectiveConfiguration: effective(baseline(alternateRef, 'SELECTED_RESOURCE')),
    issues: [],
    canResetToPackageDefaults: true,
    updatedAt: '2026-07-29T12:00:00.000Z',
  }],
  readiness: { status: 'RUNNABLE', issues: [] },
}

const resources = [
  {
    source: 'bundle',
    kind: 'AGENT_TEAM',
    localId: packageRef.localId,
    definitionId: 'bundle-team',
    name: 'Bundled Brief Team',
    applicationId: 'brief-app',
  },
  {
    source: 'shared',
    kind: 'AGENT_TEAM',
    localId: null,
    definitionId: alternateRef.definitionId,
    name: 'Shared Writing Team',
    applicationId: null,
  },
]

describe('ApplicationLaunchSetupPanel', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('previews an alternate selection and saves only the sparse current launch override', async () => {
    fetchMock
      .mockResolvedValueOnce(okJson(packageView))
      .mockResolvedValueOnce(okJson(resources))
      .mockResolvedValueOnce(okJson({
        status: 'RESOLVED',
        applicationId: 'brief-app',
        slotKey: slot.slotKey,
        executionResourceRef: alternateRef,
        selectedResourceBaseline: baseline(alternateRef, 'SELECTED_RESOURCE'),
        issues: [],
      }))
      .mockResolvedValueOnce(okJson(savedView))

    const wrapper = mount(ApplicationLaunchSetupPanel, {
      props: { applicationId: 'brief-app', presentation: 'panel' },
      global: {
        stubs: {
          ApplicationExecutionResourceSlotEditor: ApplicationExecutionResourceSlotEditorStub,
        },
      },
    })
    await flushPromises()

    expect(wrapper.emitted('setup-state-change')?.at(-1)?.[0]).toMatchObject({
      phase: 'ready',
      isLaunchReady: true,
    })
    await wrapper.get('[data-testid="select-shared-team"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('setup-state-change')?.at(-1)?.[0]).toMatchObject({
      phase: 'ready',
      isLaunchReady: false,
    })
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      'http://127.0.0.1:43123/rest/applications/brief-app/execution-resource-configurations/draftingTeam/selection-preview',
    )
    expect(JSON.parse(String((fetchMock.mock.calls[2]?.[1] as RequestInit).body))).toEqual({
      executionResourceRef: alternateRef,
    })

    await wrapper.get('[data-testid="set-sparse-team-override"]').trigger('click')
    await wrapper.get('[data-testid="mark-ready"]').trigger('click')
    await wrapper.get('[data-testid="application-launch-setup-save-draftingTeam"]').trigger('click')
    await flushPromises()

    const [saveUrl, saveInit] = fetchMock.mock.calls[3] as [string, RequestInit]
    expect(saveUrl).toBe(
      'http://127.0.0.1:43123/rest/applications/brief-app/execution-resource-configurations/draftingTeam',
    )
    expect(saveInit.method).toBe('PUT')
    expect(JSON.parse(String(saveInit.body))).toEqual({
      executionResourceRef: alternateRef,
      launchOverride: savedLaunchOverride,
    })
    expect(wrapper.text()).toContain('Setup saved.')
    expect(wrapper.emitted('setup-state-change')?.at(-1)?.[0]).toMatchObject({
      phase: 'ready',
      isLaunchReady: true,
    })
  })

  it('uses DELETE for explicit Reset and restores the package-selected view', async () => {
    fetchMock
      .mockResolvedValueOnce(okJson(savedView))
      .mockResolvedValueOnce(okJson(resources))
      .mockResolvedValueOnce(okJson(packageView))

    const wrapper = mount(ApplicationLaunchSetupPanel, {
      props: { applicationId: 'brief-app' },
      global: {
        stubs: {
          ApplicationExecutionResourceSlotEditor: ApplicationExecutionResourceSlotEditorStub,
        },
      },
    })
    await flushPromises()

    await wrapper.get('[data-testid="application-launch-setup-package-reset-draftingTeam"]').trigger('click')
    await flushPromises()

    const [resetUrl, resetInit] = fetchMock.mock.calls[2] as [string, RequestInit]
    expect(resetUrl).toBe(
      'http://127.0.0.1:43123/rest/applications/brief-app/execution-resource-configurations/draftingTeam',
    )
    expect(resetInit.method).toBe('DELETE')
    expect(wrapper.text()).toContain('Package defaults restored.')
    expect(wrapper.find('[data-testid="application-launch-setup-package-reset-draftingTeam"]').exists()).toBe(false)
  })
})
