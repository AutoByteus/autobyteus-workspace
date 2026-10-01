import type {
  CollaboratorEntry,
  CollaboratorTeamEntry,
  TaskExecution,
} from "./run-execution-tree-shared-records.js";

type AgentIdentityRecord = Readonly<{ agentRunId: string; address: string; platformAgentRunId: string | null }>;

/**
 * Maps the hosted Agents of collaborator entries (a collaborator Agent, each collaborator Team
 * member) and the task executions hosted by collaborator Teams. Root tree mutators use it for
 * platform bindings, so a collaborator is bound like a configured member.
 */
export const mapCollaboratorEntries = (
  entries: readonly CollaboratorEntry[],
  map: Readonly<{
    agent<T extends AgentIdentityRecord>(value: T): T;
    task(value: TaskExecution): TaskExecution;
  }>,
): CollaboratorEntry[] => entries.map((entry): CollaboratorEntry => entry.kind === "agent"
  ? map.agent(entry)
  : {
      ...entry,
      members: entry.members.map((member) => map.agent(member)),
      taskExecutions: entry.taskExecutions.map((task) => map.task(task)),
    });

/**
 * Appends a task execution to the collaborator Team whose TeamRun hosts it. Returns null when
 * no collaborator Team has that TeamRun ID (the host is elsewhere in the tree).
 */
export const appendCollaboratorTeamTask = (
  entries: readonly CollaboratorEntry[],
  hostTeamRunId: string,
  append: (team: CollaboratorTeamEntry) => CollaboratorTeamEntry,
): CollaboratorEntry[] | null => {
  if (!entries.some((entry) => entry.kind === "agent_team" && entry.teamRunId === hostTeamRunId)) return null;
  return entries.map((entry) => entry.kind === "agent_team" && entry.teamRunId === hostTeamRunId ? append(entry) : entry);
};
