import { computed, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { ApplicationExecutionResourceSlotDeclaration } from '@autobyteus/application-sdk-contracts'
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
    groupedModelOptions: computed(() => []),
    hasModelIdentifier: (value: string) => value === 'gpt-5',
    normalizedStoredRuntimeKind: computed(() => 'autobyteus'),
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

describe('ApplicationAgentLaunchProfileEditor', () => {
  it('retains an unavailable saved selector and blocks entry until an available model is selected', async () => {
    const staleIdentifier = 'openai-compatible:provider_alibaba_cloud:deepseek-v4'
    const wrapper = mount(ApplicationAgentLaunchProfileEditor, {
      props: {
        slot,
        draft: {
          kind: 'AGENT',
          runtimeKind: 'autobyteus',
          llmModelIdentifier: staleIdentifier,
          workspaceRootPath: '/tmp/workspace',
        },
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

    await wrapper.setProps({
      draft: {
        kind: 'AGENT',
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-5',
        workspaceRootPath: '/tmp/workspace',
      },
    })

    expect(wrapper.emitted('readiness-change')?.at(-1)?.[0]).toEqual({
      isReady: true,
      blockingReason: null,
      hasEffectiveResource: true,
    })
  })
})
