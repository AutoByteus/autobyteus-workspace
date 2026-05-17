import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";

export type TeamMemberSelector =
  | { kind: "path"; memberPath: string[] }
  | { kind: "route_key"; memberRouteKey: string };

export type TeamMemberIdentity = {
  memberName: string;
  memberPath?: readonly string[] | null;
  memberRouteKey: string;
};

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} cannot be empty.`);
  }
  return normalized;
};

export const normalizeMemberPath = (memberPath: readonly string[]): string[] => {
  const normalized = memberPath.map((segment, index) =>
    normalizeRequiredString(segment, `memberPath[${index}]`),
  );
  if (normalized.length === 0) {
    throw new Error("memberPath cannot be empty.");
  }
  return normalized;
};

export const buildMemberRouteKeyFromPath = (memberPath: readonly string[]): string =>
  normalizeMemberRouteKey(normalizeMemberPath(memberPath).join("/"));

export const buildMemberPath = (
  parentPath: readonly string[] | null | undefined,
  memberName: string,
): string[] => [...(parentPath ?? []), normalizeRequiredString(memberName, "memberName")];

export const selectorFromMemberRouteKey = (memberRouteKey: string): TeamMemberSelector => ({
  kind: "route_key",
  memberRouteKey: normalizeMemberRouteKey(memberRouteKey),
});

export const selectorFromMemberPath = (memberPath: readonly string[]): TeamMemberSelector => ({
  kind: "path",
  memberPath: normalizeMemberPath(memberPath),
});

export const selectorToRouteKey = (selector: TeamMemberSelector): string => {
  if (selector.kind === "path") {
    return buildMemberRouteKeyFromPath(selector.memberPath);
  }
  return normalizeMemberRouteKey(selector.memberRouteKey);
};

export const selectorToDisplayString = (selector: TeamMemberSelector): string => {
  if (selector.kind === "path") {
    return normalizeMemberPath(selector.memberPath).join("/");
  }
  return normalizeMemberRouteKey(selector.memberRouteKey);
};

export const isNestedSelector = (selector: TeamMemberSelector): boolean => {
  if (selector.kind === "path") {
    return normalizeMemberPath(selector.memberPath).length > 1;
  }
  return normalizeMemberRouteKey(selector.memberRouteKey).includes("/");
};

export const getSelectorTopLevelName = (selector: TeamMemberSelector): string | null => {
  if (selector.kind === "path") {
    return normalizeMemberPath(selector.memberPath)[0] ?? null;
  }
  const routeKey = normalizeMemberRouteKey(selector.memberRouteKey);
  return routeKey.split("/")[0] ?? null;
};

export const stripSelectorTopLevel = (selector: TeamMemberSelector): TeamMemberSelector | null => {
  if (selector.kind === "path") {
    const [, ...rest] = normalizeMemberPath(selector.memberPath);
    return rest.length > 0 ? selectorFromMemberPath(rest) : null;
  }
  const [, ...rest] = normalizeMemberRouteKey(selector.memberRouteKey).split("/");
  return rest.length > 0 ? selectorFromMemberRouteKey(rest.join("/")) : null;
};

export type TeamMemberSelectorResolution<TMember> =
  | { ok: true; member: TMember }
  | { ok: false; code: "TARGET_MEMBER_NOT_FOUND"; message: string };

export const resolveTeamMemberSelector = <TMember extends TeamMemberIdentity>(
  selector: TeamMemberSelector,
  members: readonly TMember[],
): TeamMemberSelectorResolution<TMember> => {
  if (selector.kind === "path") {
    const routeKey = buildMemberRouteKeyFromPath(selector.memberPath);
    const matched = members.find((member) => normalizeMemberRouteKey(member.memberRouteKey) === routeKey) ?? null;
    return matched
      ? { ok: true, member: matched }
      : {
          ok: false,
          code: "TARGET_MEMBER_NOT_FOUND",
          message: `Team member path '${routeKey}' was not found.`,
        };
  }

  const routeKey = normalizeMemberRouteKey(selector.memberRouteKey);
  const matched = members.find((member) => normalizeMemberRouteKey(member.memberRouteKey) === routeKey) ?? null;
  return matched
    ? { ok: true, member: matched }
    : {
        ok: false,
        code: "TARGET_MEMBER_NOT_FOUND",
        message: `Team member route '${routeKey}' was not found.`,
      };
};
