import {
  assertAgentTeamAddress,
  getAgentTeamAddressBasename,
  type AgentTeamAddress,
} from "../../domain/agent-team-address.js";

export type RootSubjectKind = "agent_team" | "agent_org";

export type RootExecutionIdentity =
  | Readonly<{ rootSubjectKind: "agent_team"; rootRunId: string }>
  | Readonly<{ rootSubjectKind: "agent_org"; rootRunId: string }>;

export type CollaborationMemberExecutionIdentity = Readonly<{
  root: RootExecutionIdentity;
  memberAddress: AgentTeamAddress;
  agentRunId: string;
}>;

export type RootExecutionPhysicalScope = Readonly<{
  root: RootExecutionIdentity;
  ancestorTeamRunIds: readonly string[];
}>;

export type TaskExecutionHostIdentity = Readonly<{
  root: RootExecutionIdentity;
  hostKind: "root" | "team";
  hostRunId: string;
  hostAddress: AgentTeamAddress;
}>;

const required = (value: string, field: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

const exactKeys = (value: object, expected: readonly string[], label: string): void => {
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  if (actual.length !== keys.length || actual.some((key, index) => key !== keys[index])) {
    throw new Error(`${label} accepts exactly ${keys.join(", ")}.`);
  }
};

export const createRootExecutionIdentity = (input: {
  rootSubjectKind: RootSubjectKind;
  rootRunId: string;
}): RootExecutionIdentity => {
  exactKeys(input, ["rootSubjectKind", "rootRunId"], "Root execution identity");
  if (input.rootSubjectKind !== "agent_team" && input.rootSubjectKind !== "agent_org") {
    throw new Error("rootSubjectKind must be 'agent_team' or 'agent_org'.");
  }
  return Object.freeze({
    rootSubjectKind: input.rootSubjectKind,
    rootRunId: required(input.rootRunId, "rootRunId"),
  });
};

export const cloneRootExecutionIdentity = (
  identity: RootExecutionIdentity,
): RootExecutionIdentity => createRootExecutionIdentity(identity);

export const sameRootExecutionIdentity = (
  left: RootExecutionIdentity,
  right: RootExecutionIdentity,
): boolean => left.rootSubjectKind === right.rootSubjectKind && left.rootRunId === right.rootRunId;

export const rootExecutionIdentityKey = (identity: RootExecutionIdentity): string => {
  const normalized = createRootExecutionIdentity(identity);
  return `${normalized.rootSubjectKind}\0${normalized.rootRunId}`;
};

export const requireRootExecutionIdentityKind = <TKind extends RootSubjectKind>(
  identity: RootExecutionIdentity,
  expectedKind: TKind,
): Extract<RootExecutionIdentity, { rootSubjectKind: TKind }> => {
  const normalized = cloneRootExecutionIdentity(identity);
  if (normalized.rootSubjectKind !== expectedKind) {
    throw new Error(
      `Root execution kind '${normalized.rootSubjectKind}' does not match '${expectedKind}'.`,
    );
  }
  return normalized as Extract<RootExecutionIdentity, { rootSubjectKind: TKind }>;
};

export const createTeamRootExecutionIdentity = (rootTeamRunId: string): RootExecutionIdentity =>
  createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: rootTeamRunId });

export const createAgentOrgRootExecutionIdentity = (orgRunId: string): RootExecutionIdentity =>
  createRootExecutionIdentity({ rootSubjectKind: "agent_org", rootRunId: orgRunId });

export const createCollaborationMemberExecutionIdentity = (input: {
  root: RootExecutionIdentity;
  memberAddress: string;
  agentRunId: string;
}): CollaborationMemberExecutionIdentity => {
  exactKeys(input, ["root", "memberAddress", "agentRunId"], "Collaboration member execution identity");
  const memberAddress = assertAgentTeamAddress(input.memberAddress);
  if (!getAgentTeamAddressBasename(memberAddress)) {
    throw new Error("memberAddress must identify an Agent placement.");
  }
  return Object.freeze({
    root: cloneRootExecutionIdentity(input.root),
    memberAddress,
    agentRunId: required(input.agentRunId, "agentRunId"),
  });
};

export const cloneCollaborationMemberExecutionIdentity = (
  identity: CollaborationMemberExecutionIdentity,
): CollaborationMemberExecutionIdentity => createCollaborationMemberExecutionIdentity(identity);

export const sameCollaborationMemberExecutionIdentity = (
  left: CollaborationMemberExecutionIdentity,
  right: CollaborationMemberExecutionIdentity,
): boolean => sameRootExecutionIdentity(left.root, right.root)
  && left.memberAddress === right.memberAddress
  && left.agentRunId === right.agentRunId;

export const createRootExecutionPhysicalScope = (input: {
  root: RootExecutionIdentity;
  ancestorTeamRunIds: readonly string[];
}): RootExecutionPhysicalScope => {
  exactKeys(input, ["root", "ancestorTeamRunIds"], "Root execution physical scope");
  if (!Array.isArray(input.ancestorTeamRunIds)) throw new Error("ancestorTeamRunIds must be an array.");
  const ancestors = input.ancestorTeamRunIds.map((id, index) => required(id, `ancestorTeamRunIds[${index}]`));
  if (new Set(ancestors).size !== ancestors.length) throw new Error("ancestorTeamRunIds must not repeat a TeamRun id.");
  return Object.freeze({
    root: cloneRootExecutionIdentity(input.root),
    ancestorTeamRunIds: Object.freeze(ancestors),
  });
};

export const createTaskExecutionHostIdentity = (input: {
  root: RootExecutionIdentity;
  hostKind: "root" | "team";
  hostRunId: string;
  hostAddress: string;
}): TaskExecutionHostIdentity => {
  exactKeys(input, ["root", "hostKind", "hostRunId", "hostAddress"], "Task execution host identity");
  const root = cloneRootExecutionIdentity(input.root);
  const hostRunId = required(input.hostRunId, "hostRunId");
  const hostAddress = assertAgentTeamAddress(input.hostAddress);
  if (input.hostKind === "root") {
    if (hostRunId !== root.rootRunId || hostAddress !== "/") {
      throw new Error("Root task host must use the exact rootRunId and '/'.");
    }
  } else if (input.hostKind === "team") {
    if (hostAddress === "/") throw new Error("Team task host must use a non-root Team address.");
  } else {
    throw new Error("hostKind must be 'root' or 'team'.");
  }
  return Object.freeze({ root, hostKind: input.hostKind, hostRunId, hostAddress });
};
