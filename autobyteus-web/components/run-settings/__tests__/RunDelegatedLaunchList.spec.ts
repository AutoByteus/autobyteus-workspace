import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import RunDelegatedLaunchList from '../RunDelegatedLaunchList.vue'
import RunMemberRow from '../RunMemberRow.vue'
import type { DelegatedLaunchRow } from '~/utils/runSettings/delegatedLaunchRows'
import type { RunMemberNode } from '~/utils/runSettings/runMemberTree'

vi.mock('~/composables/chat/useChatModelCatalog', () => ({ useChatModelCatalog: () => ({
  ensureCatalog: vi.fn(), schemaFor: () => null, modelLabel: (_runtimeKind: string, id: string) => id,
}) }))

const row = (overrides: Partial<DelegatedLaunchRow>): DelegatedLaunchRow => ({
  key: 'k', entry: 'copy', subject: 'agent', member: false, address: '/se/ie',
  runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1', source: 'agent_default', fallbacks: [], ...overrides,
})

describe('RunDelegatedLaunchList (AC-010, AC-005)', () => {
  it('lists each collaborator and copy agent read-only with runtime, model, source and its fallback note', () => {
    setActivePinia(createPinia())
    const wrapper = mount(RunDelegatedLaunchList, { props: { rows: [
      row({ key: 'a', address: '/writer', entry: 'collaborator', source: 'not_recorded', llmModelIdentifier: 'opus', runtimeKind: 'claude_agent_sdk' }),
      row({ key: 'b', member: true, source: 'inherited', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus',
        fallbacks: [{ layer: 'agent_default', runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1', detail: "Codex App Server command 'codex' is not available." }] }),
    ] } })
    const writer = wrapper.get('[data-test="run-delegated-/writer"]')
    expect(writer.attributes('data-source')).toBe('not_recorded')
    expect(writer.get('[data-test="run-delegated-launch"]').text()).toContain('opus')
    const ie = wrapper.get('[data-test="run-delegated-/se/ie"]')
    expect(ie.attributes('data-source')).toBe('inherited')
    expect(ie.classes()).toContain('pl-9')
    expect(ie.get('[data-test="run-delegated-launch"]').text()).toContain('opus')
    expect(ie.get('[data-test="run-delegated-fallback"]').text()).toContain("sol-6.1 was not used: Codex App Server command 'codex' is not available.")
    expect(wrapper.findAll('button')).toHaveLength(0)
  })
})

describe('RunMemberRow launch note (AC-011)', () => {
  it('shows why a member\'s own default is not used', () => {
    setActivePinia(createPinia())
    const values = { workspace: null, runtimeKind: 'autobyteus', llmModelIdentifier: 'm', llmConfig: null, autoExecuteTools: true }
    const node: RunMemberNode = {
      key: '/cr', kind: 'agent', name: 'cr', isCoordinator: false, values, parentValues: values, fields: ['model'],
      customized: {}, customizedOptionKeys: [], modelRequired: false, children: [],
      launchNote: { runtimeKind: 'grok_build', llmModelIdentifier: 'grok-4', reason: 'runtime_unavailable' },
    }
    const wrapper = mount(RunMemberRow, { props: { node, expandedKeys: new Set<string>() } })
    expect(wrapper.get('[data-test="run-member-launch-note"]').text()).toContain('grok-4')
    expect(wrapper.get('[data-test="run-member-launch-note"]').text()).toContain('the runtime is not available')
  })
})
