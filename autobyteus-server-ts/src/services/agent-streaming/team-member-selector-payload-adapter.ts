import {
  selectorFromMemberPath,
  selectorFromMemberRouteKey,
  type TeamMemberSelector,
} from "../../agent-team-execution/domain/team-run-member-identity.js";

export type TeamMemberSelectorPayloadKeys = {
  pathKeys: string[];
  routeKeyKeys: string[];
};

export const resolveTeamMemberSelectorFromPayload = (
  payload: Record<string, unknown>,
  keys: TeamMemberSelectorPayloadKeys,
): TeamMemberSelector | null => {
  for (const key of keys.pathKeys) {
    const value = payload[key];
    if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
      const path = value.map((entry) => entry.trim()).filter(Boolean);
      if (path.length > 0) {
        return selectorFromMemberPath(path);
      }
    }
  }
  for (const key of keys.routeKeyKeys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return selectorFromMemberRouteKey(value);
    }
  }
  return null;
};
