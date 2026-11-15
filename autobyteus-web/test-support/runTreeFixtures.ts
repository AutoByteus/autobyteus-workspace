import type { RunTreeDto, RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'

// The same identities as `agentRootMultiTeamFixture` (kept here so this file imports no store or service).
const teamId = (copy: number) => `software-team-${copy}`
const memberId = (copy: number, member: number) => `${teamId(copy)}-member-${member}`
const memberNames = ['solution_designer', 'architecture_reviewer', 'implementation_engineer', 'code_reviewer', 'api_e2e_engineer', 'delivery_engineer']

/**
 * A run's tree as the server builds it (autobyteus-461 SR-084), for web specs: rows only, with their keys, targets and
 * status IDs. The rows mirror `multiTeamView`: the run's own agent, then its delegated Team copies with their members.
 */
export const agentRow = (agentRunId: string, parentKey: string | null, depth: number, name = agentRunId): RunTreeRowDto => ({
  key: `agent:${agentRunId}`, parentKey, depth, kind: 'agent', name, address: `/${agentRunId}`,
  openTarget: { runKind: 'agent', runId: agentRunId, agentRunId }, statusIds: [agentRunId],
})

export const teamRows = (teamRunId: string, parentKey: string, depth: number, members: readonly string[], coordinator = members[0]!): RunTreeRowDto[] => [
  { key: `team:${teamRunId}`, parentKey, depth, kind: 'team', name: 'software engineering team', address: '/software_engineering_team',
    openTarget: { runKind: 'agent_team', runId: teamRunId, agentRunId: coordinator }, statusIds: [teamRunId] },
  ...members.map((agentRunId, index): RunTreeRowDto => ({
    key: `team_member:${teamRunId}:${agentRunId}`, parentKey: `team:${teamRunId}`, depth: depth + 1, kind: 'team_member',
    name: (memberNames[index] ?? agentRunId).replace(/_/g, ' '), address: `/software_engineering_team/${memberNames[index] ?? agentRunId}`,
    openTarget: { runKind: 'agent_team', runId: teamRunId, agentRunId }, statusIds: [agentRunId],
  })),
]

/** `multiTeamView`'s tree: the run's own agent and `count` delegated Team copies of six members, each at its coordinator. */
export const multiTeamTree = (count = 7, hostRunId = 'host-run'): RunTreeDto => ({
  kind: 'agent', runId: hostRunId,
  rows: [agentRow(hostRunId, null, 0, 'project task manager'), ...Array.from({ length: count }, (_, copy) =>
    teamRows(teamId(copy), `agent:${hostRunId}`, 1, memberNames.map((_name, member) => memberId(copy, member)),
      memberId(copy, memberNames.indexOf('solution_designer')))).flat()],
})

/** An Apollo client whose `runTree` answers come from `trees` (by `kind:runId`); every other query is refused. */
export const runTreeApollo = (trees: (kind: string, runId: string) => RunTreeDto | null) => ({
  query: async ({ variables }: { variables: { kind: string; runId: string } }) => ({ data: { runTree: trees(variables.kind, variables.runId) } }),
})

type OrgTree = import('@autobyteus/collaboration-stream-contracts').AgentOrgExecutionTreeDto
type OrgTask = OrgTree['rootOrg']['taskExecutions'][number]
type Closed = readonly (Readonly<{ agentRunId: string }> | Readonly<{ teamRunId: string }>)[]

/**
 * What the server's `RunTreeView` sends for an Org run whose recorded tree is `tree` (SR-084), for web specs whose
 * fixtures hold Org execution trees: its own agents and mounted teams (opening in the Org), then each run it delegated
 * under the agent or member that delegated it; closed runs (and everything under them) are not in the tree.
 */
export const orgRunTreeRows = (orgRunId: string, tree: OrgTree, closed: Closed = []): RunTreeRowDto[] => {
  const rows: RunTreeRowDto[] = []
  const anchors = new Map<string, Readonly<{ key: string; depth: number }>>()
  const closedIds = new Set(closed.map((reference) => 'agentRunId' in reference ? reference.agentRunId : reference.teamRunId))
  const nameOf = (address: string) => address.split('/').filter(Boolean).at(-1)?.replace(/[_-]+/g, ' ') ?? address
  const inOrg = (agentRunId: string) => ({ runKind: 'agent_org' as const, runId: orgRunId, agentRunId })
  const push = (row: RunTreeRowDto, anchorAgentRunId?: string) => {
    rows.push(row)
    if (anchorAgentRunId) anchors.set(anchorAgentRunId, { key: row.key, depth: row.depth })
  }
  const teamTasks: OrgTask[] = []
  for (const member of tree.rootOrg.members) {
    if ('agentRunId' in member) {
      push({ key: `org_agent:${orgRunId}:${member.agentRunId}`, parentKey: null, depth: 0, kind: 'org_agent', name: nameOf(member.address),
        address: member.address, openTarget: inOrg(member.agentRunId), statusIds: [member.agentRunId] }, member.agentRunId)
      continue
    }
    const coordinator = member.members.find((candidate) => candidate.address === member.coordinatorAddress) ?? member.members[0]!
    push({ key: `org_team:${member.teamRunId}`, parentKey: null, depth: 0, kind: 'org_team', name: nameOf(member.address), address: member.address,
      openTarget: inOrg(coordinator.agentRunId), statusIds: member.members.map((candidate) => candidate.agentRunId) })
    for (const agent of member.members) {
      push({ key: `team_member:${member.teamRunId}:${agent.agentRunId}`, parentKey: `org_team:${member.teamRunId}`, depth: 1, kind: 'team_member',
        name: nameOf(agent.address), address: agent.address, openTarget: inOrg(agent.agentRunId), statusIds: [agent.agentRunId] }, agent.agentRunId)
    }
    teamTasks.push(...member.taskExecutions)
  }
  const visit = (tasks: readonly OrgTask[]) => {
    for (const task of tasks) {
      if (closedIds.has('agentRunId' in task ? task.agentRunId : task.teamRunId)) continue
      const anchor = (task.delegatorAgentRunId && anchors.get(task.delegatorAgentRunId)) || null
      const depth = anchor ? anchor.depth + 1 : 0
      if ('agentRunId' in task) {
        push({ key: `agent:${task.agentRunId}`, parentKey: anchor?.key ?? null, depth, kind: 'agent', name: nameOf(task.address), address: task.address,
          openTarget: task.openTarget ?? { runKind: 'agent', runId: task.agentRunId, agentRunId: task.agentRunId }, statusIds: [task.agentRunId] }, task.agentRunId)
        continue
      }
      push({ key: `team:${task.teamRunId}`, parentKey: anchor?.key ?? null, depth, kind: 'team', name: nameOf(task.address), address: task.address,
        openTarget: task.openTarget ?? (task.members[0] ? { runKind: 'agent_team', runId: task.teamRunId, agentRunId: task.members[0].agentRunId } : null),
        statusIds: [task.teamRunId] })
      for (const agent of task.members) {
        push({ key: `team_member:${task.teamRunId}:${agent.agentRunId}`, parentKey: `team:${task.teamRunId}`, depth: depth + 1, kind: 'team_member',
          name: nameOf(agent.address), address: agent.address, openTarget: { runKind: 'agent_team', runId: task.teamRunId, agentRunId: agent.agentRunId },
          statusIds: [agent.agentRunId] }, agent.agentRunId)
      }
      visit(task.taskExecutions)
    }
  }
  visit([...tree.rootOrg.taskExecutions, ...teamTasks])
  return rows
}

/** Seeds each Org run's tree as its open view's stream would feed it (SR-084), from the run's recorded tree. */
export const seedOrgRunTrees = (trees: Readonly<{ streamSnapshot(ref: Readonly<{ kind: 'agent_org'; runId: string }>, rows: readonly RunTreeRowDto[]): void }>,
  runs: readonly Readonly<{ rootRunId: string; executionTree: OrgTree; closedTaskExecutions?: Closed }>[]): void => {
  for (const run of runs) trees.streamSnapshot({ kind: 'agent_org', runId: run.rootRunId }, orgRunTreeRows(run.rootRunId, run.executionTree, run.closedTaskExecutions))
}
