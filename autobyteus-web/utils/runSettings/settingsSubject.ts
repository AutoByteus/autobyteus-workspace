import type { RunMemberNode } from './runMemberTree'

/**
 * The one agent Settings show, and the group it belongs to (autobyteus-366):
 * - the run's own agent (a standalone run): the root card; it has no group;
 * - a member of the run (a Team's or an Org's, in a placed team too): its row; its group is the run;
 * - a delegated copy (local or remote): its row; a member of a Team copy has that Team copy as its group;
 * - no row for the focused agent (nothing focused, not loaded yet, an unknown ID): no subject, so the run's group
 *   view shows, never an empty page.
 */
export type SettingsSubject =
  | Readonly<{ origin: 'root'; subject: 'root'; group: null }>
  | Readonly<{ origin: 'member'; subject: RunMemberNode; group: 'root' }>
  | Readonly<{ origin: 'delegated'; subject: RunMemberNode; group: RunMemberNode | null }>
  | Readonly<{ origin: 'none'; subject: null; group: 'root' }>

const NO_SUBJECT: SettingsSubject = Object.freeze({ origin: 'none', subject: null, group: 'root' })

const findAgent = (nodes: readonly RunMemberNode[], agentRunId: string): RunMemberNode | null => {
  for (const node of nodes) {
    if (node.agentRunId === agentRunId) return node
    const child = findAgent(node.children, agentRunId)
    if (child) return child
  }
  return null
}

export const resolveSettingsSubject = (input: Readonly<{
  /** A standalone run's own agent run ID; a Team or Org run has no agent of its own. */
  rootAgentRunId: string | null
  members: readonly RunMemberNode[]
  /** The run's open copies; a Team copy's members are its children. */
  delegated: readonly RunMemberNode[]
  focusedAgentRunId: string | null
}>): SettingsSubject => {
  const { focusedAgentRunId: focused } = input
  if (!focused) return NO_SUBJECT
  if (focused === input.rootAgentRunId) return Object.freeze({ origin: 'root', subject: 'root', group: null })
  const member = findAgent(input.members, focused)
  if (member) return Object.freeze({ origin: 'member', subject: member, group: 'root' })
  for (const row of input.delegated) {
    if (row.agentRunId === focused) return Object.freeze({ origin: 'delegated', subject: row, group: null })
    const child = findAgent(row.children, focused)
    if (child) return Object.freeze({ origin: 'delegated', subject: child, group: row })
  }
  return NO_SUBJECT
}
