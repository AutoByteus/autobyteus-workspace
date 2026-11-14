import type { AgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'

type OrgTaskExecution = AgentOrgExecutionTree['rootOrg']['taskExecutions'][number]
type OrgAgent = { address: string; platformAgentRunId: string | null; launchConfiguration: { runtimeKind: string } }

type Selection = <T extends { runtimeKind: string; llmModelIdentifier: string; llmConfig: unknown }>(launch: T) => T
/**
 * A child row's model choice (its agent runtime, model and settings; a Team child's and its members') is its own run's
 * launch, saved by that run (autobyteus-461 SR-039), so it may change with a Save; every other field stays locked.
 */
const withoutChildChoices = (task: OrgTaskExecution, selection: Selection): OrgTaskExecution => 'agentRunId' in task
  ? { ...task, source: { ...task.source, launchConfiguration: selection(task.source.launchConfiguration) } }
  : { ...task, source: { ...task.source, defaultLaunchConfiguration: selection(task.source.defaultLaunchConfiguration),
      members: task.source.members.map(member => ({ ...member, launchConfiguration: selection(member.launchConfiguration) })) },
    taskExecutions: task.taskExecutions.map(child => withoutChildChoices(child, selection)) }

/**
 * The Org's own configuration with the rows its view shows (autobyteus-461 rule 2, CR-461-088): a run it delegated to is a
 * run of its own, so the Org's configuration read and its Save answer carry none of them (`taskExecutions` is empty);
 * its view's rows stay, and change with the view's own reads (a row event, `RUN_TREE_CHANGED`), never with a
 * configuration read. A mounted Team's rows likewise, by its address.
 */
export const withViewRows = (view: AgentOrgExecutionTree, config: AgentOrgExecutionTree): AgentOrgExecutionTree => {
  const viewTeams = new Map(view.rootOrg.members.flatMap(member => 'teamRunId' in member ? [[member.address, member] as const] : []))
  return { ...config, rootOrg: { ...config.rootOrg, taskExecutions: view.rootOrg.taskExecutions,
    members: config.rootOrg.members.map(member => 'teamRunId' in member
      ? { ...member, taskExecutions: viewTeams.get(member.address)?.taskExecutions ?? [] } : member) } }
}

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
      taskExecutions: tree.rootOrg.taskExecutions.map(task => withoutChildChoices(task, selection)),
      members: tree.rootOrg.members.map(member => 'agentRunId' in member
        ? agent(member, selection)
        : { ...member, defaultLaunchConfiguration: teamLaunch(member.defaultLaunchConfiguration),
            members: member.members.map(value => agent(value, teamLaunch)),
            taskExecutions: member.taskExecutions.map(task => withoutChildChoices(task, selection)) }) } }
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
