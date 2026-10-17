import { assertAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

export class ContextFileDescriptorError extends Error {}
/** A resolved context-file path that would leave its owner folder (defence in depth behind the codec rules). */
export class ContextFilePathContainmentError extends ContextFileDescriptorError {}

/**
 * Stored filenames are server-generated (`ctx_<token>__<stem>.<ext>`), so only that character set is accepted.
 * Dot-only names are rejected: `.` would resolve to the owner folder itself.
 */
const filename = (value: string): string => {
  if (typeof value !== "string" || !/^[A-Za-z0-9._-]+$/.test(value) || /^\.+$/.test(value) || value.includes("..")) {
    throw new ContextFileDescriptorError("storedFilename is invalid.");
  }
  return value;
};

export type StandaloneDraftContextFileOwner = { kind: "agent_draft"; draftRunId: string };
export type TeamMemberDraftContextFileOwner = { kind: "team_member_draft"; teamDraftId: string; memberAddress: AgentTeamAddress };
export type AgentOrgMemberDraftContextFileOwner = { kind: "org_member_draft"; orgRunId: string; agentRunId: string };
export type StandaloneFinalContextFileOwner = { kind: "agent_final"; runId: string };
export type TeamMemberFinalContextFileOwner = { kind: "team_member_final"; teamRunId: string; agentRunId: string };
export type AgentOrgMemberFinalContextFileOwner = { kind: "org_member_final"; orgRunId: string; agentRunId: string };
/** A child (task Agent or task-Team member) of a standalone Agent run's collaboration root. */
export type AgentCollaborationMemberDraftContextFileOwner = { kind: "agent_collaboration_member_draft"; hostRunId: string; agentRunId: string };
export type AgentCollaborationMemberFinalContextFileOwner = { kind: "agent_collaboration_member_final"; hostRunId: string; agentRunId: string };
export type ResolvedAgentCollaborationMemberFinalContextFileOwner = AgentCollaborationMemberFinalContextFileOwner & {
  rootSubjectKind: "agent";
  rootRunId: string;
  ancestorTeamRunIds: string[];
  memoryDir: string;
};
export type ResolvedTeamMemberFinalContextFileOwner = TeamMemberFinalContextFileOwner & {
  rootTeamRunId: string;
  ancestorTeamRunIds: string[];
  memoryDir: string;
};
export type ResolvedAgentOrgMemberFinalContextFileOwner = AgentOrgMemberFinalContextFileOwner & {
  rootSubjectKind: "agent_org";
  rootRunId: string;
  ancestorTeamRunIds: string[];
  memoryDir: string;
};
export type ContextFileDraftOwnerDescriptor = StandaloneDraftContextFileOwner | TeamMemberDraftContextFileOwner | AgentOrgMemberDraftContextFileOwner
  | AgentCollaborationMemberDraftContextFileOwner;
export type ContextFileFinalOwnerDescriptor = StandaloneFinalContextFileOwner | TeamMemberFinalContextFileOwner | AgentOrgMemberFinalContextFileOwner
  | AgentCollaborationMemberFinalContextFileOwner;
export type ContextFileResolvedFinalOwnerDescriptor = StandaloneFinalContextFileOwner | ResolvedTeamMemberFinalContextFileOwner | ResolvedAgentOrgMemberFinalContextFileOwner
  | ResolvedAgentCollaborationMemberFinalContextFileOwner;

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContextFileDescriptorError("owner descriptor is invalid.");
  return value as Record<string, unknown>;
};
const safeIdentity = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value || value !== value.trim()
    || /[\\/\x00-\x1f\x7f]/.test(value) || value === "." || value === "..") {
    throw new ContextFileDescriptorError(`${field} must be a safe non-empty identity.`);
  }
  return value;
};

const assertExactFields = (input: Record<string, unknown>, fields: readonly string[], ownerLabel: string): void => {
  if (Object.keys(input).some((key) => key !== "kind" && !fields.includes(key))) {
    throw new ContextFileDescriptorError(`${ownerLabel} context-file owner has unsupported fields.`);
  }
};
const exactOrgIdentity = (input: Record<string, unknown>): { orgRunId: string; agentRunId: string } => {
  assertExactFields(input, ["orgRunId", "agentRunId"], "Org");
  return { orgRunId: safeIdentity(input.orgRunId, "orgRunId"), agentRunId: safeIdentity(input.agentRunId, "agentRunId") };
};
const exactAgentCollaborationIdentity = (input: Record<string, unknown>): { hostRunId: string; agentRunId: string } => {
  assertExactFields(input, ["hostRunId", "agentRunId"], "Agent collaboration");
  return { hostRunId: safeIdentity(input.hostRunId, "hostRunId"), agentRunId: safeIdentity(input.agentRunId, "agentRunId") };
};
export const parseDraftContextFileOwnerDescriptor = (value: unknown): ContextFileDraftOwnerDescriptor => {
  const input = record(value);
  if (input.kind === "agent_draft") {
    assertExactFields(input, ["draftRunId"], "Standalone draft");
    return { kind: "agent_draft", draftRunId: safeIdentity(input.draftRunId, "draftRunId") };
  }
  if (input.kind === "team_member_draft") {
    assertExactFields(input, ["teamDraftId", "memberAddress"], "Team draft");
    return {
      kind: "team_member_draft",
      teamDraftId: safeIdentity(input.teamDraftId, "teamDraftId"),
      memberAddress: assertAgentTeamAddress(String(input.memberAddress ?? "")),
    };
  }
  if (input.kind === "org_member_draft") return {
    kind: "org_member_draft",
    ...exactOrgIdentity(input),
  };
  if (input.kind === "agent_collaboration_member_draft") return {
    kind: "agent_collaboration_member_draft",
    ...exactAgentCollaborationIdentity(input),
  };
  throw new ContextFileDescriptorError(`Unsupported draft owner kind '${String(input.kind)}'.`);
};
export const parseFinalContextFileOwnerDescriptor = (value: unknown): ContextFileFinalOwnerDescriptor => {
  const input = record(value);
  if (input.kind === "agent_final") return { kind: "agent_final", runId: safeIdentity(input.runId, "runId") };
  if (input.kind === "team_member_final") {
    assertExactFields(input, ["teamRunId", "agentRunId"], "Team");
    return { kind: "team_member_final", teamRunId: safeIdentity(input.teamRunId, "teamRunId"),
      agentRunId: safeIdentity(input.agentRunId, "agentRunId") };
  }
  if (input.kind === "org_member_final") return {
    kind: "org_member_final",
    ...exactOrgIdentity(input),
  };
  if (input.kind === "agent_collaboration_member_final") return {
    kind: "agent_collaboration_member_final",
    ...exactAgentCollaborationIdentity(input),
  };
  throw new ContextFileDescriptorError(`Unsupported final owner kind '${String(input.kind)}'.`);
};
type DraftOwnerKind = ContextFileDraftOwnerDescriptor["kind"];
type DraftOwnerField<K extends DraftOwnerKind> = Exclude<keyof Extract<ContextFileDraftOwnerDescriptor, { kind: K }>, "kind">;
/** Owner path of a draft locator: `<literal>/<field value>` pairs between `/rest/drafts/` and `/context-files/`. */
type DraftLocatorShape<K extends DraftOwnerKind> = ReadonlyArray<readonly [literal: string, field: DraftOwnerField<K>]>;

