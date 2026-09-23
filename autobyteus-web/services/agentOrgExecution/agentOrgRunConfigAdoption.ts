import type { AgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'

/** Only model fields and mounted Team/configured-child workspace fields are mutable. */
export const assertAgentOrgRunConfigChange = (previous: AgentOrgExecutionTree, next: AgentOrgExecutionTree): void => {
  const masked = (tree: AgentOrgExecutionTree) => {
    const model = <T extends { llmModelIdentifier: string; llmConfig: unknown }>(launch: T): T =>
      ({ ...launch, llmModelIdentifier: '__MODEL__', llmConfig: null })
    const teamLaunch = <T extends { llmModelIdentifier: string; llmConfig: unknown; workspaceRootPath: string | null }>(launch: T): T =>
      ({ ...model(launch), workspaceRootPath: '__WORKSPACE__' })
    return { ...tree, rootOrg: { ...tree.rootOrg,
      defaultLaunchConfiguration: model(tree.rootOrg.defaultLaunchConfiguration),
      members: tree.rootOrg.members.map(member => 'agentRunId' in member
        ? { ...member, launchConfiguration: model(member.launchConfiguration) }
        : { ...member, defaultLaunchConfiguration: teamLaunch(member.defaultLaunchConfiguration),
            members: member.members.map(agent => ({ ...agent, launchConfiguration: teamLaunch(agent.launchConfiguration) })) }) } }
  }
  if (JSON.stringify(masked(previous)) !== JSON.stringify(masked(next))) {
    throw new Error('Org configuration changed topology, identity, or locked fields.')
  }
  for (const team of next.rootOrg.members) {
    if (!('teamRunId' in team)) continue
    const old = previous.rootOrg.members.find(member => member.address === team.address)
    if (!old || !('teamRunId' in old)) throw new Error('Org configured Team identity changed.')
    const root = team.defaultLaunchConfiguration.workspaceRootPath
    const changed = root !== old.defaultLaunchConfiguration.workspaceRootPath || team.members.some((agent, index) =>
      agent.launchConfiguration.workspaceRootPath !== old.members[index]!.launchConfiguration.workspaceRootPath)
    if (changed && (!root || team.members.some(agent => agent.launchConfiguration.workspaceRootPath !== root))) {
      throw new Error('Changed Team workspace must agree with every configured child.')
    }
  }
}
