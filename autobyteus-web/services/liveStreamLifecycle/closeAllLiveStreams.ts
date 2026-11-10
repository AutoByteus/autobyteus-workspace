import { useAgentRunStore } from '~/stores/agentRunStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useWorkspaceStore } from '~/stores/workspace'

/**
 * Closes every live stream this page holds, and the reconnection of each: agent runs, Team runs, collaboration hosts,
 * Orgs and file explorers (autobyteus-435 REQ-010 (b)). The phone calls it when its session ends, so a page whose
 * credential is gone sends nothing more to the node. Each registry closes its own streams; nothing here reaches a
 * service. Stores never import this file.
 */
export const closeAllLiveStreams = (): void => {
  useAgentRunStore().disconnectAllAgentStreams()
  useAgentTeamRunStore().disconnectAllTeamStreams()
  useAgentRunCollaborationStore().releaseAll()
  useAgentOrgContextsStore().releaseAll()
  useWorkspaceStore().disconnectAllFileExplorerLiveStreams()
}
