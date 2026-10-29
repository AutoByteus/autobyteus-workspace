export class ContextFileDescriptorError extends Error {}

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
export type StandaloneFinalContextFileOwner = { kind: "agent_final"; runId: string };
export type TeamMemberFinalContextFileOwner = { kind: "team_member_final"; teamRunId: string; agentRunId: string };
export type AgentOrgMemberFinalContextFileOwner = { kind: "org_member_final"; orgRunId: string; agentRunId: string };
export type AgentCollaborationMemberFinalContextFileOwner = { kind: "agent_collaboration_member_final"; hostRunId: string; agentRunId: string };
export type ContextFileFinalOwnerDescriptor = StandaloneFinalContextFileOwner | TeamMemberFinalContextFileOwner | AgentOrgMemberFinalContextFileOwner
  | AgentCollaborationMemberFinalContextFileOwner;

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
