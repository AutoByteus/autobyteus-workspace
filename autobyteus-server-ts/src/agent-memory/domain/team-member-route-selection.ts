import { normalizeMemberRouteKey } from "../../agent-team-execution/domain/team-run-member-identity.js";

type TeamMemberRouteCandidate = {
  memberRouteKey: string;
};

export type TeamMemberRouteSelectionResult<T> =
  | { status: "none" }
  | { status: "ambiguous" }
  | { status: "resolved"; item: T };

const toComparableRouteKey = (value: string): string => {
  try {
    return normalizeMemberRouteKey(value);
  } catch {
    return value.trim();
  }
};

const normalizeOptionalString = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toResult = <T>(matches: readonly T[]): TeamMemberRouteSelectionResult<T> => {
  if (matches.length === 0) {
    return { status: "none" };
  }
  return matches.length === 1
    ? { status: "resolved", item: matches[0]! }
    : { status: "ambiguous" };
};

export const selectTeamMemberRouteCandidate = <T extends TeamMemberRouteCandidate>(
  candidates: readonly T[],
  memberRouteKey: string | null | undefined,
): TeamMemberRouteSelectionResult<T> => {
  const normalizedMemberRouteKey = normalizeOptionalString(memberRouteKey);
  if (!normalizedMemberRouteKey) {
    return { status: "none" };
  }

  const comparable = toComparableRouteKey(normalizedMemberRouteKey);
  const exact = candidates.filter(
    (candidate) => toComparableRouteKey(candidate.memberRouteKey) === comparable,
  );
  if (exact.length > 0) {
    return toResult(exact);
  }

  return toResult(
    candidates.filter((candidate) =>
      toComparableRouteKey(candidate.memberRouteKey).endsWith(`/${comparable}`),
    ),
  );
};

export const resolveTeamMemberRouteCandidate = <T extends TeamMemberRouteCandidate>(
  candidates: readonly T[],
  memberRouteKey: string | null | undefined,
): T | null => {
  const result = selectTeamMemberRouteCandidate(candidates, memberRouteKey);
  return result.status === "resolved" ? result.item : null;
};