/** The one definition of every draft owner kind's locator path; build and parse both derive from it. */
const DRAFT_LOCATOR_SHAPES: { readonly [K in DraftOwnerKind]: DraftLocatorShape<K> } = {
  agent_draft: [["agent-runs", "draftRunId"]],
  team_member_draft: [["team-runs", "teamDraftId"], ["members", "memberAddress"]],
  org_member_draft: [["agent-org-runs", "orgRunId"], ["agent-runs", "agentRunId"]],
  agent_collaboration_member_draft: [["agent-collaborations", "hostRunId"], ["agent-runs", "agentRunId"]],
};
const DRAFT_LOCATOR_PREFIX = "/rest/drafts/";
const CONTEXT_FILES_SEGMENT = "context-files";

const draftLocatorShape = (kind: DraftOwnerKind): ReadonlyArray<readonly [literal: string, field: string]> =>
  DRAFT_LOCATOR_SHAPES[kind];

export const buildDraftContextFileLocator = (owner: ContextFileDraftOwnerDescriptor, storedFilename: string): string => {
  const file = encodeURIComponent(filename(storedFilename));
  const values = owner as unknown as Record<string, string>;
  const ownerPath = draftLocatorShape(owner.kind)
    .map(([literal, field]) => `${literal}/${encodeURIComponent(values[field]!)}`)
    .join("/");
  return `${DRAFT_LOCATOR_PREFIX}${ownerPath}/${CONTEXT_FILES_SEGMENT}/${file}`;
};

const decodeLocatorSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new ContextFileDescriptorError("Draft context-file locator is not validly encoded.");
  }
};

/**
 * Inverse of `buildDraftContextFileLocator` for a `/rest/drafts/...` pathname (no query or fragment).
 * Returns `null` when the path is not a draft locator; throws `ContextFileDescriptorError` (or the
 * owner's own contract error) when it has a draft locator shape with an invalid owner or file.
 */
export const parseDraftContextFileLocator = (
  pathname: string,
): { owner: ContextFileDraftOwnerDescriptor; storedFilename: string } | null => {
  if (!pathname.startsWith(DRAFT_LOCATOR_PREFIX)) return null;
  const segments = pathname.slice(DRAFT_LOCATOR_PREFIX.length).split("/");
  for (const kind of Object.keys(DRAFT_LOCATOR_SHAPES) as DraftOwnerKind[]) {
    const shape = draftLocatorShape(kind);
    if (segments.length !== shape.length * 2 + 2
      || segments[shape.length * 2] !== CONTEXT_FILES_SEGMENT
      || shape.some(([literal], index) => segments[index * 2] !== literal)) {
      continue;
    }
    const descriptor: Record<string, string> = { kind };
    shape.forEach(([, field], index) => { descriptor[field] = decodeLocatorSegment(segments[index * 2 + 1]!); });
    return {
      owner: parseDraftContextFileOwnerDescriptor(descriptor),
      storedFilename: filename(decodeLocatorSegment(segments[segments.length - 1]!)),
    };
  }
  return null;
};
export const buildFinalContextFileLocator = (owner: ContextFileFinalOwnerDescriptor, storedFilename: string): string => {
  const file = encodeURIComponent(filename(storedFilename));
  switch (owner.kind) {
    case "agent_final":
      return `/rest/runs/${encodeURIComponent(owner.runId)}/context-files/${file}`;
    case "team_member_final":
      return `/rest/team-runs/${encodeURIComponent(owner.teamRunId)}/agent-runs/${encodeURIComponent(owner.agentRunId)}/context-files/${file}`;
    case "org_member_final":
      return `/rest/agent-org-runs/${encodeURIComponent(owner.orgRunId)}/agent-runs/${encodeURIComponent(owner.agentRunId)}/context-files/${file}`;
    case "agent_collaboration_member_final":
      return `/rest/agent-collaborations/${encodeURIComponent(owner.hostRunId)}/agent-runs/${encodeURIComponent(owner.agentRunId)}/context-files/${file}`;
  }
};
export const assertStoredFilename = filename;
