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
export type TeamMemberFinalContextFileOwner = { kind: "team_member_final"; teamRunId: string; memberAddress: AgentTeamAddress };
export type AgentOrgMemberFinalContextFileOwner = { kind: "org_member_final"; orgRunId: string; agentRunId: string };
export type ResolvedTeamMemberFinalContextFileOwner = TeamMemberFinalContextFileOwner & {
  rootTeamRunId: string;
  ancestorTeamRunIds: string[];
  agentRunId: string;
  memoryDir: string;
};
export type ResolvedAgentOrgMemberFinalContextFileOwner = AgentOrgMemberFinalContextFileOwner & {
  rootSubjectKind: "agent_org";
  rootRunId: string;
  ancestorTeamRunIds: string[];
  agentRunId: string;
  memoryDir: string;
};
export type ContextFileDraftOwnerDescriptor = StandaloneDraftContextFileOwner | TeamMemberDraftContextFileOwner | AgentOrgMemberDraftContextFileOwner;
export type ContextFileFinalOwnerDescriptor = StandaloneFinalContextFileOwner | TeamMemberFinalContextFileOwner | AgentOrgMemberFinalContextFileOwner;
export type ContextFileResolvedFinalOwnerDescriptor = StandaloneFinalContextFileOwner | ResolvedTeamMemberFinalContextFileOwner | ResolvedAgentOrgMemberFinalContextFileOwner;

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContextFileDescriptorError("owner descriptor is invalid.");
  return value as Record<string, unknown>;
};
const exactOrgIdentity = (input: Record<string, unknown>): { orgRunId: string; agentRunId: string } => {
  if (Object.keys(input).some((key) => !["kind", "orgRunId", "agentRunId"].includes(key))) {
    throw new ContextFileDescriptorError("Org context-file owner has unsupported fields.");
  }
  const segment = (value: unknown, field: string): string => {
    if (typeof value !== "string" || !value || value !== value.trim()
      || /[\\/\x00-\x1f\x7f]/.test(value) || value === "." || value === "..") {
      throw new ContextFileDescriptorError(`${field} must be a safe non-empty identity.`);
    }
    return value;
  };
  return { orgRunId: segment(input.orgRunId, "orgRunId"), agentRunId: segment(input.agentRunId, "agentRunId") };
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
  throw new ContextFileDescriptorError(`Unsupported draft owner kind '${String(input.kind)}'.`);
};
export const parseFinalContextFileOwnerDescriptor = (value: unknown): ContextFileFinalOwnerDescriptor => {
  const input = record(value);
  if (input.kind === "agent_final") return { kind: "agent_final", runId: required(String(input.runId ?? ""), "runId") };
  if (input.kind === "team_member_final") return {
    kind: "team_member_final",
    teamRunId: required(String(input.teamRunId ?? ""), "teamRunId"),
    memberAddress: assertAgentTeamAddress(String(input.memberAddress ?? "")),
  };
  if (input.kind === "org_member_final") return {
    kind: "org_member_final",
    ...exactOrgIdentity(input),
  };
  throw new ContextFileDescriptorError(`Unsupported final owner kind '${String(input.kind)}'.`);
};
export const buildDraftContextFileLocator = (owner: ContextFileDraftOwnerDescriptor, storedFilename: string): string =>
  owner.kind === "agent_draft"
    ? `/rest/drafts/agent-runs/${encodeURIComponent(owner.draftRunId)}/context-files/${encodeURIComponent(filename(storedFilename))}`
    : owner.kind === "team_member_draft"
      ? `/rest/drafts/team-runs/${encodeURIComponent(owner.teamDraftId)}/members/${encodeURIComponent(owner.memberAddress)}/context-files/${encodeURIComponent(filename(storedFilename))}`
      : `/rest/drafts/agent-org-runs/${encodeURIComponent(owner.orgRunId)}/agent-runs/${encodeURIComponent(owner.agentRunId)}/context-files/${encodeURIComponent(filename(storedFilename))}`;
export const buildFinalContextFileLocator = (owner: ContextFileFinalOwnerDescriptor, storedFilename: string): string =>
  owner.kind === "agent_final"
    ? `/rest/runs/${encodeURIComponent(owner.runId)}/context-files/${encodeURIComponent(filename(storedFilename))}`
    : owner.kind === "team_member_final"
      ? `/rest/team-runs/${encodeURIComponent(owner.teamRunId)}/members/${encodeURIComponent(owner.memberAddress)}/context-files/${encodeURIComponent(filename(storedFilename))}`
      : `/rest/agent-org-runs/${encodeURIComponent(owner.orgRunId)}/agent-runs/${encodeURIComponent(owner.agentRunId)}/context-files/${encodeURIComponent(filename(storedFilename))}`;
export const getStoredFilenameFromLocator = (locator: string): string | null => {
  const raw = locator.trim(); if (!raw) return null;
  const pathname = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw).pathname : raw;
  const match = pathname.match(/\/context-files\/([^/?#]+)$/); if (!match?.[1]) return null;
  try { return filename(decodeURIComponent(match[1])); } catch { return null; }
};
export const getDisplayNameFromStoredFilename = (storedFilename: string): string => filename(storedFilename).match(/^ctx_[^_]+__([^]+)$/)?.[1] || filename(storedFilename);
export const assertStoredFilename = filename;
