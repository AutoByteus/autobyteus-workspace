import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import AgentOrgWorkspaceView from '../AgentOrgWorkspaceView.vue'

const state = reactive({
  context: null as any,
  error: null as string | null,
  target: null as any,
})
const inspect = vi.fn().mockResolvedValue(undefined)
const disconnect = vi.fn()
const push = vi.fn().mockResolvedValue(undefined)
const center = reactive({
  mode: 'chat' as 'chat' | 'config',
  get isConfigMode() { return this.mode === 'config' },
  showChat: vi.fn(() => { center.mode = 'chat' }),
  showConfig: vi.fn(() => { center.mode = 'config' }),
})
const route = reactive({ query: {
  rootSubjectKind: 'agent_org', definitionId: 'org-def', orgRunId: 'org-run', mode: 'active',
} })

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push, replace: push }),
}))
vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => ({
    get activeWorkspaceTarget() { return state.target },
    inspectAgentOrg: inspect,
    selectAgentOrg: vi.fn(),
    disconnectAgentOrg: disconnect,
    agentOrgContextFor: () => state.context,
    agentOrgErrorFor: () => state.error,
  }),
}))
vi.mock('~/stores/workspaceCenterViewStore', () => ({
  useWorkspaceCenterViewStore: () => center,
}))

const context = (phase: 'live' | 'reopen_required' | 'historical' = 'live') => ({
  phase,
  error: phase === 'reopen_required' ? 'Sequence gap' : null,
  executionTree: { rootOrg: { orgDefinitionId: 'org-def', orgRunId: 'org-run' } },
})
const directTarget = {
  kind: 'agent_org_direct_agent', access: 'live',
  root: { orgRunId: 'org-run' },
  address: '/writer',
  context: { state: { runId: 'agent-run' } },
}
const mountedTeamTarget = {
  kind: 'agent_org_team_member', access: 'live',
  root: { orgRunId: 'org-run' },
  address: '/delivery/reviewer',
  context: { state: { runId: 'mounted-agent-run' } },
}

const mountSubject = () => mount(AgentOrgWorkspaceView, {
  global: { stubs: {
    Icon: true,
    AgentWorkspaceSurface: {
      props: ['target', 'showHeaderActions', 'recoveryNotice'],
      emits: ['new-agent', 'edit-config'],
      template: '<div data-test="shared-agent-surface" :data-recovery="recoveryNotice || \'\'" :data-actions="String(showHeaderActions)"><button data-test="org-new" @click="$emit(\'new-agent\')" /><button data-test="org-edit" @click="$emit(\'edit-config\')" /></div>',
    },
    TeamWorkspaceSurface: {
      props: ['target', 'showHeaderActions', 'recoveryNotice'],
      emits: ['new-team', 'edit-config'],
      template: '<div data-test="shared-team-surface" :data-actions="String(showHeaderActions)"><button data-test="org-team-new" @click="$emit(\'new-team\')" /><button data-test="org-team-edit" @click="$emit(\'edit-config\')" /></div>',
    },
    ExistingRunConfigEditor: {
      props: ['target'],
      template: '<div data-test="whole-org-run-config" :data-org-run-id="target.orgRunId" />',
    },
  } },
})

