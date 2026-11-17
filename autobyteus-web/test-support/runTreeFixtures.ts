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
export const multiTeamTree = (count = 7, runId = 'host-run'): RunTreeDto => ({
  kind: 'agent', runId: runId,
  rows: [agentRow(runId, null, 0, 'project task manager'), ...Array.from({ length: count }, (_, copy) =>
    teamRows(teamId(copy), `agent:${runId}`, 1, memberNames.map((_name, member) => memberId(copy, member)),
      memberId(copy, memberNames.indexOf('solution_designer')))).flat()],
})

/** An Apollo client whose `runTree` answers come from `trees` (by `kind:runId`); every other query is refused. */
export const runTreeApollo = (trees: (kind: string, runId: string) => RunTreeDto | null) => ({
  query: async ({ variables }: { variables: { kind: string; runId: string } }) => ({ data: { runTree: trees(variables.kind, variables.runId) } }),
})

type OrgTree = import('@autobyteus/collaboration-stream-contracts').AgentOrgExecutionTreeDto
type LaunchDto = OrgTree['rootOrg']['defaultLaunchConfiguration']
type LaunchSource = import('@autobyteus/collaboration-stream-contracts').CollaborationLaunchConfigurationSourceDto
type RowTarget = Readonly<{ runKind: 'agent' | 'agent_team'; runId: string; agentRunId: string }>
/**
 * A delegated run as a spec records it under its delegator (the shape base's views nested; no view carries it now:
 * `orgRunTreeRows` and `agentRunTreeRows` turn it into the tree rows the server sends).
 */
type CollaborationTask = Readonly<{ address: string; delegatorAgentRunId?: string; startedAt: string; openTarget?: RowTarget | null }> & (
  | Readonly<{ agentRunId: string; platformAgentRunId: string | null;
    source: Readonly<{ kind: 'agent'; agentDefinitionId: string; launchConfiguration: LaunchDto; launchSource?: LaunchSource }> }>
  | Readonly<{ teamRunId: string; members: readonly Readonly<{ address: string; agentRunId: string; platformAgentRunId: string | null }>[];
    taskExecutions: readonly CollaborationTask[];
    source: Readonly<{ kind: 'agent_team'; teamDefinitionId: string; coordinatorAddress: string; handoffs: readonly unknown[];
      defaultLaunchConfiguration: LaunchDto; defaultLaunchSource?: LaunchSource;
      members: readonly Readonly<{ address: string; agentDefinitionId: string; launchConfiguration: LaunchDto; launchSource?: LaunchSource }>[] }> }>
)
type OrgTask = CollaborationTask
/**
 * An Org run's tree as a spec records it: its own parts, and the runs it delegated (`taskExecutions`, as base's views
 * nested them). The app's views carry only the own parts (`ownOrgTree`); the delegated ones become tree rows.
 */
export type RecordedOrgTree = Omit<OrgTree, 'rootOrg'> & Readonly<{ rootOrg: Omit<OrgTree['rootOrg'], 'members'> & Readonly<{
  members: readonly (OrgTree['rootOrg']['members'][number] & Readonly<{ taskExecutions?: readonly OrgTask[] }>)[]
  taskExecutions?: readonly OrgTask[]
}> }>
type Closed = readonly (Readonly<{ agentRunId: string }> | Readonly<{ teamRunId: string }>)[]

/** A recorded Org tree's own parts, as the app's views and history reads carry it (SR-084). */
export const ownOrgTree = (tree: RecordedOrgTree): OrgTree => {
  const { taskExecutions: _delegated, ...rootOrg } = tree.rootOrg
  return { ...tree, rootOrg: { ...rootOrg, members: rootOrg.members.map((member) => {
    if (!('teamRunId' in member)) return member
    const { taskExecutions: _memberDelegated, ...own } = member
    return own
  }) } } as OrgTree
}

