/**
 * Which agent run a read addresses, and the run whose tree holds it. A standalone run is read by its own id (`run`),
 * a run another run delegated to on this node too; a member is read inside its owner: a team run or an org run. An
 * agent of a run on a peer node (`peerRun`, autobyteus-461 G-D1) is its run there: its trace and files stay on its
 * node (autobyteus-278), so this node reads none of them. Event-monitor pages and file-change reads both take it.
 */
export type AgentRunReadSubject =
  | { kind: 'run'; runId: string }
  | { kind: 'teamMember'; teamRunId: string; memberAddress: string; agentRunId: string }
  | { kind: 'agentOrgMember'; orgRunId: string; memberAddress: string; agentRunId: string }
  | { kind: 'peerRun'; nodeId: string; runId: string; agentRunId: string };

/** The agent run a subject addresses. */
export const agentRunIdOf = (subject: AgentRunReadSubject): string =>
  subject.kind === 'run' ? subject.runId : subject.agentRunId;
