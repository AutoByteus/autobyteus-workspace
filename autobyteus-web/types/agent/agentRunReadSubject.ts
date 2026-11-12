/**
 * Which agent run a read addresses, and the run whose tree holds it. A standalone run is read by its own id (`run`),
 * a run another run delegated to on this node too; a member is read inside its owner: a team run or an org run. A run
 * a standalone run delegated to a peer node is read through that standalone run (`standaloneMember`, autobyteus-278);
 * its trace and files stay on its node. Event-monitor pages and file-change reads both take it.
 */
export type AgentRunReadSubject =
  | { kind: 'run'; runId: string }
  | { kind: 'teamMember'; teamRunId: string; memberAddress: string; agentRunId: string }
  | { kind: 'agentOrgMember'; orgRunId: string; memberAddress: string; agentRunId: string }
  | { kind: 'standaloneMember'; hostRunId: string; memberAddress: string; agentRunId: string };

/** The agent run a subject addresses. */
export const agentRunIdOf = (subject: AgentRunReadSubject): string =>
  subject.kind === 'run' ? subject.runId : subject.agentRunId;
