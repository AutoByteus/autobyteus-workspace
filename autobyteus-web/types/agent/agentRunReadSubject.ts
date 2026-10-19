/**
 * Which agent run a read addresses, and the run whose tree holds it. A top-level standalone run is
 * read by its own id (`run`); a member is read inside its owner: a team run, an org run, or the
 * standalone run (hub) whose delegated copies and copy-Team members it holds (`standaloneMember`).
 * Event-monitor pages and file-change reads both take it.
 */
export type AgentRunReadSubject =
  | { kind: 'run'; runId: string }
  | { kind: 'teamMember'; teamRunId: string; memberAddress: string; agentRunId: string }
  | { kind: 'agentOrgMember'; orgRunId: string; memberAddress: string; agentRunId: string }
  | { kind: 'standaloneMember'; hostRunId: string; memberAddress: string; agentRunId: string };

/** The agent run a subject addresses. */
export const agentRunIdOf = (subject: AgentRunReadSubject): string =>
  subject.kind === 'run' ? subject.runId : subject.agentRunId;
