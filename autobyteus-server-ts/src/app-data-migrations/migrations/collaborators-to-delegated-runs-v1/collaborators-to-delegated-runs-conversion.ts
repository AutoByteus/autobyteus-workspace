import {
  parseReleasedCollaboratorEntryV1,
  type ReleasedCollaboratorAgentEntryV1,
  type ReleasedCollaboratorEntryV1,
  type ReleasedCollaboratorTeamEntryV1,
  type ReleasedCollaboratorTeamMemberV1,
} from "./released-collaborator-entry-v1.js";

type Json = Record<string, unknown>;

/** Where the `collaborators` array and the root-level `taskExecutions` of each tree family live. */
export type CollaboratorContainerKey = null | "rootTeam" | "rootOrg";

export class InvalidCollaboratorError extends Error {}

export type CollaboratorConversion =
  | Readonly<{ kind: "already_current" }>
  | Readonly<{ kind: "converted"; tree: Json; collaboratorCount: number; stampedCopyCount: number }>;

const isRecord = (value: unknown): value is Json =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const agentSourceOf = (entry: ReleasedCollaboratorAgentEntryV1): Json => ({
  kind: "agent",
  agentDefinitionId: entry.agentDefinitionId,
  launchConfiguration: entry.launchConfiguration,
  ...(entry.launchSource ? { launchSource: entry.launchSource } : {}),
});

const teamSourceOf = (entry: ReleasedCollaboratorTeamEntryV1): Json => ({
  kind: "agent_team",
  teamDefinitionId: entry.teamDefinitionId,
  coordinatorAddress: entry.coordinatorAddress,
  members: entry.members.map((member) => ({
    address: member.address,
    agentDefinitionId: member.agentDefinitionId,
    ...(member.launchConfiguration ? { launchConfiguration: member.launchConfiguration } : {}),
    ...(member.launchSource ? { launchSource: member.launchSource } : {}),
  })),
  handoffs: entry.handoffs,
  defaultLaunchConfiguration: entry.defaultLaunchConfiguration,
  ...(entry.defaultLaunchSource ? { defaultLaunchSource: entry.defaultLaunchSource } : {}),
});

/** A collaborator Team member's own launch when it recorded one, else the Team's (the released rule). */
const memberSourceOf = (team: ReleasedCollaboratorTeamEntryV1, member: ReleasedCollaboratorTeamMemberV1): Json => {
  const launchSource = member.launchSource ?? team.defaultLaunchSource;
  return {
    kind: "agent",
    agentDefinitionId: member.agentDefinitionId,
    launchConfiguration: member.launchConfiguration ?? team.defaultLaunchConfiguration,
    ...(launchSource ? { launchSource } : {}),
  };
};

/** The released entry as an unowned root-level delegated run (lossless; DEC-005 (a)). */
const toTaskExecution = (entry: ReleasedCollaboratorEntryV1): Json => entry.kind === "agent"
  ? {
      address: entry.address,
      agentRunId: entry.agentRunId,
      platformAgentRunId: entry.platformAgentRunId,
      delegatorAgentRunId: entry.addedViaAgentRunId,
      startedAt: entry.addedAt,
      source: agentSourceOf(entry),
      ...(entry.userLaunchSelection ? { userLaunchSelection: entry.userLaunchSelection } : {}),
    }
  : {
      address: entry.address,
      teamRunId: entry.teamRunId,
      members: entry.members.map((member) => ({
        address: member.address,
        agentRunId: member.agentRunId,
        platformAgentRunId: member.platformAgentRunId,
        ...(member.userLaunchSelection ? { userLaunchSelection: member.userLaunchSelection } : {}),
      })),
      taskExecutions: entry.taskExecutions,
      delegatorAgentRunId: entry.addedViaAgentRunId,
      startedAt: entry.addedAt,
      source: teamSourceOf(entry),
      ...(entry.userTeamLaunchSelection ? { userTeamLaunchSelection: entry.userTeamLaunchSelection } : {}),
    };

