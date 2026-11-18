import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const selection = vi.hoisted(() => ({
  refreshModelsOnOpen: vi.fn(),
  refreshModels: vi.fn(),
  refreshing: { value: false },
  failed: { value: false },
}))
vi.mock('~/composables/useRuntimeScopedModelSelection', async () => {
  const { ref: vueRef, computed: vueComputed } = await import('vue')
  const refreshing = vueRef(false)
  const failed = vueRef(false)
  selection.refreshing = refreshing
  selection.failed = failed
  return {
    normalizeScopedRuntimeKind: (kind: string) => kind,
    resolveEffectiveScopedRuntimeKind: (kind: string) => kind,
    useRuntimeScopedModelSelection: () => ({
      effectiveRuntimeKind: vueRef('claude_agent_sdk'),
      ensureModelsForRuntime: vi.fn(async () => undefined),
      groupedModelOptions: vueComputed(() => [{ label: 'Anthropic', items: [{ id: 'opus', name: 'Opus', description: null }, { id: 'fable', name: 'Fable', description: null }] }]),
      hasModelIdentifier: () => true,
      isLoadingModels: vueRef(false),
      modelLoadError: vueRef(null),
      modelListRefreshing: refreshing,
      modelListRefreshFailed: failed,
      modelConfigSchemaByIdentifier: () => null,
      normalizedStoredRuntimeKind: vueRef('claude_agent_sdk'),
      refreshModels: selection.refreshModels,
      refreshModelsOnOpen: selection.refreshModelsOnOpen,
      reloadModelsForRuntime: vi.fn(),
      runtimeOptions: vueRef([{ value: 'claude_agent_sdk', label: 'Claude Agent SDK', enabled: true }]),
    }),
  }
})
vi.mock('~/composables/useRuntimeCurrentModelDescriptor', async () => {
  const { ref: vueRef } = await import('vue')
  return { useRuntimeCurrentModelDescriptor: () => ({ selectedDisplay: vueRef(null), schema: vueRef(null), loading: vueRef(false), error: vueRef(null), descriptor: vueRef(null) }) }
})

import MobileRuntimeModelRows from '../MobileRuntimeModelRows.vue'

const mountRows = () => mount(MobileRuntimeModelRows, {
  props: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus' },
  attachTo: document.body,
  global: { mocks: { $t: (key: string) => key }, stubs: { Icon: true } },
})

beforeEach(() => {
  vi.clearAllMocks()
  selection.refreshing.value = false
  selection.failed.value = false
  document.body.innerHTML = ''
})

describe('MobileRuntimeModelRows model sheet (REQ-010, REQ-011)', () => {
  it('re-reads the runtime list when the model sheet opens, not when the runtime sheet does', async () => {
    const wrapper = mountRows()
    await wrapper.get('[data-testid="mobile-run-runtime-select-toggle"]').trigger('click')
    await flushPromises()
    expect(selection.refreshModelsOnOpen).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="mobile-run-model-select-toggle"]').trigger('click')
    await flushPromises()
    expect(selection.refreshModelsOnOpen).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('offers "Refresh models" in the model sheet beside the rows, which stay choosable while refreshing', async () => {
    const wrapper = mountRows()
    await wrapper.get('[data-testid="mobile-run-model-select-toggle"]').trigger('click')
    await flushPromises()
    selection.refreshing.value = true
    await flushPromises()

    expect(document.body.querySelectorAll('[data-testid="mobile-run-model-select-option"]')).toHaveLength(2)
    expect(document.body.querySelector('[data-test="model-list-refreshing"]')).not.toBeNull()
    expect(document.body.querySelector<HTMLButtonElement>('[data-test="model-list-refresh-button"]')!.disabled).toBe(true)

    selection.refreshing.value = false
    await flushPromises()
    document.body.querySelector<HTMLButtonElement>('[data-test="model-list-refresh-button"]')!.click()
    expect(selection.refreshModels).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('shows the failure with Retry and keeps the rows when the refresh failed', async () => {
    const wrapper = mountRows()
    await wrapper.get('[data-testid="mobile-run-model-select-toggle"]').trigger('click')
    selection.failed.value = true
    await flushPromises()

    expect(document.body.querySelectorAll('[data-testid="mobile-run-model-select-option"]')).toHaveLength(2)
    expect(document.body.querySelector('[data-test="model-list-refresh-error"]')).not.toBeNull()
    wrapper.unmount()
  })
})
