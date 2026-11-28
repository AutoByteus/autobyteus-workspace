import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import type { RunHistoryDelegatedRunRow } from '~/stores/runHistoryTypes'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { TeamStatus } from '~/utils/workspaceTeamAggregateStatus'

/** A tree row as the Workspaces row component shows it, with the guide lines that connect it to its siblings. */
export type RunTreeDisplayRow = Readonly<{
  tree: RunTreeRowDto
  row: RunHistoryDelegatedRunRow
  /** A team row's own status (its run's, computed by its root, SR-086 G-A4); null for an agent row. */
  teamStatus: TeamStatus | null
  continuingAncestorDepths: number[]
  hasFollowingSibling: boolean
}>

const TEAM_KINDS: ReadonlySet<RunTreeRowDto['kind']> = new Set(['team', 'peer_team', 'org_team'])
const MEMBER_KINDS: ReadonlySet<RunTreeRowDto['kind']> = new Set(['team_member', 'peer_member'])

/** Whether a row is a team's (it holds members), shown collapsed until the user expands it. */
export const isTeamRow = (row: Pick<RunTreeRowDto, 'kind'>): boolean => TEAM_KINDS.has(row.kind)

/**
 * The rows under one of a tree's rows (autobyteus-461 SR-084), in the server's order, as the row component shows them:
 * nothing about a run is derived here, only the display. A row is shown when every row above it is expanded; its status
 * is its own run's answer, read by the ID the server named (`statusOf`).
 */
export const runTreeDisplayRows = (input: Readonly<{
  rows: readonly RunTreeRowDto[]
  /** The row the list starts under (its own row is shown elsewhere, as the run's row); `null`: the tree's top rows (an Org's own parts). */
  rootKey: string | null
  /** The run the rows belong to: selection and inspection are keyed by it. */
  topRunId: string
  isExpanded(row: RunTreeRowDto): boolean
  /** An agent's status, or a team run's own, by the ID the row names; null while not answered. */
  statusOf(row: RunTreeRowDto, id: string): AgentStatus | string | null
}>): RunTreeDisplayRow[] => {
  const byKey = new Map(input.rows.map((row) => [row.key, row]))
  const children = new Map<string | null, RunTreeRowDto[]>()
  for (const row of input.rows) children.set(row.parentKey, [...children.get(row.parentKey) ?? [], row])
  const shown: { tree: RunTreeRowDto; depth: number }[] = []
  const visit = (key: string | null, depth: number): void => {
    for (const row of children.get(key) ?? []) {
      shown.push({ tree: row, depth })
      if (input.isExpanded(row)) visit(row.key, depth + 1)
    }
  }
  if (input.rootKey === null || byKey.has(input.rootKey)) visit(input.rootKey, 0)
  const delegatorName = (row: RunTreeRowDto): string | null => {
    if (MEMBER_KINDS.has(row.kind) || !row.parentKey) return null
    return byKey.get(row.parentKey)?.name ?? null
  }
  const hasSibling = (index: number, depth: number): boolean => {
    for (let next = index + 1; next < shown.length; next += 1) {
      if (shown[next]!.depth < depth) return false
      if (shown[next]!.depth === depth) return true
    }
    return false
  }
  return shown.map(({ tree, depth }, index) => {
    const team = isTeamRow(tree)
    const target = tree.openTarget
    const status = tree.statusIds[0] ? input.statusOf(tree, tree.statusIds[0]) : null
    const row: RunHistoryDelegatedRunRow = {
      kind: 'delegated_run',
      delegatedRunKind: team ? 'task_team' : MEMBER_KINDS.has(tree.kind) ? 'task_team_child' : 'task_agent',
      rowKey: tree.key,
      teamRunId: input.topRunId,
      memberAddress: tree.address ?? '',
      agentRunId: team ? null : target?.agentRunId ?? null,
      teamRunIdForNode: team ? target?.runId ?? null : null,
      memberKind: team ? 'agent_team' : 'agent',
      displayName: tree.name,
      currentStatus: team ? null : status ?? AgentStatus.Offline,
      delegatedBy: delegatorName(tree),
      depth,
      hasChildren: (children.get(tree.key)?.length ?? 0) > 0,
      openTarget: target && target.runKind !== 'agent_org' ? { ...target, runKind: target.runKind } : null,
      remote: tree.peer && target
        ? Object.freeze({ runId: target.runId, nodeName: tree.peer.nodeName, reachable: tree.peer.reachable, title: tree.peer.title })
        : null,
      ...(tree.leaving ? { leaving: true } : {}),
      // Its definition's picture (autobyteus-669); a peer's run shows the fallback (DEC-006).
      definitionId: tree.peer ? null : tree.definitionId ?? null,
    }
    return Object.freeze({
      tree, row,
      teamStatus: team ? (status === 'initializing' ? AgentStatus.Running : (status ?? AgentStatus.Offline)) as TeamStatus : null,
      continuingAncestorDepths: Array.from({ length: depth }, (_, at) => at).filter((at) => hasSibling(index, at)),
      hasFollowingSibling: hasSibling(index, depth),
    })
  })
}
