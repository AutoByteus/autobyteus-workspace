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
