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

const memberValues = { workspace: null, runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5', llmConfig: null, autoExecuteTools: false }
const member = (key: string, name: string) => ({ key, kind: 'agent', name, isCoordinator: false, values: memberValues, parentValues: memberValues,
  fields: ['model', 'approval'], customized: {}, customizedOptionKeys: [], modelRequired: false, launchNotes: [], children: [] }) as never

describe('ExistingRunSettings: the group view (autobyteus-348, autobyteus-366)', () => {
  const group = (kind: 'team' | 'org', extra: Record<string, unknown> = {}) => mount(ExistingRunSettings, {
    props: {
      kind, name: 'Crew', isActive: false, canEdit: true, state: 'editable', stop: { label: 'Stop', pending: false, error: null },
      root: memberValues, members: [member('/lead', 'lead')] as never,
      dirty: false, canSave: false, saving: false, saved: false, ...extra,
    },
    global: { stubs: { ...stubs, RunSubjectCard: { name: 'RunSubjectCard', props: ['node', 'lockedModels'], emits: ['change'], template: '<div data-test="subject-stub" />' },
      RunMembersSection: { props: { runtimeLocked: Boolean }, template: '<div data-test="members" :data-runtime-locked="String(runtimeLocked)" />' } }, mocks: { $t: (key: string) => key } },
  })

  it.each(['team', 'org'] as const)('with no subject, a %s run shows its card and members, and leaves their agent runtime to each row\'s locks', (kind) => {
    const wrapper = group(kind)
    expect(wrapper.get('[data-test="members"]').attributes('data-runtime-locked')).toBe('false')
    expect(wrapper.get('[data-test="card-stub"]').attributes('data-runtime-locked')).toBe('true')
    expect(wrapper.find('[data-test="run-settings-switch"]').exists()).toBe(false)
  })

  it.each([['team', 'Team settings'], ['org', 'Organization settings']] as const)(
    'a focused %s member shows its one card, and its switch opens today\'s group view', async (kind, label) => {
      const lead = member('/lead', 'lead')
      const wrapper = group(kind, { subject: { origin: 'member', subject: lead, group: 'root' }, lockedModelsFor: () => [] })
      expect(wrapper.find('[data-test="subject-stub"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="members"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="existing-run-root-card"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="run-settings-switch-group"]').text()).toBe(label)
      wrapper.getComponent({ name: 'RunSubjectCard' }).vm.$emit('change', { field: 'thinking', llmConfig: null })
      expect(wrapper.emitted('change-member')).toEqual([['/lead', { field: 'thinking', llmConfig: null }]])

      await wrapper.setProps({ showGroup: true })
      expect(wrapper.find('[data-test="subject-stub"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="existing-run-root-card"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="members"]').exists()).toBe(true)
    })
})

describe('ExistingRunSettings: a hub, and the save bar (autobyteus-366)', () => {
  it('a hub with open copies says where their settings are, and lists none', () => {
    const wrapper = mountSettings('agent', { subject: { origin: 'root', subject: 'root', group: null }, copiesHint: true })
    expect(wrapper.get('[data-test="existing-run-copies-hint"]').text()).toBe('runSettings.subject.selectCopyHint')
    expect(wrapper.find('[data-test="run-settings-switch"]').exists()).toBe(false)
    expect(mountSettings('agent').find('[data-test="existing-run-copies-hint"]').exists()).toBe(false)
  })

  it('names every agent with unsaved edits', () => {
    const named = mountSettings('team', { dirty: true, unsavedNames: ['code reviewer', 'writer'] }).get('[data-test="existing-run-save-text"]')
    expect(named.text()).toContain('code reviewer, writer')
    expect(named.attributes('title')).toContain('code reviewer, writer')
  })
})
