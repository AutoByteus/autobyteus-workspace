import {
  buildTeamLocalAgentDefinitionId,
  buildTeamLocalTeamDefinitionId,
} from "autobyteus-ts/agent-team/utils/team-local-definition-id.js";
import type { AgentTeamDefinitionOwnershipScope, TeamMember } from "../domain/models.js";

export type ScopedMemberResolutionContext = {
  containingTeamId: string;
  containingTeamOwnershipScope?: AgentTeamDefinitionOwnershipScope | null;
  ownerApplicationId?: string | null;
};

export type ScopedMemberResolutionSource = {
  id?: string | null;
  ownershipScope?: AgentTeamDefinitionOwnershipScope | null;
  ownerApplicationId?: string | null;
};

export const buildScopedMemberResolutionContext = (
  source: ScopedMemberResolutionSource,
  fallbackContainingTeamId?: string | null,
): ScopedMemberResolutionContext => {
  const sourceId = typeof source.id === "string" && source.id.trim().length > 0
    ? source.id
    : fallbackContainingTeamId ?? "";
  return {
    containingTeamId: normalizeRequiredString(sourceId, "containingTeamId"),
    containingTeamOwnershipScope: source.ownershipScope ?? "shared",
    ownerApplicationId: source.ownerApplicationId ?? null,
  };
};

const normalizeResolutionContext = (
  contextOrContainingTeamId: string | ScopedMemberResolutionContext,
): ScopedMemberResolutionContext => (
  typeof contextOrContainingTeamId === "string"
    ? { containingTeamId: contextOrContainingTeamId }
    : contextOrContainingTeamId
);

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const requireMemberScope = (member: Pick<TeamMember, "memberName" | "refScope">): NonNullable<TeamMember["refScope"]> => {
  if (!member.refScope) {
    throw new Error(`Team member '${member.memberName}' must include refScope.`);
  }
  return member.refScope;
};

const isApplicationOwnedContext = (context: ScopedMemberResolutionContext): boolean => (
  context.containingTeamOwnershipScope === "application_owned"
  || (context.containingTeamOwnershipScope === "team_local" && Boolean(context.ownerApplicationId))
);

const assertApplicationOwnedScopeAllowed = (
  context: ScopedMemberResolutionContext,
  member: Pick<TeamMember, "memberName" | "refType" | "refScope">,
): void => {
  if (member.refScope !== "application_owned") {
    return;
  }
  if (member.refType === "agent") {
    throw new Error(`Team member '${member.memberName}' cannot use refScope 'application_owned' for agent refs.`);
  }
  if (!isApplicationOwnedContext(context)) {
    throw new Error(
      `Team member '${member.memberName}' cannot use refScope 'application_owned' outside an application-owned team context.`,
    );
  }
};

export const resolveScopedAgentMemberRef = (
  contextOrContainingTeamId: string | ScopedMemberResolutionContext,
  member: Pick<TeamMember, "memberName" | "ref" | "refType" | "refScope">,
): string => {
  if (member.refType !== "agent") {
    throw new Error(`Team member '${member.memberName}' is not an agent member.`);
  }
  const context = normalizeResolutionContext(contextOrContainingTeamId);
  const scope = requireMemberScope(member);
  assertApplicationOwnedScopeAllowed(context, member);
  const ref = normalizeRequiredString(member.ref, "agentDefinitionRef");
  if (scope === "team_local") {
    return buildTeamLocalAgentDefinitionId(
      normalizeRequiredString(context.containingTeamId, "containingTeamId"),
      ref,
    );
  }
  return ref;
};

export const resolveScopedTeamMemberRef = (
  contextOrContainingTeamId: string | ScopedMemberResolutionContext,
  member: Pick<TeamMember, "memberName" | "ref" | "refType" | "refScope">,
): string => {
  if (member.refType !== "agent_team") {
    throw new Error(`Team member '${member.memberName}' is not an agent_team member.`);
  }
  const context = normalizeResolutionContext(contextOrContainingTeamId);
  const scope = requireMemberScope(member);
  assertApplicationOwnedScopeAllowed(context, member);
  const ref = normalizeRequiredString(member.ref, "teamDefinitionRef");
  if (scope === "team_local") {
    return buildTeamLocalTeamDefinitionId(
      normalizeRequiredString(context.containingTeamId, "containingTeamId"),
      ref,
    );
  }
  return ref;
};
