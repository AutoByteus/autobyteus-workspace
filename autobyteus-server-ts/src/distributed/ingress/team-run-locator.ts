import type { AgentTeamDefinition } from "../../agent-team-definition/domain/models.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { PlacementCandidateNode } from "../policies/default-placement-policy.js";
import type {
  StartRunIfMissingInput,
  TeamRunOrchestrator,
} from "../team-run-orchestrator/team-run-orchestrator.js";

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

export class TeamRunLocatorError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TeamRunLocatorError";
    this.code = code;
  }
}

export type TeamRunLocatorRecord = {
  teamId: string;
  teamDefinitionId: string;
  coordinatorMemberName: string;
  teamRunId: string;
  runVersion: number;
  hostNodeId: string;
};

export type TeamRunLocatorDependencies = {
  teamRunOrchestrator: TeamRunOrchestrator;
  teamDefinitionService: Pick<AgentTeamDefinitionService, "getDefinitionById">;
  teamRunManager: Pick<
    AgentTeamRunManager,
    "getTeamRun" | "getTeamDefinitionId" | "getTeamMemberNames"
  >;
  hostNodeId: string;
  nodeSnapshotProvider: () => PlacementCandidateNode[];
  defaultNodeId?: string | null;
  onRunResolved?: (record: TeamRunLocatorRecord) => Promise<void> | void;
};

export class TeamRunLocator {
  private readonly teamRunOrchestrator: TeamRunOrchestrator;
  private readonly teamDefinitionService: Pick<AgentTeamDefinitionService, "getDefinitionById">;
  private readonly teamRunManager: Pick<
    AgentTeamRunManager,
    "getTeamRun" | "getTeamDefinitionId" | "getTeamMemberNames"
  >;
  private readonly hostNodeId: string;
  private readonly nodeSnapshotProvider: () => PlacementCandidateNode[];
  private readonly defaultNodeId: string | null;
  private readonly onRunResolved: ((record: TeamRunLocatorRecord) => Promise<void> | void) | null;
  private readonly recordByTeamId = new Map<string, TeamRunLocatorRecord>();
  private readonly recordByRunId = new Map<string, TeamRunLocatorRecord>();

  constructor(deps: TeamRunLocatorDependencies) {
    this.teamRunOrchestrator = deps.teamRunOrchestrator;
    this.teamDefinitionService = deps.teamDefinitionService;
    this.teamRunManager = deps.teamRunManager;
    this.hostNodeId = normalizeRequiredString(deps.hostNodeId, "hostNodeId");
    this.nodeSnapshotProvider = deps.nodeSnapshotProvider;
    this.defaultNodeId = deps.defaultNodeId ?? null;
    this.onRunResolved = deps.onRunResolved ?? null;
  }

  async resolveOrCreateRun(teamId: string): Promise<TeamRunLocatorRecord> {
    const normalizedTeamId = normalizeRequiredString(teamId, "teamId");
    this.assertTeamExists(normalizedTeamId);

    const existing = this.resolveActiveRun(normalizedTeamId);
    if (existing) {
      if (this.onRunResolved) {
        await this.onRunResolved(existing);
      }
      return existing;
    }

    const teamDefinitionId = this.resolveTeamDefinitionIdOrThrow(normalizedTeamId);
    const teamDefinition = await this.resolveTeamDefinitionOrThrow(teamDefinitionId);
    this.assertTeamMembersExistInDefinition(normalizedTeamId, teamDefinition);

    const runRecord = this.teamRunOrchestrator.startRunIfMissing({
      teamDefinition,
      hostNodeId: this.hostNodeId,
      nodeSnapshots: this.resolveNodeSnapshots(),
      defaultNodeId: this.defaultNodeId,
    });

    const locatorRecord: TeamRunLocatorRecord = {
      teamId: normalizedTeamId,
      teamDefinitionId,
      coordinatorMemberName: teamDefinition.coordinatorMemberName,
      teamRunId: runRecord.teamRunId,
      runVersion: this.normalizeRunVersion(runRecord.runVersion, "runRecord.runVersion"),
      hostNodeId: runRecord.hostNodeId,
    };
    this.recordByTeamId.set(normalizedTeamId, locatorRecord);
    this.recordByRunId.set(locatorRecord.teamRunId, locatorRecord);
    if (this.onRunResolved) {
      await this.onRunResolved(locatorRecord);
    }
    return locatorRecord;
  }

