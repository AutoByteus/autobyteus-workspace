import { computed } from 'vue'
import { useRemoteRunView } from '~/composables/remoteRuns/useRemoteRunView'
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget'

/**
 * The binding of one open target to its conversation (`AgentEventMonitor`), for every surface that shows it: the
 * desktop's agent and Team member surfaces and the phone's run screen (autobyteus-277). It owns the agent's display
 * name, whether the composer is read-only, the sender names of inter-agent messages and the remote-run view (278).
 */
export const useTargetConversation = (target: () => ActiveAgentWorkspaceTarget) => {
  /** A Team member: its agent's name, else its address's last part, else the Team's; any other agent: its name. */
  const displayName = computed(() => {
    const current = target()
    const agentName = current.context.config.agentDefinitionName
    if (!('team' in current)) return agentName || 'Agent'
    return agentName
      || current.team.focusedMemberAddress.split('/').at(-1)?.replace(/[_-]+/g, ' ')
      || current.team.teamDefinitionName
  })

  /**
   * Read-only unless the Org's own agents can still be continued: a submission in flight, an Org's direct agent or an
   * Org Team's member (the desktop's two surfaces each receive only their own of these kinds).
   */
  const readOnly = computed(() => {
    const current = target()
    return current.access === 'read_only' && !('root' in current && (current.context.submissionPending
      || current.kind === 'agent_org_direct_agent' || current.kind === 'agent_org_team_member'))
  })

  const senderNameByAgentRunId = computed<Readonly<Record<string, string>>>(() => {
    const current = target()
    return 'collaborationMessages' in current
      ? Object.freeze(Object.fromEntries(Object.entries(current.collaborationMessages.memberIdentityByAgentRunId())
        .map(([agentRunId, identity]) => [agentRunId, identity.label])))
      : Object.freeze({})
  })

  const remoteView = useRemoteRunView({ agentRunId: () => target().context.state.runId, agentName: displayName })

  return { displayName, readOnly, senderNameByAgentRunId, remoteView }
}
