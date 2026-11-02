import type { AgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'

type OrgTaskExecution = AgentOrgExecutionTree['rootOrg']['taskExecutions'][number]
type OrgAgent = { address: string; platformAgentRunId: string | null; launchConfiguration: { runtimeKind: string } }

/**
 * A delegated copy's model choice (its own, or a Team copy's and its members') is saved on the Org run, so it may
 * change with a Save (autobyteus-366); every other field of a copy stays locked.
 */
const withoutCopyChoices = (task: OrgTaskExecution): OrgTaskExecution => 'agentRunId' in task
  ? { ...task, userLaunchSelection: undefined }
  : { ...task, userTeamLaunchSelection: undefined, members: task.members.map(member => ({ ...member, userLaunchSelection: undefined })),
      taskExecutions: task.taskExecutions.map(withoutCopyChoices) }

/**
 * Only the selection (agent runtime, model, settings), mounted Team/configured-child workspace fields and copies' model
 * choices are mutable. A configured Agent whose agent runtime changed has switched or undone a pending switch
 * (autobyteus-348): the server decides its session (a switch drops it, an undo restores the original), so any session is
 * accepted for it and nothing else of its identity may differ; every other Agent keeps its session.
 */
export const assertAgentOrgRunConfigChange = (previous: AgentOrgExecutionTree, next: AgentOrgExecutionTree): void => {
  const agentsOf = (tree: AgentOrgExecutionTree): OrgAgent[] => tree.rootOrg.members.flatMap(member => 'agentRunId' in member ? [member] : member.members)
  const before = new Map(agentsOf(previous).map(agent => [agent.address, agent]))
  const switched = new Set(agentsOf(next).filter(agent => {
    const old = before.get(agent.address)
    return old !== undefined && old.launchConfiguration.runtimeKind !== agent.launchConfiguration.runtimeKind
  }).map(agent => agent.address))
  const masked = (tree: AgentOrgExecutionTree) => {
    const selection = <T extends { runtimeKind: string; llmModelIdentifier: string; llmConfig: unknown }>(launch: T): T =>
      ({ ...launch, runtimeKind: '__RUNTIME__', llmModelIdentifier: '__MODEL__', llmConfig: null })
    const teamLaunch = <T extends { runtimeKind: string; llmModelIdentifier: string; llmConfig: unknown; workspaceRootPath: string | null }>(launch: T): T =>
      ({ ...selection(launch), workspaceRootPath: '__WORKSPACE__' })
    const agent = <T extends OrgAgent & { launchConfiguration: { runtimeKind: string; llmModelIdentifier: string; llmConfig: unknown; workspaceRootPath: string | null } }>(
      value: T, launch: (launchConfiguration: T['launchConfiguration']) => T['launchConfiguration']): T =>
      ({ ...value, launchConfiguration: launch(value.launchConfiguration),
        platformAgentRunId: switched.has(value.address) ? '__SWITCHED__' : value.platformAgentRunId })
    return { ...tree, rootOrg: { ...tree.rootOrg,
      defaultLaunchConfiguration: selection(tree.rootOrg.defaultLaunchConfiguration),
      taskExecutions: tree.rootOrg.taskExecutions.map(withoutCopyChoices),
      members: tree.rootOrg.members.map(member => 'agentRunId' in member
        ? agent(member, selection)
        : { ...member, defaultLaunchConfiguration: teamLaunch(member.defaultLaunchConfiguration),
            members: member.members.map(value => agent(value, teamLaunch)),
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
