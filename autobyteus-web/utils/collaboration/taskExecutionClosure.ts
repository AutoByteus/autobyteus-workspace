import type { TaskExecutionReferenceDto } from '@autobyteus/collaboration-stream-contracts'
import type { TeamTaskExecutionReferenceDto } from '@autobyteus/team-stream-contracts'

/**
 * Task closure (DONE) in the Workspaces listing, shared by the Agent, Team and Org roots.
 * The execution tree is never filtered: a root view keeps every node and participant. Only its
 * listing leaves out each closed task execution and everything under it.
 */
export type TaskExecutionReference = TaskExecutionReferenceDto

export const agentRunKey = (agentRunId: string): string => `agent:${agentRunId}`
export const teamRunKey = (teamRunId: string): string => `team:${teamRunId}`

export const taskExecutionReferenceKey = (reference: TaskExecutionReference): string =>
  'agentRunId' in reference ? agentRunKey(reference.agentRunId) : teamRunKey(reference.teamRunId)

/** The Team stream's snake-case reference, in the shared shape. */
export const fromTeamTaskExecutionReference = (reference: TeamTaskExecutionReferenceDto): TaskExecutionReference =>
  'agent_run_id' in reference ? { agentRunId: reference.agent_run_id } : { teamRunId: reference.team_run_id }

/** Adds newly closed references, keeping each once (a repeated DONE re-publishes the same ones). */
export const mergeClosedTaskExecutions = (
  current: readonly TaskExecutionReference[],
  added: readonly TaskExecutionReference[],
): TaskExecutionReference[] => {
  const keys = new Set(current.map(taskExecutionReferenceKey))
  const merged = [...current]
  for (const reference of added) {
    const key = taskExecutionReferenceKey(reference)
    if (keys.has(key)) continue
    keys.add(key)
    merged.push(reference)
  }
  return merged
}

/** How one root's tree is walked: the run key of a node (`agent:` / `team:`) and its child nodes. */
export type TaskExecutionTreeWalk<Node> = Readonly<{
  keyOf(node: Node): string
  childrenOf(node: Node): readonly Node[]
}>

/**
 * The closed-subtree rule: every node at or under a closed task execution is not listed. Returns,
 * for each unlisted node's run key, the outermost closed task execution that hides it.
 */
export const collectClosedSubtrees = <Node>(
  roots: readonly Node[],
  closed: readonly TaskExecutionReference[],
  walk: TaskExecutionTreeWalk<Node>,
): ReadonlyMap<string, Node> => {
  const hidden = new Map<string, Node>()
  if (!closed.length) return hidden
  const closedKeys = new Set(closed.map(taskExecutionReferenceKey))
  const visit = (node: Node, closedAncestor: Node | null): void => {
    const key = walk.keyOf(node)
    const outermost = closedAncestor ?? (closedKeys.has(key) ? node : null)
    if (outermost) hidden.set(key, outermost)
    walk.childrenOf(node).forEach((child) => visit(child, outermost))
  }
  roots.forEach((root) => visit(root, null))
  return hidden
}

/** A node of the collaboration contracts' trees (Agent and Org roots): Agents, and Teams with members and task executions. */
export type CollaborationTreeNode = Readonly<{ agentRunId: string; delegatorAgentRunId?: string }>
  | Readonly<{ teamRunId: string; members: readonly unknown[]; taskExecutions?: readonly unknown[]; delegatorAgentRunId?: string }>

export const collaborationTreeWalk: TaskExecutionTreeWalk<CollaborationTreeNode> = Object.freeze({
  keyOf: (node: CollaborationTreeNode) => 'agentRunId' in node ? agentRunKey(node.agentRunId) : teamRunKey(node.teamRunId),
  childrenOf: (node: CollaborationTreeNode) => 'agentRunId' in node
    ? []
    : [...node.members, ...(node.taskExecutions ?? [])] as readonly CollaborationTreeNode[],
})
