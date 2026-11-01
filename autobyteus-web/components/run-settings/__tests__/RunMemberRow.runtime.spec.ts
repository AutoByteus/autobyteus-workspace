import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { RunMemberNode } from '~/utils/runSettings/runMemberTree'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('~/composables/chat/useChatModelCatalog', () => ({ useChatModelCatalog: () => ({
  ensureCatalog: vi.fn(), schemaFor: () => null, modelLabel: (_runtimeKind: string, id: string) => id,
}) }))

import RunMemberRow from '../RunMemberRow.vue'

/**
 * autobyteus-348: a member's (or a copy's) agent runtime can be chosen exactly when its model can: the runtime lock
 * follows the row's model lock, so a stopped run's member offers every agent runtime and a locked row none.
 */
const cardStub = { props: ['runtimeLocked', 'locked'], template: '<div data-test="card-stub" :data-runtime-locked="String(runtimeLocked)" />' }
const values = { workspace: null, runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-sol', llmConfig: null, autoExecuteTools: true }
const node = (overrides: Partial<RunMemberNode> = {}): RunMemberNode => ({
  key: '/lead@lead-run', kind: 'agent', name: 'lead', isCoordinator: true, values, parentValues: values, fields: ['model'],
  customized: {}, customizedOptionKeys: [], modelRequired: false, children: [], launchNotes: [], ...overrides,
})
const runtimeLockedOf = (props: Record<string, unknown>): string | undefined => mount(RunMemberRow, {
  props: { expandedKeys: new Set<string>(['/lead@lead-run']), node: node(), ...props },
  global: { stubs: { RunSettingsCard: cardStub, RemoteNodeChip: true, Icon: true } },
}).get('[data-test="card-stub"]').attributes('data-runtime-locked')

describe('RunMemberRow: the agent runtime control follows the model control', () => {
  it('is open on a row whose model can be changed', () => {
    expect(runtimeLockedOf({ locked: { model: false, thinking: false } })).toBe('false')
  })

  it('is fixed on a row whose model is locked', () => {
    expect(runtimeLockedOf({ locked: { model: true, thinking: true } })).toBe('true')
  })

  it('takes the row\'s own locks over the section\'s (a stopped copy among locked copies)', () => {
    expect(runtimeLockedOf({ locked: { model: true }, node: node({ locked: { model: false } }) })).toBe('false')
    expect(runtimeLockedOf({ locked: { model: false }, node: node({ locked: { model: true } }) })).toBe('true')
  })

  it('stays fixed when the section fixes it', () => {
    expect(runtimeLockedOf({ locked: { model: false }, runtimeLocked: true })).toBe('true')
  })
})
