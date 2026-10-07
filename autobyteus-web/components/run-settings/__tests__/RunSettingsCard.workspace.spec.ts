import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import RunSettingsCard from '../RunSettingsCard.vue'
import RunMemberRow from '../RunMemberRow.vue'
import ExistingRunSettings from '../ExistingRunSettings.vue'
import type { RunMemberNode } from '~/utils/runSettings/runMemberTree'
import type { RunSettingsValues } from '~/types/runSettings/RunSettings'

// Keep the actual card, presentation, member row and shared workspace menu. Only unrelated
// model discovery is replaced; these tests stop at the existing setting-intent boundary.
vi.mock('~/composables/chat/useChatModelCatalog', () => ({ useChatModelCatalog: () => ({
  ensureCatalog: vi.fn(), schemaFor: () => null, modelLabel: () => '',
}) }))

const values: RunSettingsValues = {
  workspace: { kind: 'folder', rootPath: '/owned/root' },
  runtimeKind: 'autobyteus', llmModelIdentifier: '', llmConfig: null, autoExecuteTools: true,
}
const node: RunMemberNode = {
  key: '/product', kind: 'team', name: 'Product', isCoordinator: false,
  values, parentValues: values, fields: ['workspace'], customized: {}, customizedOptionKeys: [],
  modelRequired: false, children: [],
}
let wrapper: VueWrapper | null = null
let originalBridge: Window['electronAPI']
const showFolderDialog = vi.fn()
const browsePath = async () => {
  await wrapper!.get('[data-test="chat-workspace-trigger"]').trigger('click')
  await wrapper!.get('[data-test="chat-workspace-open-folder"]').trigger('click')
  await wrapper!.get('[data-test="chat-workspace-browse"]').trigger('click')
  await flushPromises()
  expect(wrapper!.get<HTMLInputElement>('#chat-workspace-path').element.value).toBe('/owned/chosen')
  expect(wrapper!.emitted('change')).toBeUndefined()
}
beforeEach(() => {
  setActivePinia(createPinia())
  originalBridge = window.electronAPI
  showFolderDialog.mockReset().mockResolvedValue({ canceled: false, path: '/owned/chosen' })
  window.electronAPI = { showFolderDialog } as unknown as Window['electronAPI']
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  window.electronAPI = originalBridge
  document.body.innerHTML = ''
})

describe('shared folder choice in settings (AC-002/006)', () => {
  it('the root card emits only on Use folder and never mutates its input', async () => {
    wrapper = mount(RunSettingsCard, { props: { values, fields: ['workspace'] }, attachTo: document.body })
    await browsePath()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('change')).toEqual([[{ field: 'workspace', choice: { kind: 'folder', rootPath: '/owned/chosen' } }]])
    expect(values.workspace).toEqual({ kind: 'folder', rootPath: '/owned/root' })
  })

  it('an editable placed Team propagates the correct member address only on confirmation', async () => {
    wrapper = mount(RunMemberRow, { props: { node, expandedKeys: new Set(['/product']) }, attachTo: document.body })
    await browsePath()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('change')).toEqual([['/product', { field: 'workspace', choice: { kind: 'folder', rootPath: '/owned/chosen' } }]])
    expect(node.parentValues.workspace).toEqual({ kind: 'folder', rootPath: '/owned/root' })
  })

  it.each(['root', 'member'] as const)('a locked %s stays fixed, without a menu or native invocation', (scope) => {
    wrapper = scope === 'root'
      ? mount(RunSettingsCard, { props: { values, fields: ['workspace'], locked: { workspace: true } } })
      : mount(RunMemberRow, { props: { node, expandedKeys: new Set(['/product']), locked: { workspace: true }, readOnly: true } })
    expect(wrapper.find('[data-test="run-setting-locked"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="chat-workspace-trigger"]').exists()).toBe(false)
    expect(showFolderDialog).not.toHaveBeenCalled()
  })
})


describe('existing-run workspace policy (AC-002/007)', () => {
  const savedProps = (kind: 'agent' | 'team' | 'org', active = false) => ({
    kind, name: 'Owned saved run', isActive: active, canEdit: !active,
    state: 'editable' as const, stop: { label: 'Stop', pending: false, error: null },
    root: values, members: kind === 'org' ? [node] : [],
    dirty: false, canSave: false, saving: false, saved: false,
  })

  it.each(['agent', 'team', 'org'] as const)('never unlocks a saved %s root even when editable', (kind) => {
    wrapper = mount(ExistingRunSettings, { props: savedProps(kind) })
    const root = wrapper.get('[data-test="existing-run-root-card"]')
    expect(root.get('[data-test="run-setting-workspace"]').find('[data-test="run-setting-locked"]').exists()).toBe(true)
    expect(root.find('[data-test="chat-workspace-trigger"]').exists()).toBe(false)
    expect(showFolderDialog).not.toHaveBeenCalled()
  })

  it('keeps active Org members locked; stopped editable members emit only draft intent, never Save', async () => {
    wrapper = mount(ExistingRunSettings, { props: savedProps('org', true), attachTo: document.body })
    await wrapper.get('[data-test="run-member-toggle"]').trigger('click')
    expect(wrapper.find('[data-test="chat-workspace-trigger"]').exists()).toBe(false)
    expect(showFolderDialog).not.toHaveBeenCalled()
    await wrapper.setProps({ isActive: false, canEdit: true })
    await browsePath()
    expect(wrapper.emitted('change-member')).toBeUndefined()
    expect(wrapper.emitted('save')).toBeUndefined()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('change-member')).toEqual([['/product', { field: 'workspace', choice: { kind: 'folder', rootPath: '/owned/chosen' } }]])
    expect(wrapper.emitted('save')).toBeUndefined()
  })
})