  resolveActiveRun(teamId: string): TeamRunLocatorRecord | null {
    const normalizedTeamId = normalizeRequiredString(teamId, "teamId");
    const record = this.recordByTeamId.get(normalizedTeamId) ?? null;
    if (!record) {
      return null;
    }
    const activeRun = this.teamRunOrchestrator.getRunRecord(record.teamRunId);
    if (!activeRun || activeRun.status === "stopped") {
      this.recordByTeamId.delete(normalizedTeamId);
      this.recordByRunId.delete(record.teamRunId);
      return null;
    }
    if (activeRun.runVersion !== record.runVersion) {
      const updated: TeamRunLocatorRecord = {
        ...record,
        runVersion: this.normalizeRunVersion(activeRun.runVersion, "activeRun.runVersion"),
      };
      this.recordByTeamId.set(normalizedTeamId, updated);
      this.recordByRunId.set(updated.teamRunId, updated);
      return updated;
    }
    return record;
  }

  resolveByTeamRunId(teamRunId: string): TeamRunLocatorRecord | null {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const record = this.recordByRunId.get(normalizedTeamRunId) ?? null;
    if (!record) {
      return null;
    }
    return this.resolveActiveRun(record.teamId);
  }

  private assertTeamExists(teamId: string): void {
    const team = this.teamRunManager.getTeamRun(teamId);
    if (!team) {
      throw new TeamRunLocatorError("TEAM_NOT_FOUND", `Team '${teamId}' not found.`);
    }
  }

  private resolveTeamDefinitionIdOrThrow(teamId: string): string {
    const value = this.teamRunManager.getTeamDefinitionId(teamId);
    if (!value) {
      throw new TeamRunLocatorError(
        "TEAM_DEFINITION_UNAVAILABLE",
        `Team definition metadata is not available for team '${teamId}'.`,
      );
    }
    return value;
  }

  private async resolveTeamDefinitionOrThrow(teamDefinitionId: string): Promise<AgentTeamDefinition> {
    const definition = await this.teamDefinitionService.getDefinitionById(teamDefinitionId);
    if (!definition) {
      throw new TeamRunLocatorError(
        "TEAM_DEFINITION_NOT_FOUND",
        `Team definition '${teamDefinitionId}' was not found.`,
      );
    }
    return definition;
  }

  private assertTeamMembersExistInDefinition(teamId: string, definition: AgentTeamDefinition): void {
    const runtimeMemberNames = new Set(this.teamRunManager.getTeamMemberNames(teamId));
    if (runtimeMemberNames.size === 0) {
      return;
    }

    const definedMembers = new Set(definition.nodes.map((node) => node.memberName));
    for (const memberName of runtimeMemberNames) {
      if (!definedMembers.has(memberName)) {
        throw new TeamRunLocatorError(
          "TEAM_DEFINITION_MEMBER_MISMATCH",
          `Team member '${memberName}' is missing from definition '${definition.id ?? "unknown"}'.`,
        );
      }
    }
  }

  private resolveNodeSnapshots(): PlacementCandidateNode[] {
    const snapshots = this.nodeSnapshotProvider();
    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      throw new TeamRunLocatorError("NODE_SNAPSHOT_EMPTY", "No node snapshots are available for run placement.");
    }
    return snapshots;
  }

  private normalizeRunVersion(value: unknown, field: string): number {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }

    throw new TeamRunLocatorError(
      "INVALID_RUN_VERSION",
      `Expected ${field} to be a positive integer, received '${String(value)}'.`,
    );
  }
}