/** The source a sourceless copy at `address` gets: the collaborator (or collaborator-Team member) it copied. */
const copySourceFor = (
  entries: readonly ReleasedCollaboratorEntryV1[],
  copy: Json,
): Json | null => {
  const address = copy.address;
  const isTeamCopy = "teamRunId" in copy;
  for (const entry of entries) {
    if (entry.address === address) {
      if (entry.kind === "agent" && !isTeamCopy) return agentSourceOf(entry);
      if (entry.kind === "agent_team" && isTeamCopy) return teamSourceOf(entry);
      return null;
    }
    if (entry.kind === "agent_team" && !isTeamCopy) {
      const member = entry.members.find((candidate) => candidate.address === address);
      if (member) return memberSourceOf(entry, member);
    }
  }
  return null;
};

/** Stamps `source` on sourceless copies at collaborator addresses, at any depth (AC-011). */
const stampSourcelessCopies = (
  entries: readonly ReleasedCollaboratorEntryV1[],
  tasks: unknown,
): number => {
  let stamped = 0;
  const visitTasks = (list: unknown): void => {
    if (!Array.isArray(list)) return;
    for (const task of list) {
      if (!isRecord(task)) continue;
      if (task.source === undefined) {
        const source = copySourceFor(entries, task);
        if (source) { task.source = source; stamped += 1; }
      }
      if (Array.isArray(task.members)) visitMembers(task.members);
      visitTasks(task.taskExecutions);
    }
  };
  const visitMembers = (members: unknown[]): void => {
    for (const member of members) {
      if (!isRecord(member) || !Array.isArray(member.members)) continue;
      visitMembers(member.members);
      visitTasks(member.taskExecutions);
    }
  };
  visitTasks(tasks);
  return stamped;
};

/** Every `taskExecutions` list of the document outside the collaborator entries (root, mounted Teams at any depth). */
const taskListsOf = (container: Json): unknown[] => {
  const lists: unknown[] = [container.taskExecutions];
  const visit = (members: unknown): void => {
    if (!Array.isArray(members)) return;
    for (const member of members) {
      if (!isRecord(member) || !Array.isArray(member.members)) continue;
      lists.push(member.taskExecutions);
      visit(member.members);
    }
  };
  visit(container.members);
  return lists;
};

/**
 * Pure conversion of one tree document (DS-003): every released collaborator becomes an unowned
 * root-level task execution, sourceless copies at collaborator addresses get their `source`, and
 * the `collaborators` key is removed. `tree` is not modified; a new document is returned.
 * @throws InvalidCollaboratorError when an entry fails the frozen released schema.
 */
export const convertCollaboratorsToDelegatedRuns = (
  tree: Json,
  containerKey: CollaboratorContainerKey,
): CollaboratorConversion => {
  const document = structuredClone(tree);
  const container = containerKey === null ? document : document[containerKey];
  if (!isRecord(container)) throw new InvalidCollaboratorError(`'${containerKey ?? "tree"}' must be an object.`);
  const raw = container.collaborators;
  if (raw === undefined || (Array.isArray(raw) && raw.length === 0)) return { kind: "already_current" };
  if (!Array.isArray(raw)) throw new InvalidCollaboratorError("collaborators must be an array.");
  let entries: ReleasedCollaboratorEntryV1[];
  try {
    entries = raw.map((value, index) => parseReleasedCollaboratorEntryV1(value, `collaborators[${index}]`));
  } catch (error) {
    throw new InvalidCollaboratorError(error instanceof Error ? error.message : String(error));
  }
  let stamped = 0;
  for (const tasks of taskListsOf(container)) stamped += stampSourcelessCopies(entries, tasks);
  for (const entry of entries) {
    if (entry.kind === "agent_team") stamped += stampSourcelessCopies(entries, (entry as { taskExecutions: unknown }).taskExecutions);
  }
  const converted = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.addedAt.localeCompare(b.entry.addedAt) || a.index - b.index)
    .map(({ entry }) => toTaskExecution(entry));
  container.taskExecutions = [...(Array.isArray(container.taskExecutions) ? container.taskExecutions : []), ...converted];
  delete container.collaborators;
  return { kind: "converted", tree: document, collaboratorCount: entries.length, stampedCopyCount: stamped };
};
