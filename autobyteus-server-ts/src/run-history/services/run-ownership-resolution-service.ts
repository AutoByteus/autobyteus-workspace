import { getTeamRuntimeBindingRegistry, type TeamRuntimeBindingRegistry } from "../../agent-team-execution/services/team-runtime-binding-registry.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { RunManifest } from "../domain/models.js";
import type { TeamMemberRunManifest } from "../domain/team-models.js";
import { RunManifestStore } from "../store/run-manifest-store.js";
import { TeamMemberRunManifestStore } from "../store/team-member-run-manifest-store.js";

type AgentLike = {
  context?: {
    customData?: Record<string, unknown> | null;
  } | null;
} | null;

type RunOwnershipResolution =
  | {
      kind: "standalone";
      runId: string;
      manifest: RunManifest;
      source: "manifest";
    }
  | {
      kind: "team_member";
      runId: string;
      teamRunId: string | null;
      memberManifest: TeamMemberRunManifest | null;
      source: "agent_context" | "binding_registry" | "member_manifest";
    }
  | {
      kind: "missing";
      runId: string;
    };

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const normalizeRunId = (runId: string): string => {
  const normalized = runId.trim();
  if (!normalized) {
    throw new Error("runId is required.");
  }
  return normalized;
};

const resolveTeamRunIdFromCustomData = (
  customData: Record<string, unknown>,
): string | null => {
  const teamContext = customData.teamContext;
  if (!teamContext || typeof teamContext !== "object" || Array.isArray(teamContext)) {
    return null;
  }
  return asNonEmptyString((teamContext as Record<string, unknown>).teamId);
};

const indicatesTeamMembership = (
  customData: Record<string, unknown>,
  runId: string,
): boolean => {
  const memberRouteKey = asNonEmptyString(customData.member_route_key);
  const memberRunId = asNonEmptyString(customData.member_run_id);
  const teamRunId = resolveTeamRunIdFromCustomData(customData);
  return memberRouteKey !== null || memberRunId === runId || teamRunId !== null;
};

export class RunOwnershipResolutionService {
  private readonly runManifestStore: RunManifestStore;
  private readonly teamMemberRunManifestStore: TeamMemberRunManifestStore;
  private readonly teamRuntimeBindingRegistry: TeamRuntimeBindingRegistry;

  constructor(
    memoryDir: string,
    options: {
      runManifestStore?: RunManifestStore;
      teamMemberRunManifestStore?: TeamMemberRunManifestStore;
      teamRuntimeBindingRegistry?: TeamRuntimeBindingRegistry;
    } = {},
  ) {
    this.runManifestStore = options.runManifestStore ?? new RunManifestStore(memoryDir);
    this.teamMemberRunManifestStore =
      options.teamMemberRunManifestStore ?? new TeamMemberRunManifestStore(memoryDir);
    this.teamRuntimeBindingRegistry =
      options.teamRuntimeBindingRegistry ?? getTeamRuntimeBindingRegistry();
  }

  async resolveOwnership(
    runId: string,
    options: {
      domainAgent?: AgentLike;
    } = {},
  ): Promise<RunOwnershipResolution> {
    const normalizedRunId = normalizeRunId(runId);
    const standaloneManifest = await this.runManifestStore.readManifest(normalizedRunId);
    if (standaloneManifest) {
      return {
        kind: "standalone",
        runId: normalizedRunId,
        manifest: standaloneManifest,
        source: "manifest",
      };
    }

    const customData = options.domainAgent?.context?.customData ?? null;
    if (customData && indicatesTeamMembership(customData, normalizedRunId)) {
      return {
        kind: "team_member",
        runId: normalizedRunId,
        teamRunId: resolveTeamRunIdFromCustomData(customData),
        memberManifest: null,
        source: "agent_context",
      };
    }

    const registryMatch = this.teamRuntimeBindingRegistry.resolveByMemberRunId(normalizedRunId);
    if (registryMatch) {
      return {
        kind: "team_member",
        runId: normalizedRunId,
        teamRunId: registryMatch.teamRunId,
        memberManifest: null,
        source: "binding_registry",
      };
    }

    const memberManifest = await this.teamMemberRunManifestStore.findManifestByMemberRunId(
      normalizedRunId,
    );
    if (memberManifest) {
      return {
        kind: "team_member",
        runId: normalizedRunId,
        teamRunId: memberManifest.teamRunId,
        memberManifest,
        source: "member_manifest",
      };
    }

    return {
      kind: "missing",
      runId: normalizedRunId,
    };
  }
}

let cachedRunOwnershipResolutionService: RunOwnershipResolutionService | null = null;

export const getRunOwnershipResolutionService = (): RunOwnershipResolutionService => {
  if (!cachedRunOwnershipResolutionService) {
    cachedRunOwnershipResolutionService = new RunOwnershipResolutionService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedRunOwnershipResolutionService;
};

export type { AgentLike as RunOwnershipAgentLike, RunOwnershipResolution };
