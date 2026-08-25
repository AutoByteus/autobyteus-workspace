import { computed, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type {
  ApplicationExecutionResourceSlotDeclaration,
  ApplicationResolvedLaunchBaselineLeaf,
} from '@autobyteus/application-sdk-contracts'
import ApplicationAgentLaunchProfileEditor from '../ApplicationAgentLaunchProfileEditor.vue'

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, values?: Record<string, string>) => {
      if (key.endsWith('unavailableModelBeforeEntry')) {
        return `Saved model ${values?.model} is unavailable.`
      }
      if (key.endsWith('requiredModelBeforeEntry')) return 'A model is required.'
      return key
    },
  }),
}))

vi.mock('~/components/agentTeams/SearchableGroupedSelect.vue', () => ({
  default: defineComponent({
    name: 'SearchableGroupedSelect',
    props: ['modelValue', 'options', 'disabled', 'placeholder', 'searchPlaceholder'],
    emits: ['update:modelValue'],
    template: '<div class="model-selector">{{ modelValue }}</div>',
  }),
}))

vi.mock('~/components/applications/setup/ApplicationWorkspaceRootSelector.vue', () => ({
  default: defineComponent({
    name: 'ApplicationWorkspaceRootSelector',
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue'],
    template: '<div />',
  }),
}))

vi.mock('~/composables/useRuntimeScopedModelSelection', () => ({
  normalizeScopedRuntimeKind: (value: string) => value,
  useRuntimeScopedModelSelection: () => ({
    availableProviderGroups: computed(() => ([{ provider: { name: 'OpenAI' }, models: [] }])),
    effectiveRuntimeKind: computed(() => 'codex_app_server'),
    groupedModelOptions: computed(() => []),
    hasModelIdentifier: (value: string) => value === 'gpt-5.6-luna',
    normalizedStoredRuntimeKind: computed(() => ''),
    runtimeOptions: computed(() => []),
    selectedRuntimeUnavailableReason: computed(() => null),
  }),
}))

const slot: ApplicationExecutionResourceSlotDeclaration = {
  slotKey: 'primaryAgent',
  name: 'Primary Agent',
  allowedExecutionResourceKinds: ['AGENT'],
  supportedLaunchConfig: {
    AGENT: {
      runtimeKind: true,
      llmModelIdentifier: true,
      workspaceRootPath: true,
    },
  },
}

const inheritedProfile = (
  llmModelIdentifier: string,
): ApplicationResolvedLaunchBaselineLeaf => ({
  memberAddress: null,
  displayName: 'Primary Agent',
  agentDefinitionId: 'primary-agent',
  runtimeKind: 'codex_app_server',
  llmModelIdentifier,
  llmConfig: null,
  provenance: {
    runtimeKind: null,
    llmModelIdentifier: null,
    llmConfig: null,
  },
})

const draft = (llmModelIdentifier: string) => ({
  kind: 'AGENT' as const,
  runtimeKind: '',
  llmModelIdentifier,
  workspaceRootPath: '/tmp/workspace',
})

describe('ApplicationAgentLaunchProfileEditor', () => {
  it('retains an unavailable explicit selector, warns, and blocks entry', () => {
    const staleIdentifier = 'openai-compatible:provider_alibaba_cloud:deepseek-v4'
    const wrapper = mount(ApplicationAgentLaunchProfileEditor, {
      props: {
        slot,
        draft: draft(staleIdentifier),
        inheritedProfile: inheritedProfile('gpt-5.6-luna'),
      },
    })

    expect(wrapper.text()).toContain(staleIdentifier)
    expect(wrapper.text().toLowerCase()).toContain('unavailable')
    expect(wrapper.emitted('update:draft')).toBeUndefined()
    expect(wrapper.emitted('readiness-change')?.at(-1)?.[0]).toMatchObject({
      isReady: false,
      blockingReason: expect.stringMatching(/unavailable/i),
      hasEffectiveResource: true,
    })
  })

  it('keeps a blank sparse override while blocking an unavailable inherited model', () => {
    const inheritedIdentifier = 'codex:removed-model'
    const wrapper = mount(ApplicationAgentLaunchProfileEditor, {
      props: {
        slot,
        draft: draft(''),
        inheritedProfile: inheritedProfile(inheritedIdentifier),
      },
      global: {
        mocks: {
          $t: (key: string, values?: Record<string, string>) => (
            key.endsWith('unavailableModelBeforeEntry')
              ? `Saved model ${values?.model} is unavailable.`
              : key
          ),
        },
      },
    })

    expect(wrapper.text()).toContain(inheritedIdentifier)
    expect(wrapper.emitted('update:draft')).toBeUndefined()
    expect(wrapper.emitted('readiness-change')?.at(-1)?.[0]).toMatchObject({
      isReady: false,
      blockingReason: expect.stringContaining(inheritedIdentifier),
    })
  })

  it('accepts a blank sparse override when the inherited model is available', () => {
    const wrapper = mount(ApplicationAgentLaunchProfileEditor, {
      props: {
        slot,
        draft: draft(''),
        inheritedProfile: inheritedProfile('gpt-5.6-luna'),
      },
    })

    expect(wrapper.text().toLowerCase()).not.toContain('unavailable')
    expect(wrapper.emitted('update:draft')).toBeUndefined()
    expect(wrapper.emitted('readiness-change')?.at(-1)?.[0]).toEqual({
      isReady: true,
      blockingReason: null,
      hasEffectiveResource: true,
    })
  })

  it('accepts an available explicit model even when the inherited model is unavailable', () => {
    const wrapper = mount(ApplicationAgentLaunchProfileEditor, {
      props: {
        slot,
        draft: draft('gpt-5.6-luna'),
        inheritedProfile: inheritedProfile('codex:removed-model'),
      },
    })

    expect(wrapper.emitted('readiness-change')?.at(-1)?.[0]).toEqual({
      isReady: true,
      blockingReason: null,
      hasEffectiveResource: true,
    })
  })

  it('removes llmConfig when the selected slot does not support it', () => {
    const wrapper = mount(ApplicationAgentLaunchProfileEditor, {
      props: {
        slot,
        draft: {
          ...draft('gpt-5.6-luna'),
          llmConfig: { reasoning_effort: 'high' },
        },
        inheritedProfile: inheritedProfile('gpt-5.6-luna'),
      },
    })

    expect(wrapper.emitted('update:draft')?.at(-1)?.[0]).toEqual(
      draft('gpt-5.6-luna'),
    )
  })
})
