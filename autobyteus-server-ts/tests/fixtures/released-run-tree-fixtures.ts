/**
 * Test-only builders for released (pre-delegator) on-disk run trees.
 *
 * Current fixtures produce the current version-less trees (task executions carry
 * `delegatorAgentRunId`, no `settledAt`). Tests that seed a pre-ticket data root
 * for the released app-data migrations (frozen strict classifiers) need the released
 * shapes instead: Team tree V2 / Org tree V1, where each task execution has
 * `settledAt` and no delegator, and each launch configuration carries the since-removed
 * run-level `skillAccessMode`. These helpers perform only that shape change.
 */
type Json = Record<string, unknown>;

const RELEASED_LAUNCH_CONFIGURATION_KEYS = ["launchConfiguration", "defaultLaunchConfiguration"] as const;

/** Released launch configurations stored `skillAccessMode`; current ones do not. */
const withReleasedLaunchConfigurations = (node: Json): Json => {
  const next: Json = { ...node };
  for (const key of RELEASED_LAUNCH_CONFIGURATION_KEYS) {
    const launch = node[key];
    if (launch && typeof launch === "object") next[key] = { skillAccessMode: "PRELOADED_ONLY", ...(launch as Json) };
  }
  return next;
};

const releasedTask = (task: Json, settledAt: string | null): Json => {
  const { delegatorAgentRunId: _delegator, ...rest } = task;
  const next: Json = { ...rest };
  if (Array.isArray(rest.members)) next.members = rest.members.map((member) => releasedMember(member as Json, settledAt));
  if (Array.isArray(rest.taskExecutions)) next.taskExecutions = rest.taskExecutions.map((child) => releasedTask(child as Json, settledAt));
  return { ...next, settledAt };
};

const releasedMember = (member: Json, settledAt: string | null): Json => {
  const next: Json = withReleasedLaunchConfigurations(member);
  if (Array.isArray(member.members)) next.members = member.members.map((child) => releasedMember(child as Json, settledAt));
  if (Array.isArray(member.taskExecutions)) next.taskExecutions = member.taskExecutions.map((task) => releasedTask(task as Json, settledAt));
  return next;
};

/** Current configured Agent/Team node -> released node, for tests that nest one into a released tree. */
export const toReleasedConfiguredNode = <T>(node: T, settledAt: string | null = null): T =>
  releasedMember(structuredClone(node) as Json, settledAt) as T;

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
