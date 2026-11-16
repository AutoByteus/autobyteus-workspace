import { isRecord, runRefOf, type RawRecord, type ReleasedDelegationScan, type RunRef } from "./released-delegation-scan.js";

/** The outcome for one run file of step 4 (or E10). */
export type RunFileConversion =
  | Readonly<{ kind: "current" }>
  | Readonly<{ kind: "converted"; payload: RawRecord }>
  | Readonly<{ kind: "preserved"; reason: string; predecessor?: string }>;

const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

/**
 * A delegated run's origin from its released `taskAgent` (contract §13.2 E6): the run its delegator is a part of, one
 * hop, else today's `coordinatingRun`; the delegator when recorded.
 */
export const originOf = (runId: string, taskAgent: RawRecord, scan: ReleasedDelegationScan): RawRecord | null => {
  const delegator = scan.delegatorOf(runId);
  const delegatingRun: RunRef | null = (delegator ? scan.delegatingRunOf(delegator) : null) ?? runRefOf(taskAgent.coordinatingRun);
  if (!delegatingRun) return null;
  return { delegatingRun: { kind: delegatingRun.kind, runId: delegatingRun.runId }, ...(delegator ? { delegatorAgentRunId: delegator } : {}) };
};

/** E10: a peer-started run's `delegatedFrom { nodeId, coordinatingRun, … }` → `{ delegatingRun, delegatorAgentRunId, nodeId }`. */
export const renamedPeerOrigin = (delegatedFrom: unknown): RawRecord | null => {
  if (!isRecord(delegatedFrom) || delegatedFrom.coordinatingRun === undefined) return null;
  const { coordinatingRun, nodeId, delegatorAgentRunId, ...rest } = delegatedFrom;
  return { ...rest, delegatingRun: coordinatingRun, ...(delegatorAgentRunId !== undefined ? { delegatorAgentRunId } : {}),
    ...(nodeId !== undefined ? { nodeId } : {}) };
};

/**
 * Step 4 for a delegated agent run's `run_metadata.json` (contract §2.2, §13.2 E6): `taskAgent` goes; `address` and
 * `launchSource` become the run's own fields; a Settings edit (`userLaunchSelection`) becomes the run's own launch, and
 * the edited run's `launchSource` is dropped; a pending runtime switch moves to the top level; the run's own
 * `delegatedFrom` is written. A file a predecessor did not finish (`20261017_…`, `20261019_…`) is left as it is.
 */
export const convertAgentRunFile = (runId: string, raw: RawRecord, scan: ReleasedDelegationScan): RunFileConversion => {
  if (!isRecord(raw.taskAgent)) {
    const renamed = renamedPeerOrigin(raw.delegatedFrom);
    return renamed ? { kind: "converted", payload: { ...raw, delegatedFrom: renamed } } : { kind: "current" };
  }
  const taskAgent = raw.taskAgent;
  if (taskAgent.origin !== undefined) {
    return { kind: "preserved", predecessor: "20261019_delegated_copy_own_file_complete_v1", reason: "its own file was not completed (taskAgent.origin)" };
  }
  if (scan.unfinishedRuns.has(runId)) {
    return { kind: "preserved", predecessor: "20261017_task_agent_own_run_v1", reason: "a tree still keeps its full record or its link without an own file" };
  }
  if (!text(raw.workspaceRootPath)) return { kind: "preserved", reason: "it has no workspace, which every ordinary run has" };
  if (!text(taskAgent.address)) return { kind: "preserved", reason: "taskAgent.address is missing" };
  const delegatedFrom = originOf(runId, taskAgent, scan);
  if (!delegatedFrom) return { kind: "preserved", reason: "taskAgent.coordinatingRun is missing" };
  const { taskAgent: _removed, ...own } = raw;
  const selection = isRecord(taskAgent.userLaunchSelection) ? taskAgent.userLaunchSelection : null;
  return { kind: "converted", payload: {
    ...own,
    address: taskAgent.address,
    ...(selection ? { llmModelIdentifier: selection.llmModelIdentifier, llmConfig: selection.llmConfig ?? null }
      : isRecord(taskAgent.launchSource) ? { launchSource: taskAgent.launchSource } : {}),
    ...(isRecord(taskAgent.pendingRuntimeSwitch) && raw.pendingRuntimeSwitch === undefined ? { pendingRuntimeSwitch: taskAgent.pendingRuntimeSwitch } : {}),
    delegatedFrom,
  } };
};

const withSelection = (launch: unknown, selection: RawRecord): unknown => isRecord(launch)
  ? { ...launch, llmModelIdentifier: selection.llmModelIdentifier, llmConfig: selection.llmConfig ?? null } : launch;