describe('AgentOrgWorkspaceView', () => {
  afterEach(async () => { await localizationRuntime.setPreference('en') })
  beforeEach(() => {
    vi.clearAllMocks()
    state.context = context()
    state.error = null
    state.target = directTarget
    route.query.mode = 'active'
    center.mode = 'chat'
  })

  it.each([directTarget, mountedTeamTarget])('exposes stopped configured $kind Settings and existing + semantics', async target => {
    state.context = context('historical'); state.target = { ...target, access: 'continuable' }; route.query.mode = 'history'
    const wrapper = mountSubject()
    const surface = wrapper.find(target.kind === 'agent_org_direct_agent' ? '[data-test="shared-agent-surface"]' : '[data-test="shared-team-surface"]')
    expect(surface.attributes('data-actions')).toBe('true')
    await wrapper.get(target.kind === 'agent_org_direct_agent' ? '[data-test="org-edit"]' : '[data-test="org-team-edit"]').trigger('click')
    expect(wrapper.get('[data-test="whole-org-run-config"]').attributes('data-org-run-id')).toBe('org-run')
    await wrapper.get('[data-test="agent-org-config-back-to-events"]').trigger('click')
    {
      await wrapper.get(target.kind === 'agent_org_direct_agent' ? '[data-test="org-new"]' : '[data-test="org-team-new"]').trigger('click')
      expect(push).toHaveBeenCalledWith({ path: '/workspace', query: { rootSubjectKind: 'agent_org', definitionId: 'org-def', sourceOrgRunId: 'org-run', mode: 'configuration' } })
    }
    wrapper.unmount()
  })
  it('keeps historical task actions excluded', async () => {
    state.context = context('historical'); state.target = { ...directTarget, kind: 'agent_org_task_agent', access: 'read_only' }
    const wrapper = mountSubject()
    expect(wrapper.get('[data-test="shared-agent-surface"]').attributes('data-actions')).toBe('false')
    await wrapper.get('[data-test="org-edit"]').trigger('click'); expect(center.showConfig).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('opens the enclosing whole-Org configuration from a direct Agent and returns to the same monitor', async () => {
    const wrapper = mountSubject()
    expect(wrapper.find('[data-test="shared-agent-surface"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="shared-team-surface"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="shared-agent-surface"]').attributes('data-actions')).toBe('true')
    expect(wrapper.text()).not.toContain('AGENT RUN EVENT')
    await wrapper.get('[data-test="org-edit"]').trigger('click')
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="whole-org-run-config"]').attributes('data-org-run-id')).toBe('org-run')
    expect(state.target).toStrictEqual(directTarget)

    await wrapper.get('[data-test="agent-org-config-back-to-events"]').trigger('click')
    expect(wrapper.find('[data-test="shared-agent-surface"]').exists()).toBe(true)
    expect(state.target).toStrictEqual(directTarget)

    await wrapper.get('[data-test="org-new"]').trigger('click')
    expect(push).toHaveBeenCalledWith({
      path: '/workspace',
      query: { rootSubjectKind: 'agent_org', definitionId: 'org-def', sourceOrgRunId: 'org-run', mode: 'configuration' },
    })
    wrapper.unmount()
    expect(disconnect).toHaveBeenCalledWith('org-run')
  })

  it('opens the same enclosing whole-Org configuration from a mounted-Team Agent without changing Org focus', async () => {
    state.target = mountedTeamTarget
    const wrapper = mountSubject()

    expect(wrapper.find('[data-test="shared-team-surface"]').exists()).toBe(true)
    await wrapper.get('[data-test="org-team-edit"]').trigger('click')

    expect(push).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="whole-org-run-config"]').attributes('data-org-run-id')).toBe('org-run')
    expect(state.target).toStrictEqual(mountedTeamTarget)

    await wrapper.get('[data-test="agent-org-config-back-to-events"]').trigger('click')
    expect(wrapper.find('[data-test="shared-team-surface"]').exists()).toBe(true)
    expect(state.target).toStrictEqual(mountedTeamTarget)
  })

  it.each(['en', 'zh-CN'] as const)('keeps the committed shared surface visible with %s active-route recovery', async (locale) => {
    await localizationRuntime.setPreference(locale)
    state.context = context('reopen_required')
    state.error = 'Sequence gap'
    const wrapper = mountSubject()
    expect(wrapper.find('[data-test="shared-agent-surface"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="shared-agent-surface"]').attributes('data-recovery')).toBe(localizationRuntime.translate('workspace.agentOrg.recovery.exhausted'))
    expect(wrapper.text()).not.toContain('Reconnect')
  })

  it('uses the shared bounded recovery notice when no committed context is available', () => {
    state.context = null
    state.target = null
    state.error = 'Automatic recovery exhausted'
    const wrapper = mountSubject()
    expect(wrapper.get('[role="alert"]').text()).toContain('recover automatically')
    expect(wrapper.text()).not.toContain('Agent Org stream needs to reconnect')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it.each(['en', 'zh-CN'] as const)('retains the %s cold inspection failure notice without implying activation', async (locale) => {
    await localizationRuntime.setPreference(locale)
    route.query.mode = 'history'
    state.context = null
    state.target = null
    state.error = 'inspection unavailable'
    const wrapper = mountSubject()
    expect(wrapper.get('[role="alert"]').text()).toBe(localizationRuntime.translate('workspace.agentOrg.inspectionUnavailable'))
    expect(wrapper.text()).not.toContain(localizationRuntime.translate('workspace.agentOrg.recovery.exhausted'))
    expect(push).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('starts with the approved nullable-focus prompt instead of inventing a member fallback', () => {
    state.target = null
    const wrapper = mountSubject()
    expect(wrapper.get('[data-test="agent-org-active-unfocused"]').text()).toContain('Choose an Agent or Team')
    expect(wrapper.find('[data-test="shared-agent-surface"]').exists()).toBe(false)
  })

  it('opens an inactive root as terminal history without starting a live stream', () => {
    route.query.mode = 'history'
    state.context = context('historical')
    state.target = null
    const wrapper = mountSubject()

    expect(wrapper.get('[data-test="agent-org-stopped-history"]').text()).toContain('Stopped Agent Org')
    expect(wrapper.get('[data-test="agent-org-stopped-history"]').text()).toContain('saved state')
    expect(wrapper.text()).not.toContain('Restore')
  })
  it('synchronizes same-root historical/live modes without disposing or reopening the workspace', async () => {
    state.context = context('live')
    const wrapper = mountSubject()
    await wrapper.vm.$nextTick()
    expect(inspect).toHaveBeenCalledTimes(1)
    state.context.phase = 'historical'
    await wrapper.vm.$nextTick()
    expect(push).toHaveBeenCalledWith({ path: '/workspace', query: { ...route.query, mode: 'history' } })
    route.query.mode = 'history'
    await wrapper.vm.$nextTick()
    expect(disconnect).not.toHaveBeenCalled()
    expect(inspect).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

})
