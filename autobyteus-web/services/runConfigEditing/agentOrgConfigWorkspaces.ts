import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import type { AgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'
import type { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext'
import { assertAgentOrgRunConfigChange } from '~/services/agentOrgExecution/agentOrgRunConfigAdoption'
import { useRunHistoryStore } from '~/stores/runHistoryStore'

/**
 * The workspaces a stopped Org's new configuration names that its agents do not hold yet, by root path (split from
 * `agentOrgContextsStore`, autobyteus-541 D-E1). The read carries the Org's own configuration only; its view's rows are
 * its delegated runs' (CR-461-088). It stops reading once `isCurrent` is false.
 */
export const prepareAgentOrgConfigWorkspaces = async (org: AgentOrgExecutionContext, tree: AgentOrgExecutionTree,
  isCurrent: () => boolean): Promise<ReadonlyMap<string, WorkspaceMetadata | null>> => {
  assertAgentOrgRunConfigChange(org.executionTree, tree)
  const roots = new Set<string>()
  for (const member of tree.rootOrg.members) {
    const agents = 'agentRunId' in member ? [member] : member.members
    for (const agent of agents) {
      const old = org.index.requireAgent(agent.agentRunId).source.launchConfiguration.workspaceRootPath
      const config = org.getAgentContext(agent.agentRunId)?.config
      const root = agent.launchConfiguration.workspaceRootPath
      if (root && (root !== old || !config?.workspaceId || !config.workspaceMetadata)) roots.add(root)
    }
  }
  const metadata = new Map<string, WorkspaceMetadata | null>()
  for (const root of roots) {
    const resolved = await useRunHistoryStore().resolveWorkspaceMetadataByRootPath(root).catch(() => null)
    if (!isCurrent()) return metadata
    metadata.set(root, resolved)
  }
  return metadata
}
