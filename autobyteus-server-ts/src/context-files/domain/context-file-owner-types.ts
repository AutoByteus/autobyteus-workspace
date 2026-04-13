import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeStoredFilename = (storedFilename: string): string => {
  const normalized = normalizeRequiredString(storedFilename, "storedFilename");
  if (
    normalized.includes("..") ||
    normalized.includes("/") ||
    normalized.includes("\\")
  ) {
    throw new Error("storedFilename is invalid.");
  }
  return normalized;
};

export type StandaloneDraftContextFileOwner = {
  kind: "agent_draft";
  draftRunId: string;
};

export type TeamMemberDraftContextFileOwner = {
  kind: "team_member_draft";
  draftTeamRunId: string;
  memberRouteKey: string;
};

export type StandaloneFinalContextFileOwner = {
  kind: "agent_final";
  runId: string;
};

export type TeamMemberFinalContextFileOwner = {
  kind: "team_member_final";
  teamRunId: string;
  memberRouteKey: string;
};

export type ContextFileDraftOwnerDescriptor =
  | StandaloneDraftContextFileOwner
  | TeamMemberDraftContextFileOwner;

export type ContextFileFinalOwnerDescriptor =
  | StandaloneFinalContextFileOwner
  | TeamMemberFinalContextFileOwner;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseDraftContextFileOwnerDescriptor = (
  value: unknown,
): ContextFileDraftOwnerDescriptor => {
  if (!isRecord(value) || typeof value.kind !== "string") {
    throw new Error("draft owner descriptor is invalid.");
  }

  if (value.kind === "agent_draft") {
    return {
      kind: "agent_draft",
      draftRunId: normalizeRequiredString(String(value.draftRunId ?? ""), "draftRunId"),
    };
  }

  if (value.kind === "team_member_draft") {
    return {
      kind: "team_member_draft",
      draftTeamRunId: normalizeRequiredString(
        String(value.draftTeamRunId ?? ""),
        "draftTeamRunId",
      ),
      memberRouteKey: normalizeMemberRouteKey(String(value.memberRouteKey ?? "")),
    };
  }

  throw new Error(`Unsupported draft owner kind '${String(value.kind)}'.`);
};

export const parseFinalContextFileOwnerDescriptor = (
  value: unknown,
): ContextFileFinalOwnerDescriptor => {
  if (!isRecord(value) || typeof value.kind !== "string") {
    throw new Error("final owner descriptor is invalid.");
  }

  if (value.kind === "agent_final") {
    return {
      kind: "agent_final",
      runId: normalizeRequiredString(String(value.runId ?? ""), "runId"),
    };
  }

  if (value.kind === "team_member_final") {
    return {
      kind: "team_member_final",
      teamRunId: normalizeRequiredString(String(value.teamRunId ?? ""), "teamRunId"),
      memberRouteKey: normalizeMemberRouteKey(String(value.memberRouteKey ?? "")),
    };
  }

  throw new Error(`Unsupported final owner kind '${String(value.kind)}'.`);
};

export const buildDraftContextFileLocator = (
  owner: ContextFileDraftOwnerDescriptor,
  storedFilename: string,
): string => {
  const normalizedStoredFilename = encodeURIComponent(normalizeStoredFilename(storedFilename));
  if (owner.kind === "agent_draft") {
    return `/rest/drafts/agent-runs/${encodeURIComponent(owner.draftRunId)}/context-files/${normalizedStoredFilename}`;
  }

  return `/rest/drafts/team-runs/${encodeURIComponent(owner.draftTeamRunId)}/members/${encodeURIComponent(owner.memberRouteKey)}/context-files/${normalizedStoredFilename}`;
};

export const buildFinalContextFileLocator = (
  owner: ContextFileFinalOwnerDescriptor,
  storedFilename: string,
): string => {
  const normalizedStoredFilename = encodeURIComponent(normalizeStoredFilename(storedFilename));
  if (owner.kind === "agent_final") {
    return `/rest/runs/${encodeURIComponent(owner.runId)}/context-files/${normalizedStoredFilename}`;
  }

  return `/rest/team-runs/${encodeURIComponent(owner.teamRunId)}/members/${encodeURIComponent(owner.memberRouteKey)}/context-files/${normalizedStoredFilename}`;
};

export const getStoredFilenameFromLocator = (locator: string): string | null => {
  const normalized = locator.trim();
  if (!normalized) {
    return null;
  }

  const pathname = normalized.startsWith("http://") || normalized.startsWith("https://")
    ? new URL(normalized).pathname
    : normalized;
  const match = pathname.match(/\/context-files\/([^/?#]+)$/);
  if (!match?.[1]) {
    return null;
  }

  try {
    return normalizeStoredFilename(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
};

export const getDisplayNameFromStoredFilename = (storedFilename: string): string => {
  const normalizedStoredFilename = normalizeStoredFilename(storedFilename);
  const match = normalizedStoredFilename.match(/^ctx_[^_]+__([^]+)$/);
  return match?.[1] || normalizedStoredFilename;
};

export const assertStoredFilename = (storedFilename: string): string =>
  normalizeStoredFilename(storedFilename);
