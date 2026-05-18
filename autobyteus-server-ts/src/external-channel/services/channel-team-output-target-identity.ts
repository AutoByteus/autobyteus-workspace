import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import {
  getRuntimeMemberContexts,
  type TeamMemberRuntimeContext,
} from "../../agent-team-execution/domain/team-run-context.js";
import {
  buildMemberRouteKeyFromPath,
  selectorFromMemberPath,
  selectorFromMemberRouteKey,
  selectorToRouteKey,
} from "../../agent-team-execution/domain/team-run-member-identity.js";
import type { ChannelBinding, ChannelRunOutputTarget } from "../domain/models.js";

export type ChannelTeamOutputTarget = Extract<
  ChannelRunOutputTarget,
  { targetType: "TEAM" }
>;

export type ChannelTeamOutputTargetIdentity = {
  memberRunId: string | null;
  memberRouteKey: string | null;
  memberPath: string[] | null;
};

export const resolveTeamRunOutputTarget = (
  binding: ChannelBinding,
  run: TeamRun,
  preferred: ChannelRunOutputTarget | null,
): ChannelTeamOutputTarget | null => {
  const preferredTeam = preferred?.targetType === "TEAM" ? preferred : null;
  const identity = resolveTeamBindingOutputIdentity(binding, run, preferredTeam);
  if (!identity.memberRunId && !identity.memberRouteKey) {
    return null;
  }
  return {
    targetType: "TEAM",
    teamRunId: normalizeRequiredTeamRunId(binding, run, preferredTeam),
    entryMemberRunId: identity.memberRunId,
    entryMemberRouteKey: identity.memberRouteKey,
    entryMemberPath: identity.memberPath,
  };
};

export const resolveTeamBindingCurrentOutputIdentity = (
  binding: ChannelBinding,
  run: TeamRun,
): ChannelTeamOutputTargetIdentity =>
  resolveTeamBindingOutputIdentity(binding, run, null);

const resolveTeamBindingOutputIdentity = (
  binding: ChannelBinding,
  run: TeamRun,
  preferred: ChannelTeamOutputTarget | null,
): ChannelTeamOutputTargetIdentity => {
  const contexts = getRuntimeMemberContexts(run.getRuntimeContext());
  const preferredRunId = normalizeOptionalString(preferred?.entryMemberRunId);
  if (preferredRunId) {
    return fromRuntimeContext(
      contexts.find((context) => context.memberRunId === preferredRunId) ?? null,
      { memberRunId: preferredRunId, memberRouteKey: null, memberPath: null },
    );
  }

  const preferredRouteKey = normalizeRouteKey(preferred?.entryMemberRouteKey);
  const preferredPath = normalizeMemberPath(preferred?.entryMemberPath);
  const preferredPathRouteKey = routeKeyFromPath(preferredPath);
  const preferredIdentityRouteKey = preferredRouteKey ?? preferredPathRouteKey;
  if (preferredIdentityRouteKey) {
    return fromRuntimeContext(
      findRuntimeContextByRouteKey(contexts, preferredIdentityRouteKey),
      {
        memberRunId: null,
        memberRouteKey: preferredIdentityRouteKey,
        memberPath: preferredPath ?? routeKeyToPath(preferredIdentityRouteKey),
      },
    );
  }

  const bindingRouteKey = normalizeRouteKey(binding.targetMemberRouteKey);
  const bindingPath = normalizeMemberPath(binding.targetMemberPath);
  const bindingPathRouteKey = routeKeyFromPath(bindingPath);
  const bindingIdentityRouteKey = bindingRouteKey ?? bindingPathRouteKey;
  if (bindingIdentityRouteKey) {
    return fromRuntimeContext(
      findRuntimeContextByRouteKey(contexts, bindingIdentityRouteKey),
      {
        memberRunId: null,
        memberRouteKey: bindingIdentityRouteKey,
        memberPath: bindingPath ?? routeKeyToPath(bindingIdentityRouteKey),
      },
    );
  }

  const coordinatorRouteKey = normalizeRouteKey(
    run.context?.coordinatorMemberRouteKey ?? run.config?.coordinatorMemberRouteKey,
  );
  if (coordinatorRouteKey) {
    return fromRuntimeContext(
      findRuntimeContextByRouteKey(contexts, coordinatorRouteKey),
      {
        memberRunId: null,
        memberRouteKey: coordinatorRouteKey,
        memberPath: routeKeyToPath(coordinatorRouteKey),
      },
    );
  }

  return contexts.length === 1
    ? fromRuntimeContext(contexts[0] ?? null, emptyIdentity())
    : emptyIdentity();
};

const normalizeRequiredTeamRunId = (
  binding: ChannelBinding,
  run: TeamRun,
  preferred: ChannelTeamOutputTarget | null,
): string =>
  normalizeOptionalString(binding.teamRunId) ??
  normalizeOptionalString(preferred?.teamRunId) ??
  run.runId;

const findRuntimeContextByRouteKey = (
  contexts: TeamMemberRuntimeContext[],
  routeKey: string,
): TeamMemberRuntimeContext | null =>
  contexts.find((context) => context.memberRouteKey === routeKey) ?? null;

const fromRuntimeContext = (
  context: TeamMemberRuntimeContext | null,
  fallback: ChannelTeamOutputTargetIdentity,
): ChannelTeamOutputTargetIdentity => ({
  memberRunId: context?.memberRunId ?? fallback.memberRunId,
  memberRouteKey: context?.memberRouteKey ?? fallback.memberRouteKey,
  memberPath: context?.memberPath ? [...context.memberPath] : fallback.memberPath,
});

const emptyIdentity = (): ChannelTeamOutputTargetIdentity => ({
  memberRunId: null,
  memberRouteKey: null,
  memberPath: null,
});

const normalizeRouteKey = (value: string | null | undefined): string | null => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  try {
    return selectorToRouteKey(selectorFromMemberRouteKey(normalized));
  } catch {
    return null;
  }
};

const normalizeMemberPath = (value: readonly string[] | null | undefined): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  try {
    const selector = selectorFromMemberPath(value);
    return selector.kind === "path" ? [...selector.memberPath] : null;
  } catch {
    return null;
  }
};

const routeKeyFromPath = (path: string[] | null): string | null =>
  path ? buildMemberRouteKeyFromPath(path) : null;

const routeKeyToPath = (routeKey: string | null): string[] | null =>
  routeKey ? routeKey.split("/") : null;

const normalizeOptionalString = (
  value: string | null | undefined,
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
