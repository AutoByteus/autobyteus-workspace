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
import type { RunProjectionProvider } from "../projection/run-projection-provider-port.js";
import {
  getCodexThreadRunProjectionProvider,
} from "../projection/providers/codex-thread-run-projection-provider.js";

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

export class TeamMemberRunProjectionService {
  private readonly teamRunHistoryService: TeamRunHistoryService;
  private readonly projectionReader: TeamMemberMemoryProjectionReader;
  private readonly codexProjectionProvider: RunProjectionProvider;

  constructor(options: {
    teamRunHistoryService?: TeamRunHistoryService;
    projectionReader?: TeamMemberMemoryProjectionReader;
    codexProjectionProvider?: RunProjectionProvider;
  } = {}) {
    this.teamRunHistoryService = options.teamRunHistoryService ?? getTeamRunHistoryService();
    this.projectionReader = options.projectionReader ?? getTeamMemberMemoryProjectionReader();
    this.codexProjectionProvider =
      options.codexProjectionProvider ?? getCodexThreadRunProjectionProvider();
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

    let projection: RunProjection | null = null;
    let projectionReadError: unknown = null;
    try {
      projection = await this.projectionReader.getProjection(
        normalizedTeamRunId,
        binding.memberRunId,
      );
    } catch (error) {
      projectionReadError = error;
    }

    const shouldTryCodexFallback =
      binding.runtimeKind === "codex_app_server" &&
      (projectionReadError !== null ||
        !projection ||
        projection.conversation.length === 0);

    if (shouldTryCodexFallback) {
      const codexProjection = await this.codexProjectionProvider.buildProjection({
        runId: binding.memberRunId,
        runtimeKind: "codex_app_server",
        manifest: {
          workspaceRootPath:
            binding.workspaceRootPath ?? resumeConfig.manifest.workspaceRootPath ?? "",
        } as any,
        runtimeReference: binding.runtimeReference as any,
      });
      if (codexProjection && codexProjection.conversation.length > 0) {
        projection = codexProjection;
        projectionReadError = null;
      }
    }

    if (!projection) {
      throw projectionReadError ?? new Error("Team member projection is unavailable.");
    }

    if (projection.conversation.length === 0 && projectionReadError) {
      throw projectionReadError;
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