/** An address under the team's former root (`/software_engineering_team/x`) at the team's own root (`/x`); others unchanged. */
const rebased = (address: unknown, prefix: string): unknown => typeof address !== "string" || prefix === "/" ? address
  : address === prefix ? "/" : address.startsWith(`${prefix}/`) ? address.slice(prefix.length) : address;

/**
 * Step 4 for a delegated team run's `team_run_execution_tree.json` (contract §6 E6t, TC-12 revised, SR-035): the file
 * becomes an ordinary team file rooted at `/`, like every team run. The members and the coordinator lose the former
 * root (`/software_engineering_team/x` → `/x`); handoffs are rebased, and a `to` outside the team is kept as written
 * (it is resolved when sent). `taskAgent` goes; `delegatedFrom` is written beside `rootTeam`;
 * `rootTeam.teamDefinitionName` is the definition's name, else its ID; the team's `launchSource` becomes
 * `rootTeam.defaultLaunchSource`. A team-level Settings edit becomes the own launch of every member that follows the
 * team, a member's edit that member's own launch (and drops its `launchSource`); then `followsTeam` and the edits go.
 * Two members that would share an address, or a file a predecessor did not finish, leave the file as it is.
 */
export const convertTeamRunFile = (runId: string, raw: RawRecord, scan: ReleasedDelegationScan, teamDefinitionName: string): RunFileConversion => {
  if (!isRecord(raw.taskAgent)) {
    const renamed = renamedPeerOrigin(raw.delegatedFrom);
    return renamed ? { kind: "converted", payload: { ...raw, delegatedFrom: renamed } } : { kind: "current" };
  }
  const taskAgent = raw.taskAgent;
  if (taskAgent.origin !== undefined) {
    return { kind: "preserved", predecessor: "20261019_delegated_copy_own_file_complete_v1", reason: "its own file was not completed (taskAgent.origin)" };
  }
  if (scan.unfinishedRuns.has(runId)) {
    return { kind: "preserved", predecessor: "20261017_task_agent_own_run_v1", reason: "a tree still keeps its full record or its link without an own file" };
  }
  const rootTeam = isRecord(raw.rootTeam) ? raw.rootTeam : null;
  if (!rootTeam || !Array.isArray(rootTeam.members)) return { kind: "preserved", reason: "rootTeam.members is missing" };
  const delegatedFrom = originOf(runId, taskAgent, scan);
  if (!delegatedFrom) return { kind: "preserved", reason: "taskAgent.coordinatingRun is missing" };
  const prefix = typeof rootTeam.address === "string" ? rootTeam.address : "/";
  const teamSelection = isRecord(taskAgent.userLaunchSelection) ? taskAgent.userLaunchSelection : null;
  const members = rootTeam.members.map((value) => {
    if (!isRecord(value)) return value;
    const { followsTeam, userLaunchSelection, launchSource, ...member } = value;
    const own = isRecord(userLaunchSelection) ? userLaunchSelection : followsTeam === true ? teamSelection : null;
    const at = { ...member, address: rebased(member.address, prefix) };
    return own ? { ...at, launchConfiguration: withSelection(member.launchConfiguration, own) }
      : { ...at, ...(launchSource !== undefined ? { launchSource } : {}) };
  });
  const addresses = members.map((member) => isRecord(member) ? member.address : null);
  if (new Set(addresses).size !== addresses.length || addresses.includes("/")) {
    return { kind: "preserved", reason: `two members, or a member and the team, would share an address at '/' (former root '${prefix}')` };
  }
  const handoffs = Array.isArray(raw.handoffs) ? raw.handoffs.map((handoff) => isRecord(handoff)
    ? { ...handoff, from: rebased(handoff.from, prefix), to: rebased(handoff.to, prefix) } : handoff) : raw.handoffs;
  const { taskExecutions: _lists, remoteTaskExecutions: _remote, ...team } = rootTeam;
  const { taskAgent: _removed, ...own } = raw;
  return { kind: "converted", payload: {
    ...own,
    archivedAt: own.archivedAt ?? null,
    applicationBinding: own.applicationBinding ?? null,
    handoffs,
    rootTeam: {
      ...team,
      address: "/",
      coordinatorAddress: rebased(team.coordinatorAddress, prefix),
      teamDefinitionName: typeof team.teamDefinitionName === "string" ? team.teamDefinitionName : teamDefinitionName,
      ...(!teamSelection && isRecord(taskAgent.launchSource) && team.defaultLaunchSource === undefined ? { defaultLaunchSource: taskAgent.launchSource } : {}),
      members,
    },
    delegatedFrom,
  } };
};
