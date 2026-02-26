import type { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { RunScopedTeamBindingRegistry } from "../../distributed/runtime-binding/run-scoped-team-binding-registry.js";
import type { TeamRunManifest } from "../domain/team-models.js";
import type { TeamHistoryCleanupDispatcher } from "../distributed/team-history-cleanup-dispatcher.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
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

const isLocalNodeId = (candidate: string | null, localNodeId: string): boolean => {
  if (!candidate) {
    return true;
  }
  if (candidate === "embedded-local" || candidate === "local") {
    return true;
  }
  return candidate === localNodeId;
};

export type TeamHistoryRuntimeProbeOutcome = {
  canDelete: boolean;
  retryable: boolean;
  code: string;
  detail: string;
};

type TeamRunManagerLike = Pick<AgentTeamRunManager, "getTeamRun">;
type RunBindingRegistryLike = Pick<RunScopedTeamBindingRegistry, "listBindingsByTeamId">;

export class TeamHistoryRuntimeStateProbeService {
  private readonly teamRunManager: TeamRunManagerLike;
  private readonly runBindingRegistry: RunBindingRegistryLike;
  private readonly dispatcher: TeamHistoryCleanupDispatcher | null;
  private readonly localNodeId: string;

  constructor(options: {
    teamRunManager: TeamRunManagerLike;
    runBindingRegistry: RunBindingRegistryLike;
    dispatcher?: TeamHistoryCleanupDispatcher | null;
    localNodeId: string;
  }) {
    this.teamRunManager = options.teamRunManager;
    this.runBindingRegistry = options.runBindingRegistry;
    this.dispatcher = options.dispatcher ?? null;
    this.localNodeId = normalizeRequiredString(options.localNodeId, "localNodeId");
  }

  async probeDeletePrecondition(teamRunId: string, manifest: TeamRunManifest): Promise<TeamHistoryRuntimeProbeOutcome> {
    const normalizedTeamId = normalizeRequiredString(teamRunId, "teamRunId");

    if (this.isRuntimeActiveOnLocalNode(normalizedTeamId)) {
      return {
        canDelete: false,
        retryable: false,
        code: "TEAM_ACTIVE_LOCAL",
        detail: `Team '${normalizedTeamId}' is active on local node '${this.localNodeId}'.`,
      };
    }

    const remoteNodeIds = new Set<string>();
    for (const binding of manifest.memberBindings) {
      const normalizedHostNodeId = normalizeOptionalString(binding.hostNodeId);
      if (!isLocalNodeId(normalizedHostNodeId, this.localNodeId) && normalizedHostNodeId) {
        remoteNodeIds.add(normalizedHostNodeId);
      }
    }

    if (remoteNodeIds.size === 0) {
      return {
        canDelete: true,
        retryable: false,
        code: "OK",
        detail: "No remote ownership groups require runtime-state probing.",
      };
    }

    if (!this.dispatcher) {
      return {
        canDelete: false,
        retryable: true,
        code: "RUNTIME_PROBE_UNAVAILABLE",
        detail: "Distributed runtime-state probe transport is not available.",
      };
    }

    for (const remoteNodeId of remoteNodeIds) {
      const outcome = await this.dispatcher.probeRuntimeState({
        targetNodeId: remoteNodeId,
        teamRunId: normalizedTeamId,
      });
      if (!outcome.success) {
        return {
          canDelete: false,
          retryable: true,
          code: outcome.code,
          detail: `Runtime probe failed on node '${remoteNodeId}': ${outcome.detail}`,
        };
      }
      if (outcome.active) {
        return {
          canDelete: false,
          retryable: false,
          code: "TEAM_ACTIVE_REMOTE",
          detail: `Team '${normalizedTeamId}' is active on remote node '${remoteNodeId}'.`,
        };
      }
    }

    return {
      canDelete: true,
      retryable: false,
      code: "OK",
      detail: "Distributed runtime-state probe confirmed inactive state.",
    };
  }

  isRuntimeActiveOnLocalNode(teamRunId: string): boolean {
    const normalizedTeamId = normalizeRequiredString(teamRunId, "teamRunId");
    if (this.teamRunManager.getTeamRun(normalizedTeamId)) {
      return true;
    }
    return this.runBindingRegistry.listBindingsByTeamId(normalizedTeamId).length > 0;
  }
}
