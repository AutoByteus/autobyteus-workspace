import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AgentWorkspaceSurface from '../agent/AgentWorkspaceSurface.vue'
import TeamWorkspaceSurface from '../team/TeamWorkspaceSurface.vue'

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => ({ getAgentDefinitionById: vi.fn(() => null) }),
}))

/**
 * autobyteus-277 (E-18, AR-005): the read-only rule moved into `useTargetConversation`, one rule for every surface.
 * Each desktop surface receives only its own kinds, so for each of them the rule is the one it had before.
 */
const context = (submissionPending = false) => ({
  submissionPending,
  config: { agentDefinitionId: 'def', agentDefinitionName: 'Writer', agentAvatarUrl: null },
  state: { runId: 'writer-run', currentStatus: 'idle', conversation: { messages: [] }, eventMonitorPresentationRevision: 0, hasEarlierActiveTraceEvents: false },
})
const messages = {
  rootKind: 'agent_org', rootRunId: 'org-run', focusedAgentRunId: 'writer-run', focusedMemberAddress: '/writer',
  memberIdentityByAgentRunId: () => ({}), listMessages: () => [], referenceContentPath: () => '',
}
const team = { focusedMemberAddress: '/team/writer', teamDefinitionName: 'Team' }
const stubs = { AgentEventMonitor: { name: 'AgentEventMonitor', props: ['readOnly', 'agentName'], template: '<div />' }, AgentStatusDisplay: true, WorkspaceHeaderActions: true, WorkspaceRecoveryNotice: true }
const readOnlyOf = (component: typeof AgentWorkspaceSurface | typeof TeamWorkspaceSurface, target: Record<string, unknown>) =>
  shallowMount(component as never, { props: { target: { browse: { kind: 'run', runId: 'writer-run' }, collaborationMessages: messages, ...target } }, global: { stubs } } as never)
    .getComponent({ name: 'AgentEventMonitor' }).props('readOnly')

describe('the unified read-only rule on each desktop surface', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each([
    ['a live standalone agent', { kind: 'standalone_agent', access: 'live', context: context() }, false],
    ['a read-only standalone agent (no Org)', { kind: 'standalone_agent', access: 'read_only', context: context(true) }, true],
    ["an Org's direct agent (continuable)", { kind: 'agent_org_direct_agent', access: 'read_only', root: { orgRunId: 'org-run' }, context: context() }, false],
    ["an Org's task agent", { kind: 'agent_org_task_agent', access: 'read_only', root: { orgRunId: 'org-run' }, context: context() }, true],
    ["an Org's task agent with a submission in flight", { kind: 'agent_org_task_agent', access: 'read_only', root: { orgRunId: 'org-run' }, context: context(true) }, false],
  ])('AgentWorkspaceSurface: %s → read-only %s', (_name, target, expected) => {
    expect(readOnlyOf(AgentWorkspaceSurface, target)).toBe(expected)
  })

  it.each([
    ['a read-only standalone Team member (no Org)', { kind: 'standalone_team_member', access: 'read_only', team, context: context(true) }, true],
    ['a live standalone Team member', { kind: 'standalone_team_member', access: 'live', team, context: context() }, false],
    ["an Org Team's member (continuable)", { kind: 'agent_org_team_member', access: 'read_only', root: { orgRunId: 'org-run' }, team, context: context() }, false],
    ["an Org's task Team member", { kind: 'agent_org_task_team_member', access: 'read_only', root: { orgRunId: 'org-run' }, team, context: context() }, true],
    ["an Org's task Team member with a submission in flight", { kind: 'agent_org_task_team_member', access: 'read_only', root: { orgRunId: 'org-run' }, team, context: context(true) }, false],
  ])('TeamWorkspaceSurface: %s → read-only %s', (_name, target, expected) => {
    expect(readOnlyOf(TeamWorkspaceSurface, target)).toBe(expected)
  })

  it('the display name: a Team member without an agent name is its address\'s last part; an agent without one is "Agent"', () => {
    const nameless = { ...context(), config: { ...context().config, agentDefinitionName: '' } }
    const agentName = shallowMount(AgentWorkspaceSurface as never, { props: { target: { kind: 'standalone_agent', access: 'live', context: nameless, browse: { kind: 'run', runId: 'writer-run' } } }, global: { stubs } } as never)
      .getComponent({ name: 'AgentEventMonitor' }).props('agentName')
    const memberName = shallowMount(TeamWorkspaceSurface as never, { props: { target: { kind: 'standalone_team_member', access: 'live', team: { ...team, focusedMemberAddress: '/team/code_reviewer' }, context: nameless, collaborationMessages: messages, browse: { kind: 'run', runId: 'writer-run' } } }, global: { stubs } } as never)
      .getComponent({ name: 'AgentEventMonitor' }).props('agentName')
    expect(agentName).toBe('Agent')
    expect(memberName).toBe('code reviewer')
  })
})
