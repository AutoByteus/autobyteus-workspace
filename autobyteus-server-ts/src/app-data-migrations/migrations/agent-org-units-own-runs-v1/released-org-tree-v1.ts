/**
 * The released Org tree v1 (`agent_org_run_execution_tree.json` as the last release before org-teams-follow-definition
 * wrote it), read for its conversion only. Frozen here, in this migration's folder: no other migration reads it in this
 * shape, and the application no longer has a reader of it. Field names and meanings as the released writer wrote them;
 * a value outside them is refused (the Org is left as it is, with the reason).
 */

type Json = Record<string, unknown>;

export type ReleasedLaunch = Readonly<{
  runtimeKind: string;
  llmModelIdentifier: string;
  llmConfig: Json | null;
  autoExecuteTools: boolean;
  workspaceRootPath: string | null;
}>;

export type ReleasedHandoff = Readonly<{ from: string; to: string; rules: readonly string[] }>;

export type ReleasedOrgAgentNode = Readonly<{
  address: string;
  agentDefinitionId: string;
  agentRunId: string;
  platformAgentRunId: string | null;
  role: string | null;
  description: string | null;
  launchConfiguration: ReleasedLaunch;
  launchSource?: unknown;
  pendingRuntimeSwitch?: unknown;
}>;

export type ReleasedOrgTeamNode = Readonly<{
  address: string;
  teamDefinitionId: string;
  teamRunId: string;
  coordinatorAddress: string;
  role: string | null;
  description: string | null;
  defaultLaunchConfiguration: ReleasedLaunch;
  members: readonly ReleasedOrgAgentNode[];
}>;

export type ReleasedOrgTreeV1 = Readonly<{
  createdAt: string;
  archivedAt: string | null;
  applicationBinding: Readonly<{ applicationId: string; bindingId: string }> | null;
  handoffs: readonly ReleasedHandoff[];
  rootOrg: Readonly<{
    orgDefinitionId: string;
    orgDefinitionName: string;
    orgRunId: string;
    defaultLaunchConfiguration: ReleasedLaunch;
    members: readonly (ReleasedOrgAgentNode | ReleasedOrgTeamNode)[];
  }>;
}>;

/** What an Org run's file is: today's container, a released Org tree v1, or neither (left as it is). */
export type OrgFileKind = "container" | "released_v1" | "unknown";

const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const fail = (label: string, detail: string): never => { throw new Error(`${label}: ${detail}`); };
const text = (value: unknown, label: string): string => typeof value === "string" && value.trim() ? value : fail(label, "a non-empty string is required");
const nullableText = (value: unknown, label: string): string | null => value === undefined || value === null ? null : text(value, label);
const record = (value: unknown, label: string): Json => isRecord(value) ? value : fail(label, "an object is required");
const list = (value: unknown, label: string): unknown[] => Array.isArray(value) ? value : fail(label, "an array is required");

export const classifyOrgFile = (raw: unknown): OrgFileKind => {
  if (!isRecord(raw) || !isRecord(raw.rootOrg)) return "unknown";
  if (Array.isArray(raw.rootOrg.units)) return "container";
  return Array.isArray(raw.rootOrg.members) ? "released_v1" : "unknown";
};

/**
 * A launch in the current shape: exactly the five current keys; any other released key (for example `skillAccessMode`,
 * removed by `remove-global-skill-discovery-mode`, which never visited Org trees) is dropped (contract §9).
 */
export const currentLaunchOf = (value: unknown, label: string): ReleasedLaunch => {
  const launch = record(value, label);
  if (typeof launch.autoExecuteTools !== "boolean") fail(`${label}.autoExecuteTools`, "a boolean is required");
  if (launch.llmConfig !== null && launch.llmConfig !== undefined && !isRecord(launch.llmConfig)) fail(`${label}.llmConfig`, "an object or null is required");
  return Object.freeze({
    runtimeKind: text(launch.runtimeKind, `${label}.runtimeKind`),
    llmModelIdentifier: text(launch.llmModelIdentifier, `${label}.llmModelIdentifier`),
    llmConfig: isRecord(launch.llmConfig) ? launch.llmConfig : null,
    autoExecuteTools: launch.autoExecuteTools as boolean,
    workspaceRootPath: nullableText(launch.workspaceRootPath, `${label}.workspaceRootPath`),
  });
};

const handoffOf = (value: unknown, label: string): ReleasedHandoff => {
  const handoff = record(value, label);
  return Object.freeze({ from: text(handoff.from, `${label}.from`), to: text(handoff.to, `${label}.to`),
    rules: list(handoff.rules, `${label}.rules`).map((rule, index) => text(rule, `${label}.rules[${index}]`)) });
};