/**
 * What the server's `RunTreeView` sends for an Org run whose recorded tree is `tree` (SR-084), for web specs whose
 * fixtures hold Org execution trees: its own agents and mounted teams (opening in the Org), then each run it delegated
 * under the agent or member that delegated it; closed runs (and everything under them) are not in the tree.
 */
export const orgRunTreeRows = (orgRunId: string, tree: RecordedOrgTree, closed: Closed = []): RunTreeRowDto[] => {
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
    teamTasks.push(...member.taskExecutions ?? [])
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
  visit([...tree.rootOrg.taskExecutions ?? [], ...teamTasks])
  return rows
}

/** Seeds each Org run's tree as its open view's stream would feed it (SR-084), from the run's recorded tree. */
export const seedOrgRunTrees = (trees: Readonly<{ streamSnapshot(ref: Readonly<{ kind: 'agent_org'; runId: string }>, rows: readonly RunTreeRowDto[]): void }>,
  runs: readonly Readonly<{ rootRunId: string; executionTree: RecordedOrgTree; closedTaskExecutions?: Closed }>[]): void => {
  for (const run of runs) trees.streamSnapshot({ kind: 'agent_org', runId: run.rootRunId }, orgRunTreeRows(run.rootRunId, run.executionTree, run.closedTaskExecutions))
}

type RowLaunch = NonNullable<RunTreeRowDto['launch']>
const rowLaunchOf = (launch: Readonly<{ runtimeKind: string; llmModelIdentifier: string; llmConfig: unknown; autoExecuteTools: boolean; workspaceRootPath?: string | null }>,
  source: unknown, ownSource: boolean): RowLaunch => ({ runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier,
  llmConfig: (launch.llmConfig ?? null) as RowLaunch['llmConfig'], autoExecuteTools: launch.autoExecuteTools, workspaceRootPath: launch.workspaceRootPath ?? null,
  source: (source ?? null) as RowLaunch['source'], ownSource })

/**
 * What the server's `RunTreeView` sends for an agent run whose recorded delegations are `tasks` (SR-084), for web specs
 * whose fixtures hold an agent run's view: its own agent, then each run it delegated under the agent or member that
 * delegated it, each with its launch and origin as its record has them.
 */
export const agentRunTreeRows = (runId: string, tasks: readonly CollaborationTask[]): RunTreeRowDto[] => {
  const rows: RunTreeRowDto[] = [agentRow(runId, null, 0)]
  const anchors = new Map<string, Readonly<{ key: string; depth: number }>>([[runId, { key: `agent:${runId}`, depth: 0 }]])
  const nameOf = (address: string) => address.split('/').filter(Boolean).at(-1)?.replace(/[_-]+/g, ' ') ?? address
  const visit = (list: readonly CollaborationTask[]) => {
    for (const task of list) {
      const anchor = (task.delegatorAgentRunId && anchors.get(task.delegatorAgentRunId)) || anchors.get(runId)!
      if ('agentRunId' in task) {
        const row: RunTreeRowDto = { key: `agent:${task.agentRunId}`, parentKey: anchor.key, depth: anchor.depth + 1, kind: 'agent', name: nameOf(task.address),
          address: task.address, openTarget: { runKind: 'agent', runId: task.agentRunId, agentRunId: task.agentRunId }, statusIds: [task.agentRunId],
          launch: rowLaunchOf(task.source.launchConfiguration, task.source.launchSource, true) }
        rows.push(row)
        anchors.set(task.agentRunId, { key: row.key, depth: row.depth })
        continue
      }
      const source = task.source
      const coordinator = task.members.find((member) => member.address === source.coordinatorAddress) ?? task.members[0]
      const teamKey = `team:${task.teamRunId}`
      rows.push({ key: teamKey, parentKey: anchor.key, depth: anchor.depth + 1, kind: 'team', name: nameOf(task.address), address: task.address,
        openTarget: coordinator ? { runKind: 'agent_team', runId: task.teamRunId, agentRunId: coordinator.agentRunId } : null, statusIds: [task.teamRunId],
        launch: rowLaunchOf(source.defaultLaunchConfiguration, source.defaultLaunchSource, true) })
      for (const member of task.members) {
        const recorded = source.members.find((candidate) => candidate.address === member.address)
        const key = `team_member:${task.teamRunId}:${member.agentRunId}`
        rows.push({ key, parentKey: teamKey, depth: anchor.depth + 2, kind: 'team_member', name: nameOf(member.address), address: member.address,
          openTarget: { runKind: 'agent_team', runId: task.teamRunId, agentRunId: member.agentRunId }, statusIds: [member.agentRunId],
          ...(recorded ? { launch: rowLaunchOf(recorded.launchConfiguration, recorded.launchSource ?? source.defaultLaunchSource, Boolean(recorded.launchSource)) } : {}) })
        anchors.set(member.agentRunId, { key, depth: anchor.depth + 2 })
      }
      visit(task.taskExecutions)
    }
  }
  visit(tasks)
  return rows
}

