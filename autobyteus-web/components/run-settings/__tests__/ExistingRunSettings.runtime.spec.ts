import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ExistingRunSettings from '../ExistingRunSettings.vue'

/** autobyteus-316: a stopped Agent run's root card lets the agent runtime be chosen; team and Org roots keep it fixed. */
const stubs = {
  RunSettingsCard: { props: ['values', 'locked', 'runtimeLocked', 'lockedModels', 'modelUnavailable', 'testSuffix'], template: '<div data-test="card-stub" :data-runtime-locked="String(runtimeLocked)" />' },
  RunMembersSection: true,
  RunSubjectHeader: true,
  Icon: true,
}
const mountSettings = (kind: 'agent' | 'team' | 'org', extra: Record<string, unknown> = {}) => mount(ExistingRunSettings, {
  props: {
    kind, name: 'Writer', isActive: false, canEdit: true, state: 'editable', stop: { label: 'Stop', pending: false, error: null },
    root: { workspace: null, runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5', llmConfig: null, autoExecuteTools: false },
    dirty: false, canSave: false, saving: false, saved: false, ...extra,
  },
  global: { stubs, mocks: { $t: (key: string) => key } },
})

describe('ExistingRunSettings: the agent runtime of the root card', () => {
  it('is chosen for an Agent run, fixed for a Team and an Org', () => {
    expect(mountSettings('agent').get('[data-test="card-stub"]').attributes('data-runtime-locked')).toBe('false')
    expect(mountSettings('team').get('[data-test="card-stub"]').attributes('data-runtime-locked')).toBe('true')
    expect(mountSettings('org').get('[data-test="card-stub"]').attributes('data-runtime-locked')).toBe('true')
  })

  it('tells that the new agent runtime takes over with the next message only while another one is chosen', () => {
    expect(mountSettings('agent').find('[data-test="existing-run-runtime-change-hint"]').exists()).toBe(false)
    const hint = mountSettings('agent', { runtimeChangePending: true }).get('[data-test="existing-run-runtime-change-hint"]')
    expect(hint.text()).toBe('runSettings.existing.runtimeChangeHint')
  })
})

describe('ExistingRunSettings: members and copies (autobyteus-348)', () => {
  const sections = (kind: 'team' | 'org') => mount(ExistingRunSettings, {
    props: {
      kind, name: 'Crew', isActive: false, canEdit: true, state: 'editable', stop: { label: 'Stop', pending: false, error: null },
      root: { workspace: null, runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5', llmConfig: null, autoExecuteTools: false },
      members: [{ key: '/lead' }] as never, delegated: [{ key: '/writer@copy' }] as never,
      dirty: false, canSave: false, saving: false, saved: false,
    },
    global: { stubs: { ...stubs, RunMembersSection: { props: { runtimeLocked: Boolean, testId: String }, template: '<div :data-test="testId ?? `members`" :data-runtime-locked="String(runtimeLocked)" />' } }, mocks: { $t: (key: string) => key } },
  })

  it.each(['team', 'org'] as const)('leaves the agent runtime of a %s run\'s members and copies to each row\'s locks', (kind) => {
    const wrapper = sections(kind)
    expect(wrapper.get('[data-test="members"]').attributes('data-runtime-locked')).toBe('false')
    expect(wrapper.get('[data-test="run-delegated-launches"]').attributes('data-runtime-locked')).toBe('false')
    expect(wrapper.get('[data-test="card-stub"]').attributes('data-runtime-locked')).toBe('true')
  })
})
