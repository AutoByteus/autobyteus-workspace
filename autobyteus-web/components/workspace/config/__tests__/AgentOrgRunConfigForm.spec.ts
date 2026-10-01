import { createExistingAgentOrgWorkspaceDraft } from '~/services/runConfigEditing/existingAgentOrgWorkspaceDraft'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import AgentOrgRunConfigForm from '../AgentOrgRunConfigForm.vue'
import { createExistingAgentOrgModelConfigDraft } from '~/services/runConfigEditing/existingAgentOrgModelConfigDraft'
import { projectExistingAgentOrgRunFormModel } from '~/services/runConfigEditing/existingAgentOrgRunFormModel'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'

const model = () => {
  const tree = taskBearingView().execution_tree
  return projectExistingAgentOrgRunFormModel({ tree, workspaceDraft: createExistingAgentOrgWorkspaceDraft(tree, []), planner: createExistingAgentOrgModelConfigDraft(tree),
    isActive: false, modelConfigEditable: true, modelConfigReason: null, saving: false,
    modelOptionsByAddress: Object.fromEntries(['/', '/director', '/team', '/team/lead'].map(address => [address, {
      status: 'ready', options: { currentModelIdentifier: 'gpt-5.6-sol', replacements: [], unavailableReason: null },
    }])) })
}

describe('AgentOrgRunConfigForm', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders the whole canonical Org root/direct/mounted hierarchy in existing mode', () => {
    const wrapper = mount(AgentOrgRunConfigForm, { props: { existingModel: model() }, global: { stubs: {
      TeamScopeConfigEditor: { props: ['scope', 'disabled'], template: '<div data-test="scope" :data-address="scope.address" :data-disabled="String(disabled)">{{ scope.displayName }}</div>' },
      TeamMemberConfigTree: { props: ['memberNodes', 'disabled'], template: '<div data-test="tree" :data-disabled="String(disabled)"><span v-for="node in memberNodes" :key="node.address">{{ node.address }}<i v-if="node.children" v-for="child in node.children" :key="child.address">{{ child.address }}</i></span></div>' },
      AgentOrgDirectAgentOverrideRow: { props: ['node', 'expanded', 'disabled'], template: '<div data-test="direct-agent" :data-address="node.address" :data-disabled="String(disabled)">{{ node.displayName }}</div>' },
      MemberOverridesDisclosure: { template: '<section data-test="disclosure"><slot /></section>' },
    } } })
    expect(wrapper.get('[data-test="agent-org-config-form"]').attributes('data-mode')).toBe('existing')
    expect(wrapper.text()).toContain('Org')
    expect(wrapper.get('[data-test="scope"]').attributes('data-address')).toBe('/')
    expect(wrapper.get('[data-test="direct-agent"]').attributes('data-address')).toBe('/director')
    expect(wrapper.get('[data-test="tree"]').text()).toContain('/team/lead')
    expect(wrapper.get('[data-test="agent-org-run-existing-notice"]').text()).toContain('stopped')
  })

  it('keeps the same shared component around launch-mode root content', () => {
    const wrapper = mount(AgentOrgRunConfigForm, { props: { editableModel: {
      configurableAgentCount: 0, directAgents: [], mountedTeams: [],
    } }, slots: { default: '<div data-test="launch-root">launch root</div>' }, global: { stubs: {
      MemberOverridesDisclosure: { template: '<section data-test="disclosure"><slot /></section>' },
    } } })
    expect(wrapper.get('[data-test="launch-root"]').text()).toBe('launch root')
    expect(wrapper.find('[data-test="agent-org-run-existing-notice"]').exists()).toBe(false)
  })

  it('renders and operates the real stopped hierarchy disclosure and direct-Agent row', async () => {
    const wrapper = mount(AgentOrgRunConfigForm, {
      props: { existingModel: model() },
      global: { stubs: { Icon: true } },
    })
    const disclosure = wrapper.get('[data-test="org-member-overrides-toggle"]')
    expect(disclosure.attributes('aria-expanded')).toBe('false')
    await disclosure.trigger('click')
    expect(disclosure.attributes('aria-expanded')).toBe('true')
    const direct = wrapper.get('[data-test="org-placement-/director"]')
    expect(direct.text()).toContain('director')
    expect(direct.get('button').attributes('aria-expanded')).toBe('false')
    await direct.get('button').trigger('click')
    expect(direct.get('button').attributes('aria-expanded')).toBe('true')
    expect(direct.find('[data-test="member-override-item"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Team')
    expect(wrapper.text()).toContain('stopped')
  })
})
