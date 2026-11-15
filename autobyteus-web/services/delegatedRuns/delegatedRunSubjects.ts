import type { ParticipantMessagesKey } from '~/services/collaborationMessages/collaborationParticipantMessages'

/**
 * A delegated run on this node, as rule 2 reaches it (autobyteus-461 SR-061): a run of its own, by its own run ID. An
 * agent row is that agent run; a member of a delegated Team is that member of the Team run, at its address in the Team
 * run's own space (as the server sends it). A delegator's view only shows its row. A run on a peer node is not one: it
 * opens on its own node, by its own identity (SR-066, SR-086 G-D1).
 */
export type DelegatedRunSubject =
  | Readonly<{ kind: 'agent'; agentRunId: string }>
  | Readonly<{ kind: 'team_member'; teamRunId: string; agentRunId: string }>

const agentSubject = (agentRunId: string): DelegatedRunSubject => Object.freeze({ kind: 'agent', agentRunId })
const memberSubject = (teamRunId: string, agentRunId: string): DelegatedRunSubject =>
  Object.freeze({ kind: 'team_member', teamRunId, agentRunId })

/**
 * The run a tree row opens (autobyteus-461 SR-084): its `openTarget`, as the server built it, read as a subject: an agent
 * run, or a team run at the agent to focus. Nothing about the run is derived on the client.
 */
export const subjectOfTarget = (target: Readonly<{ runKind: 'agent' | 'agent_team'; runId: string; agentRunId: string }>): DelegatedRunSubject =>
  target.runKind === 'agent' ? agentSubject(target.agentRunId) : memberSubject(target.runId, target.agentRunId)

/** Whose log holds a delegated run's Team tab messages: its own run's (CR-461-020, CR-461-022). */
export const delegatedRunMessagesKey = (subject: DelegatedRunSubject): ParticipantMessagesKey => subject.kind === 'agent'
  ? Object.freeze({ rootKind: 'agent', rootRunId: subject.agentRunId, agentRunId: subject.agentRunId })
  : Object.freeze({ rootKind: 'agent_team', rootRunId: subject.teamRunId, agentRunId: subject.agentRunId })
