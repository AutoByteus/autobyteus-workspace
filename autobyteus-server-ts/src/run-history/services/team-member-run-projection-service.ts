import type { RunProjection } from "./run-projection-service.js";
import {
  getTeamRunHistoryService,
  TeamRunHistoryService,
} from "./team-run-history-service.js";
import type { TeamRunMemberBinding } from "../domain/team-models.js";
import { normalizeMemberRouteKey } from "../utils/team-member-run-id.js";
import {
  TeamMemberMemoryProjectionReader,
  getTeamMemberMemoryProjectionReader,
} from "./team-member-memory-projection-reader.js";
import {
  getRunProjectionProviderRegistry,
  type RunProjectionProviderRegistry,
} from "../projection/run-projection-provider-registry.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const toNormalizedMemberRouteKey = (value: string): string | null => {
  try {
    return normalizeMemberRouteKey(value);
  } catch {
    return null;
  }
};

const resolveMemberBinding = (
  bindings: TeamRunMemberBinding[],
  memberRouteKey: string,
): TeamRunMemberBinding | null => {
  const normalizedTarget = toNormalizedMemberRouteKey(memberRouteKey) ?? memberRouteKey.trim();

  for (const binding of bindings) {
    const routeKey =
      toNormalizedMemberRouteKey(binding.memberRouteKey) ?? binding.memberRouteKey.trim();
    if (routeKey === normalizedTarget) {
      return binding;
    }
    if (binding.memberName.trim() === memberRouteKey.trim()) {
      return binding;
    }
  }

  return null;
};

export interface TeamMemberRunProjection {
  agentRunId: string;
  conversation: RunProjection["conversation"];
  summary: string | null;
  lastActivityAt: string | null;
}

const toTimestampMs = (value: string | null | undefined): number => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasConversation = (projection: RunProjection | null): boolean =>
  Boolean(projection && projection.conversation.length > 0);

const selectPreferredProjection = (options: {
  localProjection: RunProjection | null;
  runtimeProjection: RunProjection | null;
}): RunProjection | null => {
  const { localProjection, runtimeProjection } = options;
  if (!localProjection) {
    return runtimeProjection;
  }
  if (!runtimeProjection) {
    return localProjection;
  }

  const localConversationLength = localProjection.conversation.length;
  const runtimeConversationLength = runtimeProjection.conversation.length;
  if (runtimeConversationLength > localConversationLength) {
    return runtimeProjection;
  }
  if (runtimeConversationLength < localConversationLength) {
    return localProjection;
  }

  const runtimeLastActivityMs = toTimestampMs(runtimeProjection.lastActivityAt);
  const localLastActivityMs = toTimestampMs(localProjection.lastActivityAt);
  if (runtimeLastActivityMs > localLastActivityMs) {
    return runtimeProjection;
  }

  return localProjection;
};

export class TeamMemberRunProjectionService {
  private readonly teamRunHistoryService: TeamRunHistoryService;
  private readonly projectionReader: TeamMemberMemoryProjectionReader;
  private readonly projectionProviderRegistry: RunProjectionProviderRegistry;

  constructor(options: {
    teamRunHistoryService?: TeamRunHistoryService;
    projectionReader?: TeamMemberMemoryProjectionReader;
    projectionProviderRegistry?: RunProjectionProviderRegistry;
  } = {}) {
    this.teamRunHistoryService = options.teamRunHistoryService ?? getTeamRunHistoryService();
    this.projectionReader = options.projectionReader ?? getTeamMemberMemoryProjectionReader();
    this.projectionProviderRegistry =
      options.projectionProviderRegistry ?? getRunProjectionProviderRegistry();
  }

  async getProjection(teamRunId: string, memberRouteKey: string): Promise<TeamMemberRunProjection> {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const normalizedMemberRouteKey = normalizeRequiredString(memberRouteKey, "memberRouteKey");
    const resumeConfig = await this.teamRunHistoryService.getTeamRunResumeConfig(normalizedTeamRunId);
    const binding = resolveMemberBinding(
      resumeConfig.manifest.memberBindings,
      normalizedMemberRouteKey,
    );

    if (!binding) {
      throw new Error(
        `Member route key '${normalizedMemberRouteKey}' not found for team run '${normalizedTeamRunId}'.`,
      );
    }

    let localProjection: RunProjection | null = null;
    let localProjectionReadError: unknown = null;
    try {
      localProjection = await this.projectionReader.getProjection(
        normalizedTeamRunId,
        binding.memberRunId,
      );
    } catch (error) {
      localProjectionReadError = error;
    }

    let runtimeProjection: RunProjection | null = null;
    let runtimeProjectionError: unknown = null;
    if (binding.runtimeKind !== "autobyteus") {
      const runtimeProjectionProvider = this.projectionProviderRegistry.resolveProvider(
        binding.runtimeKind,
      );
      try {
        runtimeProjection = await runtimeProjectionProvider.buildProjection({
          runId: binding.memberRunId,
          runtimeKind: binding.runtimeKind,
          manifest: {
            workspaceRootPath:
              binding.workspaceRootPath ?? resumeConfig.manifest.workspaceRootPath ?? "",
          } as any,
          runtimeReference: binding.runtimeReference as any,
        });
      } catch (error) {
        runtimeProjectionError = error;
      }
    }

    const projection = selectPreferredProjection({
      localProjection,
      runtimeProjection,
    });

    if (!projection) {
      throw (
        runtimeProjectionError ??
        localProjectionReadError ??
        new Error("Team member projection is unavailable.")
      );
    }

    if (
      !hasConversation(projection) &&
      localProjectionReadError &&
      runtimeProjectionError
    ) {
      throw runtimeProjectionError;
    }

    if (!hasConversation(projection) && localProjectionReadError) {
      throw localProjectionReadError;
    }

    return {
      agentRunId: projection.runId,
      conversation: projection.conversation,
      summary: projection.summary,
      lastActivityAt: projection.lastActivityAt,
    };
  }
}

let cachedTeamMemberRunProjectionService: TeamMemberRunProjectionService | null = null;

export const getTeamMemberRunProjectionService = (): TeamMemberRunProjectionService => {
  if (!cachedTeamMemberRunProjectionService) {
    cachedTeamMemberRunProjectionService = new TeamMemberRunProjectionService();
  }
  return cachedTeamMemberRunProjectionService;
};
