/**
 * Test-only builders for released (pre-delegator) on-disk run trees.
 *
 * Current fixtures produce the current version-less trees (task executions carry
 * `delegatorAgentRunId`, no `settledAt`). Tests that seed a pre-ticket data root
 * for the released app-data migrations (frozen strict classifiers) need the released
 * shapes instead: Team tree V2 / Org tree V1, where each task execution has
 * `settledAt` and no delegator. These helpers perform only that shape change.
 */
type Json = Record<string, unknown>;

const releasedTask = (task: Json, settledAt: string | null): Json => {
  const { delegatorAgentRunId: _delegator, ...rest } = task;
  const next: Json = { ...rest };
  if (Array.isArray(rest.members)) next.members = rest.members.map((member) => releasedMember(member as Json, settledAt));
  if (Array.isArray(rest.taskExecutions)) next.taskExecutions = rest.taskExecutions.map((child) => releasedTask(child as Json, settledAt));
  return { ...next, settledAt };
};

const releasedMember = (member: Json, settledAt: string | null): Json => {
  const next: Json = { ...member };
  if (Array.isArray(member.members)) next.members = member.members.map((child) => releasedMember(child as Json, settledAt));
  if (Array.isArray(member.taskExecutions)) next.taskExecutions = member.taskExecutions.map((task) => releasedTask(task as Json, settledAt));
  return next;
};

/** Current Team tree -> released Team tree V2 shape. */
export const toReleasedTeamRunExecutionTreeV2 = (tree: unknown, settledAt: string | null = null): Json => {
  const current = structuredClone(tree) as Json & { rootTeam: Json };
  return { ...current, schemaVersion: 2, rootTeam: releasedMember(current.rootTeam, settledAt) };
};

/** Current Org tree -> released Org tree V1 shape. */
export const toReleasedAgentOrgRunExecutionTreeV1 = (tree: unknown, settledAt: string | null = null): Json => {
  const current = structuredClone(tree) as Json & { rootOrg: Json };
  return { ...current, schemaVersion: 1, rootOrg: releasedMember(current.rootOrg, settledAt) };
};