const agentNodeOf = (value: Json, label: string): ReleasedOrgAgentNode => Object.freeze({
  address: text(value.address, `${label}.address`),
  agentDefinitionId: text(value.agentDefinitionId, `${label}.agentDefinitionId`),
  agentRunId: text(value.agentRunId, `${label}.agentRunId`),
  platformAgentRunId: nullableText(value.platformAgentRunId, `${label}.platformAgentRunId`),
  role: nullableText(value.role, `${label}.role`),
  description: nullableText(value.description, `${label}.description`),
  launchConfiguration: currentLaunchOf(value.launchConfiguration, `${label}.launchConfiguration`),
  ...(value.launchSource !== undefined && value.launchSource !== null ? { launchSource: value.launchSource } : {}),
  ...(value.pendingRuntimeSwitch !== undefined && value.pendingRuntimeSwitch !== null ? { pendingRuntimeSwitch: value.pendingRuntimeSwitch } : {}),
});

const teamNodeOf = (value: Json, label: string): ReleasedOrgTeamNode => Object.freeze({
  address: text(value.address, `${label}.address`),
  teamDefinitionId: text(value.teamDefinitionId, `${label}.teamDefinitionId`),
  teamRunId: text(value.teamRunId, `${label}.teamRunId`),
  coordinatorAddress: text(value.coordinatorAddress, `${label}.coordinatorAddress`),
  role: nullableText(value.role, `${label}.role`),
  description: nullableText(value.description, `${label}.description`),
  defaultLaunchConfiguration: currentLaunchOf(value.defaultLaunchConfiguration, `${label}.defaultLaunchConfiguration`),
  members: list(value.members, `${label}.members`).map((member, index) => agentNodeOf(record(member, `${label}.members[${index}]`), `${label}.members[${index}]`)),
});

/**
 * The released Org tree v1. `rootOrg.collaborators` is released residue with no current reader (dropped, contract §9);
 * `taskExecutions` lists mean a predecessor (`delegated-runs-own-runs-v1`) has not converted this Org yet: refused, so the
 * Org waits for that predecessor (its follow-up converts it).
 */
export const parseReleasedOrgTreeV1 = (raw: unknown, orgRunId: string): ReleasedOrgTreeV1 => {
  const file = record(raw, "org tree");
  const root = record(file.rootOrg, "rootOrg");
  if (root.taskExecutions !== undefined || root.remoteTaskExecutions !== undefined) {
    fail("rootOrg.taskExecutions", "its delegated runs are not runs of their own yet (20261111_delegated_runs_own_runs_v1 has not converted it)");
  }
  if (text(root.orgRunId, "rootOrg.orgRunId") !== orgRunId) fail("rootOrg.orgRunId", `'${String(root.orgRunId)}' is not the folder's run ID '${orgRunId}'`);
  const binding = file.applicationBinding === undefined || file.applicationBinding === null ? null : record(file.applicationBinding, "applicationBinding");
  return Object.freeze({
    createdAt: text(file.createdAt, "createdAt"),
    archivedAt: nullableText(file.archivedAt, "archivedAt"),
    applicationBinding: binding ? Object.freeze({ applicationId: text(binding.applicationId, "applicationBinding.applicationId"),
      bindingId: text(binding.bindingId, "applicationBinding.bindingId") }) : null,
    handoffs: (file.handoffs === undefined ? [] : list(file.handoffs, "handoffs")).map((handoff, index) => handoffOf(handoff, `handoffs[${index}]`)),
    rootOrg: Object.freeze({
      orgDefinitionId: text(root.orgDefinitionId, "rootOrg.orgDefinitionId"),
      orgDefinitionName: text(root.orgDefinitionName, "rootOrg.orgDefinitionName"),
      orgRunId,
      defaultLaunchConfiguration: currentLaunchOf(root.defaultLaunchConfiguration, "rootOrg.defaultLaunchConfiguration"),
      members: list(root.members, "rootOrg.members").map((member, index) => {
        const node = record(member, `rootOrg.members[${index}]`);
        return "teamRunId" in node ? teamNodeOf(node, `rootOrg.members[${index}]`) : agentNodeOf(node, `rootOrg.members[${index}]`);
      }),
    }),
  });
};

export const isReleasedTeamNode = (node: ReleasedOrgAgentNode | ReleasedOrgTeamNode): node is ReleasedOrgTeamNode => "teamRunId" in node;

/** Whether `address` is the Team's address or lies under it. */
export const isUnderTeam = (teamAddress: string, address: string): boolean => address === teamAddress || address.startsWith(`${teamAddress}/`);

/** An Org address of a Team member in the Team's own space (`/set/x` → `/x`). */
export const teamSpaceOf = (teamAddress: string, address: string): string => {
  if (!address.startsWith(`${teamAddress}/`)) throw new Error(`'${address}' is not inside the Team at '${teamAddress}'.`);
  return address.slice(teamAddress.length);
};
