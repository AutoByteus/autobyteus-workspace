import { createHash } from "node:crypto";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} cannot be empty.`);
  }
  return normalized;
};

export const normalizeMemberRouteKey = (memberRouteKey: string): string => {
  const normalized = normalizeRequiredString(memberRouteKey, "memberRouteKey")
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    throw new Error("memberRouteKey cannot be empty.");
  }
  return normalized;
};

const ROUTE_SLUG_MAX_LENGTH = 48;

const buildRouteSlug = (normalizedRouteKey: string): string => {
  const normalizedSlug = normalizedRouteKey
    .toLowerCase()
    .replace(/[\/\\]+/g, "_")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!normalizedSlug) {
    return "agent";
  }
  return normalizedSlug.slice(0, ROUTE_SLUG_MAX_LENGTH);
};

export const buildTeamMemberRunId = (teamRunId: string, memberRouteKey: string): string => {
  const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
  const normalizedRouteKey = normalizeMemberRouteKey(memberRouteKey);
  const routeSlug = buildRouteSlug(normalizedRouteKey);
  const hash = createHash("sha256")
    .update(`${normalizedTeamRunId}::${normalizedRouteKey}`)
    .digest("hex")
    .slice(0, 16);
  return `${routeSlug}_${hash}`;
};
