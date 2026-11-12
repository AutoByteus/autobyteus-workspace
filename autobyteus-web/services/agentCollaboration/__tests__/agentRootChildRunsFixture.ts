import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { AgentRunCollaborationContext } from '../agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '../agentRunCollaborationIndex'
import { agentRootMessages, agentRootView, created, launch } from './agentRootFixture'

/** An Agent run's view with several child rows, two of them delegated Teams (autobyteus-461 DS-8). */
const agentSource = { kind: 'agent' as const, agentDefinitionId: 'computer-use', launchConfiguration: launch }
const teamSource = { kind: 'agent_team' as const, teamDefinitionId: 'product-team', coordinatorAddress: '/product_team/prototyper', handoffs: [],
  members: [{ address: '/product_team/prototyper', agentDefinitionId: 'prototyper', launchConfiguration: launch, followsTeam: true },
    { address: '/product_team/bootstrapper', agentDefinitionId: 'bootstrapper', launchConfiguration: launch, followsTeam: true }],
  defaultLaunchConfiguration: launch }

export const childRunsView = () => {
  const view = agentRootView()
  view.execution_tree = {
    ...view.execution_tree,
    taskExecutions: [
      ...view.execution_tree.taskExecutions,
      { address: '/computer_use_agent', agentRunId: 'writer-run', platformAgentRunId: null, delegatorAgentRunId: 'host-run', startedAt: created, source: agentSource },
      { address: '/product_team', teamRunId: 'review-team', delegatorAgentRunId: 'host-run', startedAt: created,
        members: [
          { address: '/product_team/prototyper', agentRunId: 'rp-run', platformAgentRunId: null },
          { address: '/product_team/bootstrapper', agentRunId: 'rb-run', platformAgentRunId: null },
        ],
        // One hop (autobyteus-461 DS-8): a child team's own children are its own view's.
        taskExecutions: [],
        source: teamSource },
      { address: '/computer_use_agent', agentRunId: 'other-task-run', platformAgentRunId: null, delegatorAgentRunId: 'host-run', startedAt: created, source: agentSource },
    ],
  }
  return view
}

export const buildChildRunsContext = (view = childRunsView()) => new AgentRunCollaborationContext({
  hostRunId: 'host-run', view,
  // Its children on this node and on peer nodes, each with its context.
  entries: (() => {
    const index = new AgentRunCollaborationIndex(view.execution_tree, view.remote_task_executions)
    return [...index.agents.values(), ...index.remoteAgents.values()]
  })().map((agent) => {
    const state = new AgentRunState(agent.agentRunId, { id: agent.agentRunId, messages: [], createdAt: created, updatedAt: created, agentDefinitionId: 'x', agentName: agent.address })
    state.currentStatus = AgentStatus.Offline
    return { agentRunId: agent.agentRunId, memberAddress: agent.address,
      context: new AgentContext({ agentDefinitionId: 'x', agentDefinitionName: agent.address } as never, state) }
  }),
})

/** The root's stored messages beside the base fixture's (autobyteus-358: loaded per participant). */
export const childRunsMessages = Object.freeze([...agentRootMessages,
  { messageId: 'm-writer', senderAgentRunId: 'writer-run', receiverAgentRunId: 'host-run', content: 'Release notes drafted.',
    messageType: 'direct_message', referenceFiles: [], createdAt: created }])
