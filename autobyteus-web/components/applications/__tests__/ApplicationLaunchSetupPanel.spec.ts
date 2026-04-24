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
        'applications.components.applications.ApplicationLaunchSetupPanel.reset': 'Reset changes',
        'applications.components.applications.ApplicationLaunchSetupPanel.saved': 'Setup saved.',
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

const ApplicationResourceSlotEditorStub = defineComponent({
  name: 'ApplicationResourceSlotEditor',
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
        'data-testid': 'set-team-launch-profile',
        onClick: () => emit('update:launchProfile', {
          kind: 'AGENT_TEAM',
          defaults: {
            runtimeKind: 'lmstudio',
            llmModelIdentifier: 'qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234',
            workspaceRootPath: '/tmp/brief-studio',
          },
          memberProfiles: [
            {
              memberRouteKey: 'researcher',
              memberName: 'researcher',
              agentDefinitionId: 'bundle-agent__researcher',
              runtimeKind: '',
              llmModelIdentifier: '',
            },
            {
              memberRouteKey: 'writer',
              memberName: 'writer',
              agentDefinitionId: 'bundle-agent__writer',
              runtimeKind: 'lmstudio',
              llmModelIdentifier: 'qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234',
            },
          ],
        }),
      }, 'set-team-launch-profile'),
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

describe('ApplicationLaunchSetupPanel', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('loads host-managed setup and saves launchProfile payloads without starting a run', async () => {
    fetchMock
      .mockResolvedValueOnce(okJson([
        {
          slot: {
            slotKey: 'draftingTeam',
            name: 'Drafting team',
            description: 'Used for brief drafting runs.',
            allowedResourceKinds: ['AGENT_TEAM'],
            allowedResourceOwners: ['bundle', 'shared'],
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
            defaultResourceRef: {
              owner: 'bundle',
              kind: 'AGENT_TEAM',
              localId: 'brief-studio-team',
            },
          },
          status: 'READY',
          configuration: {
            slotKey: 'draftingTeam',
            resourceRef: {
              owner: 'bundle',
              kind: 'AGENT_TEAM',
              localId: 'brief-studio-team',
            },
            launchProfile: null,
          },
          invalidSavedConfiguration: null,
          issue: null,
          updatedAt: null,
        },
      ]))
      .mockResolvedValueOnce(okJson([
        {
          owner: 'bundle',
          kind: 'AGENT_TEAM',
          localId: 'brief-studio-team',
          definitionId: 'brief-studio-team',
          name: 'Bundled Brief Team',
          applicationId: 'bundle-app__pkg__brief-studio',
        },
        {
          owner: 'shared',
          kind: 'AGENT_TEAM',
          localId: null,
          definitionId: 'shared-writing-team',
          name: 'Shared Writing Team',
          applicationId: null,
        },
      ]))
      .mockResolvedValueOnce(okJson({
        slot: {
          slotKey: 'draftingTeam',
          name: 'Drafting team',
          description: 'Used for brief drafting runs.',
          allowedResourceKinds: ['AGENT_TEAM'],
          allowedResourceOwners: ['bundle', 'shared'],
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
          defaultResourceRef: {
            owner: 'bundle',
            kind: 'AGENT_TEAM',
            localId: 'brief-studio-team',
          },
        },
        status: 'READY',
        configuration: {
          slotKey: 'draftingTeam',
          resourceRef: {
            owner: 'shared',
            kind: 'AGENT_TEAM',
            definitionId: 'shared-writing-team',
          },
          launchProfile: {
            kind: 'AGENT_TEAM',
            defaults: {
              runtimeKind: 'lmstudio',
              llmModelIdentifier: 'qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234',
              workspaceRootPath: '/tmp/brief-studio',
            },
            memberProfiles: [
              {
                memberRouteKey: 'researcher',
                memberName: 'researcher',
                agentDefinitionId: 'bundle-agent__researcher',
              },
              {
                memberRouteKey: 'writer',
                memberName: 'writer',
                agentDefinitionId: 'bundle-agent__writer',
                runtimeKind: 'lmstudio',
                llmModelIdentifier: 'qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234',
              },
            ],
          },
        },
        invalidSavedConfiguration: null,
        issue: null,
        updatedAt: '2026-04-20T18:45:00.000Z',
      }))

    const wrapper = mount(ApplicationLaunchSetupPanel, {
      props: {
        applicationId: 'bundle-app__pkg__brief-studio',
        presentation: 'panel',
      },
      global: {
        stubs: {
          ApplicationResourceSlotEditor: ApplicationResourceSlotEditorStub,
        },
      },
    })

    await flushPromises()

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://127.0.0.1:43123/rest/applications/bundle-app__pkg__brief-studio/resource-configurations',
    )
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://127.0.0.1:43123/rest/applications/bundle-app__pkg__brief-studio/available-resources',
    )
    expect(wrapper.get('[data-testid="application-launch-setup-panel"]').attributes('data-presentation')).toBe('panel')
    expect(wrapper.emitted('setup-state-change')?.at(-1)?.[0]).toMatchObject({
      phase: 'ready',
      isLaunchReady: false,
    })

    await wrapper.get('[data-testid="select-shared-team"]').trigger('click')
    await wrapper.get('[data-testid="set-team-launch-profile"]').trigger('click')
    await wrapper.get('[data-testid="mark-ready"]').trigger('click')
    await flushPromises()

    const saveButton = wrapper.get('[data-testid="application-launch-setup-save-draftingTeam"]')
    expect(saveButton.attributes('disabled')).toBeUndefined()

    await saveButton.trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [, saveInit] = fetchMock.mock.calls[2] as [string, RequestInit]
    expect(saveInit.method).toBe('PUT')
    expect(JSON.parse(String(saveInit.body))).toEqual({
      resourceRef: {
        owner: 'shared',
        kind: 'AGENT_TEAM',
        definitionId: 'shared-writing-team',
      },
      launchProfile: {
        kind: 'AGENT_TEAM',
        defaults: {
          runtimeKind: 'lmstudio',
          llmModelIdentifier: 'qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234',
          workspaceRootPath: '/tmp/brief-studio',
        },
        memberProfiles: [
          {
            memberRouteKey: 'researcher',
            memberName: 'researcher',
            agentDefinitionId: 'bundle-agent__researcher',
          },
          {
            memberRouteKey: 'writer',
            memberName: 'writer',
            agentDefinitionId: 'bundle-agent__writer',
            runtimeKind: 'lmstudio',
            llmModelIdentifier: 'qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234',
          },
        ],
      },
    })

    expect(wrapper.text()).toContain('Setup saved.')
    expect(wrapper.emitted('setup-state-change')?.at(-1)?.[0]).toMatchObject({
      phase: 'ready',
      isLaunchReady: true,
      blockingReason: null,
    })
  })
})
