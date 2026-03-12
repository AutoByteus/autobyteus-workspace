import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";
import type { TeamRunMemberBinding } from "../../run-history/domain/team-models.js";

export type TeamRuntimeMode = "native_team" | "member_runtime";

export interface TeamRuntimeBindingState {
  teamRunId: string;
  mode: TeamRuntimeMode;
  coordinatorMemberRouteKey: string | null;
  memberBindings: TeamRunMemberBinding[];
}

export interface ResolveMemberBindingResult {
  binding: TeamRunMemberBinding | null;
  code:
    | "TEAM_BINDINGS_NOT_FOUND"
    | "TARGET_MEMBER_REQUIRED"
    | "TARGET_MEMBER_NOT_FOUND"
    | "TARGET_MEMBER_AMBIGUOUS";
  message: string;
}

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} cannot be empty.`);
  }
  return normalized;
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeCaseFold = (value: string): string => value.trim().toLowerCase();

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class TeamRuntimeBindingRegistry {
  private readonly stateByTeamRunId = new Map<string, TeamRuntimeBindingState>();
  private readonly teamRunIdByMemberRunId = new Map<string, string>();

  upsertTeamBindings(
    teamRunId: string,
    mode: TeamRuntimeMode,
    memberBindings: TeamRunMemberBinding[],
    coordinatorMemberRouteKey?: string | null,
  ): void {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const normalizedBindings = memberBindings.map((binding) => ({
      ...binding,
      memberRouteKey: normalizeMemberRouteKey(binding.memberRouteKey),
      memberName: normalizeRequiredString(binding.memberName, "memberName"),
      memberRunId: normalizeRequiredString(binding.memberRunId, "memberRunId"),
    }));

    const previous = this.stateByTeamRunId.get(normalizedTeamRunId);
    if (previous) {
      for (const binding of previous.memberBindings) {
        this.teamRunIdByMemberRunId.delete(binding.memberRunId);
      }
    }

    for (const binding of normalizedBindings) {
      const previousTeamRunId = this.teamRunIdByMemberRunId.get(binding.memberRunId);
      if (previousTeamRunId && previousTeamRunId !== normalizedTeamRunId) {
        logger.warn(
          `Member run '${binding.memberRunId}' was mapped to team '${previousTeamRunId}', remapping to '${normalizedTeamRunId}'.`,
        );
      }
      this.teamRunIdByMemberRunId.set(binding.memberRunId, normalizedTeamRunId);
    }

    let normalizedCoordinatorMemberRouteKey = normalizeOptionalString(
      coordinatorMemberRouteKey ?? null,
    );
    if (normalizedCoordinatorMemberRouteKey) {
      normalizedCoordinatorMemberRouteKey = normalizeMemberRouteKey(
        normalizedCoordinatorMemberRouteKey,
      );
    } else {
      normalizedCoordinatorMemberRouteKey =
        previous?.coordinatorMemberRouteKey ??
        normalizedBindings[0]?.memberRouteKey ??
        null;
    }

    this.stateByTeamRunId.set(normalizedTeamRunId, {
      teamRunId: normalizedTeamRunId,
      mode,
      coordinatorMemberRouteKey: normalizedCoordinatorMemberRouteKey,
      memberBindings: normalizedBindings,
    });
  }

  removeTeam(teamRunId: string): void {
    const normalizedTeamRunId = normalizeOptionalString(teamRunId);
    if (!normalizedTeamRunId) {
      return;
    }
    const existing = this.stateByTeamRunId.get(normalizedTeamRunId);
    if (existing) {
      for (const binding of existing.memberBindings) {
        this.teamRunIdByMemberRunId.delete(binding.memberRunId);
      }
    }
    this.stateByTeamRunId.delete(normalizedTeamRunId);
  }

  getTeamMode(teamRunId: string): TeamRuntimeMode | null {
    const normalizedTeamRunId = normalizeOptionalString(teamRunId);
    if (!normalizedTeamRunId) {
      return null;
    }
    return this.stateByTeamRunId.get(normalizedTeamRunId)?.mode ?? null;
  }

  getTeamBindings(teamRunId: string): TeamRunMemberBinding[] {
    const normalizedTeamRunId = normalizeOptionalString(teamRunId);
    if (!normalizedTeamRunId) {
      return [];
    }
    return this.stateByTeamRunId.get(normalizedTeamRunId)?.memberBindings ?? [];
  }

  getTeamBindingState(teamRunId: string): TeamRuntimeBindingState | null {
    const normalizedTeamRunId = normalizeOptionalString(teamRunId);
    if (!normalizedTeamRunId) {
      return null;
    }
    return this.stateByTeamRunId.get(normalizedTeamRunId) ?? null;
  }

  listTeamRunIds(): string[] {
    return Array.from(this.stateByTeamRunId.keys());
  }

  resolveMemberBinding(
    teamRunId: string,
    targetMember: string | null | undefined,
  ): ResolveMemberBindingResult {
    const normalizedTeamRunId = normalizeOptionalString(teamRunId);
    if (!normalizedTeamRunId) {
      return {
        binding: null,
        code: "TEAM_BINDINGS_NOT_FOUND",
        message: "Team runtime bindings are not available.",
      };
    }
    const state = this.stateByTeamRunId.get(normalizedTeamRunId);
    if (!state || state.memberBindings.length === 0) {
      return {
        binding: null,
        code: "TEAM_BINDINGS_NOT_FOUND",
        message: `Team runtime bindings for '${normalizedTeamRunId}' are not available.`,
      };
    }

    const normalizedTarget = normalizeOptionalString(targetMember);
    if (!normalizedTarget) {
      return {
        binding: null,
        code: "TARGET_MEMBER_REQUIRED",
        message: "Target member is required for member-runtime routing.",
      };
    }

    const directRunIdMatch = state.memberBindings.find(
      (binding) => binding.memberRunId === normalizedTarget,
    );
    if (directRunIdMatch) {
      return {
        binding: directRunIdMatch,
        code: "TARGET_MEMBER_NOT_FOUND",
        message: "",
      };
    }

    let normalizedRouteKeyTarget: string | null = null;
    try {
      normalizedRouteKeyTarget = normalizeMemberRouteKey(normalizedTarget);
    } catch {
      normalizedRouteKeyTarget = null;
    }

    if (normalizedRouteKeyTarget) {
      const routeMatches = state.memberBindings.filter(
        (binding) => normalizeMemberRouteKey(binding.memberRouteKey) === normalizedRouteKeyTarget,
      );
      if (routeMatches.length === 1) {
        return {
          binding: routeMatches[0] ?? null,
          code: "TARGET_MEMBER_NOT_FOUND",
          message: "",
        };
      }
      if (routeMatches.length > 1) {
        return {
          binding: null,
          code: "TARGET_MEMBER_AMBIGUOUS",
          message: `Target member '${normalizedTarget}' is ambiguous by route key.`,
        };
      }
    }

    const normalizedNameTarget = normalizeCaseFold(normalizedTarget);
    const nameMatches = state.memberBindings.filter(
      (binding) => normalizeCaseFold(binding.memberName) === normalizedNameTarget,
    );
    if (nameMatches.length === 1) {
      return {
        binding: nameMatches[0] ?? null,
        code: "TARGET_MEMBER_NOT_FOUND",
        message: "",
      };
    }
    if (nameMatches.length > 1) {
      return {
        binding: null,
        code: "TARGET_MEMBER_AMBIGUOUS",
        message: `Target member '${normalizedTarget}' resolves to multiple team members.`,
      };
    }

    return {
      binding: null,
      code: "TARGET_MEMBER_NOT_FOUND",
      message: `Target member '${normalizedTarget}' is not part of this team run.`,
    };
  }

  resolveByMemberRunId(
    memberRunId: string | null | undefined,
  ): { teamRunId: string; binding: TeamRunMemberBinding } | null {
    const normalizedMemberRunId = normalizeOptionalString(memberRunId);
    if (!normalizedMemberRunId) {
      return null;
    }
    const teamRunId = this.teamRunIdByMemberRunId.get(normalizedMemberRunId);
    if (!teamRunId) {
      return null;
    }
    const state = this.stateByTeamRunId.get(teamRunId);
    if (!state) {
      return null;
    }
    const binding = state.memberBindings.find((row) => row.memberRunId === normalizedMemberRunId);
    if (!binding) {
      return null;
    }
    return { teamRunId, binding };
  }

  isCoordinatorMemberRunId(
    teamRunId: string | null | undefined,
    memberRunId: string | null | undefined,
  ): boolean {
    const normalizedTeamRunId = normalizeOptionalString(teamRunId);
    const normalizedMemberRunId = normalizeOptionalString(memberRunId);
    if (!normalizedTeamRunId || !normalizedMemberRunId) {
      return false;
    }

    const state = this.stateByTeamRunId.get(normalizedTeamRunId);
    if (!state || !state.coordinatorMemberRouteKey) {
      return false;
    }

    const coordinatorBinding = state.memberBindings.find(
      (binding) => binding.memberRouteKey === state.coordinatorMemberRouteKey,
    );
    return coordinatorBinding?.memberRunId === normalizedMemberRunId;
  }
}

let cachedTeamRuntimeBindingRegistry: TeamRuntimeBindingRegistry | null = null;

export const getTeamRuntimeBindingRegistry = (): TeamRuntimeBindingRegistry => {
  if (!cachedTeamRuntimeBindingRegistry) {
    cachedTeamRuntimeBindingRegistry = new TeamRuntimeBindingRegistry();
  }
  return cachedTeamRuntimeBindingRegistry;
};
