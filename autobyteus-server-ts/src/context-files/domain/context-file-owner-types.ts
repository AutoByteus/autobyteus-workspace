import { assertAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

export class ContextFileDescriptorError extends Error {}

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new ContextFileDescriptorError(`${field} is required.`);
  return normalized;
};
const filename = (value: string): string => {
  const normalized = required(value, "storedFilename");
  if (normalized.includes("..") || normalized.includes("/") || normalized.includes("\\")) throw new ContextFileDescriptorError("storedFilename is invalid.");
  return normalized;
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

const exactOrgIdentity = (input: Record<string, unknown>): { orgRunId: string; agentRunId: string } => {
  if (Object.keys(input).some((key) => !["kind", "orgRunId", "agentRunId"].includes(key))) {
    throw new ContextFileDescriptorError("Org context-file owner has unsupported fields.");
  }
  return { orgRunId: safeIdentity(input.orgRunId, "orgRunId"), agentRunId: safeIdentity(input.agentRunId, "agentRunId") };
};
const exactAgentCollaborationIdentity = (input: Record<string, unknown>): { hostRunId: string; agentRunId: string } => {
  if (Object.keys(input).some((key) => !["kind", "hostRunId", "agentRunId"].includes(key))) {
    throw new ContextFileDescriptorError("Agent collaboration context-file owner has unsupported fields.");
  }
  return { hostRunId: safeIdentity(input.hostRunId, "hostRunId"), agentRunId: safeIdentity(input.agentRunId, "agentRunId") };
};
export const parseDraftContextFileOwnerDescriptor = (value: unknown): ContextFileDraftOwnerDescriptor => {
  const input = record(value);
  if (input.kind === "agent_draft") return { kind: "agent_draft", draftRunId: required(String(input.draftRunId ?? ""), "draftRunId") };
  if (input.kind === "team_member_draft") return {
    kind: "team_member_draft",
    teamDraftId: required(String(input.teamDraftId ?? ""), "teamDraftId"),
    memberAddress: assertAgentTeamAddress(String(input.memberAddress ?? "")),
  };
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
  if (input.kind === "agent_final") return { kind: "agent_final", runId: required(String(input.runId ?? ""), "runId") };
  if (input.kind === "team_member_final") {
    if (Object.keys(input).some((key) => !["kind", "teamRunId", "agentRunId"].includes(key))) {
      throw new ContextFileDescriptorError("Team context-file owner has unsupported fields.");
    }
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
export const buildDraftContextFileLocator = (owner: ContextFileDraftOwnerDescriptor, storedFilename: string): string => {
  const file = encodeURIComponent(filename(storedFilename));
  switch (owner.kind) {
    case "agent_draft":
      return `/rest/drafts/agent-runs/${encodeURIComponent(owner.draftRunId)}/context-files/${file}`;
    case "team_member_draft":
      return `/rest/drafts/team-runs/${encodeURIComponent(owner.teamDraftId)}/members/${encodeURIComponent(owner.memberAddress)}/context-files/${file}`;
    case "org_member_draft":
      return `/rest/drafts/agent-org-runs/${encodeURIComponent(owner.orgRunId)}/agent-runs/${encodeURIComponent(owner.agentRunId)}/context-files/${file}`;
    case "agent_collaboration_member_draft":
      return `/rest/drafts/agent-collaborations/${encodeURIComponent(owner.hostRunId)}/agent-runs/${encodeURIComponent(owner.agentRunId)}/context-files/${file}`;
  }
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
export const getStoredFilenameFromLocator = (locator: string): string | null => {
  const raw = locator.trim(); if (!raw) return null;
  const pathname = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw).pathname : raw;
  const match = pathname.match(/\/context-files\/([^/?#]+)$/); if (!match?.[1]) return null;
  try { return filename(decodeURIComponent(match[1])); } catch { return null; }
};
export const getDisplayNameFromStoredFilename = (storedFilename: string): string => filename(storedFilename).match(/^ctx_[^_]+__([^]+)$/)?.[1] || filename(storedFilename);
export const assertStoredFilename = filename;
