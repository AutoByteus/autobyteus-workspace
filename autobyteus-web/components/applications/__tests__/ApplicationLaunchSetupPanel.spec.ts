import { describe, expect, it, beforeEach, vi } from 'vitest'
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
        'applications.components.applications.ApplicationLaunchSetupPanel.resourceLabel': 'Runtime resource',
        'applications.components.applications.ApplicationLaunchSetupPanel.noResourceSelected': 'No resource selected',
        'applications.components.applications.ApplicationLaunchSetupPanel.toolExecutionLabel': 'Tool execution',
        'applications.components.applications.ApplicationLaunchSetupPanel.toolExecutionDescription': 'Auto execute tools is always on.',
        'applications.components.applications.ApplicationLaunchSetupPanel.useApplicationDefaultRuntime': 'Use application default runtime',
        'applications.components.applications.ApplicationLaunchSetupPanel.runtimeLabel': 'Default runtime',
        'applications.components.applications.ApplicationLaunchSetupPanel.modelLabel': 'Default model',
        'applications.components.applications.ApplicationLaunchSetupPanel.runtimeHelp': 'Runtime help',
        'applications.components.applications.ApplicationLaunchSetupPanel.selectResourceFirst': 'Select resource first',
        'applications.components.applications.ApplicationLaunchSetupPanel.modelHelp': 'Model help',
        'applications.components.applications.ApplicationLaunchSetupPanel.modelPlaceholder': 'Select model',
        'applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathLabel': 'Workspace root',
        'applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathPlaceholder': '/workspace',
        'applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathHelp': 'Workspace help',
        'applications.components.applications.ApplicationLaunchSetupPanel.waitingForLoadBeforeEntry': 'Loading setup before entry',
        'applications.components.applications.ApplicationLaunchSetupPanel.savingBeforeEntry': 'Saving setup before entry',
        'applications.components.applications.ApplicationLaunchSetupPanel.saveOrResetChangesBeforeEntry': 'Save or reset changes before entry',
        'applications.components.applications.ApplicationLaunchSetupPanel.requiredResourceBeforeEntry': `Save required resource for ${params?.slot}`,
        'applications.components.applications.ApplicationLaunchSetupPanel.requiredModelBeforeEntry': `Save required model for ${params?.slot}`,
        'applications.components.applications.ApplicationLaunchSetupPanel.noAdditionalDefaults': 'No additional defaults',
        'applications.components.applications.ApplicationLaunchSetupPanel.save': 'Save setup',
        'applications.components.applications.ApplicationLaunchSetupPanel.saving': 'Saving setup…',
        'applications.components.applications.ApplicationLaunchSetupPanel.reset': 'Reset changes',
        'applications.components.applications.ApplicationLaunchSetupPanel.saved': 'Setup saved.',
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

const RuntimeModelConfigFieldsStub = defineComponent({
  name: 'RuntimeModelConfigFields',
  props: {
    runtimeKind: {
      type: String,
      default: '',
    },
    llmModelIdentifier: {
      type: String,
      default: '',
    },
  },
  emits: ['update:runtime-kind', 'update:llm-model-identifier', 'update:llm-config'],
  setup(_props, { emit }) {
    return () => h('div', { 'data-testid': 'runtime-fields' }, [
      h('button', {
        type: 'button',
        onClick: () => emit('update:runtime-kind', 'lmstudio'),
      }, 'set-runtime'),
      h('button', {
        type: 'button',
        onClick: () => emit('update:llm-model-identifier', 'qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234'),
      }, 'set-model'),
    ])
  },
})

const okJson = (payload: unknown) => ({
  ok: true,
  json: vi.fn(async () => payload),
}) as unknown as Response

const errorJson = (payload: unknown) => ({
  ok: false,
  json: vi.fn(async () => payload),
}) as unknown as Response

describe('ApplicationLaunchSetupPanel', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('loads host-managed setup and saves resource/model defaults without starting a run', async () => {
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
            supportedLaunchDefaults: {
              runtimeKind: true,
              llmModelIdentifier: true,
              workspaceRootPath: true,
            },
            defaultResourceRef: {
              owner: 'bundle',
              kind: 'AGENT_TEAM',
              localId: 'brief-studio-team',
            },
          },
          configuration: {
            slotKey: 'draftingTeam',
            resourceRef: {
              owner: 'bundle',
              kind: 'AGENT_TEAM',
              localId: 'brief-studio-team',
            },
            launchDefaults: null,
          },
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
            supportedLaunchDefaults: {
              runtimeKind: true,
              llmModelIdentifier: true,
              workspaceRootPath: true,
            },
            defaultResourceRef: {
              owner: 'bundle',
              kind: 'AGENT_TEAM',
            localId: 'brief-studio-team',
          },
        },
        configuration: {
          slotKey: 'draftingTeam',
          resourceRef: {
            owner: 'shared',
            kind: 'AGENT_TEAM',
            definitionId: 'shared-writing-team',
          },
          launchDefaults: {
            runtimeKind: 'lmstudio',
            llmModelIdentifier: 'qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234',
            workspaceRootPath: '/tmp/brief-studio',
            autoExecuteTools: true,
          },
        },
        updatedAt: '2026-04-20T18:45:00.000Z',
      }))

    const wrapper = mount(ApplicationLaunchSetupPanel, {
      props: {
        applicationId: 'bundle-app__pkg__brief-studio',
      },
      global: {
        stubs: {
          RuntimeModelConfigFields: RuntimeModelConfigFieldsStub,
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
    expect(wrapper.get('[data-testid="application-launch-setup-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Tool execution')
    expect(wrapper.emitted('setup-state-change')?.at(-1)?.[0]).toMatchObject({
      phase: 'ready',
      isLaunchReady: false,
    })

    await wrapper.get('select').setValue('shared:AGENT_TEAM:shared-writing-team')
    await wrapper.get('[data-testid="runtime-fields"] button:nth-child(1)').trigger('click')
    await wrapper.get('[data-testid="runtime-fields"] button:nth-child(2)').trigger('click')
    await wrapper.get('input[type="text"]').setValue('/tmp/brief-studio')
    await wrapper.get('button.bg-blue-600').trigger('click')
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
      launchDefaults: {
        runtimeKind: 'lmstudio',
        llmModelIdentifier: 'qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234',
        workspaceRootPath: '/tmp/brief-studio',
        autoExecuteTools: true,
      },
    })
    expect(wrapper.text()).toContain('Setup saved.')
    expect(wrapper.emitted('setup-state-change')?.at(-1)?.[0]).toMatchObject({
      phase: 'ready',
      isLaunchReady: true,
      blockingReason: null,
    })
  })

  it('emits an error gate state when the setup surface fails to load', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(errorJson({
      detail: 'Unable to load application setup',
    })))

    const wrapper = mount(ApplicationLaunchSetupPanel, {
      props: {
        applicationId: 'bundle-app__pkg__brief-studio',
      },
      global: {
        stubs: {
          RuntimeModelConfigFields: RuntimeModelConfigFieldsStub,
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load application setup')
    expect(wrapper.emitted('setup-state-change')?.at(-1)?.[0]).toMatchObject({
      phase: 'error',
      isLaunchReady: false,
      blockingReason: 'Unable to load application setup',
    })
  })
})
