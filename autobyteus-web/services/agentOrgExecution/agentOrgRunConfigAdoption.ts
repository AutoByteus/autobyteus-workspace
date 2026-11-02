import type { AgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'

type OrgTaskExecution = AgentOrgExecutionTree['rootOrg']['taskExecutions'][number]

/**
 * A delegated copy's model choice (its own, or a Team copy's and its members') is saved on the Org run, so it may
 * change with a Save (autobyteus-366); every other field of a copy stays locked.
 */
const withoutCopyChoices = (task: OrgTaskExecution): OrgTaskExecution => 'agentRunId' in task
  ? { ...task, userLaunchSelection: undefined }
  : { ...task, userTeamLaunchSelection: undefined, members: task.members.map(member => ({ ...member, userLaunchSelection: undefined })),
      taskExecutions: task.taskExecutions.map(withoutCopyChoices) }

/** Only model fields, mounted Team/configured-child workspace fields and copies' model choices are mutable. */
export const assertAgentOrgRunConfigChange = (previous: AgentOrgExecutionTree, next: AgentOrgExecutionTree): void => {
  const masked = (tree: AgentOrgExecutionTree) => {
    const model = <T extends { llmModelIdentifier: string; llmConfig: unknown }>(launch: T): T =>
      ({ ...launch, llmModelIdentifier: '__MODEL__', llmConfig: null })
    const teamLaunch = <T extends { llmModelIdentifier: string; llmConfig: unknown; workspaceRootPath: string | null }>(launch: T): T =>
      ({ ...model(launch), workspaceRootPath: '__WORKSPACE__' })
    return { ...tree, rootOrg: { ...tree.rootOrg,
      defaultLaunchConfiguration: model(tree.rootOrg.defaultLaunchConfiguration),
      taskExecutions: tree.rootOrg.taskExecutions.map(withoutCopyChoices),
      members: tree.rootOrg.members.map(member => 'agentRunId' in member
        ? { ...member, launchConfiguration: model(member.launchConfiguration) }
        : { ...member, defaultLaunchConfiguration: teamLaunch(member.defaultLaunchConfiguration),
            members: member.members.map(agent => ({ ...agent, launchConfiguration: teamLaunch(agent.launchConfiguration) })),
            taskExecutions: member.taskExecutions.map(withoutCopyChoices) }) } }
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
