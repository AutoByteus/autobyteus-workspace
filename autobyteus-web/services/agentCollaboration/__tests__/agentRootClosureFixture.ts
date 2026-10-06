import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { AgentRunCollaborationContext } from '../agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '../agentRunCollaborationIndex'
import { agentRootView, created } from './agentRootFixture'

/**
 * task-run-resources-workspace-cleanup REQ-001/004/008: a closed task execution (Task DONE) and
 * everything under it leave the listing; the tree, contexts and Team-tab messages keep them.
 */
export const closureView = (closed: Array<{ agentRunId: string } | { teamRunId: string }> = []) => {
  const view = agentRootView()
  view.execution_tree = {
    ...view.execution_tree,
    taskExecutions: [
      { address: '/computer_use_agent', agentRunId: 'writer-run', platformAgentRunId: null, delegatorAgentRunId: 'host-run', startedAt: created },
      { address: '/product_team', teamRunId: 'review-team', delegatorAgentRunId: 'host-run', startedAt: created,
        members: [
          { address: '/product_team/prototyper', agentRunId: 'rp-run', platformAgentRunId: null },
          { address: '/product_team/bootstrapper', agentRunId: 'rb-run', platformAgentRunId: null },
        ],
        taskExecutions: [
          { address: '/computer_use_agent', agentRunId: 'helper-run', platformAgentRunId: null, delegatorAgentRunId: 'rp-run', startedAt: created },
        ] },
      { address: '/computer_use_agent', agentRunId: 'other-task-run', platformAgentRunId: null, delegatorAgentRunId: 'host-run', startedAt: created },
    ],
  }
  view.closed_task_executions = closed
  view.communication_messages = { ...view.communication_messages, messages: [
    ...view.communication_messages.messages,
    { messageId: 'm-writer', senderAgentRunId: 'writer-run', receiverAgentRunId: 'host-run', content: 'Release notes drafted.',
      messageType: 'direct_message', referenceFiles: [], createdAt: created },
  ] }
  return view
}

export const buildClosureContext = (view = closureView()) => new AgentRunCollaborationContext({
  hostRunId: 'host-run', view,
  entries: [...new AgentRunCollaborationIndex(view.execution_tree).agents.values()].map((agent) => {
    const state = new AgentRunState(agent.agentRunId, { id: agent.agentRunId, messages: [], createdAt: created, updatedAt: created, agentDefinitionId: 'x', agentName: agent.address })
    state.currentStatus = AgentStatus.Offline
    return { agentRunId: agent.agentRunId, memberAddress: agent.address,
      context: new AgentContext({ agentDefinitionId: 'x', agentDefinitionName: agent.address } as never, state) }
  }),
})