/** A peer's run as its node last answered it (`null` while not answered), for a peer row's `peer`. */
export type PeerAnswer = Readonly<{ nodeId?: string; nodeName?: string; reachable?: boolean | null; title?: string | null }>
const peerOf = (answer: PeerAnswer = {}) => ({ nodeId: answer.nodeId ?? 'node-b', nodeName: answer.nodeName ?? 'Node B',
  title: answer.title ?? null, reachable: answer.reachable ?? null })

/** A peer agent run's row (autobyteus-461 G-D1): it opens on its node, by its own identity. */
export const peerAgentRow = (agentRunId: string, parentKey: string | null, answer: PeerAnswer = {}, address = '/market_researcher'): RunTreeRowDto => {
  const peer = peerOf(answer)
  return { key: `peer_agent:${agentRunId}`, parentKey, depth: parentKey ? 1 : 0, kind: 'peer_agent', name: address.slice(1).replace(/_/g, ' '), address,
    openTarget: { runKind: 'agent', runId: agentRunId, agentRunId, nodeId: peer.nodeId }, statusIds: [agentRunId], peer }
}

/** A peer team run's rows: the team (opening at its coordinator, the first member) and its members, each opening on its node. */
export const peerTeamRows = (teamRunId: string, parentKey: string | null, members: readonly Readonly<{ agentRunId: string; address: string }>[],
  answer: PeerAnswer = {}): RunTreeRowDto[] => {
  const peer = peerOf(answer)
  const key = `peer_team:${teamRunId}`
  const depth = parentKey ? 1 : 0
  const target = (agentRunId: string) => ({ runKind: 'agent_team' as const, runId: teamRunId, agentRunId, nodeId: peer.nodeId })
  return [
    { key, parentKey, depth, kind: 'peer_team', name: 'studio team', address: '/studio_team', openTarget: target(members[0]!.agentRunId), statusIds: [teamRunId], peer },
    ...members.map((member): RunTreeRowDto => ({ key: `peer_member:${teamRunId}:${member.agentRunId}`, parentKey: key, depth: depth + 1, kind: 'peer_member',
      name: member.address.split('/').at(-1)!.replace(/_/g, ' '), address: member.address, openTarget: target(member.agentRunId), statusIds: [member.agentRunId], peer })),
  ]
}

/** Seeds an agent run's tree with these peer rows, as its open view's stream would feed it. */
export const seedPeerRows = (trees: Readonly<{ streamSnapshot(ref: Readonly<{ kind: 'agent'; runId: string }>, rows: readonly RunTreeRowDto[]): void }>,
  runId: string, rows: readonly RunTreeRowDto[]): void => {
  trees.streamSnapshot({ kind: 'agent', runId: runId }, [agentRow(runId, null, 0), ...rows])
}
