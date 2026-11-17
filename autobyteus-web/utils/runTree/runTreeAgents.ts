import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import type { CollaborationMessageMemberIdentity } from '~/types/workspace/collaborationMessagesContextView'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import { subjectOfTarget, type DelegatedRunSubject } from '~/services/delegatedRuns/delegatedRunSubjects'
import { isTeamRow } from '~/utils/runTree/runTreeDisplayRows'

/**
 * The tree row that shows one agent (autobyteus-461 SR-084): an agent row, a member row or a peer agent row, found by the
 * agent its open target focuses. A team row names its coordinator there, so it never shows an agent; null when none does.
 */
export const treeRowOfAgent = (rows: readonly RunTreeRowDto[], agentRunId: string): RunTreeRowDto | null =>
  rows.find((row) => !isTeamRow(row) && row.openTarget?.agentRunId === agentRunId) ?? null

/**
 * The run a tree row opens as a run of its own (rule 2), read from its open target, as the server built it: a run on this
 * node, or a peer's run by its own identity on its node (G-D1); null for the view's own parts (its run's own ID).
 */
export const delegatedSubjectOfRow = (row: RunTreeRowDto, ownRunId: string): DelegatedRunSubject | null => {
  const target = row.openTarget
  if (!target || target.runKind === 'agent_org' || (!target.nodeId && target.runId === ownRunId)) return null
  return subjectOfTarget({ runKind: target.runKind, runId: target.runId, agentRunId: target.agentRunId, nodeId: target.nodeId }, row.address ?? '')
}

/**
 * An agent of a run in a view's tree, as its Team tab names it: at its address, with the run it belongs to (a team
 * member's team run; else the view's own run hosts it). Null when the tree has no row for it.
 */
export const treeAgentIdentity = (rows: readonly RunTreeRowDto[], agentRunId: string, viewRunId: string): CollaborationMessageMemberIdentity | null => {
  const row = treeRowOfAgent(rows, agentRunId)
  const target = row?.openTarget
  if (!row?.address || !target) return null
  const teamRunId = target.runKind === 'agent_team' ? target.runId : null
  return Object.freeze({ kind: 'delegated', address: row.address, label: memberDisplayName(row.address),
    runId: teamRunId ?? viewRunId, executionRunId: teamRunId ?? agentRunId })
}

/** A Team run's own coordinator, from its tree: where the Team shows while a run it delegated is selected under it. */
export const teamCoordinatorFocusOf = (rows: readonly RunTreeRowDto[], teamRunId: string): Readonly<{
  teamRunId: string; memberAddress: string; agentRunId: string }> | null => {
  const coordinator = rows.find((row) => row.key === `team:${teamRunId}`)?.openTarget?.agentRunId
  const member = coordinator ? rows.find((row) => row.kind === 'team_member' && row.openTarget?.runId === teamRunId
    && row.openTarget.agentRunId === coordinator) : undefined
  return member?.address ? Object.freeze({ teamRunId, memberAddress: member.address, agentRunId: coordinator! }) : null
}

/**
 * The team rows a tree must unfold to show an agent's row (CR-461-108): every team row above it, below the run's own row
 * (`ownKey`), the delegated team that holds it as a coordinator or member included. Empty when the tree does not show it.
 */
export const teamRowsAboveAgent = (rows: readonly RunTreeRowDto[], agentRunId: string, ownKey: string): string[] => {
  const byKey = new Map(rows.map((row) => [row.key, row]))
  const keys: string[] = []
  for (let above = byKey.get(treeRowOfAgent(rows, agentRunId)?.parentKey ?? ''); above && above.key !== ownKey; above = byKey.get(above.parentKey ?? '')) {
    if (isTeamRow(above)) keys.unshift(above.key)
  }
  return keys
}

/**
 * The rows a tree must unfold to show a picked row's agent (CR-461-108): every row above it, outermost first, and the
 * picked row itself when it is a team row (it opens at its coordinator, shown under it). Empty when the row is not shown.
 */
export const rowsToUnfoldFor = (rows: readonly RunTreeRowDto[], pickedKey: string): RunTreeRowDto[] => {
  const byKey = new Map(rows.map((row) => [row.key, row]))
  const picked = byKey.get(pickedKey)
  if (!picked) return []
  const out = isTeamRow(picked) ? [picked] : []
  for (let above = byKey.get(picked.parentKey ?? ''); above; above = byKey.get(above.parentKey ?? '')) out.unshift(above)
  return out
}
