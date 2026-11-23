import { getAgentTeamAddressBasename, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  createStoredTeamRunExecutionTreeLocationService,
  type TeamRunExecutionTreeLocationService,
} from "../../run-history/services/team-run-execution-tree-location-service.js";
import { TeamRunHistoryCatalogService } from "../../run-history/services/team-run-history-catalog-service.js";
import { toCollaborationMemberMemoryLocation } from "./collaboration-member-memory-targets.js";
import type {
  CollaborationRootCatalogEntry,
  CollaborationRootMemoryRecord,
  CollaborationRootMemorySource,
} from "./collaboration-root-memory-catalog.js";

type TeamLocations = Pick<TeamRunExecutionTreeLocationService, "listRootTeamRunIds" | "listAgents">;
type TeamCatalogRows = Pick<TeamRunHistoryCatalogService, "listCatalogRows">;

/** Stored-only history manager: the explorer never manages live runs and only reads history. */
const STORED_HISTORY_MANAGER = Object.freeze({
  withInactiveHistoryMutation: async <T>(_teamRunId: string, operation: () => Promise<T>) => ({
    kind: "completed" as const,
    value: await operation(),
  }),
});

/**
 * Reads stored root team runs for the memory catalog: one tree read per root, every agent execution in it. A delegated Team
 * run is a root (autobyteus-461); a Team unit of an Org is not.
 */
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
    const located = await this.locations.listAgents({ rootTeamRunId: rootRunId });
    const tree = located[0]?.tree;
    // A Team unit of an Org (autobyteus-29) is a Team run of its own but not a team root: the Memory page shows it under its
    // Org (autobyteus-619 REQ-002). Decided by its tree's own field, not by a failed lookup of the Org.
    if (!tree || tree.containedIn) return null;
    return {
      rootRunId,
      definitionId: tree.rootTeam.teamDefinitionId.trim(),
      definitionName: tree.rootTeam.teamDefinitionName,
      createdAt: tree.createdAt ?? null,
      members: located.map((item) => toCollaborationMemberMemoryLocation(item, toTeamDisplayName)),
      configuredMembers: tree.rootTeam.members.map((member) => ({
        kind: "AGENT" as const, id: member.agentDefinitionId, name: toTeamDisplayName(member.address),
      })),
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

/** Team members and groups are labeled by their address basename (REQ-004). */
const toTeamDisplayName = (address: string): string =>
  getAgentTeamAddressBasename(address as AgentTeamAddress) ?? address;
