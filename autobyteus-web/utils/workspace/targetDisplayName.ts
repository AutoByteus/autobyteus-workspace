import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget'

/**
 * The name the view shows for an open target's agent: a Team member's agent name, else its address's last part, else
 * the Team's name; any other agent: its name. The conversation header and the Stop messages use it (autobyteus-533 D-W5).
 */
export const targetDisplayName = (target: ActiveAgentWorkspaceTarget): string => {
  const agentName = target.context.config.agentDefinitionName
  if (!('team' in target)) return agentName || 'Agent'
  return agentName
    || target.team.focusedMemberAddress.split('/').at(-1)?.replace(/[_-]+/g, ' ')
    || target.team.teamDefinitionName
}
