import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  createStoredTeamRunExecutionTreeLocationService,
  type LocatedTeamAgentExecution,
  type TeamRunExecutionTreeLocationService,
} from "../../run-history/services/team-run-execution-tree-location-service.js";
import { TeamRunHistoryCatalogService } from "../../run-history/services/team-run-history-catalog-service.js";
import type { CollaborationMemberMemoryLocation } from "./collaboration-member-memory-targets.js";
import type {
  CollaborationRootCatalogEntry,
  CollaborationRootMemoryRecord,
  CollaborationRootMemorySource,
} from "./collaboration-root-memory-catalog.js";

type TeamLocations = Pick<TeamRunExecutionTreeLocationService, "listRootTeamRunIds" | "listAgents">;
type TeamCatalogRows = Pick<TeamRunHistoryCatalogService, "listCatalogRows">;

const STORED_HISTORY_MANAGER = Object.freeze({
  hasManagedTeamRun: () => false,
  withUnmanagedHistoryDeletion: async <T>(_teamRunId: string, operation: () => Promise<T>) => ({
    kind: "completed" as const,
    value: await operation(),
  }),
});

/** Reads stored root team runs for the memory catalog: one tree read per root. */
export class TeamRootMemorySource implements CollaborationRootMemorySource {
  readonly familyLabel = "team run";
  private readonly locations: TeamLocations;
  private readonly catalogRows: TeamCatalogRows;

  constructor(
    memoryDir: string,
    dependencies: { locations?: TeamLocations; catalogRows?: TeamCatalogRows } = {},
  ) {
    this.locations = dependencies.locations ?? createStoredTeamRunExecutionTreeLocationService(memoryDir);
    this.catalogRows = dependencies.catalogRows ?? new TeamRunHistoryCatalogService(memoryDir, {
      teamRunManager: STORED_HISTORY_MANAGER,
    });
  }

  listRootRunIds(): Promise<string[]> {
    return this.locations.listRootTeamRunIds();
  }

  async readRoot(rootRunId: string): Promise<CollaborationRootMemoryRecord | null> {
    const located = await this.locations.listAgents({ rootTeamRunId: rootRunId, configuredOnly: true });
    const tree = located[0]?.tree;
    if (!tree) return null;
    return {
      rootRunId,
      definitionId: tree.rootTeam.teamDefinitionId.trim(),
      definitionName: tree.rootTeam.teamDefinitionName,
      createdAt: tree.createdAt ?? null,
      members: located.map(toMemberLocation),
    };
  }

  async readCatalogEntries(): Promise<ReadonlyMap<string, CollaborationRootCatalogEntry>> {
    const rows = await this.catalogRows.listCatalogRows();
    return new Map(rows.map((row) => [row.teamRunId, {
      definitionName: row.teamDefinitionName,
      summary: row.summary,
      workspaceRootPath: row.workspaceRootPath,
      createdAt: row.createdAt,
    }]));
  }
}

const toMemberLocation = (located: LocatedTeamAgentExecution): CollaborationMemberMemoryLocation => ({
  memberAddress: located.memberAddress,
  displayName: getAgentTeamAddressBasename(located.memberAddress) ?? located.memberAddress,
  agentRunId: located.agentRunId,
  agentDefinitionId: located.configuredPlacement?.agentDefinitionId ?? null,
  memoryDir: located.memoryDir,
});
