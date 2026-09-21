import { describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import AgentWorkspaceSurface from '../AgentWorkspaceSurface.vue'

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => ({ getAgentDefinitionById: vi.fn(() => null) }),
}))

const context = {
  config: {
    agentDefinitionId: 'receiver-def',
    agentDefinitionName: 'Receiver',
    agentAvatarUrl: null,
  },
  state: {
    runId: 'receiver-run',
    currentStatus: 'idle',
    conversation: { messages: [] },
    eventMonitorPresentationRevision: 0,
    hasEarlierActiveTraceEvents: false,
  },
}

const mountSubject = () => shallowMount(AgentWorkspaceSurface, {
  props: {
    target: {
      kind: 'agent_org_direct_agent',
      root: { orgRunId: 'org-run' },
      address: '/receiver',
      context,
      collaborationMessages: {
        rootKind: 'agent_org', rootRunId: 'org-run',
        focusedAgentRunId: 'receiver-run', focusedMemberAddress: '/receiver',
        memberIdentityByAgentRunId: () => ({
          'sender-run': { address: '/other/reviewer', label: 'reviewer' },
          'receiver-run': { address: '/receiver', label: 'receiver' },
        }),
        listMessages: () => [],
        referenceContentPath: () => '',
      },
      interaction: { send: vi.fn(), interrupt: vi.fn(), decideTool: vi.fn() },
      browse: {
        kind: 'agentOrgMember', orgRunId: 'org-run',
        memberAddress: '/receiver', agentRunId: 'receiver-run',
      },
    } as never,
  },
  global: {
    stubs: {
      AgentEventMonitor: {
        name: 'AgentEventMonitor',
        props: ['interAgentSenderNameById'],
        template: '<div />',
      },
      AgentStatusDisplay: true,
      WorkspaceHeaderActions: true,
      WorkspaceRecoveryNotice: true,
      SkillImprovementComposerCta: true,
    },
  },
})

describe('AgentWorkspaceSurface AgentOrg sender identity', () => {
  it('passes the complete owning-Org configured identity map to the receiver monitor', () => {
    const monitor = mountSubject().getComponent({ name: 'AgentEventMonitor' })

    expect(monitor.props('interAgentSenderNameById')).toEqual({
      'sender-run': 'reviewer',
      'receiver-run': 'receiver',
    })
  })
})
