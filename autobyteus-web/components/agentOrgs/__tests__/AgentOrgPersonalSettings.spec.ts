import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AgentOrgPersonalSettings from '../AgentOrgPersonalSettings.vue'
import type { AgentOrgDefinition } from '~/stores/agentOrgDefinitionStore'

/** package-personal-settings, design "UI (stage 1)": the Org editor's note, avatar mark and the captured runtime/model. */
const { mockOrgStore } = vi.hoisted(() => ({ mockOrgStore: { resetPersonalSetting: vi.fn() } }))
vi.mock('~/stores/agentOrgDefinitionStore', () => ({ useAgentOrgDefinitionStore: () => mockOrgStore }))
vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: (key: string, params?: Record<string, string>) => (params ? `${key} ${JSON.stringify(params)}` : key) }),
}))

const org = (overrides: Partial<AgentOrgDefinition> = {}): AgentOrgDefinition => ({
  id: 'my-org', name: 'My Org', description: 'Runs', instructions: 'Run.', revision: 'r1', members: [], handoffs: [],
  avatarUrl: '/mine.png', defaultLaunchConfig: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5', llmConfig: null },
  personalSettings: ['AVATAR', 'DEFAULT_LAUNCH_CONFIG'], personalSettingsBase: 'PACKAGE', ...overrides,
})

describe('AgentOrgPersonalSettings', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows the note, the avatar mark and the personal runtime/model with its reset', () => {
    const wrapper = mount(AgentOrgPersonalSettings, { props: { org: org() } })
    expect(wrapper.get('[data-testid="personal-settings-note"]').text()).toBe('personalSettings.note.collaboration.package')
    expect(wrapper.findAll('[data-testid="personal-setting-mark"]')).toHaveLength(2)
    expect(wrapper.get('[data-test="org-personal-launch-config"]').text())
      .toContain('personalSettings.orgLaunchConfig {"runtime":"codex_app_server","model":"gpt-5.5"}')
  })

  it('nothing for an Org outside a package', () => {
    const wrapper = mount(AgentOrgPersonalSettings, { props: { org: org({ personalSettingsBase: null, personalSettings: [] }) } })
    expect(wrapper.html()).not.toContain('personal-settings')
  })

  it('the avatar reset hands the base avatar to the editor; a failed reset shows the error', async () => {
    mockOrgStore.resetPersonalSetting.mockResolvedValueOnce(org({ avatarUrl: null, personalSettings: ['DEFAULT_LAUNCH_CONFIG'] }))
    const wrapper = mount(AgentOrgPersonalSettings, { props: { org: org() } })
    await wrapper.findAll('[data-testid="personal-setting-reset"]')[0]!.trigger('click')
    await flushPromises()
    expect(mockOrgStore.resetPersonalSetting).toHaveBeenCalledWith('my-org', 'AVATAR')
    expect(wrapper.emitted('avatarReset')).toEqual([['']])

    mockOrgStore.resetPersonalSetting.mockRejectedValueOnce(new Error('offline'))
    await wrapper.findAll('[data-testid="personal-setting-reset"]')[1]!.trigger('click')
    await flushPromises()
    expect(mockOrgStore.resetPersonalSetting).toHaveBeenLastCalledWith('my-org', 'DEFAULT_LAUNCH_CONFIG')
    expect(wrapper.get('[role="alert"]').text()).toBe('personalSettings.reset.failed {"error":"offline"}')
    expect(wrapper.emitted('avatarReset')).toHaveLength(1)
  })
})
